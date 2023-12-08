import { useState, useEffect } from 'react'

import useLocalParticipant from '@/hooks/useLocalParticipant'

import type { MediaStreamKindType } from '@/models/LocalParticipant'

interface UseMediaStreamManagerProps {
  source?: MediaStreamKindType
}

function useMediaStream({ source }: UseMediaStreamManagerProps) {
  const [mediaStreamList, setMediaStreamList] = useState<MediaStream[]>([])

  const localParticipant = useLocalParticipant()

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const subscription = localParticipant
      .observeMediaStreamList$(source)
      .subscribe(setMediaStreamList)

    return () => {
      subscription.unsubscribe()
    }
  }, [localParticipant, source])

  return mediaStreamList
}

export default useMediaStream
