var rootpath = require('path').resolve(__dirname)

var autoprefixer = require('autoprefixer')
var HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './app/client/index.tsx',
  output: { path: './build/', filename: 'bundle.js', publicPath: '/' },
  module: {
    loaders: [
      {
        test: /\.(js|tsx?)$/,
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
    new HtmlWebpackPlugin({
      template: `${rootpath}/app/client/index.html`,
      filename: `./index.html`
    })
  ],
  postcss: () => [autoprefixer],
  devtool: 'inline-source-map',
  devServer: { historyApiFallback: true }
}
