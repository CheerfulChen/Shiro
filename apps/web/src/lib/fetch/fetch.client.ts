import 'client-only'

import { nanoid } from 'nanoid'
import { createFetch } from 'ofetch'

import PKG from '~/../package.json'
import { defaultLocale, locales } from '~/i18n/config'

import { createApiClient, createFetchAdapter } from './shared'

const isDev = process.env.NODE_ENV === 'development'
const isServerSide = typeof window === 'undefined'
const uuidStorageKey = 'x-uuid'
const uuid = nanoid()

const globalConfigureHeader = {} as any
const globalConfigureSearchParams = {} as any

if (isServerSide) {
  globalConfigureHeader['User-Agent'] =
    `NextJS/v${PKG.dependencies.next} ${PKG.name}/${PKG.version}`
}

export const $fetch = createFetch({
  defaults: {
    timeout: 8000,
    credentials: 'include',
    headers: globalConfigureHeader,
    onRequest(context) {
      // eslint-disable-next-line prefer-destructuring
      let headers: any = context.options.headers
      if (headers && headers instanceof Headers) {
        headers = Object.fromEntries(headers.entries())
      } else {
        headers = {}
      }

      headers['X-Session-Uuid'] =
        globalThis?.sessionStorage?.getItem(uuidStorageKey) ?? uuid

      context.options.params ??= {}
      // Resolve from the URL at request time, including the first request after
      // a language switch, before LangSyncProvider's effect has run.
      if (!isServerSide) {
        const prefix = window.location.pathname.split('/')[1]
        headers['x-lang'] =
          locales.find((locale) => locale === prefix) ?? defaultLocale
      }
      Object.assign(context.options.params, globalConfigureSearchParams)

      if (isDev && isServerSide) {
        console.info(`[Request]: ${context.request}`)
      }

      context.options.headers = headers
    },
    onResponse(context) {
      if (isDev && isServerSide) {
        console.info(`[Response]: ${context.request}`, context.response.status)
      }
    },
  },
})

export const apiClient = createApiClient(createFetchAdapter($fetch))
export const attachFetchHeader = (key: string, value: string | null) => {
  const original = globalConfigureHeader[key]
  if (value === null) {
    delete globalConfigureHeader[key]
  } else {
    globalConfigureHeader[key] = value
  }

  return () => {
    if (original === undefined) {
      delete globalConfigureHeader[key]
    } else {
      globalConfigureHeader[key] = original
    }
  }
}

export const setGlobalSearchParams = (params: Record<string, any>) => {
  clearGlobalSearchParams()
  Object.assign(globalConfigureSearchParams, params)
}

export const clearGlobalSearchParams = () => {
  Object.keys(globalConfigureSearchParams).forEach((key) => {
    delete globalConfigureSearchParams[key]
  })
}
export const isReactClient = true

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    get() {
      return apiClient
    },
  })
}
