/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */

const { merge } = require('webpack-merge')

const path = require('path')

const common = require('./webpack.common')

module.exports = merge(common, {
  devtool: 'eval-source-map',
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000,
  },
  mode: 'development',
})
