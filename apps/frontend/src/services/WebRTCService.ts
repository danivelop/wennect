import { BehaviorSubject, of, concat, forkJoin } from 'rxjs'
import { tap, switchMap } from 'rxjs/operators'
import { io } from 'socket.io-client'

import LocalParticipant from '@/models/LocalParticipant'

class WebRTCService {
  localParticipant$ = new BehaviorSubject<LocalParticipant | null>(null)

  enter() {
    const socket = io('https://localhost:4000')

    return of(new LocalParticipant(socket))
      .pipe(
        tap((localParticipant) => {
          this.localParticipant$.next(localParticipant)
        }),
        switchMap((localParticipant) =>
          forkJoin([
            concat(
              localParticipant
                .createUserMediaStream$({ video: true })
                .pipe(
                  switchMap((mediaStreamRecord) =>
                    mediaStreamRecord.setVideoEnabled$(true),
                  ),
                ),
              localParticipant
                .createUserMediaStream$({ audio: true })
                .pipe(
                  switchMap((mediaStreamRecord) =>
                    mediaStreamRecord.setAudioEnabled$(true),
                  ),
                ),
            ),
          ]),
        ),
      )
      .subscribe()
  }
}

export default new WebRTCService()
