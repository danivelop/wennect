import { BehaviorSubject, of, NEVER, concat } from 'rxjs'
import { tap, finalize, take, filter, switchMap, map } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import LocalParticipant from '@/models/LocalParticipant'

import type { TMediaStreamObserver } from '@/models/MediaStreamManager'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  enter(constraints: MediaStreamConstraints, observer: TMediaStreamObserver) {
    return concat(of(new LocalParticipant()), NEVER)
      .pipe(
        tap((localParticipant) => {
          this.localParticipant$.next(localParticipant)
        }),
        tap((localParticipant) =>
          localParticipant.addUserMediaStreamManager(constraints, observer),
        ),
        finalize(() => {
          this.localParticipant$
            .pipe(
              take(1),
              tap((localParticipant) => {
                if (localParticipant) {
                  localParticipant.clear()
                  this.localParticipant$.next(null)
                }
              }),
            )
            .subscribe()
        }),
      )
      .subscribe()
  }

  setLocalVideoEnabled(enabled: boolean, observer: TMediaStreamObserver) {
    return this.localParticipant$
      .pipe(
        take(1),
        filter(
          (localParticipant): localParticipant is LocalParticipant =>
            !!localParticipant,
        ),
        switchMap((localParticipant) =>
          localParticipant
            .getMediaStreamManagerList$(MEDIA_STREAM.SOURCE.USER)
            .pipe(
              take(1),
              map(
                (localUserMediaStreamManagerList) =>
                  localUserMediaStreamManagerList[0],
              ),
              tap((localUserMediaStreamManager) => {
                if (!localUserMediaStreamManager) {
                  localParticipant.addUserMediaStreamManager(
                    {
                      video: true,
                    },
                    {
                      next: (mediaStreamManager) => {
                        mediaStreamManager.setVideoEnabled(enabled)
                        observer.next?.(mediaStreamManager)
                      },
                      error: observer.error,
                      complete: observer.complete,
                    },
                  )
                  return
                }
                if (!localUserMediaStreamManager.hasVideoTrack()) {
                  localUserMediaStreamManager.addUserMediaStreamTrack(
                    { video: true },
                    {
                      next: (mediaStreamManager) => {
                        mediaStreamManager.setVideoEnabled(enabled)
                        observer.next?.(mediaStreamManager)
                      },
                      error: observer.error,
                      complete: observer.complete,
                    },
                  )
                  return
                }
                if (localUserMediaStreamManager.hasVideoTrack()) {
                  localUserMediaStreamManager.setVideoEnabled(enabled)
                  observer.next?.(localUserMediaStreamManager)
                }
              }),
            ),
        ),
      )
      .subscribe()
  }

  setLocalAudioEnabled(enabled: boolean, observer: TMediaStreamObserver) {
    return this.localParticipant$
      .pipe(
        take(1),
        filter(
          (localParticipant): localParticipant is LocalParticipant =>
            !!localParticipant,
        ),
        switchMap((localParticipant) =>
          localParticipant
            .getMediaStreamManagerList$(MEDIA_STREAM.SOURCE.USER)
            .pipe(
              take(1),
              map(
                (localUserMediaStreamManagerList) =>
                  localUserMediaStreamManagerList[0],
              ),
              tap((localUserMediaStreamManager) => {
                if (!localUserMediaStreamManager) {
                  localParticipant.addUserMediaStreamManager(
                    {
                      audio: true,
                    },
                    {
                      next: (mediaStreamManager) => {
                        mediaStreamManager.setAudioEnabled(enabled)
                        observer.next?.(mediaStreamManager)
                      },
                      error: observer.error,
                      complete: observer.complete,
                    },
                  )
                  return
                }
                if (!localUserMediaStreamManager.hasAudioTrack()) {
                  localUserMediaStreamManager.addUserMediaStreamTrack(
                    { audio: true },
                    {
                      next: (mediaStreamManager) => {
                        mediaStreamManager.setAudioEnabled(enabled)
                        observer.next?.(mediaStreamManager)
                      },
                      error: observer.error,
                      complete: observer.complete,
                    },
                  )
                  return
                }
                if (localUserMediaStreamManager.hasAudioTrack()) {
                  localUserMediaStreamManager.setAudioEnabled(enabled)
                  observer.next?.(localUserMediaStreamManager)
                }
              }),
            ),
        ),
      )
      .subscribe()
  }

  getLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
