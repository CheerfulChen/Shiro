'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { setOnlineCount, useOnlineCount } from '~/atoms'
import { useSocketIsConnect } from '~/atoms/hooks/socket'
import { ImpressionView } from '~/components/common/ImpressionTracker'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Divider } from '~/components/ui/divider'
import { FloatPopover } from '~/components/ui/float-popover'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { TrackerAction } from '~/constants/tracker'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { roomNameToRouteInfo } from '~/lib/activity-room'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

const Help = () => {
  const t = useTranslations('gateway')
  return (
    <FloatPopover
      mobileAsSheet
      as="span"
      triggerElement={<i className="i-mingcute-question-line cursor-help" />}
      type="tooltip"
      asChild
      sheet={{
        triggerAsChild: true,
      }}
    >
      <div className="space-y-2 leading-relaxed">
        <p className="flex items-center space-x-1 opacity-80">
          <i className="i-mingcute-question-line" />
          <span className="font-medium">{t('how_it_works')}</span>
        </p>
        <p>{t('websocket_intro')}</p>
        <p>{t('websocket_realtime')}</p>

        <Divider />

        <p>
          {t('socket_status')}
          <ConnectedIndicator />
        </p>
      </div>
    </FloatPopover>
  )
}

const ConnectedIndicator = () => {
  const connected = useSocketIsConnect()

  return (
    <div className="inline-flex items-center">
      <ImpressionView
        trackerMessage="socket_status"
        action={TrackerAction.Impression}
      />
      <ConnectionStatus isConnected={connected} />
    </div>
  )
}

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  const t = useTranslations('gateway')
  const color = isConnected ? '#00FC47' : '#FC0000'
  const secondaryColor = isConnected
    ? 'rgba(174, 244, 194, 0.46)'
    : 'rgba(244, 174, 174, 0.46)'
  const text = isConnected ? t('connected') : t('disconnected')

  const backgroundStyle = {
    background: `radial-gradient(45.91% 45.91% at 49.81% 54.09%, ${color} 7.13%, ${secondaryColor} 65.83%, rgba(252, 252, 252, 0.00) 100%)`,
  }

  return (
    <>
      <span className="absolute size-5" style={backgroundStyle} />
      <span className="ml-6">{text}</span>
    </>
  )
}

export const GatewayInfo = () => {
  const t = useTranslations('gateway')
  const isActive = usePageIsActive()
  const count = useOnlineCount()
  useQuery({
    queryKey: ['online-count'],
    enabled: isActive,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 10,
    queryFn: async () => {
      const data = await apiClient.activity.proxy['online-count'].get<{
        total: number
      }>()
      setOnlineCount(data.total || 0)
      return data
    },
  })

  if (!isActive) return null
  return (
    <div className="inline-flex items-center gap-2">
      <FloatPopover
        asChild
        mobileAsSheet
        placement="top"
        trigger="both"
        offset={10}
        triggerElement={
          <span key={count} className="cursor-pointer">
            {t('being_viewed')}
            <span>
              <NumberSmoothTransition>{count}</NumberSmoothTransition>
            </span>
            {t('viewers')}
          </span>
        }
      >
        <RoomsInfo />
      </FloatPopover>
      <Help />
    </div>
  )
}

