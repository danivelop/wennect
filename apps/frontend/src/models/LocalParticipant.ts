import { BehaviorSubject, from, of, NEVER, concat } from 'rxjs'
import { tap, switchMap, take, finalize } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import MediaStreamManager from '@/models/MediaStreamManager'

import type { MediaStreamType } from '@/constants/MediaStream'
import type { Observable } from 'rxjs'

class LocalParticipant {
  mediaStreamManagerList$: BehaviorSubject<MediaStreamManager[]>

  constructor() {
    this.mediaStreamManagerList$ = new BehaviorSubject<MediaStreamManager[]>([])
  }

  addUserMediaStreamManager$(constraints: MediaStreamConstraints) {
    return this.addMediaStreamManager$(
      from(window.navigator.mediaDevices.getUserMedia(constraints)),
    )
  }

  addDisplayMediaStreamManager$(constraints: MediaStreamConstraints) {
    return this.addMediaStreamManager$(
      from(window.navigator.mediaDevices.getDisplayMedia(constraints)),
    )
  }

  private addMediaStreamManager$(mediaStream$: Observable<MediaStream>) {
    return mediaStream$.pipe(
      switchMap((mediaStream) => {
        const newMdiaStreamManager = new MediaStreamManager(
          mediaStream,
          MEDIA_STREAM.SOURCE.USER,
        )
        return concat(this.mediaStreamManagerList$.pipe(take(1)), NEVER).pipe(
          tap((mediaStreamManagerList) => {
            this.mediaStreamManagerList$.next([
              ...mediaStreamManagerList,
              newMdiaStreamManager,
            ])
          }),
          finalize(() => {
            this.removeMediaStreamManager$(newMdiaStreamManager)
              .subscribe()
              .unsubscribe()
          }),
        )
      }),
    )
  }

  private removeMediaStreamManager$(mediaStreamManager: MediaStreamManager) {
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
    )
  }

  getMediaStreamManagerList$(mediaStreamSource?: MediaStreamType['SOURCE']) {
    return this.mediaStreamManagerList$.pipe(
      switchMap((mediaStreamManagerList) => {
        if (!mediaStreamSource) {
          return of(mediaStreamManagerList)
        }
        if (mediaStreamSource === MEDIA_STREAM.SOURCE.USER) {
          return of(
            mediaStreamManagerList.filter((mediaStreamManager) =>
              mediaStreamManager.isUserMediaStream(),
            ),
          )
        }
        if (mediaStreamSource === MEDIA_STREAM.SOURCE.DISPLAY) {
          return of(
            mediaStreamManagerList.filter((mediaStreamManager) =>
              mediaStreamManager.isDisplayMediaStream(),
            ),
          )
        }
        return of([])
      }),
    )
  }
}

export default LocalParticipant
