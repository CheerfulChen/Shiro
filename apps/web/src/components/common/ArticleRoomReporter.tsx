'use client'

import { useEffect } from 'react'

import { useSocketIsConnect } from '~/atoms/hooks/socket'
import { socketWorker } from '~/socket/worker-client'
import { SocketEmitEnum } from '~/types/events'

export const ArticleRoomReporter = ({ id }: { id: string }) => {
  const socketIsConnected = useSocketIsConnect()

  useEffect(() => {
    if (!socketIsConnected || !id) return

    const roomName = `article_${id}`
    socketWorker.emit(SocketEmitEnum.Join, { roomName })

    return () => {
      socketWorker.emit(SocketEmitEnum.Leave, { roomName })
    }
  }, [id, socketIsConnected])

  return null
}
