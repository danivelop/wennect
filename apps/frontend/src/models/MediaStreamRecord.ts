import { of, BehaviorSubject } from 'rxjs'
import { tap } from 'rxjs/operators'

import type { SOURCE, KIND } from '@/models/LocalParticipant'

class MediaStreamRecord {
  mediaStream: MediaStream

  source: SOURCE

  videoEnabledNotifier: BehaviorSubject<boolean>

  audioEnabledNotifier: BehaviorSubject<boolean>

  constructor(mediaStream: MediaStream, source: SOURCE) {
    this.mediaStream = mediaStream
    this.source = source
    this.videoEnabledNotifier = new BehaviorSubject(this.isVideoEnabled())
    this.audioEnabledNotifier = new BehaviorSubject(this.isAudioEnabled())
  }

  hasTrack(kind?: KIND) {
    if (kind) {
      return this.mediaStream.getTracks().some((track) => track.kind === kind)
    }
    return this.mediaStream.getTracks().length > 0
  }

  private isVideoEnabled() {
    if (this.mediaStream.getVideoTracks().length <= 0) {
      return false
    }
    return this.mediaStream
      .getVideoTracks()
      .some((videoTrack) => videoTrack.enabled)
  }

  private isAudioEnabled() {
    if (this.mediaStream.getAudioTracks().length <= 0) {
      return false
    }
    return this.mediaStream
      .getAudioTracks()
      .some((audioTrack) => audioTrack.enabled)
  }

  setVideoEnabled$(enabled: boolean) {
    return of(this.mediaStream.getVideoTracks()).pipe(
      tap((tracks) => {
        tracks.forEach((track) => {
          track.enabled = enabled
        })
        this.videoEnabledNotifier.next(this.isVideoEnabled())
      }),
    )
  }

  setAudioEnabled$(enabled: boolean) {
    return of(this.mediaStream.getAudioTracks()).pipe(
      tap((tracks) => {
        tracks.forEach((track) => {
          track.enabled = enabled
        })
        this.audioEnabledNotifier.next(this.isAudioEnabled())
      }),
    )
  }

  clear() {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop()
    })
    this.videoEnabledNotifier.complete()
    this.audioEnabledNotifier.complete()
  }
}

export default MediaStreamRecord
