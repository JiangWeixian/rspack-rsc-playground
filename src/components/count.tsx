'use client';

import { useState } from "react"

export const Count = () => {
  const [cnt, add] = useState(0)
  return (
    <button onClick={() => add(prev => prev + 1)}>{cnt}</button>
  )
}