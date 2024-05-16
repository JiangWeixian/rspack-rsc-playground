import koa from 'koa'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs/promises'

import staticCache from 'koa-static-cache'
const require = createRequire(import.meta.url)

const dev = async () => {
  const [rspack, RspackDevServer, clientConfig, serverConfig, serverRSCConfig] = await Promise.all([
    await import('@rspack/core').then(res => res.default),
    await import('@rspack/dev-server').then(res => res.default),
    await import('./rspack.client.config').then(res => res.default),
    await import('./rspack.server.config').then(res => res.default),
    await import('./rspack.rsc.config').then(res => res.default),
  ])
  const compiler = rspack.rspack([clientConfig, serverConfig, serverRSCConfig])
  const rspackServer = new RspackDevServer.RspackDevServer(clientConfig.devServer!, compiler)
  await rspackServer.start()
  const app = new koa()
  app.use(
    staticCache(path.join(process.cwd(), './dist/client'), {
      maxAge: 365 * 24 * 60 * 60
    })
  )
  app.use(async (ctx) => {
    const manifest = JSON.parse((await fs.readFile(path.join(process.cwd(), './dist/server/client-reference-manifest.json'))).toString('utf-8'))

    const ssr = require(path.join(process.cwd(), './dist/server/server-entry.js')).handleRequest(ctx, { manifest })
    const rsc = require(path.join(process.cwd(), './dist/server/rsc/server-entry.js')).handleRequest(ctx, { manifest })
    ctx.RSCStream = rsc.createRSCStream()
    await ssr.render()
  })
  app.listen(8000, () => {
    console.log('listening on 8000')
  })
}

dev()