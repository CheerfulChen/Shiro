'use client'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { memo, useEffect, useMemo } from 'react'

import { setActivityMediaInfo, setActivityProcessInfo } from '~/atoms'
import type { ActivityMediaInfo, ActivityProcessInfo } from '~/atoms/activity'
import { useActivity } from '~/atoms/hooks/activity'
import { FloatPopover } from '~/components/ui/float-popover'
import { softBouncePreset } from '~/constants/spring'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { apiClient } from '~/lib/request'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'

interface ActivityResponse {
  processName?: string
  processInfo?: ActivityProcessInfo
  mediaInfo?: ActivityMediaInfo
}

export const Activity = memo(() => {
  const activityConfig = useAppConfigSelector(
    (config) => config.module.activity,
  )
  const { enable = false, endpoint = 'fn/ps/update' } = activityConfig || {}
  const isPageActive = usePageIsActive()

  const { data } = useQuery({
    queryKey: ['header-activity', endpoint],
    queryFn: async () => {
      return apiClient.proxy(endpoint).get<ActivityResponse>()
    },
    enabled: enable && isPageActive,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
    meta: {
      persist: false,
    },
  })

  useEffect(() => {
    if (!data) return

    setActivityProcessInfo(data.processInfo || null)
    setActivityMediaInfo(data.mediaInfo || null)
  }, [data])

  useEffect(() => {
    if (!enable) return

    const handleProcessUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        processInfo?: ActivityProcessInfo
      }
      setActivityProcessInfo(detail.processInfo || null)
    }
    const handleMediaUpdate = (event: Event) => {
      setActivityMediaInfo(
        ((event as CustomEvent).detail || null) as ActivityMediaInfo | null,
      )
    }

    window.addEventListener('ps-update', handleProcessUpdate)
    window.addEventListener('media-update', handleMediaUpdate)

    return () => {
      window.removeEventListener('ps-update', handleProcessUpdate)
      window.removeEventListener('media-update', handleMediaUpdate)
    }
  }, [enable])

  if (!enable) return null

  return <ActivityIndicator />
})

Activity.displayName = 'Activity'

const ActivityIndicator = () => {
  const ownerName = useAggregationSelector((data) => data.user.name)
  const { processInfo, mediaInfo } = useActivity()

  const processName = processInfo?.name
  const iconUrl = useMemo(() => {
    if (processInfo?.iconUrl) return processInfo.iconUrl
    if (processInfo?.iconBase64)
      return `data:image/png;base64,${processInfo.iconBase64}`
    return null
  }, [processInfo?.iconBase64, processInfo?.iconUrl])

  return (
    <>
      <AnimatePresence>
        {mediaInfo && (
          <m.div
            className="pointer-events-auto absolute bottom-0 left-0 top-0 z-10 flex items-center lg:left-[-30px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={softBouncePreset}
          >
            <FloatPopover
              triggerElement={<ActivityDot label="music" />}
              type="tooltip"
              strategy="fixed"
            >
              {ownerName} 正在听 {mediaInfo.title} - {mediaInfo.artist}
            </FloatPopover>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {processName && (
          <m.div
            className="pointer-events-auto absolute bottom-0 right-0 top-0 z-10 flex items-center lg:right-[-28px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={softBouncePreset}
          >
            <FloatPopover
              triggerElement={
                <ActivityIcon iconUrl={iconUrl} label={processName} />
              }
              type="tooltip"
              strategy="fixed"
            >
              {ownerName} 正在使用 {processName}
              {processInfo?.description ? ` ${processInfo.description}` : ''}
            </FloatPopover>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}

const ActivityIcon = ({
  iconUrl,
  label,
}: {
  iconUrl: string | null
  label: string
}) => {
  if (!iconUrl) return <ActivityDot label={label} />

  return (
    <span
      aria-label={label}
      className="block size-7 rounded-md bg-cover bg-center shadow-sm ring-1 ring-black/10 dark:ring-white/15"
      role="img"
      style={{ backgroundImage: `url("${iconUrl}")` }}
    />
  )
}

const ActivityDot = ({ label }: { label: string }) => (
  <span
    aria-label={label}
    className="center flex size-6 rounded-full bg-accent text-[10px] text-white shadow-sm ring-1 ring-black/10 dark:ring-white/15"
    role="img"
  >
    <span className="i-mingcute-computer-line" />
  </span>
)
