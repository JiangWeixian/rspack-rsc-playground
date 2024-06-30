/// <reference types="react/experimental" />
import {
  memo,
  startTransition,
  StrictMode as ReactStrictMode,
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { hydrateRoot } from 'react-dom/client'
import { createFromFetch, createFromReadableStream, encodeReply } from 'react-server-dom-webpack/client'

const encoder = new TextEncoder()
const rscAPIPrefix = '/__rsc'
const serverActionAPIPrefix = '/__server_action'
globalThis.__call_server = async (action: string, args: any[]) => {
  const payload = await encodeReply(args)
  const query = encodeURIComponent(JSON.stringify({ action }))
  const url = `${serverActionAPIPrefix}?state=${query}`
  const res = await createFromFetch(fetch(url, { method: 'POST', body: payload }))
  const [actionResult] = res
  return actionResult
}
interface RSCState {
  pathname: string
  search: string
  timestamp?: string
  type?: 'initial' | 'navigate'
}
const getCacheKey = (options: RSCState) => {
  const { pathname, search, timestamp, type } = options
  return JSON.stringify({
    pathname,
    search,
    timestamp,
    type,
  })
}

let initialServerDataBuffer: string[] | undefined
let initialServerDataWriter: ReadableStreamDefaultController | undefined
let initialServerDataLoaded = false
let initialServerDataFlushed = false

function serverDataCallback(
  seg: [isBootStrap: 0] | [isNotBootstrap: 1, responsePartial: string],
): void {
  if (seg[0] === 0) {
    initialServerDataBuffer = []
  } else {
    if (!initialServerDataBuffer) {
      throw new Error('Unexpected server data: missing bootstrap script.')
    }

    if (initialServerDataWriter) {
      initialServerDataWriter.enqueue(encoder.encode(seg[1]))
    } else {
      initialServerDataBuffer.push(seg[1])
    }
  }
}

const serverDataLoadingGlobal = ((self as any).__pace_f
  = (self as any).__pace_f || [])
serverDataLoadingGlobal.forEach(serverDataCallback)
serverDataLoadingGlobal.push = serverDataCallback

function createResponseCache() {
  return new Map<string, any>()
}
const rscCache = createResponseCache()

function serverDataRegisterWriter(ctr: ReadableStreamDefaultController) {
  if (initialServerDataBuffer) {
    initialServerDataBuffer.forEach((val) => {
      ctr.enqueue(encoder.encode(val))
    })
    if (initialServerDataLoaded && !initialServerDataFlushed) {
      ctr.close()
      initialServerDataFlushed = true
      initialServerDataBuffer = undefined
    }
  }

  initialServerDataWriter = ctr
}

// When `DOMContentLoaded`, we can close all pending writers to finish hydration.
const DOMContentLoaded = function () {
  if (initialServerDataWriter && !initialServerDataFlushed) {
    initialServerDataWriter.close()
    initialServerDataFlushed = true
    initialServerDataBuffer = undefined
  }
  initialServerDataLoaded = true
}
// It's possible that the DOM is already loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DOMContentLoaded, false)
} else {
  DOMContentLoaded()
}

let readable: ReadableStream | null

try {
  readable = new ReadableStream({
    start(controller) {
      serverDataRegisterWriter(controller)
    },
  })
} catch { }

function useInitialServerResponse(cacheKey: string): Promise<JSX.Element> {
  let response = rscCache.get(cacheKey)
  if (response) {
    return response
  }

  if (readable) {
    // The flight response was inlined during SSR, use it directly.
    response = createFromReadableStream(readable)
    readable = null
  } else {
    const url = `${rscAPIPrefix}?state=${encodeURIComponent(cacheKey)}`
    // Request a new flight response.
    response = createFromFetch(fetch(url))
  }

  rscCache.set(cacheKey, response)
  return response
}

const ServerRoot = memo(({ cacheKey }: { cacheKey: string }): JSX.Element => {
  useEffect(() => {
    rscCache.delete(cacheKey)
  })
  const response = useInitialServerResponse(cacheKey)
  const root = use(response)
  return root
})

function RSCComponent(props: any): JSX.Element {
  const [serverProps, setServerProps] = useState<RSCState>({
    pathname: window.location.pathname,
    search: window.location.search,
    type: 'initial',
  })

  const serverPropsRef = useRef(serverProps)
  serverPropsRef.current = serverProps
  const prevInitialCacheKey = useRef<string>()

  const { type, timestamp } = serverProps

  const cacheKey = useMemo(() => {
    if (type === 'initial') {
      const resolvedCacheKey = getCacheKey(serverPropsRef.current)
      prevInitialCacheKey.current = resolvedCacheKey
      return resolvedCacheKey
    }
    return prevInitialCacheKey.current
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listen timestamp effect, make sure cacheKey updated related to HMR
  }, [type, timestamp])

  return <ServerRoot {...props} cacheKey={cacheKey} />
}

const renderer = (RootComponent: any, container: any, options = {}) => {
  startTransition(() => {
    hydrateRoot(
      container,
      <ReactStrictMode>
        <Suspense fallback={null}>
          {RootComponent}
        </Suspense>
      </ReactStrictMode>,
      options,
    )
  })
}


// Default render
renderer(<RSCComponent />, document.getElementById('root'))
