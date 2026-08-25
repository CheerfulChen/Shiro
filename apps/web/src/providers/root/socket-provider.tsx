'use client'

import { useLocale } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { useSocketIsConnect, useSocketSessionId } from '~/atoms/hooks/socket'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { useIsClient } from '~/hooks/common/use-is-client'
import { usePathname, useRouter } from '~/i18n/navigation'
import { pathnameToRoomName, shouldReportPathname } from '~/lib/activity-room'
import { SocketEmitEnum } from '~/types/events'

import { socketWorker } from '../../socket/worker-client'

if (typeof window !== 'undefined') {
  import('../../socket/worker-client')
}
export const SocketContainer = () =>
  useIsClient() ? <SocketContainerImpl /> : null
const SocketContainerImpl: Component = () => {
  const connectOnce = useRef(false)
  const router = useRouter()
  useEffect(() => {
    if (connectOnce.current) return

    socketWorker.setRouter(router)
    connectOnce.current = true
  }, [router])

  const webSocketSessionId = useSocketSessionId()
  const socketIsConnected = useSocketIsConnect()

  useEffect(() => {
    if (!socketIsConnected) return

    socketWorker.emit(SocketEmitEnum.UpdateSid, {
      sessionId: webSocketSessionId,
    })
  }, [socketIsConnected, webSocketSessionId])

  const locale = useLocale()
  useEffect(() => {
    if (!socketIsConnected) return
    socketWorker.emit(SocketEmitEnum.UpdateLang, { lang: locale })
  }, [socketIsConnected, locale])

  const pathname = usePathname()
  const [pageMetadata, setPageMetadata] = useState({
    pathname: '',
    title: '',
  })
  useEffect(() => {
    const updatePageMetadata = () => {
      const documentTitle = document.title
      const separatorIndex = documentTitle.lastIndexOf(' - ')
      const title =
        separatorIndex > 0
          ? documentTitle.slice(0, separatorIndex)
          : documentTitle

      setPageMetadata((current) =>
        current.pathname === pathname && current.title === title
          ? current
          : { pathname, title },
      )
    }

    const animationFrame = requestAnimationFrame(updatePageMetadata)
    const observer = new MutationObserver(updatePageMetadata)
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [pathname])

  useEffect(() => {
    if (!socketIsConnected || !shouldReportPathname(pathname)) return

    const title = pageMetadata.pathname === pathname ? pageMetadata.title : ''
    const roomName = pathnameToRoomName(pathname, title)
    socketWorker.emit(SocketEmitEnum.Join, { roomName })

    return () => {
      socketWorker.emit(SocketEmitEnum.Leave, { roomName })
    }
  }, [pageMetadata, pathname, socketIsConnected])

  const pageIsActive = usePageIsActive()
  useEffect(() => {
    if (pageIsActive && !socketIsConnected) {
      socketWorker.reconnect()
    }
  }, [pageIsActive, socketIsConnected])

  return null
}
