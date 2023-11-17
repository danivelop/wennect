import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import useLocalMediaStreamManager from '@/hooks/useLocalMediaStreamManager'

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 400px;
`

const UserMedia = styled.video`
  width: 100%;
  height: 300px;
  background-color: black;
`

const ControlButtons = styled.div`
  width: 100%;
`

const ControlButton = styled.button`
  width: 100px;
  height: 30px;
`

function LocalVideo() {
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const localUserMediaStreamManagerList = useLocalMediaStreamManager(
    MEDIA_STREAM.SOURCE.USER,
  )
  const localUserMediaStreamManager = localUserMediaStreamManagerList[0]

  useEffect(() => {
    if (!videoElementRef.current || !localUserMediaStreamManager) {
      return
    }

    const userMediaStream = localUserMediaStreamManager.mediaStream

    videoElementRef.current.srcObject = userMediaStream
  }, [localUserMediaStreamManager])

  return (
    <Layout>
      <UserMedia ref={videoElementRef} autoPlay playsInline muted />
      <ControlButtons>
        <ControlButton>비디오 toggle</ControlButton>
        <ControlButton>오디오 toggle</ControlButton>
      </ControlButtons>
    </Layout>
  )
}

export default LocalVideo
