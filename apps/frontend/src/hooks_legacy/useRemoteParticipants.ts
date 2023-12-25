import { useState, useEffect } from 'react'

import WebRTCService from '@/services_legacy/WebRTCService'

import type RemoteParticipant from '@/models_legacy/RemoteParticipant'

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
