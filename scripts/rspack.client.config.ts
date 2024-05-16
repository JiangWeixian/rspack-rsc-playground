import rspack from "@rspack/core";
import refreshPlugin from '@rspack/plugin-react-refresh'
import path from 'node:path'
import type { Configuration } from '@rspack/core'

const isDev = process.env.NODE_ENV === "development";
const RSC_CLIENT_ENTRY_LOADER = 'rsc-client-entry-loader'

const config: Configuration = {
	devtool: "source-map",
	name: 'client',
	mode: 'development',
	entry: {
		'client-entry': "./src/client-entry.tsx"
	},
	resolve: {
		extensions: ["...", ".ts", ".tsx", ".jsx"]
	},
	output: {
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    path: './dist/client',
    publicPath: '/',
  },
	devServer: {
		devMiddleware: {
			writeToDisk: true,
		},
		allowedHosts: 'all',
		webSocketServer: 'ws',
		hot: true,
		historyApiFallback: true,
		client: {
			logging: 'none',
			// prevent HMR failed with proxy
			// refs: https://webpack.js.org/configuration/dev-server/#websocketurl
			overlay: false,
		},
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
	},
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
										development: isDev,
										refresh: isDev
									}
								}
							},
							env: {
								targets: [
									"chrome >= 87",
									"edge >= 88",
									"firefox >= 78",
									"safari >= 14"
								]
							}
						}
					}
				]
			},
			{
        // refs: https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
        test: [
          /\.(j|t|mj|cj)sx?$/i,
        ],
        exclude: {
          // Exclude libraries in node_modules ...
          and: [/node_modules/],
        },
        use: [
          {
            loader: RSC_CLIENT_ENTRY_LOADER,
          },
        ],
      },
		]
	},
	optimization: {
		minimize: false,
		moduleIds: "named"
	},
	experiments: {
		rspackFuture: {
			newTreeshaking: true
		}
	},
	plugins: [
		new rspack.RSCClientReferenceManifestRspackPlugin(),
		new rspack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
		}),
		new rspack.ProgressPlugin({}),
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		isDev ? new refreshPlugin() : null
	].filter(Boolean),
	resolveLoader: {
    alias: {
      [RSC_CLIENT_ENTRY_LOADER]: path.join(process.cwd(), 'scripts', 'loaders', 'rsc-client-entry-loader.cjs'),
    },
  },
};

export default config
