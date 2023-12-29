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

  initialize() {
    this.io.on('connection', (socket: Socket) => {
      this.join(socket)
      SocketService.leave(socket)
      this.offer(socket)
      this.answer(socket)
      this.iceCandidate(socket)
    })
  }

  join(socket: Socket) {
    socket.on(SOCKET.EVENT.ON.JOIN, (roomId: string) => {
      const participantIds = Array.from(
        this.io.sockets.adapter.rooms.get(roomId)?.keys() ?? [],
      )
      socket.join(roomId)
      socket.emit(SOCKET.EVENT.EMIT.LOCAL_JOIN, socket.id, participantIds)
      socket.to(roomId).emit(SOCKET.EVENT.EMIT.REMOTE_JOIN, socket.id)
    })
  }

  static leave(socket: Socket) {
    socket.on(SOCKET.EVENT.ON.LEAVE, (roomId: string) => {
      socket.leave(roomId)
      socket.to(roomId).emit(SOCKET.EVENT.EMIT.REMOTE_LEAVE, socket.id)
    })
  }

  offer(socket: Socket) {
    socket.on(SOCKET.EVENT.ON.OFFER, (remoteId: string, sessionDescription) => {
      this.io
        .to(remoteId)
        .emit(SOCKET.EVENT.EMIT.OFFER, socket.id, sessionDescription)
    })
  }

  answer(socket: Socket) {
    socket.on(
      SOCKET.EVENT.ON.ANSWER,
      (remoteId: string, sessionDescription) => {
        this.io
          .to(remoteId)
          .emit(SOCKET.EVENT.EMIT.ANSWER, socket.id, sessionDescription)
      },
    )
  }

  iceCandidate(socket: Socket) {
    socket.on(
      SOCKET.EVENT.ON.ICECANDIDATE,
      (remoteId: string, icecandidate) => {
        this.io
          .to(remoteId)
          .emit(SOCKET.EVENT.EMIT.ICECANDIDATE, socket.id, icecandidate)
      },
    )
  }
}

export default SocketService
