export const callServer = (id: string, args: any[]) => {
  if (!globalThis.__call_server) {
    return
  }
  return globalThis.__call_server(id, args)
}