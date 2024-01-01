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

/**
 * @description
 * remote participant와의 연결과정은 아래와 같은 두가지 개념으로 나눠진다.
 * 1. room 접속
 *    - 유저가 room에 접속한 경우 소켓연결, localParticipant를 생성 및 initialize한다.
 *    - 만약, 기존에 참여하고 있던 참여자가 있다면 remoteParticipant를 생성한다.
 *    - room에 접속했다고 해서 참여자와 peer connection이 연결되지는 않는다. peer connection은 별도로 명시적으로 수행해야 한다.
 * 2. peer connection 연결
 *    - requestConnect함수에 remoteId를 넘김으로써 해당 participant와 peer connection이 수행된다.
 *    - peer connection을 해제하고 싶은 경우 명시적으로 requestDisconnect함수를 호출해야 한다.
 *    - peer connection 연결과정에서는 remoteParticipant 객체 자체에는 영향을 주지 않으며 오직 peerConnection과 mediaStream만을 handling한다.
 *
 * remoteParticipant는 아래 두가지 경우에 제거가 된다.
 * 1. 유저가 room을 나갔을 경우 / window beforeunload
 *    - 소켓을 통해 leave를 emit하며 모든 remoteParticipant를 제거한다.
 *    - 이 경우 enter함수를 통해 생성된 subscription을 unsubscribe 함으로써 수행하고 있다.
 * 2. remote participant가 나갔을 경우
 *    - 이 경우는 상대방 측에서 1번 과정이 실행되었음을 의미한다.
 *    - 소켓을 통해 leave이벤트가 트리거되며 이때 인자로 받은 remoteId에 해당하는 remoteParticipant를 제거한다.
 */

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

  private getRemoteParticipant$(remoteId: string) {
    return from(this.remoteParticipants$.value).pipe(
      filter((remoteParticipant) => remoteParticipant.id === remoteId),
    )
  }

  requestConnect$(remoteId: string) {
    return this.getRemoteParticipant$(remoteId).pipe(
      switchMap((remoteParticipant) => remoteParticipant.requestConnect$()),
    )
  }

  requestDisconnect$(remoteId: string) {
    return this.getRemoteParticipant$(remoteId).pipe(
      switchMap((remoteParticipant) => remoteParticipant.requestDisconnect$()),
    )
  }
}

export default new WebRTCService()
