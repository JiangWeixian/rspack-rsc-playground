import type { AsyncLocalStorage as AsyncLocalStorageType } from 'node:async_hooks'

class FakeAsyncLocalStorage<Store extends {}>
implements AsyncLocalStorageType<Store> {
  disable(): void {
    throw new Error('AsyncLocalStorage accessed in browser where it is not available')
  }

  getStore(): Store | undefined {
    return undefined
  }

  run<R>(): R {
    throw new Error('AsyncLocalStorage accessed in browser where it is not available')
  }

  exit<R>(): R {
    throw new Error('AsyncLocalStorage accessed in browser where it is not available')
  }

  enterWith(): void {
    throw new Error('AsyncLocalStorage accessed in browser where it is not available')
  }
}

const { AsyncLocalStorage } = process.env.PACE_IS_CLIENT
  ? { AsyncLocalStorage: FakeAsyncLocalStorage }
  : require('async_hooks')

export const contextAsyncStorage = new AsyncLocalStorage()
