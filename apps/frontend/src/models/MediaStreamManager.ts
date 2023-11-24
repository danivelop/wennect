import { BehaviorSubject, from, of, forkJoin } from 'rxjs'
import { tap, map, switchMap } from 'rxjs/operators'

import { MEDIA_STREAM } from '@/constants/MediaStream'

import type { MediaStreamType } from '@/constants/MediaStream'

class MediaStreamManager {
  mediaStream: MediaStream

  isVideoEnabled$: BehaviorSubject<boolean>

  isAudioEnabled$: BehaviorSubject<boolean>

  private source: MediaStreamType['SOURCE']

  constructor(mediaStream: MediaStream, source: MediaStreamType['SOURCE']) {
    this.mediaStream = mediaStream
    this.isVideoEnabled$ = new BehaviorSubject(this.isVideoEnabled())
    this.isAudioEnabled$ = new BehaviorSubject(this.isAudioEnabled())
    this.source = source
  }

  isUserMediaStream() {
    return this.source === MEDIA_STREAM.SOURCE.USER
  }

  isDisplayMediaStream() {
    return this.source === MEDIA_STREAM.SOURCE.DISPLAY
  }

  private getVideoTracks() {
    return this.mediaStream.getVideoTracks()
  }

  private getAudioTracks() {
    return this.mediaStream.getAudioTracks()
  }

  private hasVideoTrack() {
    return this.getVideoTracks().length > 0
  }

  private hasAudioTrack() {
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

  private addUserMediaStreamTrack$(constraints: MediaStreamConstraints) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      map((mediaStream) => mediaStream.getTracks()),
      tap((tracks) => {
        tracks.forEach((track) => {
          this.mediaStream.addTrack(track)
        })
      }),
    )
  }

  private upsertUserMediaStreamTrack$(constraints: MediaStreamConstraints) {
    const upsertVideoMediaStreamTrack$ = constraints.video
      ? of(this.getVideoTracks()).pipe(
          switchMap((videoTracks) => {
            if (videoTracks.length > 0) {
              return of(videoTracks)
            }
            return this.addUserMediaStreamTrack$({
              video: constraints.video,
            })
          }),
        )
      : of([])
    const upsertAudioMediaStreamTrack$ = constraints.audio
      ? of(this.getAudioTracks()).pipe(
          switchMap((audioTracks) => {
            if (audioTracks.length > 0) {
              return of(audioTracks)
            }
            return this.addUserMediaStreamTrack$({
              audio: constraints.audio,
            })
          }),
        )
      : of([])

    return forkJoin([
      upsertVideoMediaStreamTrack$,
      upsertAudioMediaStreamTrack$,
    ]).pipe(
      map(([videoTracks, audioTracks]) => [...videoTracks, ...audioTracks]),
    )
  }

  setTrackEnabled$(enabled: boolean, constraints: MediaStreamConstraints) {
    return this.upsertUserMediaStreamTrack$(constraints).pipe(
      tap((tracks) => {
        for (let i = 0; i < tracks.length; i += 1) {
          const track = tracks[i]
          if (track) {
            track.enabled = enabled
          }
        }
      }),
      map(() => this),
    )
  }

  setVideoEnabled$(
    enabled: boolean,
    constraints: Pick<MediaStreamConstraints, 'video'> = { video: true },
  ) {
    return this.setTrackEnabled$(enabled, constraints).pipe(
      tap(() => {
        this.isVideoEnabled$.next(this.isVideoEnabled())
      }),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    constraints: Pick<MediaStreamConstraints, 'audio'> = { audio: true },
  ) {
    return this.setTrackEnabled$(enabled, constraints).pipe(
      tap(() => {
        this.isAudioEnabled$.next(this.isAudioEnabled())
      }),
    )
  }

  observeVideoEnabled$() {
    return this.isVideoEnabled$.asObservable()
  }

  observeAudioEnabled$() {
    return this.isAudioEnabled$.asObservable()
  }

  clear() {
    this.mediaStream.getTracks().forEach((track) => {
      track.stop()
      this.mediaStream.removeTrack(track)
    })
  }
}

export default MediaStreamManager
