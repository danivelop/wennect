import { Server as SocketServer, Socket } from 'socket.io'

import { Server } from 'http'

import { SOCKET } from '@/constants/Socket'

class SocketService {
  private io: SocketServer

  private participants = new Map<string, Set<string>>()

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
      },
    })
  }

  join(socket: Socket) {
    socket.on(SOCKET.EVENT.JOIN, (roomId: string) => {
      socket.join(roomId)
      socket.emit(
        SOCKET.EVENT.JOIN,
        socket.id,
        Array.from(this.participants.keys()),
      )
      this.participants.set(socket.id, new Set())
    })
  }

  leave(socket: Socket) {
    socket.on(SOCKET.EVENT.LEAVE, (roomId: string) => {
      socket.leave(roomId)
      this.participants.delete(socket.id)
    })
  }

  initialize() {
    this.io.on('connection', (socket: Socket) => {
      this.join(socket)
      this.leave(socket)
      this.participate(socket)
      this.withdraw(socket)
      this.offer(socket)
      this.answer(socket)
      this.iceCandidate(socket)
    })
  }

  participate(socket: Socket) {
    socket.on(SOCKET.EVENT.PARTICIPATE, (remoteId) => {
      const sourceParticipants = this.participants.get(socket.id)
      const targetParticipants = this.participants.get(remoteId)

      if (
        sourceParticipants &&
        !sourceParticipants.has(remoteId) &&
        targetParticipants &&
        !targetParticipants.has(socket.id)
      ) {
        this.io.to(remoteId).emit(SOCKET.EVENT.PARTICIPATE, socket.id)
        sourceParticipants.add(remoteId)
        targetParticipants.add(socket.id)
      }
    })
  }

  withdraw(socket: Socket) {
    socket.on(SOCKET.EVENT.WITHDRAW, (remoteId: string) => {
      const sourceParticipants = this.participants.get(socket.id)
      const targetParticipants = this.participants.get(remoteId)

      if (
        sourceParticipants &&
        sourceParticipants.has(remoteId) &&
        targetParticipants &&
        targetParticipants.has(socket.id)
      ) {
        this.io.to(remoteId).emit(SOCKET.EVENT.WITHDRAW, socket.id)
        sourceParticipants.delete(remoteId)
        targetParticipants.delete(socket.id)
      }
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
