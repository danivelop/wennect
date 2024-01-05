import {
  Subscription,
  BehaviorSubject,
  Subject,
  of,
  merge,
  fromEvent,
  from,
  throwError,
  EMPTY,
} from 'rxjs'
import {
  tap,
  map,
  switchMap,
  filter,
  mergeMap,
  take,
  finalize,
  catchError,
  takeUntil,
} from 'rxjs/operators'

import { SOCKET } from '@/constants/Socket'

import type LocalParticipant from '@/models/LocalParticipant'
import type { Socket } from 'socket.io-client'

/**
 * @todo
 * - userMediaStream 혹은 displayMediaStream 구분로직
 * - remote peer에서 track remove시에도 처리 필요
 * - connection state이벤트를 통해 연결성 강화
 * - 적절한 에러처리
 */

class RemoteParticipant {
  id: string

  private socket: Socket

  private localParticipant: LocalParticipant

  userMediaStream$: BehaviorSubject<MediaStream | null>

  displayMediaStream$: BehaviorSubject<MediaStream | null>

  peerConnection: RTCPeerConnection | null

  polite: boolean

  makingOffer: boolean

  ignoreOffer: boolean

  subscription: Subscription

  requestWithdraw$: Subject<void>

  constructor(
    id: string,
    socket: Socket,
    localParticipant: LocalParticipant,
    polite: boolean,
  ) {
    this.id = id
    this.socket = socket
    this.localParticipant = localParticipant
    this.userMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.displayMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.peerConnection = null
    this.polite = polite
    this.makingOffer = false
    this.ignoreOffer = false
    this.subscription = new Subscription()
    this.requestWithdraw$ = new Subject()

    this.subscription.add(this.receivedNegotiation$().subscribe())
  }

  private upsertPeerConnection$() {
    if (this.peerConnection) {
      return of(this.peerConnection)
    }

    return of(new RTCPeerConnection()).pipe(
      tap((peerConnection) => {
        this.peerConnection = peerConnection
      }),
      switchMap((peerConnection) =>
        merge(
          this.handleNegotiate$(),
          this.handleAnswer$(),
          this.handleSyncLocalTrack$(),
          this.handleSyncRemoteTrack$(),
          this.handleSyncIceCandidate$(),
        ).pipe(map(() => peerConnection)),
      ),
      takeUntil(this.requestWithdraw$),
    )
  }

  receivedNegotiation$() {
    return fromEvent<[string, RTCSessionDescriptionInit]>(
      this.socket,
      SOCKET.EVENT.ON.OFFER,
    ).pipe(
      filter(([remoteId]) => remoteId === this.id),
      switchMap(([, description]) =>
        this.upsertPeerConnection$().pipe(
          tap((peerConnection) => {
            const offerCollision =
              description.type === 'offer' &&
              (this.makingOffer || peerConnection.signalingState !== 'stable')

            this.ignoreOffer = !this.polite && offerCollision
          }),
          filter(() => !this.ignoreOffer),
          switchMap((peerConnection) =>
            from(peerConnection.setRemoteDescription(description)).pipe(
              switchMap(() => from(peerConnection.setLocalDescription())),
              tap(() => {
                this.socket.emit(
                  SOCKET.EVENT.EMIT.ANSWER,
                  this.id,
                  peerConnection.localDescription,
                )
              }),
            ),
          ),
        ),
      ),
    )
  }

  requestNegotiation$() {
    return this.upsertPeerConnection$()
  }

