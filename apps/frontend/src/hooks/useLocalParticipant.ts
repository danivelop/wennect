import { useState, useEffect } from 'react'

import WebRTCService from '@/services/WebRTCService'

import type LocalParticipant from '@/models/LocalParticipant'

function useLocalParticipant() {
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null)

  useEffect(() => {
    const subscription =
      WebRTCService.getLocalParticipant$().subscribe(setLocalParticipant)

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return localParticipant
}

export default useLocalParticipant
