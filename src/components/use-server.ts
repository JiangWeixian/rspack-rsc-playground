'use server'
import { performance } from 'perf_hooks'

export const getServerTime = () => {
  return performance.now()
}