import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import useLocalMediaStream from '@/hooks/useLocalMediaStream'

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 400px;
`

const Video = styled.video`
  width: 100%;
  height: 300px;
  background-color: black;
`

const ControlButtons = styled.div`
  width: 100%;
`

const ControlButton = styled.button<{ $enabled: boolean }>`
  width: 100px;
  height: 30px;

  ${({ $enabled }) =>
    $enabled
      ? `
    background-color: green;
  `
      : `
    background-color: red;
  `}
`

function Room() {
  const localUserVideoElementRef = useRef<HTMLVideoElement>(null)

  const {
    userMediaStream,
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
  } = useLocalMediaStream()

  useEffect(() => {
    const subscription = WebRTCService.enter()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!localUserVideoElementRef.current || !userMediaStream) {
      return () => {}
    }

    localUserVideoElementRef.current.srcObject = userMediaStream

    return () => {
      if (localUserVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localUserVideoElementRef.current.srcObject = null
      }
    }
  }, [userMediaStream])

  return (
    <Layout>
      {userMediaStream && (
        <Video ref={localUserVideoElementRef} autoPlay playsInline />
      )}
      <ControlButtons>
        <ControlButton $enabled={isVideoEnabled} onClick={handleToggleVideo}>
          비디오 toggle
        </ControlButton>
        <ControlButton $enabled={isAudioEnabled} onClick={handleToggleAudio}>
          오디오 toggle
        </ControlButton>
        {/* <ControlButton
          $enabled={!!localDisplayMediaStream}
          onClick={handleScreenShare}
        >
          화면공유
        </ControlButton> */}
      </ControlButtons>
    </Layout>
  )
}

export default Room
