import { useState, useEffect } from 'react'

import useLocalParticipant from '@/hooks/useLocalParticipant'

function useTrack(mediaStream?: MediaStream) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  const localParticipant = useLocalParticipant()

  const handleToggleVideo = () => {
    if (!localParticipant || !mediaStream) {
      return
    }
    localParticipant.setVideoEnabled$(!isVideoEnabled, mediaStream).subscribe()
  }

  const handleToggleAudio = () => {
    if (!localParticipant || !mediaStream) {
      return
    }
    localParticipant.setAudioEnabled$(!isAudioEnabled, mediaStream).subscribe()
  }

  useEffect(() => {
    if (!localParticipant || !mediaStream) {
      return () => {}
    }

    const trackEnabledSubscription = localParticipant
      .observeTrackEnabled$(mediaStream)
      .subscribe(({ video, audio }) => {
        setIsVideoEnabled(video)
        setIsAudioEnabled(audio)
      })

    return () => {
      trackEnabledSubscription.unsubscribe()
    }
  }, [localParticipant, mediaStream])

  return {
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
  }
}

export default useTrack
