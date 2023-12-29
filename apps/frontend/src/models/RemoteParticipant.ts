import type LocalParticipant from '@/models/LocalParticipant'
import type { Socket } from 'socket.io-client'

class RemoteParticipant {
  id: string

  socket: Socket

  localParticipant: LocalParticipant

  constructor(id: string, socket: Socket, localParticipant: LocalParticipant) {
    this.id = id
    this.socket = socket
    this.localParticipant = localParticipant
  }

  // eslint-disable-next-line class-methods-use-this
  clear() {}
}

export default RemoteParticipant
