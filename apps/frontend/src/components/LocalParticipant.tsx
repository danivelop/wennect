import React from 'react'
import styled from 'styled-components'

import MediaStream from '@/components/MediaStream'
import useLocalMediaStream from '@/hooks/useLocalMediaStream'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
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

function LocalParticipant() {
  const {
    userMediaStream,
    displayMediaStream,
    isVideoEnabled,
    isAudioEnabled,
    handleToggleVideo,
    handleToggleAudio,
    handleToggleDisplayMedia,
  } = useLocalMediaStream()

  return (
    <Wrapper>
      <MediaStream
        userMediaStream={userMediaStream}
        displayMediaStream={displayMediaStream}
        muted
      />
      <ControlButtons>
        <ControlButton $enabled={isVideoEnabled} onClick={handleToggleVideo}>
          비디오 toggle
        </ControlButton>
        <ControlButton $enabled={isAudioEnabled} onClick={handleToggleAudio}>
          오디오 toggle
        </ControlButton>
        <ControlButton
          $enabled={!!displayMediaStream}
          onClick={handleToggleDisplayMedia}
        >
          화면공유
        </ControlButton>
      </ControlButtons>
    </Wrapper>
  )
}

export default LocalParticipant
