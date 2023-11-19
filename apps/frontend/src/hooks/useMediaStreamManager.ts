import { useState, useEffect } from 'react'

import useLocalParticipant from '@/hooks/useLocalParticipant'

import type { MediaStreamType } from '@/constants/MediaStream'
import type MediaStreamManager from '@/models/MediaStreamManager'

interface UseMediaStreamManagerProps {
  source?: MediaStreamType['SOURCE']
}

function useMediaStreamManager({ source }: UseMediaStreamManagerProps = {}) {
  const [mediaStreamManagerList, setMediaStreamManagerList] = useState<
    MediaStreamManager[]
  >([])

  const localParticipant = useLocalParticipant()

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const subscription = localParticipant
      .getMediaStreamManagerList$(source)
      .subscribe(setMediaStreamManagerList)

    return () => {
      subscription.unsubscribe()
    }
  }, [localParticipant, source])

  return mediaStreamManagerList
}

export default useMediaStreamManager
