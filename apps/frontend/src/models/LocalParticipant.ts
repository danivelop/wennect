import { BehaviorSubject, from, of } from 'rxjs'
import { tap, switchMap, take, map } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import MediaStreamManager from '@/models/MediaStreamManager'

import type { MediaStreamType } from '@/constants/MediaStream'

class LocalParticipant {
  private mediaStreamManagerList$: BehaviorSubject<MediaStreamManager[]>

  constructor() {
    this.mediaStreamManagerList$ = new BehaviorSubject<MediaStreamManager[]>([])
  }

  addUserMediaStreamManager$(constraints: MediaStreamConstraints) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      map(
        (mediaStream) =>
          new MediaStreamManager(mediaStream, MEDIA_STREAM.SOURCE.USER),
      ),
      switchMap((mediaStreamManager) =>
        this.addMediaStreamManager$(mediaStreamManager),
      ),
    )
  }

  addDisplayMediaStreamManager$(constraints: MediaStreamConstraints) {
    return from(
      window.navigator.mediaDevices.getDisplayMedia(constraints),
    ).pipe(
      map(
        (mediaStream) =>
          new MediaStreamManager(mediaStream, MEDIA_STREAM.SOURCE.DISPLAY),
      ),
      switchMap((mediaStreamManager) =>
        this.addMediaStreamManager$(mediaStreamManager),
      ),
    )
  }

  private addMediaStreamManager$(_mediaStreamManager: MediaStreamManager) {
    return of(_mediaStreamManager).pipe(
      switchMap((mediaStreamManager) =>
        this.mediaStreamManagerList$.pipe(
          take(1),
          tap((mediaStreamManagerList) => {
            this.mediaStreamManagerList$.next([
              ...mediaStreamManagerList,
              mediaStreamManager,
            ])
          }),
        ),
      ),
      map(() => _mediaStreamManager),
    )
  }

  private upsertUserMediaStreamManager$(constraints: MediaStreamConstraints) {
    return this.observeMediaStreamManagerList$(MEDIA_STREAM.SOURCE.USER).pipe(
      take(1),
      map(
        (localUserMediaStreamManagerList) => localUserMediaStreamManagerList[0],
      ),
      switchMap((localUserMediaStreamManager) => {
        if (localUserMediaStreamManager) {
          return of(localUserMediaStreamManager)
        }

        return this.addUserMediaStreamManager$(constraints)
      }),
    )
  }

  removeMediaStreamManager$(mediaStreamManager: MediaStreamManager) {
    return this.mediaStreamManagerList$.pipe(
      take(1),
      tap(() => {
        mediaStreamManager.clear()
      }),
      tap((mediaStreamManagerList) => {
        const newMediaStreamManagerList = mediaStreamManagerList.filter(
          (msManager) => msManager !== mediaStreamManager,
        )
        this.mediaStreamManagerList$.next(newMediaStreamManagerList)
      }),
      map(() => mediaStreamManager),
    )
  }

  setVideoEnabled$(
    enabled: boolean,
    constraints: Pick<MediaStreamConstraints, 'video'> = { video: true },
  ) {
    return this.upsertUserMediaStreamManager$(constraints).pipe(
      switchMap((localUserMediaStreamManager) =>
        localUserMediaStreamManager.setVideoEnabled$(enabled, constraints),
      ),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    constraints: Pick<MediaStreamConstraints, 'audio'> = { audio: true },
  ) {
    return this.upsertUserMediaStreamManager$(constraints).pipe(
      switchMap((localUserMediaStreamManager) =>
        localUserMediaStreamManager.setAudioEnabled$(enabled, constraints),
      ),
    )
  }

  observeMediaStreamManagerList$(
    mediaStreamSource?: MediaStreamType['SOURCE'],
  ) {
    return this.mediaStreamManagerList$.pipe(
      map((mediaStreamManagerList) => {
        if (!mediaStreamSource) {
          return mediaStreamManagerList
        }
        if (mediaStreamSource === MEDIA_STREAM.SOURCE.USER) {
          return mediaStreamManagerList.filter((mediaStreamManager) =>
            mediaStreamManager.isUserMediaStream(),
          )
        }
        if (mediaStreamSource === MEDIA_STREAM.SOURCE.DISPLAY) {
          return mediaStreamManagerList.filter((mediaStreamManager) =>
            mediaStreamManager.isDisplayMediaStream(),
          )
        }
        return []
      }),
    )
  }

  clear() {
    this.mediaStreamManagerList$
      .pipe(
        take(1),
        switchMap((mediaStreamManagerList) => from(mediaStreamManagerList)),
        tap((mediaStreamManager) => {
          mediaStreamManager.clear()
        }),
      )
      .subscribe()
    this.mediaStreamManagerList$.complete()
  }
}

export default LocalParticipant
