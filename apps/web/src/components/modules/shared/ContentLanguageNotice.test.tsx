import { createTranslator, NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { LocaleSwitcher } from '~/components/layout/footer/LocaleSwitcher'
import type { Locale } from '~/i18n/config'
import en from '~/messages/en'
import ja from '~/messages/ja'
import zh from '~/messages/zh'

import { ContentLanguageNotice } from './ContentLanguageNotice'

const messages = { zh, en, ja }

vi.mock('~/i18n/navigation', () => ({
  usePathname: () => '/posts/example/hello',
}))

vi.mock('next-intl/server', () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: Locale
    namespace: string
  }) =>
    createTranslator({
      locale,
      messages: messages[locale],
      namespace: namespace as 'translation' | 'common',
    }),
}))

const pathname = '/posts/example/hello'

describe('crawlable language links and translation status', () => {
  it('renders footer language anchors without a menu click or a Chinese redirect', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="ja" messages={ja} timeZone="UTC">
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    )
    for (const href of [pathname, `/en${pathname}`, `/ja${pathname}`]) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('href="/zh/')
  })

  it('explains the fallback without repeating the language selector', async () => {
    const html = renderToStaticMarkup(
      await ContentLanguageNotice({
        content: { isTranslated: false },
        pathname,
        locale: 'ja',
      }),
    )
    expect(html).toContain('訳はありません')
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('<aside')
  })

  it('labels AI translations and exposes an original link', async () => {
    const html = renderToStaticMarkup(
      await ContentLanguageNotice({
        content: {
          isTranslated: true,
          translationMeta: { sourceLang: 'zh', targetLang: 'ja' },
          availableTranslations: ['ja'],
        },
        pathname,
        locale: 'ja',
      }),
    )
    expect(html).toContain('AI翻訳')
    expect(html).toContain(`href="${pathname}"`)
    expect(html).not.toContain(`href="/ja${pathname}"`)
    expect(html).not.toContain('<aside')
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('href="/en/')
  })

  it('does not label an explicit original view as a missing translation', async () => {
    const html = renderToStaticMarkup(
      await ContentLanguageNotice({
        content: { isTranslated: false },
        pathname,
        locale: 'ja',
        requestedLanguage: 'original',
      }),
    )
    expect(html).toContain('原文を表示')
    expect(html).not.toContain('訳はありません')
  })

  it('keeps the original quiet even when translations are available', async () => {
    expect(
      await ContentLanguageNotice({
        content: { isTranslated: false, availableTranslations: ['en', 'ja'] },
        pathname,
        locale: 'zh',
      }),
    ).toBeNull()
  })

  it('keeps original-only content quiet in its own language', async () => {
    expect(
      await ContentLanguageNotice({
        content: { isTranslated: false },
        pathname,
        locale: 'zh',
      }),
    ).toBeNull()
  })
})
