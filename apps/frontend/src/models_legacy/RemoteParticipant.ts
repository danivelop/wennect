import { Subscription, BehaviorSubject, from, fromEvent, of } from 'rxjs'
import { tap, filter, switchMap } from 'rxjs/operators'

import { SOCKET } from '@/constants/Socket'

import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  id: string

  peerConnection: RTCPeerConnection

  mediaStreamList$: BehaviorSubject<MediaStream[]>

  private subscription: Subscription

  private socket: Socket

  constructor(id: string, socket: Socket) {
    this.id = id
    this.peerConnection = new RTCPeerConnection()
    this.mediaStreamList$ = new BehaviorSubject<MediaStream[]>([])
    this.subscription = new Subscription()
    this.socket = socket

    this.subscription.add(this.waitCandidate$().subscribe())
    this.subscription.add(this.handleIceCandidate$().subscribe())
    this.subscription.add(this.handleTrack$().subscribe())
  }

  negotiate$() {
    return from(this.peerConnection.createOffer()).pipe(
      tap((localSessionDescription) => {
        this.peerConnection.setLocalDescription(localSessionDescription)
      }),
      tap((localSessionDescription) => {
        this.socket.emit(SOCKET.EVENT.OFFER, this.id, localSessionDescription)
      }),
      switchMap(() =>
        fromEvent<[string, RTCSessionDescriptionInit]>(
          this.socket,
          SOCKET.EVENT.ANSWER,
        ),
      ),
      filter(([remoteId]) => remoteId === this.id),
      tap(([, remoteSessionDescription]) => {
        this.peerConnection.setRemoteDescription(remoteSessionDescription)
      }),
    )
  }

  createAnswer$(remoteSessionDescription: RTCSessionDescriptionInit) {
    return of({}).pipe(
      tap(() => {
        this.peerConnection.setRemoteDescription(remoteSessionDescription)
      }),
      switchMap(() => from(this.peerConnection.createAnswer())),
      tap((localSessionDescription) => {
        this.peerConnection.setLocalDescription(localSessionDescription)
      }),
      tap((localSessionDescription) => {
        this.socket.emit(SOCKET.EVENT.ANSWER, this.id, localSessionDescription)
      }),
    )
  }

  waitCandidate$() {
    return fromEvent<[string, RTCIceCandidate]>(
      this.socket,
      SOCKET.EVENT.ICECANDIDATE,
    ).pipe(
      filter(([remoteId]) => remoteId === this.id),
      tap(([, candidate]) => {
        this.peerConnection.addIceCandidate(candidate)
      }),
    )
  }

  handleIceCandidate$() {
    return fromEvent<RTCPeerConnectionIceEvent>(
      this.peerConnection,
      'icecandidate',
    ).pipe(
      tap((event) => {
        const { candidate } = event
        if (candidate) {
          this.socket.emit(SOCKET.EVENT.ICECANDIDATE, this.id, candidate)
        }
      }),
    )
  }

  handleTrack$() {
    return fromEvent<RTCTrackEvent>(this.peerConnection, 'track').pipe(
      tap((event) => {
        const { streams } = event
        streams.forEach((stream) => {
          const currentMediaStream = this.mediaStreamList$.value.find(
            (mediaStream) => mediaStream.id === stream.id,
          )
          if (currentMediaStream) {
            const currentTrack = currentMediaStream
              .getTracks()
              .find((track) => track.id === event.track.id)

            if (!currentTrack) {
              currentMediaStream.addTrack(event.track)
            }
          } else {
            this.mediaStreamList$.next([...this.mediaStreamList$.value, stream])
          }
        })
      }),
    )
  }

  clear() {
    this.peerConnection.getSenders().forEach((sender) => {
      this.peerConnection.removeTrack(sender)
    })
    this.peerConnection.close()
    this.mediaStreamList$.value.forEach((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
    })
    this.mediaStreamList$.complete()
    this.subscription.unsubscribe()
  }
}

export default RemoteParticipant
