import {
  Subscription,
  BehaviorSubject,
  Subject,
  of,
  from,
  fromEvent,
  EMPTY,
} from 'rxjs'
import {
  tap,
  map,
  switchMap,
  mergeMap,
  take,
  takeUntil,
  filter,
  catchError,
} from 'rxjs/operators'

import type { Socket } from 'socket.io-client'

interface TrackNotifier {
  mediaStream: MediaStream
  track: MediaStreamTrack
}

interface TEnabledNitifier {
  audio: boolean
  video: boolean
}

class LocalParticipant {
  id: string

  private socket: Socket

  userMediaStream$: BehaviorSubject<MediaStream | null>

  displayMediaStream$: BehaviorSubject<MediaStream | null>

  addTrackNotifier$: Subject<TrackNotifier>

  removeTrackNotifier$: Subject<TrackNotifier>

  trackEnabledNotifier$: Subject<TEnabledNitifier>

  subscription: Subscription

  constructor(id: string, socket: Socket) {
    this.id = id
    this.socket = socket
    this.userMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.displayMediaStream$ = new BehaviorSubject<MediaStream | null>(null)
    this.addTrackNotifier$ = new Subject<TrackNotifier>()
    this.removeTrackNotifier$ = new Subject<TrackNotifier>()
    this.trackEnabledNotifier$ = new Subject<TEnabledNitifier>()
    this.subscription = new Subscription()

    this.subscription.add(this.handleTrackEnded$().subscribe())
  }

  private handleTrackEnded$() {
    return this.addTrackNotifier$.pipe(
      mergeMap(({ mediaStream, track }) =>
        fromEvent(track, 'ended').pipe(
          take(1),
          tap(() => {
            track.stop()
            mediaStream.removeTrack(track)
            this.removeTrackNotifier$.next({ mediaStream, track })

            if (mediaStream.getTracks().length === 0) {
              this.deleteMediaStream(mediaStream)
            }
          }),
          takeUntil(
            this.removeTrackNotifier$.pipe(
              filter(({ track: _track }) => _track === track),
            ),
          ),
        ),
      ),
    )
  }

  private ensureSingleKindTrack(
    mediaStream: MediaStream,
    track: MediaStreamTrack,
  ) {
    const matchedTrack = mediaStream
      .getTracks()
      .find((t) => t.kind === track.kind)

    if (matchedTrack) {
      matchedTrack.stop()
      mediaStream.removeTrack(matchedTrack)
      this.removeTrackNotifier$.next({ mediaStream, track })
    }
    mediaStream.addTrack(track)
    this.addTrackNotifier$.next({ mediaStream, track })
  }

  upsertUserMediaStream$(constraints: MediaStreamConstraints) {
    return from(navigator.mediaDevices.getUserMedia(constraints)).pipe(
      switchMap((mediaStream) => {
        const currentMediaStream = this.userMediaStream$.value
        if (!currentMediaStream) {
          this.userMediaStream$.next(mediaStream)
          mediaStream.getTracks().forEach((track) => {
            this.addTrackNotifier$.next({ mediaStream, track })
          })
          return of(mediaStream)
        }
        mediaStream.getTracks().forEach((track) => {
          this.ensureSingleKindTrack(currentMediaStream, track)
        })
        return of(currentMediaStream)
      }),
      catchError(() => EMPTY),
    )
  }

  upsertDisplayMediaStream$(constraints: MediaStreamConstraints) {
    return from(navigator.mediaDevices.getDisplayMedia(constraints)).pipe(
      switchMap((mediaStream) => {
        const currentMediaStream = this.displayMediaStream$.value
        if (!currentMediaStream) {
          this.displayMediaStream$.next(mediaStream)
          mediaStream.getTracks().forEach((track) => {
            this.addTrackNotifier$.next({ mediaStream, track })
          })
          return of(mediaStream)
        }
        mediaStream.getTracks().forEach((track) => {
          this.ensureSingleKindTrack(currentMediaStream, track)
        })
        return of(currentMediaStream)
      }),
      catchError(() => EMPTY),
    )
  }

  deleteMediaStream(mediaStream: MediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop()
      mediaStream.removeTrack(track)
      this.removeTrackNotifier$.next({ mediaStream, track })
    })

    if (this.userMediaStream$.value === mediaStream) {
      this.userMediaStream$.next(null)
    }
    if (this.displayMediaStream$.value === mediaStream) {
      this.displayMediaStream$.next(null)
    }
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
        return this.upsertUserMediaStream$(constraints)
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
        return this.upsertUserMediaStream$(constraints)
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
        this.removeTrackNotifier$.next({ mediaStream: userMediaStream, track })
      })
    }

    if (displayMediaStream) {
      displayMediaStream.getTracks().forEach((track) => {
        track.stop()
        displayMediaStream.removeTrack(track)
        this.removeTrackNotifier$.next({
          mediaStream: displayMediaStream,
          track,
        })
      })
    }
    this.userMediaStream$.next(null)
    this.displayMediaStream$.next(null)
    this.trackEnabledNotifier$.next({ video: false, audio: false })

    this.userMediaStream$.complete()
    this.displayMediaStream$.complete()
    this.addTrackNotifier$.complete()
    this.removeTrackNotifier$.complete()
    this.trackEnabledNotifier$.complete()
    this.subscription.unsubscribe()
  }
}

export default LocalParticipant
