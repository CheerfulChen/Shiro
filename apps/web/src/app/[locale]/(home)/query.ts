import type { AggregateTop } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'

export const getHomeQueryKey = (locale: string) => ['home', locale]

export const useHomeQueryData = () => {
  const locale = useLocale()
  return useQuery({
    queryKey: getHomeQueryKey(locale),
    queryFn: async () => null! as AggregateTop,
    enabled: false,
  }).data!
}
