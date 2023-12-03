import {
  BehaviorSubject,
  Subscription,
  EMPTY,
  from,
  of,
  fromEvent,
  merge,
} from 'rxjs'
import { tap, filter, switchMap } from 'rxjs/operators'

import SocketService from '@/services/SocketService'

import { SOCKET } from '@/constants/Socket'

import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  id: string

  peerConnection: RTCPeerConnection

  mediaStreamList$: BehaviorSubject<MediaStream[]>

  private subscription: Subscription

  constructor(id: string) {
    this.id = id
    this.peerConnection = new RTCPeerConnection()
    this.mediaStreamList$ = new BehaviorSubject<MediaStream[]>([])
    this.subscription = new Subscription()

    this.subscription.add(this.handleTrack$().subscribe())
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
            console.log('will offer', this.id, localSessionDescription)
            socket.emit(SOCKET.EVENT.OFFER, this.id, localSessionDescription)
          }),
          switchMap(() =>
            fromEvent<[string, RTCSessionDescriptionInit]>(
              socket,
              SOCKET.EVENT.ANSWER,
            ).pipe(
              filter(([remoteId]) => remoteId === this.id),
              tap(([, remoteSessionDescription]) => {
                console.log(
                  'received answer',
                  this.id,
                  remoteSessionDescription,
                )
                this.peerConnection.setRemoteDescription(
                  new RTCSessionDescription(remoteSessionDescription),
                )
              }),
            ),
          ),
        ),
      ),
      switchMap(() => EMPTY),
    )
  }

  createAnswer$(remoteSessionDescription: RTCSessionDescriptionInit) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      tap(() => {
        console.log('received offer', this.id, remoteSessionDescription)
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(remoteSessionDescription),
        )
      }),
      switchMap((socket) =>
        from(this.peerConnection.createAnswer()).pipe(
          tap((localSessionDescription) => {
            this.peerConnection.setLocalDescription(localSessionDescription)
          }),
          tap((localSessionDescription) => {
            console.log('will answer', this.id, localSessionDescription)
            socket.emit(SOCKET.EVENT.ANSWER, this.id, localSessionDescription)
          }),
        ),
      ),
      switchMap(() => EMPTY),
    )
  }

  handleTrack$() {
    return fromEvent<RTCTrackEvent>(this.peerConnection, 'track').pipe(
      tap((event) => {
        console.log('track event', event)
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

  handleIcecandidate$() {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        merge(
          fromEvent<RTCPeerConnectionIceEvent>(
            this.peerConnection,
            'icecandidate',
          ).pipe(
            tap((event) => {
              console.log('event', event)
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
            filter(([remoteId]) => remoteId === this.id),
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
