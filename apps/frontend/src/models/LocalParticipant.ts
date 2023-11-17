import { BehaviorSubject, from, of, iif, EMPTY, NEVER, concat } from 'rxjs'
import { tap, switchMap, toArray, filter, take, finalize } from 'rxjs/operators'

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
      switchMap((mediaStreamManagerList) =>
        iif(
          () => !mediaStreamSource,
          of(mediaStreamManagerList),
          iif(
            () => mediaStreamSource === MEDIA_STREAM.SOURCE.USER,
            from(mediaStreamManagerList).pipe(
              filter((mediaStreamManager) =>
                mediaStreamManager.isUserMediaStream(),
              ),
              toArray(),
            ),
            iif(
              () => mediaStreamSource === MEDIA_STREAM.SOURCE.DISPLAY,
              from(mediaStreamManagerList).pipe(
                filter((mediaStreamManager) =>
                  mediaStreamManager.isDisplayMediaStream(),
                ),
                toArray(),
              ),
              EMPTY,
            ),
          ),
        ),
      ),
    )
  }
}

export default LocalParticipant
