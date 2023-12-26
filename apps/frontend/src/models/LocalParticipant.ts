import { BehaviorSubject, from, of, EMPTY } from 'rxjs'
import { tap, map, switchMap, mergeMap, catchError } from 'rxjs/operators'

import MediaStreamRecord from '@/models/MediaStreamRecord'

import type { Observable } from 'rxjs'
import type { Socket } from 'socket.io-client'

export enum SOURCE {
  DISPLAY = 'display',
  USER = 'user',
}

export enum KIND {
  AUDIO = 'audio',
  VIDEO = 'video',
}

interface FilterMediaStreamRecordArgs {
  kind?: KIND
  source?: SOURCE
}

class LocalParticipant {
  socket: Socket

  mediaStreamRecordList: BehaviorSubject<MediaStreamRecord[]>

  constructor(socket: Socket) {
    this.socket = socket
    this.mediaStreamRecordList = new BehaviorSubject<MediaStreamRecord[]>([])
  }

  static filterMediaStreamRecordList$(
    mediaStreamRecordList$: Observable<MediaStreamRecord[]>,
    { source, kind }: FilterMediaStreamRecordArgs,
  ) {
    let filterMediaStreamRecordList$ = mediaStreamRecordList$

    if (source) {
      filterMediaStreamRecordList$ = filterMediaStreamRecordList$.pipe(
        map((mediaStreamRecordList) =>
          mediaStreamRecordList.filter(
            (mediaStreamRecord) => mediaStreamRecord.source === source,
          ),
        ),
      )
    }

    if (kind) {
      filterMediaStreamRecordList$ = filterMediaStreamRecordList$.pipe(
        map((mediaStreamRecordList) =>
          mediaStreamRecordList.filter((mediaStreamRecord) =>
            mediaStreamRecord.hasTrack(kind),
          ),
        ),
      )
    }

    return filterMediaStreamRecordList$
  }

  observeMediaStreamRecordList$({
    source,
    kind,
  }: FilterMediaStreamRecordArgs = {}) {
    return LocalParticipant.filterMediaStreamRecordList$(
      this.mediaStreamRecordList.asObservable(),
      { source, kind },
    )
  }

  getMediaStreamRecordList$({
    source,
    kind,
  }: FilterMediaStreamRecordArgs = {}) {
    return LocalParticipant.filterMediaStreamRecordList$(
      of(this.mediaStreamRecordList.value),
      { source, kind },
    )
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
      catchError(() => EMPTY),
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
      catchError(() => EMPTY),
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
    return this.getMediaStreamRecordList$({
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
    return this.getMediaStreamRecordList$({
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
