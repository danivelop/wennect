import { from, of, fromEvent } from 'rxjs'
import { tap, map, filter, switchMap, take } from 'rxjs/operators'

import SocketService from '@/services/SocketService'

import { SOCKET } from '@/constants/Socket'

import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  private id: string

  private peerConnection: RTCPeerConnection

  constructor(id: string) {
    this.id = id
    this.peerConnection = new RTCPeerConnection()
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
              switchMap(([, remoteSessionDescription]) =>
                this.receivedAnswer$(remoteSessionDescription),
              ),
            ),
          ),
        ),
      ),
    )
  }

  createAnswer$(remoteSessionDescription: RTCSessionDescriptionInit) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        from(this.peerConnection.createAnswer()).pipe(
          tap((localSessionDescription) => {
            this.peerConnection.setRemoteDescription(remoteSessionDescription)
            this.peerConnection.setLocalDescription(localSessionDescription)
          }),
          tap((localSessionDescription) => {
            socket.emit(SOCKET.EVENT.ANSWER, this.id, localSessionDescription)
          }),
        ),
      ),
    )
  }

  receivedAnswer$(remoteSessionDescription: RTCSessionDescriptionInit) {
    return of(this.peerConnection).pipe(
      tap((peerConnection) => {
        peerConnection.setRemoteDescription(remoteSessionDescription)
      }),
      map(() => this),
    )
  }
}

export default RemoteParticipant
