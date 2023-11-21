import {
  BehaviorSubject,
  from,
  of,
  NEVER,
  EMPTY,
  concat,
  Subscription,
  merge,
  fromEvent,
} from 'rxjs'
import { tap, switchMap, take, finalize, map, filter } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import MediaStreamManager from '@/models/MediaStreamManager'

import type { MediaStreamType } from '@/constants/MediaStream'
import type { TMediaStreamObserver } from '@/models/MediaStreamManager'
import type { Observable } from 'rxjs'

class LocalParticipant {
  private mediaStreamManagerList$: BehaviorSubject<MediaStreamManager[]>

  private subscription: Subscription

  constructor() {
    this.mediaStreamManagerList$ = new BehaviorSubject<MediaStreamManager[]>([])
    this.subscription = new Subscription()
  }

  addUserMediaStreamManager(
    constraints: MediaStreamConstraints,
    observer: TMediaStreamObserver,
  ) {
    const subscription = this.addMediaStreamManager(
      from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
        map(
          (mediaStream) =>
            new MediaStreamManager(mediaStream, MEDIA_STREAM.SOURCE.USER),
        ),
      ),
      observer,
    )

    this.subscription.add(subscription)
    return subscription
  }

  addDisplayMediaStreamManager(
    constraints: MediaStreamConstraints,
    observer: TMediaStreamObserver,
  ) {
    const subscription = this.addMediaStreamManager(
      from(window.navigator.mediaDevices.getDisplayMedia(constraints)).pipe(
        switchMap((mediaStream) =>
          merge(
            of(
              new MediaStreamManager(mediaStream, MEDIA_STREAM.SOURCE.DISPLAY),
            ),
            of(mediaStream.getVideoTracks()[0]).pipe(
              filter(
                (videoTrack): videoTrack is MediaStreamTrack => !!videoTrack,
              ),
              switchMap((videoTrack) =>
                fromEvent(videoTrack, 'ended').pipe(
                  tap(() => {
                    subscription.unsubscribe()
                  }),
                ),
              ),
              switchMap(() => EMPTY),
            ),
          ),
        ),
      ),
      observer,
    )

    this.subscription.add(subscription)
    return subscription
  }

  private addMediaStreamManager(
    mediaStreamManager$: Observable<MediaStreamManager>,
    observer: TMediaStreamObserver,
  ) {
    return mediaStreamManager$
      .pipe(
        switchMap((mediaStreamManager) => {
          return concat(this.mediaStreamManagerList$.pipe(take(1)), NEVER).pipe(
            tap((mediaStreamManagerList) => {
              this.mediaStreamManagerList$.next([
                ...mediaStreamManagerList,
                mediaStreamManager,
              ])
            }),
            map(() => mediaStreamManager),
            finalize(() => {
              this.removeMediaStreamManager(mediaStreamManager)
              observer.complete?.()
            }),
          )
        }),
      )
      .subscribe(observer)
  }

  private removeMediaStreamManager(mediaStreamManager: MediaStreamManager) {
    return this.mediaStreamManagerList$
      .pipe(
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
      .subscribe()
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

  clear() {
    this.subscription.unsubscribe()
    this.mediaStreamManagerList$.complete()
  }
}

export default LocalParticipant
