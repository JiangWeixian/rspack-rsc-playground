import nodeExternals from 'webpack-node-externals'
import path from 'node:path'
import type { Configuration } from '@rspack/core'

const isDev = process.env.NODE_ENV === "development";
const RSC_CLIENT_PROXY_LOADER = 'rsc-client-proxy-loader'
const REGEX_REACT_SERVER_DOM_WEBPACK = /react-server-dom-webpack/
const REACT_FOR_SERVER_COMPONENT_PATH = 'node_modules/react/react.shared-subset.js'
const REACT_FOR_SERVER_COMPONENT_ABSOLUTE_PATH = path.resolve(process.cwd(), REACT_FOR_SERVER_COMPONENT_PATH)
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
    path: './dist/server/rsc',
    publicPath: '/',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    alias: {
      react: REACT_FOR_SERVER_COMPONENT_ABSOLUTE_PATH,
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
      {
        test: {
          and: [
            /\.(j|t|mj|cj)sx?$/i,
          ],
        },
        exclude: {
          // Exclude libraries in node_modules ...
          and: [/node_modules/],
        },
        use: [
          {
            loader: RSC_CLIENT_PROXY_LOADER,
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: false,
    removeEmptyChunks: true,
    mangleExports: false,
    usedExports: false,
  },
  resolveLoader: {
    alias: {
      [RSC_CLIENT_PROXY_LOADER]: path.join(process.cwd(), 'scripts', 'loaders', 'rsc-client-proxy-loader.cjs'),
    },
  },
}

export default config
