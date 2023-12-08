import { Subscription, BehaviorSubject, from, of, fromEvent } from 'rxjs'
import { tap, map, filter } from 'rxjs/operators'

class RemoteParticipant {
  id: string

  peerConnection: RTCPeerConnection

  mediaStreamList$: BehaviorSubject<MediaStream[]>

  subscription: Subscription

  constructor(id: string) {
    this.id = id
    this.peerConnection = new RTCPeerConnection()
    this.mediaStreamList$ = new BehaviorSubject<MediaStream[]>([])
    this.subscription = new Subscription()

    this.subscription.add(this.handleTrack$().subscribe())
  }

  observeMediaStreamList$() {
    return this.mediaStreamList$.asObservable()
  }

  createOffer$() {
    return from(this.peerConnection.createOffer()).pipe(
      tap((localSessionDescription) => {
        this.peerConnection.setLocalDescription(localSessionDescription)
      }),
    )
  }

  createAnswer$() {
    return from(this.peerConnection.createAnswer()).pipe(
      tap((localSessionDescription) => {
        this.peerConnection.setLocalDescription(localSessionDescription)
      }),
    )
  }

  receivedRemoteSessionDescription$(
    remoteSessionDescription: RTCSessionDescriptionInit,
  ) {
    return of(remoteSessionDescription).pipe(
      tap((remoteSDP) => {
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(remoteSDP),
        )
      }),
    )
  }

  observeIceCandidate$() {
    return fromEvent<RTCPeerConnectionIceEvent>(
      this.peerConnection,
      'icecandidate',
    ).pipe(
      map((event) => event.candidate),
      filter((candidate): candidate is RTCIceCandidate => !!candidate),
    )
  }

  addIceCandidate$(iceCandidate: RTCIceCandidateInit) {
    return from(this.peerConnection.addIceCandidate(iceCandidate))
  }

  handleTrack$() {
    return fromEvent<RTCTrackEvent>(this.peerConnection, 'track').pipe(
      tap((event) => {
        const { streams } = event
        streams.forEach((stream) => {
          const currentMediaStream = this.mediaStreamList$.value.find(
            (mediaStream) => mediaStream.id === stream.id,
          )
          if (currentMediaStream) {
            const currentTrack = currentMediaStream
              .getTracks()
              .find((track) => track.id === event.track.id)

            if (!currentTrack) {
              currentMediaStream.addTrack(event.track)
            }
          } else {
            this.mediaStreamList$.next([...this.mediaStreamList$.value, stream])
          }
        })
      }),
    )
  }

  clear() {
    this.peerConnection.getSenders().forEach((sender) => {
      this.peerConnection.removeTrack(sender)
    })
    this.peerConnection.close()
    this.mediaStreamList$.value.forEach((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
    })
    this.mediaStreamList$.complete()
    this.subscription.unsubscribe()
  }
}

export default RemoteParticipant
