/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */

const { merge } = require('webpack-merge')

const common = require('./webpack.common')

module.exports = merge(common, {
  devtool: 'hidden-source-map',
  mode: 'production',
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      name: 'vendor',
    },
  },
})
