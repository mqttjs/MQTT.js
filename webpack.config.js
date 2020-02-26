const path = require('path')

module.exports = {
  optimization: {
    minimize: true
  },
  mode: 'production',
  entry: './mqtt.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  }
}
