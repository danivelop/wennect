import { BehaviorSubject, Subject, from, of, merge, fromEvent, iif } from 'rxjs'
import {
  map,
  tap,
  switchMap,
  mergeMap,
  filter,
  takeUntil,
  take,
  finalize,
} from 'rxjs/operators'

export const MEDIA_STREAM_KIND = {
  DISPLAY: 'display',
  USER: 'user',
} as const

type MediaStreamKindType =
  (typeof MEDIA_STREAM_KIND)[keyof typeof MEDIA_STREAM_KIND]

interface TMediaStreamRecord {
  kind: MediaStreamKindType
  mediaStream: MediaStream
}

interface TTrackNotifier {
  mediaStream: MediaStream
  track: MediaStreamTrack
}

class LocalParticipant {
  private id: string

  private mediaStreamRecordList$: BehaviorSubject<TMediaStreamRecord[]>

  private trackList$: BehaviorSubject<MediaStreamTrack[]>

  private addMediaStreamNotifier$: Subject<TMediaStreamRecord>

  private removeMediaStreamNotifier$: Subject<MediaStream>

  private addTrackNotifier$: Subject<TTrackNotifier>

  private removeTrackNotifier$: Subject<TTrackNotifier>

  private enableTrackNotifier$: Subject<MediaStream>

  constructor(id: string) {
    this.id = id
    this.mediaStreamRecordList$ = new BehaviorSubject<TMediaStreamRecord[]>([])
    this.trackList$ = new BehaviorSubject<MediaStreamTrack[]>([])
    this.addMediaStreamNotifier$ = new Subject<TMediaStreamRecord>()
    this.removeMediaStreamNotifier$ = new Subject<MediaStream>()
    this.addTrackNotifier$ = new Subject<TTrackNotifier>()
    this.removeTrackNotifier$ = new Subject<TTrackNotifier>()
    this.enableTrackNotifier$ = new Subject<MediaStream>()

    this.handleNotifier$().subscribe()
  }

  private handleNotifier$() {
    return merge(
      this.addMediaStreamNotifier$.pipe(
        tap((mediaStreamRecord) => {
          this.mediaStreamRecordList$.next([
            ...this.mediaStreamRecordList$.value,
            mediaStreamRecord,
          ])
        }),
        switchMap(({ mediaStream }) =>
          from(mediaStream.getTracks()).pipe(
            map((track) => ({ mediaStream, track })),
          ),
        ),
        tap(({ mediaStream, track }) => {
          this.addTrackNotifier$.next({ mediaStream, track })
        }),
      ),
      this.addTrackNotifier$.pipe(
        tap(({ mediaStream, track }) => {
          this.trackList$.next([...this.trackList$.value, track])
          this.enableTrackNotifier$.next(mediaStream)
        }),
        mergeMap(({ mediaStream, track }) =>
          fromEvent(track, 'ended').pipe(
            take(1),
            tap(() => {
              this.removeTrackNotifier$.next({ mediaStream, track })
            }),
            finalize(() => {
              if (mediaStream.getTracks().length === 0) {
                this.removeMediaStreamNotifier$.next(mediaStream)
              }
            }),
            takeUntil(
              this.removeTrackNotifier$.pipe(
                filter(({ track: t }) => t.id === track.id),
              ),
            ),
          ),
        ),
      ),
      this.removeMediaStreamNotifier$.pipe(
        tap((mediaStream) => {
          this.mediaStreamRecordList$.next(
            this.mediaStreamRecordList$.value.filter(
              ({ mediaStream: ms }) => ms.id !== mediaStream.id,
            ),
          )
          mediaStream.getTracks().forEach((track) => {
            track.stop()
            this.removeTrackNotifier$.next({ mediaStream, track })
          })
        }),
      ),
      this.removeTrackNotifier$.pipe(
        tap(({ mediaStream, track }) => {
          mediaStream.removeTrack(track)
          this.trackList$.next(
            this.trackList$.value.filter((t) => t.id !== track.id),
          )
        }),
      ),
    )
  }

