const LEGACY_ROUTE_ROOM_PREFIX = 'route_'
const ROUTE_ROOM_PREFIX = 'route_v2_'

const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/login',
  '/preview',
  '/common/deleted',
  '/og',
]

export const shouldReportPathname = (pathname: string) =>
  PRIVATE_PATH_PREFIXES.every(
    (prefix) => pathname !== prefix && !pathname.startsWith(`${prefix}/`),
  )

const encodeRoomData = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  return hex
}

const decodeRoomData = (hex: string) => {
  if (!hex || hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) return null

  const bytes = new Uint8Array(
    hex.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
  )

  return new TextDecoder().decode(bytes)
}

export const pathnameToRoomName = (pathname: string, title?: string) => {
  const payload = JSON.stringify({
    path: pathname,
    title: title?.slice(0, 160) || undefined,
  })

  return `${ROUTE_ROOM_PREFIX}${encodeRoomData(payload)}`
}

export const roomNameToRouteInfo = (roomName: string) => {
  if (roomName.startsWith(ROUTE_ROOM_PREFIX)) {
    const value = decodeRoomData(roomName.slice(ROUTE_ROOM_PREFIX.length))
    if (!value) return null

    try {
      const parsed = JSON.parse(value) as { path?: unknown; title?: unknown }
      if (typeof parsed.path !== 'string') return null

      return {
        path: parsed.path,
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
      }
    } catch {
      return null
    }
  }

  if (!roomName.startsWith(LEGACY_ROUTE_ROOM_PREFIX)) return null

  const path = decodeRoomData(roomName.slice(LEGACY_ROUTE_ROOM_PREFIX.length))
  return path ? { path } : null
}
