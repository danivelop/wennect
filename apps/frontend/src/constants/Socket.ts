// eslint-disable-next-line import/prefer-default-export
export const SOCKET = {
  EVENT: {
    EMIT: {
      JOIN: 'join',
      LEAVE: 'leave',
    },
    ON: {
      LOCAL_JOIN: 'localJoin',
      REMOTE_JOIN: 'remoteJoin',
      REMOTE_LEAVE: 'remoteLeave',
    },
  },
  DISCONNECTION_REASON: {
    TRANSPORT_CLOSE: 'transport close',
    SERVER_DISCONNECT: 'server namespace disconnect',
    CLIENT_DISCONNECT: 'client namespace disconnect',
    IO_SERVER_DISCONNECT: 'io server disconnect',
    IO_CLIENT_DISCONNECT: 'io client disconnect',
    PING_TIMEOUT: 'ping timeout',
    TRANSPORT_ERROR: 'transport error',
  },
} as const
