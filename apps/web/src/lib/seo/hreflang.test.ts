import { describe, expect, it } from 'vitest'

import {
  buildContentAlternates,
  buildLocalePrefixedPath,
  getSupportedLocalesFromTranslations,
  stripLocaleFromPathname,
} from './hreflang'

describe('content language metadata', () => {
  const pathname = '/posts/大学生涯/mec302'

  it('does not advertise translations for original-only content', () => {
    expect(buildContentAlternates(pathname, { isTranslated: false })).toEqual({
      canonical: pathname,
      languages: { 'zh-CN': pathname, 'x-default': pathname },
    })
  })

  it('gives a real Japanese translation its own canonical', () => {
    const metadata = buildContentAlternates(pathname, {
      isTranslated: true,
      translationMeta: { sourceLang: 'zh-CN', targetLang: 'ja-JP' },
      availableTranslations: ['en', 'ja'],
    })
    expect(metadata.canonical).toBe(`/ja${pathname}`)
    expect(metadata.languages).toEqual({
      'zh-CN': pathname,
      en: `/en${pathname}`,
      ja: `/ja${pathname}`,
      'x-default': pathname,
    })
  })

  it('canonicalizes a fallback to the original even if a translation is listed', () => {
    const metadata = buildContentAlternates(pathname, {
      isTranslated: false,
      availableTranslations: ['en'],
    })
    expect(metadata.canonical).toBe(pathname)
    expect(metadata.languages).not.toHaveProperty('ja')
  })

  it('includes the returned translation when the availability list is absent', () => {
    expect(
      buildContentAlternates(pathname, {
        isTranslated: true,
        translationMeta: { sourceLang: 'zh', targetLang: 'en' },
      }).languages,
    ).toHaveProperty('en', `/en${pathname}`)
  })

  it('uses the actual source language for x-default and original-view canonicals', () => {
    const metadata = buildContentAlternates(pathname, {
      isTranslated: false,
      translationMeta: { sourceLang: 'en-US', targetLang: 'zh' },
    })
    expect(metadata.canonical).toBe(`/en${pathname}`)
    expect(metadata.languages).toEqual({
      en: `/en${pathname}`,
      'x-default': `/en${pathname}`,
    })
  })

  it('normalizes, deduplicates and filters language codes', () => {
    expect(
      getSupportedLocalesFromTranslations({
        sourceLang: 'ZH_cn',
        availableTranslations: ['en-US', 'ja-JP', 'ja', 'fr'],
      }),
    ).toEqual(['zh', 'en', 'ja'])
  })

  it.each([
    ['zh', '/about', '/about'],
    ['en', '/en/about', '/en/about'],
    ['ja', '/ja', '/ja/'],
  ] as const)(
    'keeps the canonical on the requested page (%s)',
    (locale, path, expected) => {
      expect(
        buildLocalePrefixedPath(locale, stripLocaleFromPathname(path)),
      ).toBe(expected)
    },
  )
})
