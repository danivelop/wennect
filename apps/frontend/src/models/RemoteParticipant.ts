import { BehaviorSubject, Subscription, from, of, fromEvent, merge } from 'rxjs'
import { tap, filter, switchMap, take } from 'rxjs/operators'

import SocketService from '@/services/SocketService'

import { SOCKET } from '@/constants/Socket'

import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  private id: string

  private peerConnection: RTCPeerConnection

  private mediaStreamList$: BehaviorSubject<MediaStream[]>

  private subscription: Subscription

  constructor(id: string) {
    this.id = id
    this.peerConnection = new RTCPeerConnection()
    this.mediaStreamList$ = new BehaviorSubject<MediaStream[]>([])
    this.subscription = new Subscription()

    this.subscription.add(this.handleTrack().subscribe())
    this.subscription.add(this.handleIcecandidate$().subscribe())
  }

  createOffer$() {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        from(this.peerConnection.createOffer()).pipe(
          tap((localSessionDescription) => {
            this.peerConnection.setLocalDescription(localSessionDescription)
          }),
          tap((localSessionDescription) => {
            socket.emit(SOCKET.EVENT.OFFER, this.id, localSessionDescription)
          }),
          switchMap(() =>
            fromEvent<[string, RTCSessionDescriptionInit]>(
              socket,
              SOCKET.EVENT.ANSWER,
            ).pipe(
              take(1),
              tap(([, remoteSessionDescription]) => {
                this.peerConnection.setRemoteDescription(
                  remoteSessionDescription,
                )
              }),
            ),
          ),
        ),
      ),
    )
  }

  createAnswer$(remoteSessionDescription: RTCSessionDescriptionInit) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      tap(() => {
        this.peerConnection.setRemoteDescription(remoteSessionDescription)
      }),
      switchMap((socket) =>
        from(this.peerConnection.createAnswer()).pipe(
          tap((localSessionDescription) => {
            this.peerConnection.setLocalDescription(localSessionDescription)
          }),
          tap((localSessionDescription) => {
            socket.emit(SOCKET.EVENT.ANSWER, this.id, localSessionDescription)
          }),
        ),
      ),
    )
  }

  handleTrack() {
    return fromEvent<RTCTrackEvent>(this.peerConnection, 'track').pipe(
      tap((event) => {
        const { streams } = event
        streams.forEach((stream) => {
          const currentMediaStream = this.mediaStreamList$.value.find(
            (mediaStream) => mediaStream.id === stream.id,
          )
          if (currentMediaStream) {
            currentMediaStream.addTrack(event.track)
          } else {
            this.mediaStreamList$.next([...this.mediaStreamList$.value, stream])
          }
        })
      }),
    )
  }

  handleIcecandidate$() {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        merge(
          fromEvent<RTCPeerConnectionIceEvent>(
            this.peerConnection,
            'icecandidate',
          ).pipe(
            take(1),
            tap((event) => {
              const { candidate } = event
              if (candidate) {
                socket.emit(SOCKET.EVENT.ICECANDIDATE, this.id, candidate)
              }
            }),
          ),
          fromEvent<[string, RTCIceCandidate]>(
            socket,
            SOCKET.EVENT.ICECANDIDATE,
          ).pipe(
            take(1),
            tap(([, candidate]) => {
              this.peerConnection.addIceCandidate(candidate)
            }),
          ),
        ),
      ),
    )
  }

  clear() {
    this.peerConnection.getSenders().forEach((sender) => {
      this.peerConnection.removeTrack(sender)
    })
    this.peerConnection.close()
    this.mediaStreamList$.value.forEach((mediaStram) => {
      mediaStram.getTracks().forEach((track) => track.stop())
    })
    this.subscription.unsubscribe()
    this.mediaStreamList$.complete()
  }
}

export default RemoteParticipant
