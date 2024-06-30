export const callServer = (id: string, args: any[]) => {
  if (!globalThis.__call_server) {
    console.error('`callServer` is not available')
    return
  }
  return globalThis.__call_server(id, args)
}