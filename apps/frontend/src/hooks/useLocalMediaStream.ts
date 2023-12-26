import { useState, useEffect } from 'react'

import useLocalParticipant from '@/hooks/useLocalParticipant'

import type { SOURCE, KIND } from '@/models/LocalParticipant'
import type MediaStreamRecord from '@/models/MediaStreamRecord'

interface UseLocalMediaStreamProps {
  kind?: KIND
  source?: SOURCE
}

function useLocalMediaStreamRecord({ source, kind }: UseLocalMediaStreamProps) {
  const [mediaStreamRecordList, setMediaStreamRecordList] = useState<
    MediaStreamRecord[]
  >([])
  const [isVideoEnabled, setVideoEnabled] = useState(false)
  const [isAudioEnabled, setAudioEnabled] = useState(false)

  const localParticipant = useLocalParticipant()
  const mediaStreamRecord = mediaStreamRecordList[0]

  const handleToggleVideo = () => {
    if (!localParticipant) {
      return
    }
    localParticipant
      .setVideoEnabled$(!isVideoEnabled, mediaStreamRecord)
      .subscribe()
  }

  const handleToggleAudio = () => {
    if (!localParticipant) {
      return
    }
    localParticipant
      .setAudioEnabled$(!isAudioEnabled, mediaStreamRecord)
      .subscribe()
  }

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const subscription = localParticipant
      .observeMediaStreamRecordList$({ source, kind })
      .subscribe(setMediaStreamRecordList)

    return () => {
      subscription.unsubscribe()
    }
  }, [kind, localParticipant, source])

  useEffect(() => {
    if (!mediaStreamRecord) {
      return () => {}
    }

    const videoEnabledSubscription =
      mediaStreamRecord.videoEnabledNotifier.subscribe(setVideoEnabled)
    const audioEnabledSubscription =
      mediaStreamRecord.audioEnabledNotifier.subscribe(setAudioEnabled)

    return () => {
      videoEnabledSubscription.unsubscribe()
      audioEnabledSubscription.unsubscribe()
    }
  }, [mediaStreamRecord])

  return {
    mediaStreamRecord,
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
  }
}

export default useLocalMediaStreamRecord
