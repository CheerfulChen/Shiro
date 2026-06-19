import { useAtomValue } from 'jotai'

import { activityAtom } from '../activity'

export const useActivity = () => useAtomValue(activityAtom)
