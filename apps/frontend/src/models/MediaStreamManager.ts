import { MEDIA_STREAM } from '@/constants/MediaStream'

import type { MediaStreamType } from '@/constants/MediaStream'

class MediaStreamManager {
  mediaStream: MediaStream

  #source: MediaStreamType['SOURCE']

  constructor(mediaStream: MediaStream, source: MediaStreamType['SOURCE']) {
    this.mediaStream = mediaStream
    this.#source = source
  }

  isUserMediaStream() {
    return this.#source === MEDIA_STREAM.SOURCE.USER
  }

  isDisplayMediaStream() {
    return this.#source === MEDIA_STREAM.SOURCE.DISPLAY
  }

  clear() {
    this.mediaStream.getTracks().forEach((track) => track.stop())
  }
}

export default MediaStreamManager
