import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'

export interface ActivityProcessInfo {
  name: string
  iconBase64?: string
  iconUrl?: string
  description?: string
}

export interface ActivityMediaInfo {
  title: string
  artist: string
}

export interface ActivityState {
  processInfo: ActivityProcessInfo | null
  mediaInfo: ActivityMediaInfo | null
}

export const activityAtom = atom<ActivityState>({
  processInfo: null,
  mediaInfo: null,
})

export const setActivityProcessInfo = (
  processInfo: ActivityProcessInfo | null,
) => {
  jotaiStore.set(activityAtom, (prev) => ({
    ...prev,
    processInfo,
  }))
}

export const setActivityMediaInfo = (mediaInfo: ActivityMediaInfo | null) => {
  jotaiStore.set(activityAtom, (prev) => ({
    ...prev,
    mediaInfo,
  }))
}
