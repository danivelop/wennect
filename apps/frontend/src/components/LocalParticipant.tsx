import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import useLocalMediaStream from '@/hooks/useLocalMediaStream'
import useLocalTrack from '@/hooks/useLocalTrack'
import useRemoteMediaStream from '@/hooks/useRemoteMediaStream'

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

  const {
    localUserMediaStreamList,
    localDisplayMediaStreamList,
    handleAddDisplayMediaStream,
    handleRemoveMediaStream,
  } = useLocalMediaStream()

  const localUserMediaStream = localUserMediaStreamList[0]
  const localDisplayMediaStream = localDisplayMediaStreamList[0]

  const {
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
  } = useLocalTrack(localUserMediaStream)

  const { remoteMediaStreamList } = useRemoteMediaStream()

  const handleScreenShare = () => {
    if (localDisplayMediaStream) {
      handleRemoveMediaStream(localDisplayMediaStream)
    } else {
      handleAddDisplayMediaStream({ video: true })
    }
  }

  useEffect(() => {
    const subscription = WebRTCService.enter()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!localUserVideoElementRef.current || !localUserMediaStream) {
      return () => {}
    }

    localUserVideoElementRef.current.srcObject = localUserMediaStream

    return () => {
      if (localUserVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localUserVideoElementRef.current.srcObject = null
      }
    }
  }, [localUserMediaStream])

  useEffect(() => {
    if (!localDisplayVideoElementRef.current || !localDisplayMediaStream) {
      return () => {}
    }

    localDisplayVideoElementRef.current.srcObject = localDisplayMediaStream

    return () => {
      if (localDisplayVideoElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localDisplayVideoElementRef.current.srcObject = null
      }
    }
  }, [localDisplayMediaStream])

  return (
    <Layout>
      {localUserMediaStream && (
        <Video ref={localUserVideoElementRef} autoPlay playsInline muted />
      )}
      {localDisplayMediaStream && (
        <Video ref={localDisplayVideoElementRef} autoPlay playsInline muted />
      )}
      {remoteMediaStreamList.map((remoteMediaStream) => {
        return (
          <Video
            key={remoteMediaStream.id}
            ref={(videoElement) => {
              if (videoElement) {
                videoElement.srcObject = remoteMediaStream
              }
            }}
            autoPlay
            playsInline
            muted
          />
        )
      })}
      <ControlButtons>
        <ControlButton $enabled={isVideoEnabled} onClick={handleToggleVideo}>
          비디오 toggle
        </ControlButton>
        <ControlButton $enabled={isAudioEnabled} onClick={handleToggleAudio}>
          오디오 toggle
        </ControlButton>
        <ControlButton
          $enabled={!!localDisplayMediaStream}
          onClick={handleScreenShare}
        >
          화면공유
        </ControlButton>
      </ControlButtons>
    </Layout>
  )
}

export default LocalVideo
