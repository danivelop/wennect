import { BehaviorSubject, Subject, of, from, fromEvent, EMPTY } from 'rxjs'
import {
  tap,
  map,
  concatMap,
  switchMap,
  toArray,
  take,
  skip,
  takeUntil,
  filter,
} from 'rxjs/operators'

interface TrackNotifier {
  mediaStream: MediaStream
  track: MediaStreamTrack
}

interface TEnabledNitifier {
  audio: boolean
  video: boolean
}

class LocalParticipant {
  /** @description userMediaStream이 생성되었을 때, 제거되었을 때 방출 */
  userMediaStream$: BehaviorSubject<MediaStream | null>

  /** @description displayMediaStream이 생성되었을 때, 제거되었을 때 방출 */
  displayMediaStream$: BehaviorSubject<MediaStream | null>

  /** @description userMediaStream 생성, track 추가, track 제거될 때 모든 track이 업데이트 된 후 방출 */
  updateTrackOnMediaStreamNotifier$: Subject<MediaStream>

  /** @description userMediaStream에 teack이 추가되었을 때 방출 */
  addTrackNotifier$: Subject<TrackNotifier>

  /** @description userMediaStream에 teack이 제거되었을 때 방출 */
  removeTrackNotifier$: Subject<TrackNotifier>

  /** @description userMediaStream의 track중 enabled값이 변경되었을 때 방출 */
  trackEnabledNotifier$: Subject<TEnabledNitifier>

  constructor() {
    this.userMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.displayMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.updateTrackOnMediaStreamNotifier$ = new Subject<MediaStream>()
    this.addTrackNotifier$ = new Subject<TrackNotifier>()
    this.removeTrackNotifier$ = new Subject<TrackNotifier>()
    this.trackEnabledNotifier$ = new Subject<TEnabledNitifier>()
  }

  ensureSingleKindTrack$(mediaStream: MediaStream, track: MediaStreamTrack) {
    return of(mediaStream).pipe(
      tap((_mediaStream) => {
        const matchedTrack = _mediaStream
          .getTracks()
          .find((t) => t.kind === track.kind)

        if (matchedTrack) {
          matchedTrack.stop()
          _mediaStream.removeTrack(matchedTrack)
          this.removeTrackNotifier$.next({ mediaStream: _mediaStream, track })
        }
      }),
      tap((_mediaStream) => {
        _mediaStream.addTrack(track)
        this.addTrackNotifier$.next({ mediaStream: _mediaStream, track })
      }),
      map(() => track),
    )
  }

  upsertUserMediaStream$(constraintsList: MediaStreamConstraints[]) {
    return of(this.userMediaStream$.value ?? new MediaStream()).pipe(
      switchMap((mediaStream) =>
        from(constraintsList).pipe(
          concatMap((constraints) =>
            from(navigator.mediaDevices.getUserMedia(constraints)),
          ),
          concatMap((_mediaStream) =>
            from(_mediaStream.getTracks()).pipe(
              concatMap((track) =>
                this.ensureSingleKindTrack$(mediaStream, track),
              ),
            ),
          ),
          toArray(),
          map(() => mediaStream),
        ),
      ),
      tap((mediaStream) => {
        if (!this.userMediaStream$.value) {
          this.userMediaStream$.next(mediaStream)
        }
        this.updateTrackOnMediaStreamNotifier$.next(mediaStream)
      }),
    )
  }

  createDisplayMediaStream$() {
    if (this.displayMediaStream$.value) {
      return EMPTY
    }

    return from(navigator.mediaDevices.getDisplayMedia({ video: true })).pipe(
      tap((displayMediaStream) => {
        this.displayMediaStream$.next(displayMediaStream)
      }),
      switchMap((displayMediaStream) => from(displayMediaStream.getTracks())),
      switchMap((track) => fromEvent(track, 'ended').pipe(take(1))),
      switchMap(() => this.deleteDisplayMediaStream$()),
      takeUntil(
        this.displayMediaStream$.pipe(
          skip(1),
          filter((displayMediaStream) => displayMediaStream === null),
        ),
      ),
    )
  }

  deleteDisplayMediaStream$() {
    return of(this.displayMediaStream$.value).pipe(
      tap((displayMediaStream) => {
        if (!displayMediaStream) {
          return
        }
        displayMediaStream.getTracks().forEach((track) => {
          track.stop()
          displayMediaStream.removeTrack(track)
        })
        this.displayMediaStream$.next(null)
      }),
    )
  }

  private isVideoEnabled() {
    const userMediaStream = this.userMediaStream$.value

    if (!userMediaStream || userMediaStream.getVideoTracks().length <= 0) {
      return false
    }
    return userMediaStream
      .getVideoTracks()
      .some((videoTrack) => videoTrack.enabled)
  }

  private isAudioEnabled() {
    const userMediaStream = this.userMediaStream$.value

    if (!userMediaStream || userMediaStream.getAudioTracks().length <= 0) {
      return false
    }
    return userMediaStream
      .getAudioTracks()
      .some((audioTrack) => audioTrack.enabled)
  }

  setVideoEnabled$(
    enabled: boolean,
    constraints: MediaStreamConstraints = { video: true },
  ) {
    return of(this.userMediaStream$.value).pipe(
      switchMap((mediaStream) => {
        if (mediaStream && mediaStream.getVideoTracks().length > 0) {
          return of(mediaStream)
        }
        return this.upsertUserMediaStream$([constraints])
      }),
      map((mediaStream) => mediaStream.getVideoTracks()),
      tap((tracks) => {
        tracks.forEach((track) => {
          track.enabled = enabled
        })
        this.trackEnabledNotifier$.next({
          video: this.isVideoEnabled(),
          audio: this.isAudioEnabled(),
        })
      }),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    constraints: MediaStreamConstraints = { audio: true },
  ) {
    return of(this.userMediaStream$.value).pipe(
      switchMap((mediaStream) => {
        if (mediaStream && mediaStream.getAudioTracks().length > 0) {
          return of(mediaStream)
        }
        return this.upsertUserMediaStream$([constraints])
      }),
      map((mediaStream) => mediaStream.getAudioTracks()),
      tap((tracks) => {
        tracks.forEach((track) => {
          track.enabled = enabled
        })
        this.trackEnabledNotifier$.next({
          video: this.isVideoEnabled(),
          audio: this.isAudioEnabled(),
        })
      }),
    )
  }

  clear() {
    const userMediaStream = this.userMediaStream$.value
    const displayMediaStream = this.displayMediaStream$.value

    if (userMediaStream) {
      userMediaStream.getTracks().forEach((track) => {
        track.stop()
        userMediaStream.removeTrack(track)
      })
    }

    if (displayMediaStream) {
      displayMediaStream.getTracks().forEach((track) => {
        track.stop()
        displayMediaStream.removeTrack(track)
      })
    }
    this.userMediaStream$.next(null)
    this.displayMediaStream$.next(null)
    this.trackEnabledNotifier$.next({ video: false, audio: false })

    this.userMediaStream$.complete()
    this.displayMediaStream$.complete()
    this.updateTrackOnMediaStreamNotifier$.complete()
    this.addTrackNotifier$.complete()
    this.removeTrackNotifier$.complete()
    this.trackEnabledNotifier$.complete()
  }
}

export default LocalParticipant
