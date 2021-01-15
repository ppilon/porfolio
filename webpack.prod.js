const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const S3Plugin = require('webpack-s3-plugin');

require('dotenv').config();

const commitHash = require('child_process')
  .execSync('git rev-parse --short HEAD')
  .toString().trim();


module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin(),
    new S3Plugin({
      // Exclude uploading of html
      exclude: /.*\.html$/,
      // s3Options are required
      s3Options: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: 'us-west-2'
      },
      s3UploadOptions: {
        Bucket: process.env.AWS_BUCKET
      },
      cdnizerOptions: {
        defaultCDNBase: 'https://assets.philippilon.com/assets/' + commitHash  + '/'
      },
      basePathTransform: function() {
        return 'assets/' + commitHash;
      }
    })
  ]
});