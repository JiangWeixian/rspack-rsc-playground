import nodeExternals from 'webpack-node-externals'
import common from './common.config'
import rspack from "@rspack/core";
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Configuration } from '@rspack/core'

const REGEX_REACT_SERVER_DOM_WEBPACK = /react-server-dom-webpack/
const REACT_FOR_SERVER_COMPONENT_PATH = 'node_modules/react/react.shared-subset.js'
const REACT_FOR_SERVER_COMPONENT_ABSOLUTE_PATH = path.resolve(process.cwd(), REACT_FOR_SERVER_COMPONENT_PATH)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: Configuration = {
  devtool: 'source-map',
  name: 'rsc',
  target: 'node16',
	mode: 'development',
  entry: {
    'server-entry': './src/server-entry.tsx'
  },
  output: {
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    path: path.resolve(process.cwd(), './dist/server/rsc'),
    publicPath: '/',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    alias: {
      react: REACT_FOR_SERVER_COMPONENT_ABSOLUTE_PATH,
      ...common.alias
    },
		extensions: ["...", ".ts", ".tsx", ".jsx"]
  },
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      allowlist: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/server',
        REGEX_REACT_SERVER_DOM_WEBPACK,
      ],
      modulesFromFile: {
        // auto include devDependencies into bundle
        // https://github.com/liady/webpack-node-externals/blob/fc082618f98c564c92f3467523618dfcf4de2084/utils.js#L50
        exclude: ['devDependencies'],
      },
    }),
  ],
  module: {
    rules: [
      {
				test: /\.svg$/,
				type: "asset"
			},
			{
				test: /\.(jsx?|tsx?)$/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							sourceMap: true,
              isModule: 'unknown',
							jsc: {
								parser: {
									syntax: "typescript",
									tsx: true
								},
								transform: {
									react: {
										runtime: "automatic",
									}
								}
							},
							env: {
								targets: 'node > 16',
							}
						}
					}
				]
			},
    ],
  },
  experiments: {
		css: true,
    rsc: true,
	},
  optimization: {
    minimize: false,
    removeEmptyChunks: true,
    mangleExports: false,
    usedExports: false,
  },
  plugins: [
    new rspack.RSCProxyRspackPlugin({
      clientProxy: path.resolve(__dirname, './runtime/client-proxy.mjs')
    }),
  ],
}

export default config
