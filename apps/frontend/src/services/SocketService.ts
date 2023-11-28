import { io } from 'socket.io-client'

import type { Socket } from 'socket.io-client'

class SocketService {
  socket: Socket | null = null

  connect() {
    this.socket = io('https://localhost:4000')
  }

  clear() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket.removeAllListeners()
      this.socket = null
    }
  }
}

export default new SocketService()
