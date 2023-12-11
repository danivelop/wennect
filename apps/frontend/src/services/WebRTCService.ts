import {
  BehaviorSubject,
  NEVER,
  EMPTY,
  merge,
  concat,
  fromEvent,
  of,
  forkJoin,
  from,
  zip,
} from 'rxjs'
import {
  tap,
  switchMap,
  finalize,
  mergeMap,
  filter,
  take,
} from 'rxjs/operators'
import { io } from 'socket.io-client'

import { SOCKET } from '@/constants/Socket'
import LocalParticipant from '@/models/LocalParticipant'
import RemoteParticipant from '@/models/RemoteParticipant'

import type { Socket } from 'socket.io-client'

/**
 * @todo
 * - track 추가될 때마다 재협상 하기
 * - 위 작업 완료후 initializeLocalParticipant, initializeRemoteParticipant 다시 병렬로 바꾸기
 */

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  remoteParticipants$ = new BehaviorSubject<RemoteParticipant[]>([])

  enter() {
    const subscription = merge(
      of(io('https://localhost:4000')).pipe(
        switchMap((socket) =>
          merge(
            concat(of({}), NEVER).pipe(
              switchMap(() =>
                this.initializeLocalParticipant$(socket).pipe(
                  switchMap(() => this.initializeRemoteParticipant$(socket)),
                ),
              ),
              finalize(() => {
                socket.disconnect()
                socket.removeAllListeners()
              }),
            ),
            fromEvent<string>(socket, SOCKET.EVENT.LEAVE).pipe(
              tap((remoteId) => {
                const leavedRemoteParticipant =
                  this.remoteParticipants$.value.find(
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

  initializeLocalParticipant$(socket: Socket) {
    return concat(of({}), NEVER).pipe(
      tap(() => {
        socket.emit(SOCKET.EVENT.JOIN, 'room1')
      }),
      switchMap(() => fromEvent<string>(socket, SOCKET.EVENT.JOIN)),
      switchMap((localId) => of(new LocalParticipant(localId))),
      tap((localParticipant) => {
        this.localParticipant$.next(localParticipant)
      }),
      switchMap((localParticipant) =>
        forkJoin([
          concat(
            localParticipant.setVideoEnabled$(true),
            localParticipant.setAudioEnabled$(true),
          ),
        ]),
      ),
      finalize(() => {
        socket.emit(SOCKET.EVENT.LEAVE, 'room1')
        const localParticipant = this.localParticipant$.value

        if (localParticipant) {
          localParticipant.clear()
          this.localParticipant$.next(null)
        }
      }),
    )
  }

  initializeRemoteParticipant$(socket: Socket) {
    return merge(
      of({}).pipe(
        tap(() => {
          socket.emit('participants')
        }),
        switchMap(() => fromEvent<string[]>(socket, 'participants')),
        switchMap((remoteIds) => from(remoteIds)),
        mergeMap((remoteId) => of(new RemoteParticipant(remoteId, socket))),
        switchMap((remoteParticipant) =>
          merge(
            this.handlePeerConnectionStateChange$(remoteParticipant),
            zip(
              of(remoteParticipant),
              this.localParticipant$.pipe(
                filter(
                  (localParticipant): localParticipant is LocalParticipant =>
                    !!localParticipant,
                ),
                take(1),
              ),
            ),
          ),
        ),
        switchMap(([remoteParticipant, localParticipant]) =>
          of(localParticipant.trackRecordList$.value).pipe(
            tap((trackRecordList) => {
              trackRecordList.forEach(({ mediaStream, track }) => {
                remoteParticipant.peerConnection.addTrack(track, mediaStream)
              })
            }),
            switchMap(() => remoteParticipant.negotiate$()),
          ),
        ),
      ),
      fromEvent<[string, RTCSessionDescriptionInit]>(
        socket,
        SOCKET.EVENT.OFFER,
      ).pipe(
        mergeMap(([remoteId, remoteSessionDescription]) =>
          zip(
            of(new RemoteParticipant(remoteId, socket)),
            of(remoteSessionDescription),
            this.localParticipant$.pipe(
              filter(
                (localParticipant): localParticipant is LocalParticipant =>
                  !!localParticipant,
              ),
              take(1),
            ),
          ),
        ),
        switchMap(
          ([remoteParticipant, remoteSessionDescription, localParticipant]) =>
            merge(
              this.handlePeerConnectionStateChange$(remoteParticipant),
              of(localParticipant.trackRecordList$.value).pipe(
                tap((trackRecordList) => {
                  trackRecordList.forEach(({ mediaStream, track }) => {
                    remoteParticipant.peerConnection.addTrack(
                      track,
                      mediaStream,
                    )
                  })
                }),
                switchMap(() =>
                  remoteParticipant.createAnswer$(remoteSessionDescription),
                ),
              ),
            ),
        ),
      ),
    )
  }

  handlePeerConnectionStateChange$(remoteParticipant: RemoteParticipant) {
    return fromEvent(
      remoteParticipant.peerConnection,
      'connectionstatechange',
    ).pipe(
      tap(() => {
        switch (remoteParticipant.peerConnection.connectionState) {
          case 'connected':
            this.remoteParticipants$.next([
              ...this.remoteParticipants$.value,
              remoteParticipant,
            ])
            break
          case 'disconnected':
            break
          case 'failed':
            break
          case 'closed':
            break
          default:
            break
        }
      }),
      switchMap(() => EMPTY),
    )
  }

  observeLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }

  observeRemoteParticipants$() {
    return this.remoteParticipants$.asObservable()
  }
}

export default new WebRTCService()
