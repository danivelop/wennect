import {
  BehaviorSubject,
  of,
  EMPTY,
  NEVER,
  fromEvent,
  merge,
  concat,
  forkJoin,
  from,
} from 'rxjs'
import {
  tap,
  map,
  take,
  filter,
  switchMap,
  mergeMap,
  catchError,
  finalize,
  takeUntil,
} from 'rxjs/operators'

import SocketService from '@/services/SocketService'

import { SOCKET } from '@/constants/Socket'
import LocalParticipant from '@/models/LocalParticipant'
import RemoteParticipant from '@/models/RemoteParticipant'

import type MediaStreamManager from '@/models/MediaStreamManager'
import type { Socket } from 'socket.io-client'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  remoteParticipants$ = new BehaviorSubject<RemoteParticipant[]>([])

  localDisplayMediaStreamManager: MediaStreamManager | null = null

  static requestParticipate$(remoteId: string) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      tap((socket) => {
        socket.emit(SOCKET.EVENT.PARTICIPATE, remoteId)
      }),
    )
  }

  requestWithdraw$(remoteId: string) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      tap((socket) => {
        socket.emit(SOCKET.EVENT.WITHDRAW, remoteId)
      }),
      switchMap(() => this.getRemoteParticipant$(remoteId)),
      tap((remoteParticipant) => {
        remoteParticipant.clear()
      }),
    )
  }

  getRemoteParticipant$(remoteId: string) {
    return of(this.remoteParticipants$.value).pipe(
      map((remoteParticipants) =>
        remoteParticipants.find((rp) => rp.id === remoteId),
      ),
      filter(
        (remoteParticipant): remoteParticipant is RemoteParticipant =>
          !!remoteParticipant,
      ),
    )
  }

  initializeLocalParticipant$(localId: string) {
    console.log('localId', localId)
    return concat(of(new LocalParticipant(localId)), NEVER).pipe(
      tap((localParticipant) => {
        this.localParticipant$.next(localParticipant)
      }),
      switchMap((localParticipant) =>
        forkJoin([
          concat(
            localParticipant
              .setVideoEnabled$(true)
              .pipe(catchError(() => EMPTY)),
            localParticipant
              .setAudioEnabled$(false)
              .pipe(catchError(() => EMPTY)),
          ),
        ]),
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

  initializeRemoteParticipants$() {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        merge(
          merge(
            fromEvent<[string, RTCSessionDescriptionInit]>(
              socket,
              SOCKET.EVENT.OFFER,
            ).pipe(
              mergeMap(([remoteId, remoteSessionDescription]) => {
                const remoteParticipant = new RemoteParticipant(remoteId)
                return concat(
                  of(remoteParticipant),
                  remoteParticipant.createAnswer$(remoteSessionDescription),
                )
              }),
            ),
            fromEvent<string>(socket, SOCKET.EVENT.PARTICIPATE).pipe(
              mergeMap((remoteId) => {
                const remoteParticipant = new RemoteParticipant(remoteId)
                return concat(
                  of(remoteParticipant),
                  remoteParticipant.createOffer$(),
                )
              }),
            ),
          ).pipe(
            mergeMap((remoteParticipant) =>
              merge(
                fromEvent(
                  remoteParticipant.peerConnection,
                  'connectionstatechange',
                ).pipe(
                  mergeMap(() => {
                    console.log(
                      'connectionState',
                      remoteParticipant.peerConnection.connectionState,
                    )
                    switch (remoteParticipant.peerConnection.connectionState) {
                      case 'connected':
                        return merge(
                          of(this.remoteParticipants$.value).pipe(
                            tap((remoteParticipants) => {
                              this.remoteParticipants$.next([
                                ...remoteParticipants,
                                remoteParticipant,
                              ])
                            }),
                          ),
                        )

                      case 'disconnected':
                        return EMPTY
                      case 'failed':
                        return this.requestWithdraw$(remoteParticipant.id)
                      case 'closed':
                        return of(this.remoteParticipants$.value).pipe(
                          tap((remoteParticipants) => {
                            this.remoteParticipants$.next(
                              remoteParticipants.filter(
                                (rp) => rp !== remoteParticipant,
                              ),
                            )
                          }),
                        )
                      default:
                        return EMPTY
                    }
                  }),
                  takeUntil(
                    fromEvent(
                      remoteParticipant.peerConnection,
                      'connectionstatechange',
                    ).pipe(
                      filter(
                        () =>
                          remoteParticipant.peerConnection.connectionState ===
                          'closed',
                      ),
                    ),
                  ),
                ),
                this.localParticipant$.pipe(
                  filter(
                    (localParticipant): localParticipant is LocalParticipant =>
                      !!localParticipant,
                  ),
                  switchMap((localParticipant) =>
                    localParticipant.observeMediaStreamManagerList$(),
                  ),
                  switchMap((mediaStreamManagerList) =>
                    from(mediaStreamManagerList),
                  ),
                  tap((mediaStreamManager) => {
                    console.log('track add')
                    mediaStreamManager.mediaStream
                      .getTracks()
                      .forEach((track) => {
                        console.log('track', track)
                        remoteParticipant.peerConnection.addTrack(
                          track,
                          mediaStreamManager.mediaStream,
                        )
                      })
                  }),
                ),
              ),
            ),
          ),
          fromEvent<string>(socket, SOCKET.EVENT.WITHDRAW).pipe(
            mergeMap((remoteId) => this.getRemoteParticipant$(remoteId)),
            tap(() => console.log('withdraw')),
            tap((remoteParticipant) => {
              remoteParticipant.clear()
            }),
          ),
        ),
      ),
    )
  }

  enter() {
    SocketService.connect()
    this.remoteParticipants$.subscribe((remoteParticipants) => {
      console.log(
        'remoteStreams',
        remoteParticipants.map(
          (remoteParticipant) => remoteParticipant.mediaStreamList$.value,
        ),
      )
    })
    const subscription = merge(
      concat(of(SocketService.socket), NEVER).pipe(
        filter((socket): socket is Socket => !!socket),
        tap((socket) => {
          socket.emit(SOCKET.EVENT.JOIN, 'room1')
        }),
        switchMap((socket) =>
          fromEvent<[string, string[]]>(socket, SOCKET.EVENT.JOIN),
        ),
        switchMap(([localId, remoteIds]) =>
          merge(
            this.initializeLocalParticipant$(localId),
            this.initializeRemoteParticipants$(),
            from(remoteIds).pipe(
              mergeMap((remoteId) =>
                WebRTCService.requestParticipate$(remoteId),
              ),
            ),
          ),
        ),
        finalize(() => {
          if (SocketService.socket) {
            SocketService.socket.emit(SOCKET.EVENT.LEAVE, 'room1')
            this.remoteParticipants$.value.forEach((remoteParticipant) => {
              if (SocketService.socket) {
                SocketService.socket.emit(
                  SOCKET.EVENT.WITHDRAW,
                  remoteParticipant.id,
                )
              }
            })
          }
          SocketService.clear()

          this.removeLocalDisplayMediaStreamManager()

          this.remoteParticipants$.next([])
        }),
      ),
      fromEvent(window, 'beforeunload').pipe(
        tap(() => {
          subscription.unsubscribe()
        }),
      ),
    ).subscribe()

    return subscription
  }

  addLocalDisplayMediaStreamManager() {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.addDisplayMediaStreamManager$({ video: true }),
        ),
        tap((localDisplayMediaStreamManager) => {
          this.localDisplayMediaStreamManager = localDisplayMediaStreamManager
        }),
        switchMap((localDisplayMediaStreamManager) =>
          merge(
            of(localDisplayMediaStreamManager),
            of(
              localDisplayMediaStreamManager.mediaStream.getVideoTracks()[0],
            ).pipe(
              filter(
                (videoTrack): videoTrack is MediaStreamTrack => !!videoTrack,
              ),
              switchMap((videoTrack) =>
                fromEvent(videoTrack, 'ended').pipe(
                  take(1),
                  tap(() => {
                    this.removeLocalDisplayMediaStreamManager()
                  }),
                ),
              ),
              switchMap(() => EMPTY),
            ),
          ),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  removeLocalDisplayMediaStreamManager() {
    of(this.localDisplayMediaStreamManager)
      .pipe(
        filter(
          (
            localDisplayMediaStreamManager,
          ): localDisplayMediaStreamManager is MediaStreamManager =>
            !!localDisplayMediaStreamManager,
        ),
        switchMap((localDisplayMediaStreamManager) =>
          this.getLocalParticipant$().pipe(
            switchMap((localParticipant) =>
              localParticipant.removeMediaStreamManager$(
                localDisplayMediaStreamManager,
              ),
            ),
          ),
        ),
        tap(() => {
          this.localDisplayMediaStreamManager = null
        }),
      )
      .subscribe()
  }

  setLocalVideoEnabled(enabled: boolean) {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.setVideoEnabled$(enabled),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  setLocalAudioEnabled(enabled: boolean) {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.setAudioEnabled$(enabled),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  private getLocalParticipant$() {
    return this.localParticipant$.pipe(
      take(1),
      filter(
        (localParticipant): localParticipant is LocalParticipant =>
          !!localParticipant,
      ),
    )
  }

  observeLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