  addUserMediaStream$(constraints: MediaStreamConstraints) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      tap((mediaStream) => {
        this.addMediaStreamNotifier$.next({
          mediaStream,
          kind: MEDIA_STREAM_KIND.USER,
        })
      }),
    )
  }

  addDisplayMedia$(constraints: MediaStreamConstraints) {
    return from(
      window.navigator.mediaDevices.getDisplayMedia(constraints),
    ).pipe(
      tap((mediaStream) => {
        this.addMediaStreamNotifier$.next({
          mediaStream,
          kind: MEDIA_STREAM_KIND.DISPLAY,
        })
      }),
    )
  }

  removeMediaStream$(mediaStream: MediaStream) {
    return of(mediaStream).pipe(
      tap((ms) => {
        this.removeMediaStreamNotifier$.next(ms)
      }),
    )
  }

  observeMediaStreamList$(kind?: MediaStreamKindType) {
    return this.mediaStreamRecordList$.pipe(
      map((mediaStreamRecordList) => {
        if (!kind) {
          return mediaStreamRecordList
        }
        if (kind === MEDIA_STREAM_KIND.USER) {
          return mediaStreamRecordList.filter(
            ({ kind: k }) => k === MEDIA_STREAM_KIND.USER,
          )
        }
        if (kind === MEDIA_STREAM_KIND.DISPLAY) {
          return mediaStreamRecordList.filter(
            ({ kind: k }) => k === MEDIA_STREAM_KIND.DISPLAY,
          )
        }
        return []
      }),
      map((mediaStreamRecordList) =>
        mediaStreamRecordList.map(({ mediaStream }) => mediaStream),
      ),
    )
  }

  static isVideoEnabled(mediaStream: MediaStream) {
    if (mediaStream.getVideoTracks().length <= 0) {
      return false
    }
    return mediaStream.getVideoTracks().some((videoTrack) => videoTrack.enabled)
  }

  static isAudioEnabled(mediaStream: MediaStream) {
    if (mediaStream.getAudioTracks().length <= 0) {
      return false
    }
    return mediaStream.getAudioTracks().some((audioTrack) => audioTrack.enabled)
  }

  private getMediaStream(id: string) {
    return this.mediaStreamRecordList$.value.find(
      ({ mediaStream }) => mediaStream.id === id,
    )?.mediaStream
  }

  addUserMediaStreamTrack$(
    mediaStream: MediaStream,
    constraints: MediaStreamConstraints,
  ) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      map((ms) => ms.getTracks()),
      tap((tracks) => {
        tracks.forEach((track) => {
          mediaStream.addTrack(track)
          this.addTrackNotifier$.next({ mediaStream, track })
        })
      }),
    )
  }

  private setTrackEnabled$(
    enabled: boolean,
    trackList: MediaStreamTrack[],
    mediaStream: MediaStream,
    constraints: MediaStreamConstraints,
  ) {
    return iif(
      () => trackList.length !== 0,
      of(trackList),
      this.addUserMediaStreamTrack$(mediaStream, constraints),
    ).pipe(
      tap((tracks) => {
        for (let i = 0; i < tracks.length; i += 1) {
          const track = tracks[i]
          if (track) {
            track.enabled = enabled
          }
        }
      }),
    )
  }

  setVideoEnabled$(
    enabled: boolean,
    mediaStream: MediaStream,
    constraints: Pick<MediaStreamConstraints, 'video'> = { video: true },
  ) {
    return of(this.getMediaStream(mediaStream.id)).pipe(
      filter((ms): ms is MediaStream => !!ms),
      switchMap((ms) =>
        this.setTrackEnabled$(
          enabled,
          ms.getVideoTracks(),
          mediaStream,
          constraints,
        ).pipe(map(() => ms)),
      ),
      tap((ms) => {
        this.enableTrackNotifier$.next(ms)
      }),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    mediaStream: MediaStream,
    constraints: Pick<MediaStreamConstraints, 'audio'> = { audio: true },
  ) {
    return of(this.getMediaStream(mediaStream.id)).pipe(
      filter((ms): ms is MediaStream => !!ms),
      switchMap((ms) =>
        this.setTrackEnabled$(
          enabled,
          ms.getAudioTracks(),
          mediaStream,
          constraints,
        ).pipe(map(() => ms)),
      ),
      tap((ms) => {
        this.enableTrackNotifier$.next(ms)
      }),
    )
  }

  observeTrackEnabled$(mediaStream: MediaStream) {
    return of(this.getMediaStream(mediaStream.id)).pipe(
      filter((ms): ms is MediaStream => !!ms),
      switchMap((ms) => merge(of(ms), this.enableTrackNotifier$)),
      filter((ms) => ms.id === mediaStream.id),
      map((ms) => ({
        video: LocalParticipant.isVideoEnabled(ms),
        audio: LocalParticipant.isAudioEnabled(ms),
      })),
      takeUntil(
        this.removeMediaStreamNotifier$.pipe(
          filter((ms) => ms.id === mediaStream.id),
        ),
      ),
    )
  }

  clear() {
    this.mediaStreamRecordList$.value.forEach(({ mediaStream }) => {
      this.removeMediaStreamNotifier$.next(mediaStream)
    })
    this.mediaStreamRecordList$.complete()
    this.trackList$.complete()
    this.addMediaStreamNotifier$.complete()
    this.removeMediaStreamNotifier$.complete()
    this.addTrackNotifier$.complete()
    this.removeTrackNotifier$.complete()
    this.enableTrackNotifier$.complete()
  }
}

export default LocalParticipant
