import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

interface MediaStreamProps {
  displayMediaStream: MediaStream | null
  muted: boolean
  userMediaStream: MediaStream | null
}

const Wrapper = styled.div`
  display: flex;
  gap: 20px;
`

const Video = styled.video`
  width: 400px;
  background-color: black;
`

function MediaStream({
  userMediaStream,
  displayMediaStream,
  muted,
}: MediaStreamProps) {
  const localUserVideoElementRef = useRef<HTMLVideoElement>(null)
  const localDisplayMediaElementRef = useRef<HTMLVideoElement>(null)

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

  useEffect(() => {
    if (!localDisplayMediaElementRef.current || !displayMediaStream) {
      return () => {}
    }

    localDisplayMediaElementRef.current.srcObject = displayMediaStream

    return () => {
      if (localDisplayMediaElementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        localDisplayMediaElementRef.current.srcObject = null
      }
    }
  }, [displayMediaStream])

  return (
    <Wrapper>
      {userMediaStream && (
        <Video
          ref={localUserVideoElementRef}
          autoPlay
          playsInline
          muted={muted}
        />
      )}
      {displayMediaStream && (
        <Video
          ref={localDisplayMediaElementRef}
          autoPlay
          playsInline
          muted={muted}
        />
      )}
    </Wrapper>
  )
}

export default MediaStream
