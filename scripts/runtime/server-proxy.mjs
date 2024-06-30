import { callServer } from '../../src/call-server.ts'
import { createServerReference as createServerReferenceImpl } from 'react-server-dom-webpack/client'

export const createServerReference = (id) => {
  return createServerReferenceImpl(id, callServer)
}