import React from 'react'

import MediaStream from '@/components/MediaStream'
import useRemoteMediaStream from '@/hooks/useRemoteMediaStream'

import type RemoteParticipantModel from '@/models/RemoteParticipant'

interface RemoteParticipantProps {
  participant: RemoteParticipantModel
}

function RemoteParticipant({ participant }: RemoteParticipantProps) {
  const { userMediaStream, displayMediaStream } =
    useRemoteMediaStream(participant)

  return (
    <MediaStream
      userMediaStream={userMediaStream}
      displayMediaStream={displayMediaStream}
      muted={false}
    />
  )
}

export default RemoteParticipant
