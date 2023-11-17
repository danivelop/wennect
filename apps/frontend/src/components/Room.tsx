import type React from 'react'

import { useEffect, useState } from 'react'

import WebRTCService from '@/services/WebRTCService'

interface RoomPrips {
  children: React.ReactNode
}

function Room({ children }: RoomPrips) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const subscription = WebRTCService.enter().subscribe()
    setEntered(true)

    return () => {
      subscription.unsubscribe()
      setEntered(false)
    }
  }, [])

  if (!entered) {
    return null
  }

  return children
}

export default Room
