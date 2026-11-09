import { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { describe, expect, it } from 'vitest'

import { routing } from './routing'

describe('language URL stability', () => {
  const middleware = createMiddleware(routing)

  it('keeps unprefixed Chinese URLs despite English preferences', () => {
    const response = middleware(
      new NextRequest('https://blog.chiran.top/about', {
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          cookie: 'NEXT_LOCALE=en',
        },
      }),
    )
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('link')).toBeNull()
    expect(
      new URL(response.headers.get('x-middleware-rewrite')!).pathname,
    ).toBe('/zh/about')
  })

  it('keeps an explicit Japanese URL despite Chinese preferences', () => {
    const response = middleware(
      new NextRequest('https://blog.chiran.top/ja/about', {
        headers: { 'accept-language': 'zh-CN', cookie: 'NEXT_LOCALE=zh' },
      }),
    )
    expect(response.headers.get('location')).toBeNull()
    expect(
      response.headers.get('x-middleware-request-x-next-intl-locale'),
    ).toBe('ja')
    expect(response.headers.get('link')).toBeNull()
  })
})
