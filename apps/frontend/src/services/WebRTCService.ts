import { BehaviorSubject, of, EMPTY, fromEvent, merge, concat } from 'rxjs'
import { tap, take, filter, switchMap, catchError } from 'rxjs/operators'

import LocalParticipant from '@/models/LocalParticipant'

import type MediaStreamManager from '@/models/MediaStreamManager'

/**
 * @todo
 * - video enabled, audio enabled 업데이트 해주기
 * - 화면공유 기능 만들기
 * - 자원정리
 */

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  localDisplayMediaStreamManager: MediaStreamManager | null = null

  enter() {
    of(new LocalParticipant())
      .pipe(
        tap((localParticipant) => {
          this.localParticipant$.next(localParticipant)
        }),
        switchMap((localParticipant) =>
          concat(
            localParticipant
              .setVideoEnabled$(false)
              .pipe(catchError(() => EMPTY)),
            localParticipant
              .setAudioEnabled$(false)
              .pipe(catchError(() => EMPTY)),
          ),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  leave() {
    this.removeLocalDisplayMediaStreamManager()
    this.getLocalParticipant$()
      .pipe(
        tap((localParticipant) => {
          localParticipant.clear()
          this.localParticipant$.next(null)
        }),
      )
      .subscribe()
  }

  addLocalDisplayMediaStreamManager() {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.addDisplayMediaStreamManager$({ video: true }),
        ),
        tap((localDisplayMediaStreamManager) => {
          this.localDisplayMediaStreamManager = localDisplayMediaStreamManager
        }),
        switchMap((localDisplayMediaStreamManager) =>
          merge(
            of(localDisplayMediaStreamManager),
            of(
              localDisplayMediaStreamManager.mediaStream.getVideoTracks()[0],
            ).pipe(
              filter(
                (videoTrack): videoTrack is MediaStreamTrack => !!videoTrack,
              ),
              switchMap((videoTrack) =>
                fromEvent(videoTrack, 'ended').pipe(
                  take(1),
                  tap(() => {
                    this.removeLocalDisplayMediaStreamManager()
                  }),
                ),
              ),
              switchMap(() => EMPTY),
            ),
          ),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  removeLocalDisplayMediaStreamManager() {
    of(this.localDisplayMediaStreamManager)
      .pipe(
        filter(
          (
            localDisplayMediaStreamManager,
          ): localDisplayMediaStreamManager is MediaStreamManager =>
            !!localDisplayMediaStreamManager,
        ),
        switchMap((localDisplayMediaStreamManager) =>
          this.getLocalParticipant$().pipe(
            switchMap((localParticipant) =>
              localParticipant.removeMediaStreamManager$(
                localDisplayMediaStreamManager,
              ),
            ),
          ),
        ),
        tap(() => {
          this.localDisplayMediaStreamManager = null
        }),
      )
      .subscribe()
  }

  setLocalVideoEnabled(enabled: boolean) {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.setVideoEnabled$(enabled),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  setLocalAudioEnabled(enabled: boolean) {
    this.getLocalParticipant$()
      .pipe(
        switchMap((localParticipant) =>
          localParticipant.setAudioEnabled$(enabled),
        ),
        catchError(() => EMPTY),
      )
      .subscribe()
  }

  private getLocalParticipant$() {
    return this.localParticipant$.pipe(
      take(1),
      filter(
        (localParticipant): localParticipant is LocalParticipant =>
          !!localParticipant,
      ),
    )
  }

  observeLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
