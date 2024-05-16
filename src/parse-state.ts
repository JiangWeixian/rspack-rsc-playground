export function parseJSON(json: any) {
  if (String(json).includes('__proto__')) {
    return JSON.parse(json, noproto)
  }
  return JSON.parse(json)
}
function noproto(k: string, v: string): string | void {
  if (k !== '__proto__') {
    return v
  }
}

export function parseState({ rscAPIPrefix = '/__rsc', ...params }: { pathname: string; search: string; rscAPIPrefix?: string }): any {
  try {
    const { pathname, search } = params
    const searchParams = new URLSearchParams(search)
    const stateParam = searchParams.get('state')
    const state: Record<string, any>
      = pathname === rscAPIPrefix
        ? stateParam
          ? parseJSON(decodeURIComponent(stateParam))
          : {}
        : {
            pathname: decodeURIComponent(pathname),
            search: decodeURIComponent(search),
          }

    return state
  } catch (e) {
    console.error(e)
    // Do not throw to prevent unhandled errors
    return {}
  }
}
