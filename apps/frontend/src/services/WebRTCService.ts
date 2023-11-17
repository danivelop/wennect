import { BehaviorSubject, of, NEVER, concat } from 'rxjs'
import { map, tap, switchMap, finalize, take } from 'rxjs/operators'

import LocalParticipant from '@/models/LocalParticipant'

import type { MediaStreamType } from '@/constants/MediaStream'

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

  getLocalMediaStreamList$(mediaStreamSource?: MediaStreamType['SOURCE']) {
    return this.localParticipant$.pipe(
      switchMap(
        (localParticipant) =>
          localParticipant?.getMediaStreamManagerList$(mediaStreamSource) ??
          of([]),
      ),
      map((mediaStreamManagerList) =>
        mediaStreamManagerList.map(
          (mediaStreamManager) => mediaStreamManager.mediaStream,
        ),
      ),
    )
  }
}

export default new WebRTCService()
