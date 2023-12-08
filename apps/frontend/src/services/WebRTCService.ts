import {
  BehaviorSubject,
  NEVER,
  EMPTY,
  merge,
  concat,
  fromEvent,
  of,
  forkJoin,
} from 'rxjs'
import {
  tap,
  map,
  switchMap,
  finalize,
  catchError,
  filter,
  take,
} from 'rxjs/operators'
import { io } from 'socket.io-client'

import { SOCKET } from '@/constants/Socket'
import LocalParticipant from '@/models/LocalParticipant'

import type RemoteParticipant from '@/models/RemoteParticipant'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  remoteParticipants$ = new BehaviorSubject<RemoteParticipant[]>([])

  enter() {
    const subscription = merge(
      of(io('https://localhost:4000')).pipe(
        switchMap((socket) =>
          concat(of({}), NEVER).pipe(
            tap(() => {
              socket.emit(SOCKET.EVENT.JOIN, 'room1')
            }),
            switchMap(() => fromEvent<string>(socket, SOCKET.EVENT.JOIN)),
            switchMap((localId) => this.initializeLocalParticipant$(localId)),
            switchMap((localParticipant) =>
              localParticipant.observeMediaStreamList$().pipe(
                filter((mediaStreamList) => mediaStreamList.length > 0),
                take(1),
              ),
            ),
            finalize(() => {
              socket.emit(SOCKET.EVENT.LEAVE, 'room1')
              socket.disconnect()
              socket.removeAllListeners()
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

  initializeLocalParticipant$(localId: string) {
    return concat(of(new LocalParticipant(localId)), NEVER).pipe(
      tap((localParticipant) => {
        this.localParticipant$.next(localParticipant)
      }),
      switchMap((localParticipant) =>
        forkJoin([
          localParticipant.addUserMediaStream$({ video: true }).pipe(
            switchMap((mediaStream) =>
              localParticipant.addUserMediaStreamTrack$(mediaStream, {
                audio: true,
              }),
            ),
            catchError(() =>
              localParticipant
                .addUserMediaStream$({ audio: true })
                .pipe(catchError(() => EMPTY)),
            ),
          ),
        ]).pipe(map(() => localParticipant)),
      ),
      finalize(() => {
        const localParticipant = this.localParticipant$.value

        if (localParticipant) {
          localParticipant.clear()
          this.localParticipant$.next(null)
        }
      }),
    )
  }

  addLocalDisplayMediaStream() {
    const localParticipant = this.localParticipant$.value

    if (localParticipant) {
      localParticipant.addDisplayMedia$({ video: true }).subscribe()
    }
  }

  observeLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
