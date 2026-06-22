import { NextResponse } from 'next/server'

import { API_URL } from '~/constants/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || API_URL
  const url = new URL(
    'activity/rooms',
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
  )

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
    },
  })

  const data = await response.json()

  return NextResponse.json(data, {
    status: response.status,
  })
}
