import { BehaviorSubject, from } from 'rxjs'
import { tap, map, filter, toArray, switchMap, mergeMap } from 'rxjs/operators'

import MediaStreamRecord, { SOURCE, KIND } from '@/models/MediaStreamRecord'

import type { Socket } from 'socket.io-client'

class LocalParticipant {
  socket: Socket

  mediaStreamRecordList: BehaviorSubject<MediaStreamRecord[]>

  constructor(socket: Socket) {
    this.socket = socket
    this.mediaStreamRecordList = new BehaviorSubject<MediaStreamRecord[]>([])
  }

  getMedaiStreamRecordList$({
    source,
    kind,
  }: { kind?: KIND; source?: SOURCE } = {}) {
    let mediaStreamRecordList$ = from(this.mediaStreamRecordList.value)

    if (source) {
      mediaStreamRecordList$ = mediaStreamRecordList$.pipe(
        filter((mediaStreamRecord) => mediaStreamRecord.source === source),
      )
    }

    if (kind) {
      mediaStreamRecordList$ = mediaStreamRecordList$.pipe(
        filter((mediaStreamRecord) => mediaStreamRecord.hasTrack(kind)),
      )
    }

    return mediaStreamRecordList$.pipe(toArray())
  }

  createUserMediaStream$(constraints: MediaStreamConstraints) {
    return from(window.navigator.mediaDevices.getUserMedia(constraints)).pipe(
      map((mediaStream) => new MediaStreamRecord(mediaStream, SOURCE.USER)),
      tap((mediaStreamRecord) => {
        this.mediaStreamRecordList.next([
          ...this.mediaStreamRecordList.value,
          mediaStreamRecord,
        ])
      }),
    )
  }

  createDisplayMediaStream$(constraints: MediaStreamConstraints) {
    return from(
      window.navigator.mediaDevices.getDisplayMedia(constraints),
    ).pipe(
      map((mediaStream) => new MediaStreamRecord(mediaStream, SOURCE.DISPLAY)),
      tap((mediaStreamRecord) => {
        this.mediaStreamRecordList.next([
          ...this.mediaStreamRecordList.value,
          mediaStreamRecord,
        ])
      }),
    )
  }

  setVideoEnabled$(
    enabled: boolean,
    mediaStreamRecord?: MediaStreamRecord,
    constraints: MediaStreamConstraints = { video: true },
  ) {
    if (mediaStreamRecord) {
      return mediaStreamRecord.setVideoEnabled$(enabled)
    }
    return this.getMedaiStreamRecordList$({
      source: SOURCE.USER,
      kind: KIND.VIDEO,
    }).pipe(
      switchMap((mediaStreamRecordList) => {
        if (mediaStreamRecordList.length > 0) {
          return from(mediaStreamRecordList)
        }
        return this.createUserMediaStream$(constraints)
      }),
      mergeMap((_mediaStreamRecord) =>
        _mediaStreamRecord.setVideoEnabled$(enabled),
      ),
    )
  }

  setAudioEnabled$(
    enabled: boolean,
    mediaStreamRecord?: MediaStreamRecord,
    constraints: MediaStreamConstraints = { audio: true },
  ) {
    if (mediaStreamRecord) {
      return mediaStreamRecord.setAudioEnabled$(enabled)
    }
    return this.getMedaiStreamRecordList$({
      source: SOURCE.USER,
      kind: KIND.AUDIO,
    }).pipe(
      switchMap((mediaStreamRecordList) => {
        if (mediaStreamRecordList.length > 0) {
          return from(mediaStreamRecordList)
        }
        return this.createUserMediaStream$(constraints)
      }),
      mergeMap((_mediaStreamRecord) =>
        _mediaStreamRecord.setAudioEnabled$(enabled),
      ),
    )
  }
}

export default LocalParticipant
