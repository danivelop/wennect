import { Server as SocketServer, Socket } from 'socket.io'

import { Server } from 'http'

import { SOCKET } from '@/constants/Socket'

class SocketService {
  private io: SocketServer

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
      },
    })
  }

  static enter(socket: Socket) {
    socket.on(SOCKET.EVENT.ENTER, (roomId: string) => {
      socket.join(roomId)
      socket.to(roomId).emit(SOCKET.EVENT.ENTER, socket.id)
    })
  }

  static leave(socket: Socket) {
    socket.on(SOCKET.EVENT.LEAVE, (roomId: string) => {
      socket.leave(roomId)
      socket.to(roomId).emit(SOCKET.EVENT.LEAVE, socket.id)
    })
  }

  initialize() {
    this.io.on('connection', (socket: Socket) => {
      SocketService.enter(socket)
      SocketService.leave(socket)
      this.iceCandidate(socket)
      this.offer(socket)
      this.answer(socket)
    })
  }

  iceCandidate(socket: Socket) {
    socket.on(SOCKET.EVENT.ICE_CANDIDATE, (remoteId: string, iceCandidate) => {
      this.io
        .to(remoteId)
        .emit(SOCKET.EVENT.ICE_CANDIDATE, socket.id, iceCandidate)
    })
  }

  offer(socket: Socket) {
    socket.on(SOCKET.EVENT.OFFER, (remoteId: string, sessionDescription) => {
      this.io
        .to(remoteId)
        .emit(SOCKET.EVENT.OFFER, socket.id, sessionDescription)
    })
  }

  answer(socket: Socket) {
    socket.on(SOCKET.EVENT.ANSWER, (remoteId: string, sessionDescription) => {
      this.io
        .to(remoteId)
        .emit(SOCKET.EVENT.ANSWER, socket.id, sessionDescription)
    })
  }
}

export default SocketService
