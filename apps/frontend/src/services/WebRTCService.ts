import {
  BehaviorSubject,
  of,
  EMPTY,
  fromEvent,
  merge,
  concat,
  forkJoin,
  from,
} from 'rxjs'
import {
  tap,
  take,
  filter,
  switchMap,
  mergeMap,
  catchError,
} from 'rxjs/operators'

import SocketService from '@/services/SocketService'

import { SOCKET } from '@/constants/Socket'
import LocalParticipant from '@/models/LocalParticipant'
import RemoteParticipant from '@/models/RemoteParticipant'

import type MediaStreamManager from '@/models/MediaStreamManager'
import type { Subscription } from 'rxjs'
import type { Socket } from 'socket.io-client'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  remoteParticipants$ = new BehaviorSubject<RemoteParticipant[]>([])

  localDisplayMediaStreamManager: MediaStreamManager | null = null

  enterSubscription: Subscription | null = null

  initializeLocalParticipant$(localId: string) {
    return of(new LocalParticipant(localId)).pipe(
      tap((localParticipant) => {
        this.localParticipant$.next(localParticipant)
      }),
      switchMap((localParticipant) =>
        forkJoin([
          concat(
            localParticipant
              .setVideoEnabled$(false)
              .pipe(catchError(() => EMPTY)),
            localParticipant
              .setAudioEnabled$(false)
              .pipe(catchError(() => EMPTY)),
          ),
        ]),
      ),
      switchMap(() => EMPTY),
      catchError(() => EMPTY),
    )
  }

  initializeRemoteParticipants$(remoteIds: string[]) {
    return of(SocketService.socket).pipe(
      filter((socket): socket is Socket => !!socket),
      switchMap((socket) =>
        merge(
          fromEvent<[string, RTCSessionDescriptionInit]>(
            socket,
            SOCKET.EVENT.OFFER,
          ).pipe(
            mergeMap(([remoteId, remoteSessionDescription]) =>
              of(new RemoteParticipant(remoteId)).pipe(
                tap((remoteParticipant) => {
                  this.remoteParticipants$.next([
                    ...this.remoteParticipants$.value,
                    remoteParticipant,
                  ])
                }),
                switchMap((remoteParticipant) =>
                  remoteParticipant.createAnswer$(remoteSessionDescription),
                ),
              ),
            ),
          ),
          fromEvent<string>(socket, SOCKET.EVENT.PARTICIPATE).pipe(
            mergeMap((remoteId) =>
              of(new RemoteParticipant(remoteId)).pipe(
                tap((remoteParticipant) => {
                  this.remoteParticipants$.next([
                    ...this.remoteParticipants$.value,
                    remoteParticipant,
                  ])
                }),
                switchMap((remoteParticipant) =>
                  remoteParticipant.createOffer$(),
                ),
              ),
            ),
          ),
          from(remoteIds).pipe(
            tap((remoteId) => {
              socket.emit(SOCKET.EVENT.PARTICIPATE, remoteId)
            }),
          ),
        ),
      ),
    )
  }

  enter() {
    SocketService.connect()
    this.enterSubscription = of(SocketService.socket)
      .pipe(
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
            this.initializeRemoteParticipants$(remoteIds),
          ),
        ),
      )
      .subscribe()
  }

  exit() {
    this.removeLocalDisplayMediaStreamManager()
    this.getLocalParticipant$()
      .pipe(
        tap((localParticipant) => {
          localParticipant.clear()
          this.localParticipant$.next(null)
        }),
      )
      .subscribe()

    if (this.enterSubscription) {
      this.enterSubscription.unsubscribe()
      this.enterSubscription = null
    }

    if (SocketService.socket) {
      SocketService.socket.emit(SOCKET.EVENT.LEAVE, 'room1')
    }
    SocketService.clear()
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
