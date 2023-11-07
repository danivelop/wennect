/* eslint-disable @typescript-eslint/no-var-requires */

const nodeExternals = require('webpack-node-externals')

const path = require('path')

module.exports = {
  entry: './src/index.ts',
  mode: 'production',
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  target: 'node',
  module: {
    rules: [{ test: /\.(ts)$/, loader: 'ts-loader' }],
  },
  externalsPresets: {
    node: true,
  },
  externals: [nodeExternals()],
}
