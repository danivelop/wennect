import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import useLocalMediaStream from '@/hooks/useLocalMediaStream'

const Video = styled.video`
  width: 400px;
  height: 300px;
  background-color: black;
`

function LocalVideo() {
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const localUserMediaStreamList = useLocalMediaStream(MEDIA_STREAM.SOURCE.USER)

  useEffect(() => {
    if (!videoElementRef.current) {
      return
    }

    const useMediaStream = localUserMediaStreamList[0]

    videoElementRef.current.srcObject = useMediaStream
  }, [localUserMediaStreamList])

  return <Video ref={videoElementRef} autoPlay playsInline muted />
}

export default LocalVideo
