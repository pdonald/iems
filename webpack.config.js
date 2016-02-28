var rootpath = require('path').resolve(__dirname)

module.exports = {
  entry: './app/client/main.js',
  output: { path: './build/', filename: 'bundle.js' },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: { presets: ['es2015', 'react'] },
        exclude: /node_modules/
      },
      { test: /\.less$/, loader: 'style-loader!css-loader!less-loader!postcss-loader' },
    ]
  },
  resolve: {
    root: [rootpath, `${rootpath}/app`, `${rootpath}/client`],
    extensions: ['', '.js']
  },
  postcss: () => [require('autoprefixer')],
  devtool: 'inline-source-map',
  devServer: { historyApiFallback: true }
}
