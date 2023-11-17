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

  toggleVideo(enabled: boolean) {
    const videoTracks = this.mediaStream.getVideoTracks()
    for (let i = 0; i < videoTracks.length; i += 1) {
      const videoTrack = videoTracks[i]
      if (videoTrack) {
        videoTrack.enabled = enabled
      }
    }
  }

  toggleAudio(enabled: boolean) {
    const audioTracks = this.mediaStream.getAudioTracks()
    for (let i = 0; i < audioTracks.length; i += 1) {
      const audioTrack = audioTracks[i]
      if (audioTrack) {
        audioTrack.enabled = enabled
      }
    }
  }

  clear() {
    this.mediaStream.getTracks().forEach((track) => track.stop())
  }
}

export default MediaStreamManager
