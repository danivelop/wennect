import { useState, useEffect } from 'react'
import { Subscription } from 'rxjs'

import useLocalParticipant from '@/hooks/useLocalParticipant'
import { MEDIA_STREAM_KIND } from '@/models/LocalParticipant'

function useLocalMediaStream() {
  const [localUserMediaStreamList, setLocalUserMediaStreamList] = useState<
    MediaStream[]
  >([])
  const [localDisplayMediaStreamList, setLocalDisplayMediaStreamList] =
    useState<MediaStream[]>([])

  const localParticipant = useLocalParticipant()

  const handleAddDisplayMediaStream = (constraints: MediaStreamConstraints) => {
    localParticipant?.addDisplayMedia$(constraints).subscribe()
  }

  const handleRemoveMediaStream = (mediaStream: MediaStream) => {
    localParticipant?.removeMediaStream$(mediaStream).subscribe()
  }

  useEffect(() => {
    if (!localParticipant) {
      return () => {}
    }

    const subscription = new Subscription()

    subscription.add(
      localParticipant
        .observeMediaStreamList$(MEDIA_STREAM_KIND.USER)
        .subscribe(setLocalUserMediaStreamList),
    )
    subscription.add(
      localParticipant
        .observeMediaStreamList$(MEDIA_STREAM_KIND.DISPLAY)
        .subscribe(setLocalDisplayMediaStreamList),
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [localParticipant])

  return {
    localUserMediaStreamList,
    localDisplayMediaStreamList,
    handleAddDisplayMediaStream,
    handleRemoveMediaStream,
  }
}

export default useLocalMediaStream
