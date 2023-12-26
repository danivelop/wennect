import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import useLocalMediaStreamRecord from '@/hooks/useLocalMediaStream'
import { SOURCE, KIND } from '@/models/LocalParticipant'

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
  const localUserAudioElementRef = useRef<HTMLAudioElement>(null)

  const {
    mediaStreamRecord: localUserVideoRecord,
    isVideoEnabled,
    handleToggleVideo,
  } = useLocalMediaStreamRecord({
    source: SOURCE.USER,
    kind: KIND.VIDEO,
  })
  const {
    mediaStreamRecord: localUserAudioRecord,
    isAudioEnabled,
    handleToggleAudio,
  } = useLocalMediaStreamRecord({
    source: SOURCE.USER,
    kind: KIND.AUDIO,
  })

  useEffect(() => {
    const subscription = WebRTCService.enter()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!localUserVideoElementRef.current || !localUserVideoRecord) {
      return () => {}
    }

    localUserVideoElementRef.current.srcObject =
      localUserVideoRecord.mediaStream

    return () => {
      if (localUserVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localUserVideoElementRef.current.srcObject = null
      }
    }
  }, [localUserVideoRecord])

  useEffect(() => {
    if (!localUserAudioElementRef.current || !localUserAudioRecord) {
      return () => {}
    }

    localUserAudioElementRef.current.srcObject =
      localUserAudioRecord.mediaStream

    return () => {
      if (localUserAudioElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localUserAudioElementRef.current.srcObject = null
      }
    }
  }, [localUserAudioRecord])

  return (
    <Layout>
      {localUserVideoRecord && (
        <Video ref={localUserVideoElementRef} autoPlay playsInline />
      )}
      {localUserAudioRecord && (
        <audio ref={localUserAudioElementRef} autoPlay muted />
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
