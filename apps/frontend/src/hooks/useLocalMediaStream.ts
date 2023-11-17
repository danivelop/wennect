import { useState, useEffect } from 'react'

import WebRTCService from '@/services/WebRTCService'

import type { MediaStreamType } from '@/constants/MediaStream'

function useLocalMediaStream(mediaStreamSource?: MediaStreamType['SOURCE']) {
  const [mediaStreamList, setMediaStreamList] = useState<MediaStream[]>([])

  useEffect(() => {
    const subscription =
      WebRTCService.getLocalMediaStreamList$(mediaStreamSource).subscribe(
        setMediaStreamList,
      )

    return () => {
      subscription.unsubscribe()
    }
  }, [mediaStreamSource])

  return mediaStreamList
}

export default useLocalMediaStream
