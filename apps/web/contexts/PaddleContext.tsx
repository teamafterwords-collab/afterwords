'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

type PaddleContextValue = {
  paddle: Paddle | undefined
  isReady: boolean
}

const PaddleContext = createContext<PaddleContextValue>({ paddle: undefined, isReady: false })

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined)

  useEffect(() => {
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then((paddleInstance) => {
      setPaddle(paddleInstance)
    })
  }, [])

  return (
    <PaddleContext.Provider value={{ paddle, isReady: !!paddle }}>
      {children}
    </PaddleContext.Provider>
  )
}

export function usePaddle() {
  return useContext(PaddleContext)
}