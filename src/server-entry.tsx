import { Suspense, use } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { createFromReadableStream } from 'react-server-dom-webpack/client.edge'
import { renderToReadableStream } from 'react-server-dom-webpack/server.browser'
import { decodeReply } from 'react-server-dom-webpack/server.node'
import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from 'web-streams-polyfill/ponyfill'

import { contextAsyncStorage } from './context-async-storage'
import { bufferReadableStream } from './buffer-readable-string'
import { htmlEscapeJsonString } from './parse-html'

import { App } from './App'
import Document from './Document'

import type { RenderToPipeableStreamOptions } from 'react-dom/server'
import { parseServerActionState } from './parse-state'

const rscAPIPrefix = '/__rsc'
const serverActionAPIPrefix = '/__server_action'
type SSRContext = any

declare global {
  var __webpack_require__: any
}

/**
 * We're running in the Node.js runtime without access to `fetch`,
 * which is needed for proxy requests and server-side API requests.
 */
if (!globalThis.ReadableStream) {
  Object.assign(globalThis, {
    ReadableStream,
    WritableStream,
    TransformStream,
  })
}

interface ClientModule {
  id: string
  name: string
  chunks: Array<string>
  async: boolean
}

interface Manifest {
  clientModules: Record<string, ClientModule>
  ssrModuleMapping: Record<string, Record<string, ClientModule>>
}

function readableStreamTee<DataType = any>(
  readable: ReadableStream<DataType>,
): [ReadableStream<DataType>, ReadableStream<DataType>] {
  const transformStream = new TransformStream()
  const transformStream2 = new TransformStream()
  const writer = transformStream.writable.getWriter()
  const writer2 = transformStream2.writable.getWriter()

  const reader = readable.getReader()
  function read() {
    reader.read().then(({ done, value }) => {
      if (done) {
        writer.close()
        writer2.close()
        return
      }
      writer.write(value)
      writer2.write(value)
      read()
    })
  }
  read()

  return [transformStream.readable, transformStream2.readable]
}

function useFlightResponse(
  req: ReadableStream<Uint8Array>,
  flightResponseRef: any,
  ssrModuleMapping: Manifest['ssrModuleMapping'],
  ctx: SSRContext,
  onWriteRscFlight?: (chunk: Uint8Array) => void,
) {
  if (flightResponseRef.current !== null) {
    return flightResponseRef.current
  }
  // split to two streams,
  // 1. flightStream: append scripts into html
  // 2. renderStream: deserialization from stream to react element
  const [renderStream, flightStream] = readableStreamTee(req)
  const res = createFromReadableStream(renderStream, {
    moduleMap: ssrModuleMapping,
  })
  flightResponseRef.current = res
  const flightReader = flightStream.getReader()
  const textDecoder = new TextDecoder()
  const resolvedCrossorigin = ctx.attributes?.script?.crossorigin
  const resolvedCrossoriginString = resolvedCrossorigin ? `crossorigin="${resolvedCrossorigin}"` : ''
  const resolvedNonce = ctx.nonce
  const startScriptTag = resolvedNonce
    ? `<script nonce=${JSON.stringify(resolvedNonce)} ${resolvedCrossoriginString}>`
    : `<script ${resolvedCrossoriginString}>`
  let bootstrapped = false
  function read() {
    flightReader.read().then(({ done, value }) => {
      if (!bootstrapped) {
        bootstrapped = true
        const chunk = new TextEncoder().encode(
          `${startScriptTag}(self.__pace_f=self.__pace_f||[]).push(${htmlEscapeJsonString(
            JSON.stringify([0]),
          )})</script>`,
        )
        onWriteRscFlight?.(chunk)
        !ctx.disableStream && ctx.res.write(chunk)
      }
      if (done) {
        // flightResponseRef.current = null
      } else {
        const responsePartial = textDecoder.decode(value, { stream: true })
        const scripts = `${startScriptTag}self.__pace_f.push(${htmlEscapeJsonString(
          JSON.stringify([1, responsePartial]),
        )})</script>`
        const chunk = new TextEncoder().encode(scripts)
        onWriteRscFlight?.(chunk)
        // Disable write to stream when disableStream=true, collect chunks and assemble in renderToString method
        !ctx.disableStream && ctx.res.write(chunk)
        read()
      }
    })
  }
  read()
  return res
}

