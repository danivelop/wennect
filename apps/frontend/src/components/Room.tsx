import React, { useEffect } from 'react'
import styled from 'styled-components'

import WebRTCService from '@/services/WebRTCService'

import LocalParticipant from '@/components/LocalParticipant'
import RemoteParticipant from '@/components/RemoteParticipant'
import useRemoteParticipants from '@/hooks/useRemoteParticipants'

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

function Room() {
  const remoteParticipants = useRemoteParticipants()

  useEffect(() => {
    const subscription = WebRTCService.enter()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <Layout>
      <LocalParticipant />
      {remoteParticipants.map((remoteParticipant) => (
        <RemoteParticipant
          key={remoteParticipant.id}
          participant={remoteParticipant}
        />
      ))}
    </Layout>
  )
}

export default Room