  requestWithdraw() {
    this.requestWithdraw$.next()

    if (this.userMediaStream$.value) {
      this.deleteMediaStream(this.userMediaStream$.value)
    }
    if (this.displayMediaStream$.value) {
      this.deleteMediaStream(this.displayMediaStream$.value)
    }
    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach((sender) => {
        this.peerConnection?.removeTrack(sender)
      })
      this.peerConnection.close()
    }
    this.makingOffer = false
    this.ignoreOffer = false
  }

  private handleNegotiate$() {
    return of(this.peerConnection).pipe(
      filter(
        (peerConnection): peerConnection is RTCPeerConnection =>
          !!peerConnection,
      ),
      switchMap((peerConnection) =>
        fromEvent(peerConnection, 'negotiationneeded').pipe(
          tap(() => {
            this.makingOffer = true
          }),
          switchMap(() =>
            from(peerConnection.setLocalDescription()).pipe(
              tap(() => {
                this.socket.emit(
                  SOCKET.EVENT.EMIT.OFFER,
                  this.id,
                  peerConnection.localDescription,
                )
              }),
              finalize(() => {
                this.makingOffer = false
              }),
            ),
          ),
        ),
      ),
    )
  }

  private handleAnswer$() {
    return fromEvent<[string, RTCSessionDescriptionInit]>(
      this.socket,
      SOCKET.EVENT.ON.ANSWER,
    ).pipe(
      filter(([remoteId]) => remoteId === this.id),
      switchMap(([, description]) =>
        of(this.peerConnection).pipe(
          filter(
            (peerConnection): peerConnection is RTCPeerConnection =>
              !!peerConnection,
          ),
          switchMap((peerConnection) =>
            from(peerConnection.setRemoteDescription(description)),
          ),
        ),
      ),
    )
  }

  private handleSyncLocalTrack$() {
    return of(this.peerConnection).pipe(
      filter(
        (peerConnection): peerConnection is RTCPeerConnection =>
          !!peerConnection,
      ),
      tap((peerConnection) => {
        const currentUserMediaStream =
          this.localParticipant.userMediaStream$.value
        const currentDisplayMediaStream =
          this.localParticipant.displayMediaStream$.value

        if (currentUserMediaStream) {
          currentUserMediaStream
            .getTracks()
            .forEach((track) =>
              peerConnection.addTrack(track, currentUserMediaStream),
            )
        }
        if (currentDisplayMediaStream) {
          currentDisplayMediaStream
            .getTracks()
            .forEach((track) =>
              peerConnection.addTrack(track, currentDisplayMediaStream),
            )
        }
      }),
      switchMap((peerConnection) =>
        merge(
          this.localParticipant.addTrackNotifier$.pipe(
            tap(({ track, mediaStream }) => {
              peerConnection.addTrack(track, mediaStream)
            }),
          ),
          this.localParticipant.removeTrackNotifier$.pipe(
            tap(({ track }) => {
              const matchedSender = peerConnection
                .getSenders()
                .find((sender) => sender.track === track)

              if (matchedSender) {
                peerConnection.removeTrack(matchedSender)
              }
            }),
          ),
        ),
      ),
    )
  }

  private handleSyncRemoteTrack$() {
    return of(this.peerConnection).pipe(
      filter(
        (peerConnection): peerConnection is RTCPeerConnection =>
          !!peerConnection,
      ),
      switchMap((peerConnection) =>
        fromEvent<RTCTrackEvent>(peerConnection, 'track').pipe(
          mergeMap(({ track, streams }) =>
            fromEvent(track, 'unmute').pipe(
              take(1),
              tap(() => {
                const currentMediaStream = this.userMediaStream$.value
                const newMediaStream = streams[0]

                if (!newMediaStream) {
                  return
                }

                if (!currentMediaStream) {
                  this.userMediaStream$.next(newMediaStream)
                  return
                }

                if (currentMediaStream.id === newMediaStream.id) {
                  currentMediaStream.addTrack(track)
                } else {
                  this.deleteMediaStream(currentMediaStream)
                  this.userMediaStream$.next(newMediaStream)
                }
              }),
            ),
          ),
        ),
      ),
    )
  }

  private handleSyncIceCandidate$() {
    return of(this.peerConnection).pipe(
      filter(
        (peerConnection): peerConnection is RTCPeerConnection =>
          !!peerConnection,
      ),
      switchMap((peerConnection) =>
        merge(
          fromEvent<RTCPeerConnectionIceEvent>(
            peerConnection,
            'icecandidate',
          ).pipe(
            tap(({ candidate }) => {
              if (candidate) {
                this.socket.emit(
                  SOCKET.EVENT.EMIT.ICECANDIDATE,
                  this.id,
                  candidate,
                )
              }
            }),
          ),
          fromEvent<[string, RTCIceCandidate]>(
            this.socket,
            SOCKET.EVENT.ON.ICECANDIDATE,
          ).pipe(
            filter(([remoteId]) => remoteId === this.id),
            switchMap(([, candidate]) =>
              from(peerConnection.addIceCandidate(candidate)),
            ),
            catchError((error) => {
              if (this.ignoreOffer) {
                return EMPTY
              }
              return throwError(() => error)
            }),
          ),
        ),
      ),
    )
  }

  deleteMediaStream(mediaStream: MediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop()
      mediaStream.removeTrack(track)
    })

    if (this.userMediaStream$.value?.id === mediaStream.id) {
      this.userMediaStream$.next(null)
    }
    if (this.displayMediaStream$.value?.id === mediaStream.id) {
      this.displayMediaStream$.next(null)
    }
  }

  clear() {
    this.requestWithdraw()
    this.subscription.unsubscribe()
  }
}

export default RemoteParticipant
