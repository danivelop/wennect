import {
  BehaviorSubject,
  Subject,
  EMPTY,
  from,
  of,
  merge,
  fromEvent,
  iif,
  defer,
} from 'rxjs'
import {
  map,
  tap,
  switchMap,
  mergeMap,
  filter,
  takeUntil,
  take,
  finalize,
  catchError,
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

interface TTrackRecord {
  mediaStream: MediaStream
  track: MediaStreamTrack
}

interface TTrackNotifier {
  mediaStream: MediaStream
  tracks: MediaStreamTrack[]
}

class LocalParticipant {
  private id: string

  private mediaStreamRecordList$: BehaviorSubject<TMediaStreamRecord[]>

  trackRecordList$: BehaviorSubject<TTrackRecord[]>

  private addMediaStreamNotifier$: Subject<TMediaStreamRecord>

  private removeMediaStreamNotifier$: Subject<MediaStream>

  addTrackNotifier$: Subject<TTrackNotifier>

  private removeTrackNotifier$: Subject<TTrackNotifier>

  private enableTrackNotifier$: Subject<MediaStream>

  constructor(id: string) {
    this.id = id
    this.mediaStreamRecordList$ = new BehaviorSubject<TMediaStreamRecord[]>([])
    this.trackRecordList$ = new BehaviorSubject<TTrackRecord[]>([])
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
        tap(({ mediaStream }) => {
          this.addTrackNotifier$.next({
            mediaStream,
            tracks: mediaStream.getTracks(),
          })
        }),
      ),
      this.addTrackNotifier$.pipe(
        tap(({ mediaStream, tracks }) => {
          this.trackRecordList$.next([
            ...this.trackRecordList$.value,
            ...tracks.map((track) => ({ mediaStream, track })),
          ])
          this.enableTrackNotifier$.next(mediaStream)
        }),
        mergeMap(({ mediaStream, tracks }) =>
          from(tracks).pipe(
            mergeMap((track) =>
              fromEvent(track, 'ended').pipe(
                take(1),
                tap(() => {
                  this.removeTrackNotifier$.next({
                    mediaStream,
                    tracks: [track],
                  })
                }),
                finalize(() => {
                  if (mediaStream.getTracks().length === 0) {
                    this.removeMediaStreamNotifier$.next(mediaStream)
                  }
                }),
                takeUntil(
                  this.removeTrackNotifier$.pipe(
                    filter(({ tracks: _tracks }) =>
                      _tracks.map((t) => t.id).includes(track.id),
                    ),
                  ),
                ),
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
          })
          this.removeTrackNotifier$.next({
            mediaStream,
            tracks: mediaStream.getTracks(),
          })
        }),
      ),
      this.removeTrackNotifier$.pipe(
        tap(({ mediaStream, tracks }) => {
          tracks.forEach((track) => {
            mediaStream.removeTrack(track)
          })
          this.trackRecordList$.next(
            this.trackRecordList$.value.filter(
              ({ track }) => !tracks.map((t) => t.id).includes(track.id),
            ),
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

  private getMediaStreamById(id: string) {
    return this.mediaStreamRecordList$.value.find(
      ({ mediaStream }) => mediaStream.id === id,
    )?.mediaStream
  }

  private getMediaStreamByKind(kind: MediaStreamKindType) {
    return this.mediaStreamRecordList$.value.find(({ kind: k }) => k === kind)
      ?.mediaStream
  }

  addUserMediaStreamTrack$(
    mediaStream: MediaStream,
    constraints: MediaStreamConstraints,
  ) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      map((ms) => ms.getTracks()),
      tap((tracks) => {
        this.addTrackNotifier$.next({ mediaStream, tracks })
        tracks.forEach((track) => {
          mediaStream.addTrack(track)
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
      tap(() => {
        this.enableTrackNotifier$.next(mediaStream)
      }),
    )
  }

  setVideoEnabled$(
    enabled: boolean,
    mediaStream?: MediaStream,
    constraints: Pick<MediaStreamConstraints, 'video'> = { video: true },
  ) {
    const getMediaStream$ = () => {
      if (mediaStream) {
        const existMediaStream = this.getMediaStreamById(mediaStream.id)
        if (existMediaStream) {
          return of(existMediaStream)
        }
        return EMPTY
      }

      const existMediaStream = this.getMediaStreamByKind(MEDIA_STREAM_KIND.USER)

      if (existMediaStream) {
        return of(existMediaStream)
      }
      return this.addUserMediaStream$(constraints)
    }

    return defer(getMediaStream$).pipe(
      switchMap((ms) =>
        this.setTrackEnabled$(enabled, ms.getVideoTracks(), ms, constraints),
      ),
      catchError(() => EMPTY),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    mediaStream?: MediaStream,
    constraints: Pick<MediaStreamConstraints, 'audio'> = { audio: true },
  ) {
    const getMediaStream$ = () => {
      if (mediaStream) {
        const existMediaStream = this.getMediaStreamById(mediaStream.id)
        if (existMediaStream) {
          return of(existMediaStream)
        }
        return EMPTY
      }

      const existMediaStream = this.getMediaStreamByKind(MEDIA_STREAM_KIND.USER)

      if (existMediaStream) {
        return of(existMediaStream)
      }
      return this.addUserMediaStream$(constraints)
    }

    return defer(getMediaStream$).pipe(
      switchMap((ms) =>
        this.setTrackEnabled$(enabled, ms.getAudioTracks(), ms, constraints),
      ),
      catchError(() => EMPTY),
    )
  }

  observeTrackEnabled$(mediaStream: MediaStream) {
    return of(this.getMediaStreamById(mediaStream.id)).pipe(
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
    this.trackRecordList$.complete()
    this.addMediaStreamNotifier$.complete()
    this.removeMediaStreamNotifier$.complete()
    this.addTrackNotifier$.complete()
    this.removeTrackNotifier$.complete()
    this.enableTrackNotifier$.complete()
  }
}

export default LocalParticipant
