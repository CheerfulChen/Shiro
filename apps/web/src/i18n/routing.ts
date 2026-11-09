import { defineRouting } from 'next-intl/routing'

import { defaultLocale, locales } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
  // Content metadata knows which translations exist; the router does not.
  alternateLinks: false,
})
