import rspack from "@rspack/core";
import path from 'node:path'
import refreshPlugin from '@rspack/plugin-react-refresh'
import type { Configuration } from '@rspack/core'
import { fileURLToPath } from 'node:url'
import common from './common.config'

const isDev = process.env.NODE_ENV === "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config: Configuration = {
	devtool: "source-map",
	name: 'client',
	mode: 'development',
	entry: {
		'client-entry': "./src/client-entry.tsx"
	},
	resolve: {
		extensions: ["...", ".ts", ".tsx", ".jsx"],
		alias: common.alias
	},
	output: {
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    path: path.resolve(process.cwd(), './dist/client'),
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
		]
	},
	optimization: {
		minimize: false,
		moduleIds: "named"
	},
	experiments: {
		css: true,
    rsc: true,
	},
	plugins: [
		new rspack.RSCClientReferenceManifestRspackPlugin({
			serverProxy: path.resolve(__dirname, './runtime/server-proxy.mjs')
		}),
		new rspack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
		}),
		new rspack.ProgressPlugin({}),
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		isDev ? new refreshPlugin() : null
	].filter(Boolean),
};

export default config
