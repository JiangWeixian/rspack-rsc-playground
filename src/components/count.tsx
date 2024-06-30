'use client';

import { useState } from "react"
import { getServerTime } from './use-server'

export const Count = () => {
  const [cnt, add] = useState(0)
  return (
    <button onClick={async () => {
      add(prev => prev + 1)
      console.log(await getServerTime())
    }}>{cnt}</button>
  )
}