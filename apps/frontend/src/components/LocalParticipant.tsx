import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import useLocalParticipant from '@/hooks/useLocalParticipant'
import useMediaStreamManager from '@/hooks/useMediaStreamManager'
import useTrackEnabled from '@/hooks/useTrackEnabled'

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

function LocalVideo() {
  const localUserVideoElementRef = useRef<HTMLVideoElement>(null)
  const localDisplayVideoElementRef = useRef<HTMLVideoElement>(null)

  const localParticipant = useLocalParticipant()

  const localUserMediaStreamManager = useMediaStreamManager({
    source: MEDIA_STREAM.SOURCE.USER,
  })[0]
  const localDisplayMediaStreamManager = useMediaStreamManager({
    source: MEDIA_STREAM.SOURCE.DISPLAY,
  })[0]
  const { isVideoEnabled, isAudioEnabled } = useTrackEnabled(
    localUserMediaStreamManager,
  )

  const handleToggleVideo = () => {
    WebRTCService.setLocalVideoEnabled(!isVideoEnabled)
  }

  const handleToggleAudio = () => {
    WebRTCService.setLocalAudioEnabled(!isAudioEnabled)
  }

  const handleScreenShare = () => {
    if (!localParticipant) {
      return
    }

    if (localDisplayMediaStreamManager) {
      WebRTCService.removeLocalDisplayMediaStreamManager()
    } else {
      WebRTCService.addLocalDisplayMediaStreamManager()
    }
  }

  useEffect(() => {
    WebRTCService.enter()

    return () => {
      WebRTCService.exit()
    }
  }, [])

  useEffect(() => {
    if (!localUserVideoElementRef.current || !localUserMediaStreamManager) {
      return () => {}
    }

    localUserVideoElementRef.current.srcObject =
      localUserMediaStreamManager.mediaStream

    return () => {
      if (localUserVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localUserVideoElementRef.current.srcObject = null
      }
    }
  }, [localUserMediaStreamManager])

  useEffect(() => {
    if (
      !localDisplayVideoElementRef.current ||
      !localDisplayMediaStreamManager
    ) {
      return () => {}
    }

    localDisplayVideoElementRef.current.srcObject =
      localDisplayMediaStreamManager.mediaStream

    return () => {
      if (localDisplayVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localDisplayVideoElementRef.current.srcObject = null
      }
    }
  }, [localDisplayMediaStreamManager])

  return (
    <Layout>
      {localUserMediaStreamManager && (
        <Video ref={localUserVideoElementRef} autoPlay playsInline muted />
      )}
      {localDisplayMediaStreamManager && (
        <Video ref={localDisplayVideoElementRef} autoPlay playsInline muted />
      )}
      <ControlButtons>
        <ControlButton $enabled={isVideoEnabled} onClick={handleToggleVideo}>
          비디오 toggle
        </ControlButton>
        <ControlButton $enabled={isAudioEnabled} onClick={handleToggleAudio}>
          오디오 toggle
        </ControlButton>
        <ControlButton
          $enabled={!!localDisplayMediaStreamManager}
          onClick={handleScreenShare}
        >
          화면공유
        </ControlButton>
      </ControlButtons>
    </Layout>
  )
}

export default LocalVideo
