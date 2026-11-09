import 'server-only'

import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'

// Reuse within one server render, never between requests or visitors.
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 3,
          gcTime: Infinity,
        },
      },
    }),
)
