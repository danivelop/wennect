import { BehaviorSubject, of, NEVER, concat } from 'rxjs'
import { tap, finalize, take } from 'rxjs/operators'

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

  getLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
