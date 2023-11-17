import { EMPTY, of, NEVER, concat } from 'rxjs'
import { map, tap, switchMap, finalize } from 'rxjs/operators'

import LocalParticipant from '@/models/LocalParticipant'

import type { MediaStreamType } from '@/constants/MediaStream'

class WebRTCService {
  localParticipant: LocalParticipant | null = null

  enter() {
    return concat(of(new LocalParticipant()), NEVER).pipe(
      tap((localParticipant) => {
        this.localParticipant = localParticipant
      }),
      switchMap(
        () =>
          this.localParticipant?.addUserMediaStreamManager$({ video: true }) ??
          EMPTY,
      ),
      finalize(() => {
        this.localParticipant = null
      }),
    )
  }

  getLocalMediaStreamList$(mediaStreamSource?: MediaStreamType['SOURCE']) {
    if (!this.localParticipant) {
      return EMPTY
    }

    return this.localParticipant
      .getMediaStreamManagerList$(mediaStreamSource)
      .pipe(
        map((mediaStreamManagerList) =>
          mediaStreamManagerList.map(
            (mediaStreamManager) => mediaStreamManager.mediaStream,
          ),
        ),
      )
  }
}

export default new WebRTCService()
