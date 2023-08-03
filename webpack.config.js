const path = require('path');

module.exports = {
  entry: './build/mqtt.js',
  mode: 'production',
  output: {
    filename: 'mqtt.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'mqtt',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  },
  target: 'web',
  resolve: {
    fallback: {
      fs: false,
      tls: false,
      net: false,
      util: false,
    }
  }
};