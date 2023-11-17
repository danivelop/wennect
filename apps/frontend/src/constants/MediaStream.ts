export const MEDIA_STREAM = {
  SOURCE: {
    USER: 'user',
    DISPLAY: 'display',
  },
} as const

export type MediaStreamType = {
  [K in keyof typeof MEDIA_STREAM]: (typeof MEDIA_STREAM)[K][keyof (typeof MEDIA_STREAM)[K]]
}
