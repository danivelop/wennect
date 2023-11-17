import { BehaviorSubject, of, NEVER, concat } from 'rxjs'
import { tap, switchMap, finalize, take } from 'rxjs/operators'

import LocalParticipant from '@/models/LocalParticipant'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  enter() {
    return concat(of(new LocalParticipant()), NEVER).pipe(
      tap((localParticipant) => {
        this.localParticipant$.next(localParticipant)
      }),
      switchMap(() => this.localParticipant$.pipe(take(1))),
      switchMap(
        (localParticipant) =>
          localParticipant?.addUserMediaStreamManager$({
            video: true,
            audio: true,
          }) ?? of([]),
      ),
      finalize(() => {
        this.localParticipant$.next(null)
      }),
    )
  }

  getLocalParticipant$() {
    return this.localParticipant$.asObservable()
  }
}

export default new WebRTCService()
