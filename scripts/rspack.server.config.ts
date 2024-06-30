import rspack from "@rspack/core";
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Configuration } from '@rspack/core'
import nodeExternals from 'webpack-node-externals'
import common from './common.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: Configuration = {
  devtool: 'source-map',
  name: 'server',
  target: 'node16',
	mode: 'development',
  entry: {
    'server-entry': './src/server-entry.tsx'
  },
	resolve: {
		extensions: ["...", ".ts", ".tsx", ".jsx"],
		alias: common.alias,
	},
  output: {
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    path: path.resolve(process.cwd(), './dist/server'),
    publicPath: '/',
    libraryTarget: 'commonjs2',
  },
	externals: [
    nodeExternals({
      modulesFromFile: {
        // auto include devDependencies into bundle
        // https://github.com/liady/webpack-node-externals/blob/fc082618f98c564c92f3467523618dfcf4de2084/utils.js#L50
        exclude: ['devDependencies'],
      },
    }) as any,
  ],
  externalsPresets: { node: true },
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
								targets: 'node > 16'
							}
						}
					}
				]
			}
		]
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
    new rspack.RSCClientEntryRspackPlugin({}),
  ],
}

export default config
