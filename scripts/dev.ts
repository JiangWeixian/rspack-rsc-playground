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
  let _resolve
  const p = new Promise(resolve => {
    _resolve = resolve
  })
  compiler.hooks.done.tap('done', () => {
    _resolve()
  })
  await p
  const app = new koa()
  app.use(
    staticCache(path.join(process.cwd(), './dist/client'), {
      maxAge: 0
    })
  )
  app.use(async (ctx, next) => {
    const ssrManifest = JSON.parse((await fs.readFile(path.join(process.cwd(), './dist/server/client-reference-manifest.json'))).toString('utf-8'))
    const serverActionManifest = JSON.parse((await fs.readFile(path.join(process.cwd(), './dist/server/server-reference-manifest.json'))).toString('utf-8'))

    const ssr = require(path.join(process.cwd(), './dist/server/server-entry.js')).handleRequest(ctx, { manifest: ssrManifest, serverActionManifest })
    const rsc = require(path.join(process.cwd(), './dist/server/rsc/server-entry.js')).handleRequest(ctx, { manifest: ssrManifest, serverActionManifest })
    if (ctx.path === '/__server_action') {
      console.log('Invoke server action', ctx.path)
      await rsc.action()
      await next()
      return
    }
    ctx.RSCStream = rsc.createRSCStream()
    await ssr.render()
  })
  app.listen(8000, () => {
    console.log('listening on 8000')
  })
}

dev()