function createServerComponentRenderer<Props>(
  ComponentToRender: (props: Props) => any,
  manifest: Manifest,
  ctx: SSRContext,
  onWriteRscFlight?: (chunk: Uint8Array) => void,
): (props: Props) => JSX.Element {
  const { clientModules, ssrModuleMapping } = manifest
  let RSCStream: ReadableStream<Uint8Array> = ctx.RSCStream
  const createRSCStream = (props: Props) => {
    if (!RSCStream) {
      // serialization react component to stream
      RSCStream = renderToReadableStream(
        <ComponentToRender {...(props as any)} />,
        clientModules,
      )
    }
    return RSCStream
  }

  const flightResponseRef: any = { current: null }

  return function ServerComponentWrapper(props: Props): JSX.Element {
    const reqStream = createRSCStream(props)
    const response = useFlightResponse(
      reqStream,
      flightResponseRef,
      ssrModuleMapping,
      ctx,
      onWriteRscFlight,
    )
    return use(response)
  }
}

const KNOWN_ERRORS = new Set([
  'The destination stream closed early.',
])

interface HandleRequestOptions {
  /**
   * @description Client refs manifest
   */
  manifest: Manifest
  serverActionManifest: {
    serverActions: Record<string, Record<string, { server: string }>>,
  }
}

export function handleRequest(
  ctx: SSRContext,
  { manifest, serverActionManifest }: HandleRequestOptions,
) {
  const [pathname, search] = ctx.url.split('?')

  const Root = (props: { onWriteRscFlight?: (chunk?: any) => void }) => {
    const RSCEntry = createServerComponentRenderer(App, manifest, ctx, props.onWriteRscFlight)
    return (
      <Document>
        <Suspense>
          <RSCEntry />
        </Suspense>
      </Document>
    )
  }

  const resolveRenderStreamOptions = (ctx: SSRContext, options?: RenderToPipeableStreamOptions): RenderToPipeableStreamOptions => {
    return {
      ...options,
      bootstrapScripts: [
        {
          src: 'client-entry.js'
        },
      ] as any[]
    }
  }

  // Currently only support nonce
  /**
   * @description Pipe html, used for users
   */
  const render = async (options?: RenderToPipeableStreamOptions) => {
    let _resolve = (_value?: unknown) => { }
    let _reject = (_?: any) => { }
    const pending = new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })
    ctx.status = 200
    const { pipe } = renderToPipeableStream(<Root />, {
      ...resolveRenderStreamOptions(ctx, options),
      onShellReady() {
        ctx.type = 'text/html'
        pipe(ctx.res)
      },
      async onAllReady() {
        _resolve()
      },
      onShellError: (error: any) => {
        console.error(error)
        _reject({ type: 'SHELL_ERROR', error })
      },
      onError: (error: any) => {
        if (KNOWN_ERRORS.has(error.message)) {
          // When refresh page very quick, will throw this error, ignore it
          return
        }
        console.error(error)
        _reject({ type: 'RENDER_ERROR', error })
      },
    })
    await pending
  }

  const serialize = async () => {
    const serializeStream = renderToReadableStream(
      <App />,
      manifest.clientModules,
    )
    ctx.type = 'text/plain'
    await bufferReadableStream(serializeStream.getReader(), ctx.res.write.bind(ctx.res))
    ctx.res.end()
  }

  const createRSCStream = () => {
    const RSCFlightStream = renderToReadableStream(
      <App />,
      manifest.clientModules,
    )
    return RSCFlightStream
  }

  const action = async () => {
    const state = parseServerActionState({ pathname, search })
    const actionId = state.action
    const actionModId = serverActionManifest.serverActions?.[actionId]?.['server-entry']?.server
    const serverActions = __webpack_require__(actionModId)?.default || __webpack_require__(actionModId)
    if (!actionId || !serverActions?.[actionId]) {
      ctx.status = 404
      return
    }
    const handler = await serverActions[actionId]()
    // TODO: koa-body
    // const payload = await decodeReply(ctx.req.body ?? {})
    // const result = await handler(...payload)
    const result = await handler()
    const RSCFlightStream = renderToReadableStream(
      [result],
      manifest.clientModules,
    )
    ctx.status = 200
    await bufferReadableStream(RSCFlightStream.getReader(), ctx.res.write.bind(ctx.res))
    ctx.res.end()
  }

  return {
    isRSCRequest: pathname === rscAPIPrefix,
    createRSCStream: () => contextAsyncStorage.run(ctx, () => createRSCStream()),
    render: (options?: RenderToPipeableStreamOptions) => contextAsyncStorage.run(ctx, () => render(options)),
    serialize: () => contextAsyncStorage.run(ctx, () => serialize()),
    action: () => contextAsyncStorage.run(ctx, () => action()),
  }
}

