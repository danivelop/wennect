import { BehaviorSubject, of, EMPTY, forkJoin } from 'rxjs'
import { tap, mergeMap, switchMap, catchError } from 'rxjs/operators'

import LocalParticipant from '@/models/LocalParticipant'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  enter() {
    return of(new LocalParticipant())
      .pipe(
        tap((localParticipant) => {
          this.localParticipant$.next(localParticipant)
        }),
        mergeMap((localParticipant) =>
          localParticipant
            .upsertUserMediaStream$([{ video: true, audio: true }])
            .pipe(
              switchMap(() =>
                forkJoin([
                  localParticipant.setVideoEnabled$(false),
                  localParticipant.setAudioEnabled$(false),
                ]),
              ),
              catchError(() => EMPTY),
            ),
        ),
      )
      .subscribe()
  }
}

export default new WebRTCService()
