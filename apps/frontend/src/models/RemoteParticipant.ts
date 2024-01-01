import { BehaviorSubject, of, merge, EMPTY, from } from 'rxjs'
import { tap, switchMap, filter } from 'rxjs/operators'

import type LocalParticipant from '@/models/LocalParticipant'
import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  id: string

  private socket: Socket

  private localParticipant: LocalParticipant

  userMediaStream$: BehaviorSubject<MediaStream | null>

  displayMediaStream$: BehaviorSubject<MediaStream | null>

  peerConnection: RTCPeerConnection | null

  constructor(id: string, socket: Socket, localParticipant: LocalParticipant) {
    this.id = id
    this.socket = socket
    this.localParticipant = localParticipant
    this.userMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.displayMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.peerConnection = null
  }

  ensureSyncLocalTrackOnPeerConnection$() {
    return merge(
      this.localParticipant.addTrackNotifier$.pipe(
        tap(({ mediaStream, track }) => {
          if (!this.peerConnection) {
            return
          }
          this.peerConnection.addTrack(track, mediaStream)
        }),
      ),
      this.localParticipant.removeTrackNotifier$.pipe(
        tap(({ track }) => {
          if (!this.peerConnection) {
            return
          }
          const matchedSender = this.peerConnection
            .getSenders()
            .find((sender) => sender.track?.id === track.id)

          if (matchedSender) {
            this.peerConnection.removeTrack(matchedSender)
          }
        }),
      ),
    ).pipe(switchMap(() => EMPTY))
  }

  requestConnect$() {
    return of(new RTCPeerConnection()).pipe(
      tap((peerConnection) => {
        this.peerConnection = peerConnection
      }),
      switchMap((peerConnection) =>
        merge(
          merge(
            of(this.localParticipant.userMediaStream$.value),
            of(this.localParticipant.displayMediaStream$.value),
          ).pipe(
            filter((mediaStream): mediaStream is MediaStream => !!mediaStream),
            tap((mediaStream) => {
              mediaStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, mediaStream)
              })
            }),
          ),
          from(this.localParticipant.userMediaStream$),
          from(this.localParticipant.displayMediaStream$),
        ),
      ),
    )
  }

  requestDisconnect$() {
    return of(this.id)
  }

  negotiate$() {
    return of(this.id)
  }

  // eslint-disable-next-line class-methods-use-this
  clear() {}
}

export default RemoteParticipant
