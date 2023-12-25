import { from } from 'rxjs'
import { tap } from 'rxjs/operators'

export enum SOURCE {
  DISPLAY = 'display',
  USER = 'user',
}

export enum KIND {
  AUDIO = 'audio',
  VIDEO = 'video',
}

class MediaStreamRecord {
  mediaStream: MediaStream

  source: SOURCE

  constructor(mediaStream: MediaStream, source: SOURCE) {
    this.mediaStream = mediaStream
    this.source = source
  }

  hasTrack(kind?: KIND) {
    if (kind) {
      return this.mediaStream.getTracks().some((track) => track.kind === kind)
    }
    return this.mediaStream.getTracks().length > 0
  }

  setVideoEnabled$(enabled: boolean) {
    return from(this.mediaStream.getVideoTracks()).pipe(
      tap((track) => {
        track.enabled = enabled
      }),
    )
  }

  setAudioEnabled$(enabled: boolean) {
    return from(this.mediaStream.getAudioTracks()).pipe(
      tap((track) => {
        track.enabled = enabled
      }),
    )
  }
}

export default MediaStreamRecord
