import { Subscription, from, of, concat, NEVER } from 'rxjs'
import { tap, switchMap, map, finalize } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'

import type { MediaStreamType } from '@/constants/MediaStream'
import type { Observer } from 'rxjs'

interface TMediaStreamObserverNext {
  audio: boolean
  video: boolean
}

export interface TMediaStreamObserver
  extends Partial<Observer<TMediaStreamObserverNext>> {}

class MediaStreamManager {
  mediaStream: MediaStream

  private source: MediaStreamType['SOURCE']

  private subscription: Subscription

  constructor(mediaStream: MediaStream, source: MediaStreamType['SOURCE']) {
    this.mediaStream = mediaStream
    this.source = source
    this.subscription = new Subscription()
  }

  isUserMediaStream() {
    return this.source === MEDIA_STREAM.SOURCE.USER
  }

  isDisplayMediaStream() {
    return this.source === MEDIA_STREAM.SOURCE.DISPLAY
  }

  getVideoTracks() {
    return this.mediaStream.getVideoTracks()
  }

  getAudioTracks() {
    return this.mediaStream.getAudioTracks()
  }

  hasVideoTrack() {
    return this.getVideoTracks().length > 0
  }

  hasAudioTrack() {
    return this.getAudioTracks().length > 0
  }

  isVideoEnabled() {
    if (!this.hasVideoTrack()) {
      return false
    }
    return this.getVideoTracks().some((videoTrack) => videoTrack.enabled)
  }

  isAudioEnabled() {
    if (!this.hasAudioTrack()) {
      return false
    }
    return this.getAudioTracks().some((audioTrack) => audioTrack.enabled)
  }

  addUserMediaStreamTrack(
    constraints: MediaStreamConstraints,
    observer: TMediaStreamObserver,
  ) {
    const subscription = from(
      window.navigator.mediaDevices.getUserMedia(constraints),
    )
      .pipe(
        map((mediaStream) => mediaStream.getTracks()),
        switchMap((tracks) =>
          concat(of(tracks), NEVER).pipe(
            tap(() => {
              tracks.forEach((track) => {
                this.mediaStream.addTrack(track)
              })
            }),
            finalize(() => {
              tracks.forEach((track) => {
                track.stop()
                this.mediaStream.removeTrack(track)
              })
              observer.complete?.()
            }),
          ),
        ),
      )
      .subscribe({
        next: () => {
          observer.next?.({
            video: this.isVideoEnabled(),
            audio: this.isAudioEnabled(),
          })
        },
        error: observer.error,
        complete: observer.complete,
      })

    this.subscription.add(subscription)
    return subscription
  }

  setVideoEnabled(enabled: boolean): boolean {
    const videoTracks = this.mediaStream.getVideoTracks()

    if (videoTracks.length === 0) {
      return false
    }
    for (let i = 0; i < videoTracks.length; i += 1) {
      const videoTrack = videoTracks[i]
      if (videoTrack) {
        videoTrack.enabled = enabled
      }
    }
    return true
  }

  setAudioEnabled(enabled: boolean): boolean {
    const audioTracks = this.mediaStream.getAudioTracks()

    if (audioTracks.length === 0) {
      return false
    }
    for (let i = 0; i < audioTracks.length; i += 1) {
      const audioTrack = audioTracks[i]
      if (audioTrack) {
        audioTrack.enabled = enabled
      }
    }
    return true
  }

  clear() {
    this.subscription.unsubscribe()
    this.mediaStream.getTracks().forEach((track) => {
      track.stop()
      this.mediaStream.removeTrack(track)
    })
  }
}

export default MediaStreamManager
