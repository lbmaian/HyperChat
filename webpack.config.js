/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const { preprocess } = require('./svelte.config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssPlugins = require('./postcss.config.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const mode = process.env.NODE_ENV || 'development';
const prod = mode !== 'development';

const smelteConfig = {
  colors: {
    // Default smelte colors
    primary: '#b027b0',
    secondary: '#009688',
    error: '#f44336',
    success: '#4caf50',
    alert: '#ff9800',
    blue: '#2196f3',
    dark: '#212121',

    member: '#0E5D10',
    'member-dark': '#04B301',
    moderator: '#2441C0',
    'moderator-dark': '#A0BDFC',
    owner: '#866518',
    'owner-dark': '#FFD600',
    deleted: '#6E6B6B',
    'deleted-dark': '#898888'
  },
  darkMode: true
};

const cssConfig = {
  test: /\.(sa|sc|c)ss$/,
  use: [
    MiniCssExtractPlugin.loader,
    'css-loader',
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          extract: true,
          plugins: postcssPlugins(prod, smelteConfig)
        }
      }
    }
  ]
};

const options = {
  entry: {
    'chat-interceptor': path.join(__dirname, 'src', 'submodules', 'chat', 'src', 'ts', 'chat-interceptor.ts'),
    'chat-background': path.join(__dirname, 'src', 'submodules', 'chat', 'src', 'ts', 'chat-background.ts'),
    'chat-injector': path.join(__dirname, 'src', 'submodules', 'chat', 'src', 'ts', 'chat-injector.ts'),
    hyperchat: path.join(__dirname, 'src', 'submodules', 'chat', 'src', 'hyperchat.ts')
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].bundle.js',
    publicPath: './'
  },
  resolve: {
    alias: {
      svelte: path.resolve('node_modules', 'svelte')
    },
    extensions: ['.mjs', '.js', '.svelte', '.tsx', '.ts'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: !prod // Built-in HMR
            },
            emitCss: false,
            hotReload: !prod,
            preprocess
          }
        }
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      },
      cssConfig
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/submodules/chat/assets',
          to: 'assets'
        },
        {
          from: 'src/manifest.json'
        }
      ]
    }),
    new MiniCssExtractPlugin({ filename: 'tailwind.css' }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'submodules', 'chat', 'src', 'template.html'),
      filename: 'hyperchat.html',
      chunks: ['hyperchat'],
      chunksSortMode: 'manual'
    })
  ],
  mode
};

if (prod) {
  options.devtool = false;
} else {
  options.devtool = 'eval-cheap-module-source-map';
  options.plugins.concat(new webpack.HotModuleReplacementPlugin());
  options.devServer = {
    host: 'localhost',
    port: 6000,
    hot: true,
    contentBase: path.join(__dirname, 'build'),
    headers: { 'Access-Control-Allow-Origin': '*' },
    writeToDisk: true,
    disableHostCheck: true
  };
}

module.exports = options;
