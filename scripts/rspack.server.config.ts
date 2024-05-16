import rspack from "@rspack/core";
import type { Configuration } from '@rspack/core'
import nodeExternals from 'webpack-node-externals'

const isDev = process.env.NODE_ENV === "development";

const config: Configuration = {
  devtool: 'source-map',
  name: 'server',
  target: 'node16',
	mode: 'development',
  entry: {
    'server-entry': './src/server-entry.tsx'
  },
	resolve: {
		extensions: ["...", ".ts", ".tsx", ".jsx"]
	},
  output: {
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    path: './dist/server',
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
		rspackFuture: {
			newTreeshaking: true,
		},
	},
  optimization: {
    minimize: false,
    removeEmptyChunks: true,
    mangleExports: false,
    usedExports: false,
  },
  plugins: [
    new rspack.RSCClientEntryPlugin({}),
    new rspack.RSCServerReferenceManifestRspackPlugin(),
  ],
}

export default config
