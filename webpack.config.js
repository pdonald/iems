module.exports = {
  entry: './app/ui/main.js',
  output: { path: './build/', filename: 'bundle.js' },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: { presets: ['es2015', 'react'] },
        exclude: /node_modules/
      },
      { test: /\.less$/, loader: 'style-loader!css-loader!less-loader' },
    ]
  },
  resolve: {
    extensions: ['', '.js']
  }
};
