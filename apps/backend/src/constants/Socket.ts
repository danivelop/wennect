export const SOCKET = {
  EVENT: {
    EMIT: {
      LOCAL_JOIN: 'localJoin',
      REMOTE_JOIN: 'remoteJoin',
      REMOTE_LEAVE: 'remoteLeave',
      OFFER: 'offer',
      ANSWER: 'answer',
      ICECANDIDATE: 'icecandidate',
    },
    ON: {
      JOIN: 'join',
      LEAVE: 'leave',
      OFFER: 'offer',
      ANSWER: 'answer',
      ICECANDIDATE: 'icecandidate',
    },
  },
} as const