const RoomsInfo = () => {
  const t = useTranslations('gateway')
  const { data } = useQuery({
    queryKey: ['rooms'],
    refetchOnMount: true,
    staleTime: 1000 * 10,
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const res = await fetch('/api/activity/rooms')
      if (!res.ok) throw new Error('Failed to fetch activity rooms')
      const data = await res.json()
      const roomCount = data.roomCount || data.room_count || {}
      const rooms = (data.rooms || []) as string[]
      const objects = {
        notes: (data.objects?.notes || []) as {
          id: string
          nid: number
          title: string
        }[],
        posts: (data.objects?.posts || []) as {
          id: string
          slug: string
          title: string
          category: { slug: string }
        }[],
        pages: (data.objects?.pages || []) as {
          id: string
          slug: string
          title: string
        }[],
      }
      const result = [] as {
        path: string
        label: string
        count: number
      }[]
      const morphArticleIdToRoomName = (id: string) => `article_${id}`
      objects.notes.forEach((note) => {
        result.push({
          path: routeBuilder(Routes.Note, {
            id: note.nid,
          }),
          label: formatContentLabel(t('content_note'), note.title, t),
          count: roomCount[morphArticleIdToRoomName(note.id)] || 0,
        })
      })
      objects.posts.forEach((post) => {
        result.push({
          path: routeBuilder(Routes.Post, {
            category: post.category.slug,
            slug: post.slug,
          }),
          label: formatContentLabel(t('content_post'), post.title, t),
          count: roomCount[morphArticleIdToRoomName(post.id)] || 0,
        })
      })
      objects.pages.forEach((page) => {
        result.push({
          path: routeBuilder(Routes.Page, {
            slug: page.slug,
          }),
          label: formatContentLabel(t('content_page'), page.title, t),
          count: roomCount[morphArticleIdToRoomName(page.id)] || 0,
        })
      })

      const routeResults = new Map<
        string,
        { path: string; label: string; count: number; hasTitle: boolean }
      >()
      rooms.forEach((roomName) => {
        const route = roomNameToRouteInfo(roomName)
        if (!route) return

        const current = routeResults.get(route.path)
        const hasTitle = !!route.title
        const routeResult = {
          path: route.path,
          label: getRouteLabel(route.path, route.title, t),
          count: (current?.count || 0) + (roomCount[roomName] || 0),
          hasTitle,
        }

        if (!current || hasTitle || !current.hasTitle) {
          routeResults.set(route.path, routeResult)
        } else {
          current.count = routeResult.count
        }
      })

      routeResults.forEach((route) => {
        const contentRoom = result.find((room) => room.path === route.path)
        if (contentRoom) {
          contentRoom.count = Math.max(contentRoom.count, route.count)
          return
        }

        result.push(route)
      })

      return result
        .filter((room) => room.count > 0)
        .sort((a, b) => b.count - a.count)
    },
  })

  if (!data)
    return (
      <div className="center flex size-6">
        <div className="loading loading-spinner" />
      </div>
    )
  if (data.length === 0)
    return <div className="text-zinc-500">{t('no_readers')}</div>
  return (
    <div className="lg:max-w-[400px]">
      <div className="mb-2 text-sm font-medium">{t('popular_content')}</div>
      <ul className="flex flex-col justify-between gap-2">
        {data.map((room) => (
          <li key={room.path} className="flex items-center justify-between">
            <PeekLink href={room.path} className="hover:underline">
              {room.label}
            </PeekLink>
            {!!room.count && (
              <span className="ml-5 inline-flex items-center text-sm text-zinc-500">
                <i className="i-mingcute-user-visible-line" /> {room.count}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const formatContentLabel = (
  category: string,
  title: string | undefined,
  t: ReturnType<typeof useTranslations<'gateway'>>,
) => (title ? t('content_title', { category, title }) : category)

const getRouteLabel = (
  path: string,
  title: string | undefined,
  t: ReturnType<typeof useTranslations<'gateway'>>,
) => {
  if (path === '/') return t('route_home')
  if (path === Routes.Posts) return t('route_posts')
  if (path === Routes.Notes) return t('route_notes')
  if (path === Routes.Timelime) return t('route_timeline')
  if (path === Routes.Friends) return t('route_friends')
  if (path === Routes.Projects) return t('route_projects')
  if (path === Routes.Says) return t('route_says')
  if (path === Routes.Thinking) return t('route_thinking')

  if (path.startsWith(`${Routes.Posts}/`))
    return formatContentLabel(t('content_post'), title, t)
  if (path.startsWith(`${Routes.Notes}/`))
    return formatContentLabel(t('content_note'), title, t)
  if (path.startsWith(`${Routes.Thinking}/`))
    return formatContentLabel(t('content_thinking'), title, t)
  if (path.startsWith(`${Routes.Projects}/`))
    return formatContentLabel(t('content_project'), title, t)

  return title
    ? formatContentLabel(t('content_page'), title, t)
    : t('route_other')
}
