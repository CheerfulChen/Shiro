const ROUTE_ROOM_PREFIX = 'route_'

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

export const pathnameToRoomName = (pathname: string) => {
  const bytes = new TextEncoder().encode(pathname)
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  return `${ROUTE_ROOM_PREFIX}${hex}`
}

export const roomNameToPathname = (roomName: string) => {
  if (!roomName.startsWith(ROUTE_ROOM_PREFIX)) return null

  const hex = roomName.slice(ROUTE_ROOM_PREFIX.length)
  if (!hex || hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) return null

  const bytes = new Uint8Array(
    hex.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
  )

  return new TextDecoder().decode(bytes)
}
