const presets = [
  [
    '@babel/preset-env',
    {
      targets: '> 1%, not dead',
      useBuiltIns: 'usage',
      corejs: { version: 3, proposals: true },
      modules: false,
    },
  ],
  '@babel/preset-react',
  '@babel/preset-typescript',
]

module.exports = {
  presets,
}
