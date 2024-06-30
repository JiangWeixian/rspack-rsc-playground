import path from 'node:path'

const config = {
  alias: {
    'rsc-client-entry-loader.js': path.resolve(__dirname, './runtime/rsc-client-entry-loader.js'),
    'rsc-server-action-entry-loader.js': path.resolve(__dirname, './runtime/rsc-server-action-entry-loader.js'),
  },
}
export default config