var webpack = require('webpack')
var autoprefixer = require('autoprefixer')
var HtmlWebpackPlugin = require('html-webpack-plugin')

var rootpath = require('path').resolve(__dirname)
var isDev = process.env.npm_lifecycle_event === 'dev'
var isProd = !isDev

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
    isProd ? new webpack.DefinePlugin({ 'process.env': { 'NODE_ENV': "'production'" } }) : function() {},
    isProd ? new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } }) : function() {},
    new HtmlWebpackPlugin({
      template: `${rootpath}/app/client/index.html`,
      filename: `./index.html`
    })
  ],
  postcss: () => [autoprefixer],
  devtool: 'source-map',
  devServer: { historyApiFallback: true, host: '0.0.0.0', port: 8080 }
}
