import { useState, useEffect } from 'react'

import useLocalParticipant from './useLocalParticipant'

import type { MediaStreamType } from '@/constants/MediaStream'
import type MediaStreamManager from '@/models/MediaStreamManager'

function useLocalMediaStreamManager(
  mediaStreamSource?: MediaStreamType['SOURCE'],
) {
  const [mediaStreamManagerList, setMediaStreamManagerList] = useState<
    MediaStreamManager[]
  >([])
  const localParticipant = useLocalParticipant()

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const subscription = localParticipant
      .getMediaStreamManagerList$(mediaStreamSource)
      .subscribe(setMediaStreamManagerList)

    return () => {
      subscription.unsubscribe()
    }
  }, [localParticipant, mediaStreamSource])

  return mediaStreamManagerList
}

export default useLocalMediaStreamManager
