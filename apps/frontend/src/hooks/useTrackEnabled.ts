import { useState, useEffect } from 'react'

import type MediaStreamManager from '@/models/MediaStreamManager'

function useTrackEnabled(mediaStreamManager?: MediaStreamManager) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  useEffect(() => {
    if (!mediaStreamManager) {
      return () => {}
    }

    const videoEnabledSubscription = mediaStreamManager
      .observeVideoEnabled$()
      .subscribe(setIsVideoEnabled)
    const audioEnabledSubscription = mediaStreamManager
      .observeAudioEnabled$()
      .subscribe(setIsAudioEnabled)

    return () => {
      videoEnabledSubscription.unsubscribe()
      audioEnabledSubscription.unsubscribe()
    }
  }, [mediaStreamManager])

  return {
    isVideoEnabled,
    isAudioEnabled,
  }
}

export default useTrackEnabled
