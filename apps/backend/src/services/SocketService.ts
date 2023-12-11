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
      SocketService.join(socket)
      SocketService.leave(socket)
      this.getParticipants(socket)
      this.offer(socket)
      this.answer(socket)
      this.iceCandidate(socket)
    })
  }

  static join(socket: Socket) {
    socket.on(SOCKET.EVENT.JOIN, (roomId: string) => {
      socket.join(roomId)
      socket.emit(SOCKET.EVENT.JOIN, socket.id)
    })
  }

  static leave(socket: Socket) {
    socket.on(SOCKET.EVENT.LEAVE, (roomId: string) => {
      socket.leave(roomId)
      socket.to(roomId).emit(SOCKET.EVENT.LEAVE, socket.id)
    })
  }

  // 임시 로직. 추후에는 rest api로 대체 필요
  getParticipants(socket: Socket) {
    socket.on('participants', () => {
      socket.emit(
        'participants',
        Array.from(
          this.io.sockets.adapter.rooms.get('room1')?.keys() ?? [],
        ).filter((id) => id !== socket.id),
      )
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

  iceCandidate(socket: Socket) {
    socket.on(SOCKET.EVENT.ICECANDIDATE, (remoteId: string, icecandidate) => {
      this.io
        .to(remoteId)
        .emit(SOCKET.EVENT.ICECANDIDATE, socket.id, icecandidate)
    })
  }
}

export default SocketService
