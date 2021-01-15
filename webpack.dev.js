const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');


module.exports = merge(common, {
  mode: 'development',
  devtool: "source-map",
  devServer: {
    contentBase: './app',
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, 'dist')
  }
});