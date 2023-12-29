import {
  BehaviorSubject,
  of,
  EMPTY,
  NEVER,
  forkJoin,
  concat,
  merge,
  fromEvent,
  from,
} from 'rxjs'
import { tap, switchMap, catchError, filter, finalize } from 'rxjs/operators'
import { io } from 'socket.io-client'

import { SOCKET } from '@/constants/Socket'
import LocalParticipant from '@/models/LocalParticipant'
import RemoteParticipant from '@/models/RemoteParticipant'

import type { Socket } from 'socket.io-client'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  remoteParticipants$ = new BehaviorSubject<RemoteParticipant[]>([])

  enter() {
    const subscription = merge(
      of(io('https://localhost:4000')).pipe(
        switchMap((socket) =>
          concat(
            merge(
              this.handleCreateOrDeleteParticipant$(socket),
              this.initializeLocalParticipant$(),
              of({}).pipe(
                tap(() => {
                  socket.emit(SOCKET.EVENT.EMIT.JOIN, 'room1')
                }),
              ),
            ),
            NEVER,
          ).pipe(
            finalize(() => {
              socket.emit(SOCKET.EVENT.EMIT.LEAVE, 'room1')
              socket.disconnect()

              const localParticipant = this.localParticipant$.value
              const remoteParticipants = this.remoteParticipants$.value

              if (localParticipant) {
                localParticipant.clear()
                this.localParticipant$.next(null)
              }

              remoteParticipants.forEach((remoteParticipant) => {
                remoteParticipant.clear()
              })
              this.remoteParticipants$.next([])
            }),
          ),
        ),
      ),
      fromEvent(window, 'beforeunload').pipe(
        tap(() => {
          subscription.unsubscribe()
        }),
      ),
    ).subscribe()

    return subscription
  }

  handleCreateOrDeleteParticipant$(socket: Socket) {
    return merge(
      fromEvent<[string, string[]]>(socket, SOCKET.EVENT.ON.LOCAL_JOIN).pipe(
        switchMap(([localId, remoteIds]) =>
          of(new LocalParticipant(localId, socket)).pipe(
            tap((localParticipant) => {
              this.localParticipant$.next(localParticipant)
            }),
            switchMap((localParticipant) =>
              merge(
                from(remoteIds),
                fromEvent<string>(socket, SOCKET.EVENT.ON.REMOTE_JOIN),
              ).pipe(
                tap((remoteId) => {
                  this.remoteParticipants$.next([
                    ...this.remoteParticipants$.value,
                    new RemoteParticipant(remoteId, socket, localParticipant),
                  ])
                }),
              ),
            ),
          ),
        ),
      ),
      fromEvent<string>(socket, SOCKET.EVENT.ON.REMOTE_LEAVE).pipe(
        tap((remoteId) => {
          const leavedRemoteParticipant = this.remoteParticipants$.value.find(
            (remoteParticipant) => remoteParticipant.id === remoteId,
          )

          if (leavedRemoteParticipant) {
            leavedRemoteParticipant.clear()
            this.remoteParticipants$.next(
              this.remoteParticipants$.value.filter(
                (remoteParticipant) => remoteParticipant.id !== remoteId,
              ),
            )
          }
        }),
      ),
    )
  }

  initializeLocalParticipant$() {
    return this.localParticipant$.pipe(
      filter(
        (localParticipant): localParticipant is LocalParticipant =>
          !!localParticipant,
      ),
      switchMap((localParticipant) =>
        localParticipant
          .upsertUserMediaStream$([{ video: true, audio: true }])
          .pipe(
            switchMap(() =>
              forkJoin([
                localParticipant.setVideoEnabled$(false),
                localParticipant.setAudioEnabled$(false),
              ]),
            ),
            catchError(() => EMPTY),
          ),
      ),
    )
  }
}

export default new WebRTCService()
