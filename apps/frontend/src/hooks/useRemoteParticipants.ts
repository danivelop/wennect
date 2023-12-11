import { useState, useEffect } from 'react'

import WebRTCService from '@/services/WebRTCService'

import type RemoteParticipant from '@/models/RemoteParticipant'

function useRemoteParticipants() {
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([])

  useEffect(() => {
    const subscription = WebRTCService.observeRemoteParticipants$().subscribe(
      setRemoteParticipants,
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return remoteParticipants
}

export default useRemoteParticipants
