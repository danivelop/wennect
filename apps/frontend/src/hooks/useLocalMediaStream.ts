import { useState, useEffect } from 'react'

import useLocalParticipant from '@/hooks/useLocalParticipant'

function useLocalMediaStream() {
  const [userMediaStream, setUserMediaStream] = useState<MediaStream | null>(
    null,
  )
  const [isVideoEnabled, setVideoEnabled] = useState<boolean>(false)
  const [isAudioEnabled, setAudioEnabled] = useState<boolean>(false)
  const [displayMediaStream, setDisplayMediaStream] =
    useState<MediaStream | null>(null)

  const localParticipant = useLocalParticipant()

  const handleToggleVideo = () => {
    if (!localParticipant) {
      return
    }

    localParticipant.setVideoEnabled$(!isVideoEnabled).subscribe()
  }

  const handleToggleAudio = () => {
    if (!localParticipant) {
      return
    }

    localParticipant.setAudioEnabled$(!isAudioEnabled).subscribe()
  }

  const handleToggleDisplayMedia = () => {
    if (!localParticipant) {
      return
    }

    if (displayMediaStream) {
      localParticipant.deleteMediaStream(displayMediaStream)
    } else {
      localParticipant.upsertDisplayMediaStream$({ video: true }).subscribe()
    }
  }

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const userMediaStreamSubscription =
      localParticipant.userMediaStream$.subscribe(setUserMediaStream)
    const displayMediaStreamSubscription =
      localParticipant.displayMediaStream$.subscribe(setDisplayMediaStream)

    return () => {
      userMediaStreamSubscription.unsubscribe()
      displayMediaStreamSubscription.unsubscribe()
    }
  }, [localParticipant])

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const trackEnabledSubscription =
      localParticipant.trackEnabledNotifier$.subscribe(({ video, audio }) => {
        setVideoEnabled(video)
        setAudioEnabled(audio)
      })

    return () => {
      trackEnabledSubscription.unsubscribe()
    }
  }, [localParticipant])

  return {
    userMediaStream,
    displayMediaStream,
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
    handleToggleDisplayMedia,
  }
}

export default useLocalMediaStream
