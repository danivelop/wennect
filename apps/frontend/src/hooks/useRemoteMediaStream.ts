import { useState, useEffect } from 'react'

import type RemoteParticipant from '@/models/RemoteParticipant'

function useRemoteMediaStream(participant: RemoteParticipant) {
  const [userMediaStream, setUserMediaStream] = useState<MediaStream | null>(
    null,
  )
  const [displayMediaStream, setDisplayMediaStream] =
    useState<MediaStream | null>(null)

  useEffect(() => {
    const userMediaStreamSubscription =
      participant.userMediaStream$.subscribe(setUserMediaStream)
    const displayMediaStreamSubscription =
      participant.displayMediaStream$.subscribe(setDisplayMediaStream)

    return () => {
      userMediaStreamSubscription.unsubscribe()
      displayMediaStreamSubscription.unsubscribe()
    }
  }, [participant])

  return {
    userMediaStream,
    displayMediaStream,
  }
}

export default useRemoteMediaStream
