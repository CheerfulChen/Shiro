import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '~/i18n/config'
import type { TranslatedContent } from '~/lib/seo/hreflang'
import {
  buildLocalePrefixedPath,
  getContentLanguages,
  normalizeLocale,
} from '~/lib/seo/hreflang'

export async function ContentLanguageNotice({
  content,
  pathname,
  locale,
  requestedLanguage,
}: {
  content: TranslatedContent
  pathname: string
  locale: string
  requestedLanguage?: string
}) {
  const { sourceLocale, contentLocale, supportedLocales } =
    getContentLanguages(content)
  const t = await getTranslations({ locale, namespace: 'translation' })
  const common = await getTranslations({ locale, namespace: 'common' })
  const languageLabel = (language: Locale) => common(`language_${language}`)
  const requestedLocale =
    normalizeLocale(requestedLanguage) ?? normalizeLocale(locale)
  const viewingOriginal = requestedLanguage === 'original'
  const isFallback = !viewingOriginal && requestedLocale !== contentLocale

  if (
    !content.isTranslated &&
    !isFallback &&
    !viewingOriginal &&
    supportedLocales.length <= 1
  )
    return null

  return (
    <aside className="my-4 rounded-lg border border-neutral/15 bg-neutral/5 px-4 py-3 text-sm">
      {content.isTranslated ? (
        <p>
          <span className="font-medium">{t('banner_title')}</span>
          {' · '}
          {t('banner_translatedFrom', {
            language: languageLabel(sourceLocale),
          })}
        </p>
      ) : isFallback ? (
        <p>
          {t('unavailable', {
            language: languageLabel(requestedLocale ?? sourceLocale),
            sourceLanguage: languageLabel(sourceLocale),
          })}
        </p>
      ) : viewingOriginal ? (
        <p>{t('viewing_original')}</p>
      ) : null}
      <nav
        aria-label={t('available_languages')}
        className="mt-2 flex flex-wrap gap-x-4 gap-y-2"
      >
        {supportedLocales.map((language) => (
          <Link
            key={language}
            href={buildLocalePrefixedPath(language, pathname)}
            hrefLang={language}
            lang={language}
            prefetch={false}
            aria-current={language === contentLocale ? 'page' : undefined}
            className="text-accent underline-offset-4 hover:underline"
          >
            {languageLabel(language)}
            {language === sourceLocale && <span> ({t('original')})</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
