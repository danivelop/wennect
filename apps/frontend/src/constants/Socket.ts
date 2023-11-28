// eslint-disable-next-line import/prefer-default-export
export const SOCKET = {
  EVENT: {
    JOIN: 'join',
    LEAVE: 'leave',
    PARTICIPATE: 'participate',
    WITHDRAW: 'withdraw',
    OFFER: 'offer',
    ANSWER: 'answer',
    ICECANDIDATE: 'icecandidate',
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
