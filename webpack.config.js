var rootpath = require('path').resolve(__dirname)

var webpack = require('webpack')
var autoprefixer = require('autoprefixer')
var HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './app/client/index.tsx',
  output: { path: './build/', filename: 'bundle.js', publicPath: '/' },
  module: {
    loaders: [
      {
        test: /\.(ts|tsx?)$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!postcss-loader!less-loader'
      },
    ]
  },
  resolve: {
    root: [rootpath, `${rootpath}/app`, `${rootpath}/client`],
    extensions: ['', '.js', '.ts', '.tsx']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': "'production'"
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new HtmlWebpackPlugin({
      template: `${rootpath}/app/client/index.html`,
      filename: `./index.html`
    })
  ],
  postcss: () => [autoprefixer],
  devtool: 'source-map',
  devServer: { historyApiFallback: true, host: '0.0.0.0', port: 8080 }
}
