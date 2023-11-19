import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import { MEDIA_STREAM } from '@/constants/MediaStream'
import useLocalParticipant from '@/hooks/useLocalParticipant'
import useMediaStreamManager from '@/hooks/useMediaStreamManager'

import type { Subscription } from 'rxjs'

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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false)
  const localUserVideoElementRef = useRef<HTMLVideoElement>(null)
  const localDisplayVideoElementRef = useRef<HTMLVideoElement>(null)
  const displaySubscriptionRef = useRef<Subscription | null>(null)

  const localParticipant = useLocalParticipant()

  const localUserMediaStreamManager = useMediaStreamManager({
    source: MEDIA_STREAM.SOURCE.USER,
  })[0]
  const localDisplayMediaStreamManager = useMediaStreamManager({
    source: MEDIA_STREAM.SOURCE.DISPLAY,
  })[0]

  const handleToggleVideo = () => {
    if (!localParticipant) {
      return
    }
    if (!localUserMediaStreamManager) {
      localParticipant.addUserMediaStreamManager(
        {
          video: true,
        },
        {
          next: ({ video }) => {
            setIsVideoEnabled(video)
          },
          error: () => {},
        },
      )
      return
    }
    if (!localUserMediaStreamManager.hasVideoTrack()) {
      localUserMediaStreamManager.addUserMediaStreamTrack(
        { video: true },
        {
          next: ({ video }) => {
            setIsVideoEnabled(video)
          },
          error: () => {},
        },
      )
      return
    }
    if (localUserMediaStreamManager.setVideoEnabled(!isVideoEnabled)) {
      setIsVideoEnabled((prev) => !prev)
    }
  }

  const handleToggleAudio = () => {
    if (!localParticipant) {
      return
    }
    if (!localUserMediaStreamManager) {
      localParticipant.addUserMediaStreamManager(
        {
          audio: true,
        },
        {
          next: ({ audio }) => {
            setIsAudioEnabled(audio)
          },
          error: () => {},
        },
      )
      return
    }
    if (!localUserMediaStreamManager.hasAudioTrack()) {
      localUserMediaStreamManager.addUserMediaStreamTrack(
        { audio: true },
        {
          next: ({ audio }) => {
            setIsAudioEnabled(audio)
          },
          error: () => {},
        },
      )
      return
    }
    if (localUserMediaStreamManager.setAudioEnabled(!isAudioEnabled)) {
      setIsAudioEnabled((prev) => !prev)
    }
  }

  const handleScreenShare = () => {
    if (!localParticipant) {
      return
    }

    if (isScreenShareEnabled) {
      displaySubscriptionRef.current?.unsubscribe()
      setIsScreenShareEnabled(false)
    } else {
      displaySubscriptionRef.current =
        localParticipant.addDisplayMediaStreamManager(
          { video: true },
          {
            next: () => {
              setIsScreenShareEnabled(true)
            },
            error: () => {},
            complete: () => {
              setIsScreenShareEnabled(false)
            },
          },
        )
    }
  }

  useEffect(() => {
    const subscription = WebRTCService.enter(
      { video: true, audio: true },
      {
        next: ({ video, audio }) => {
          setIsVideoEnabled(video)
          setIsAudioEnabled(audio)
        },
        error: () => {},
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!localUserVideoElementRef.current || !localUserMediaStreamManager) {
      return
    }

    localUserVideoElementRef.current.srcObject =
      localUserMediaStreamManager.mediaStream
  }, [localUserMediaStreamManager])

  useEffect(() => {
    if (
      !localDisplayVideoElementRef.current ||
      !localDisplayMediaStreamManager
    ) {
      return
    }

    localDisplayVideoElementRef.current.srcObject =
      localDisplayMediaStreamManager.mediaStream
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
          $enabled={isScreenShareEnabled}
          onClick={handleScreenShare}
        >
          화면공유
        </ControlButton>
      </ControlButtons>
    </Layout>
  )
}

export default LocalVideo
