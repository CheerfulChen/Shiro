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
  const { sourceLocale, contentLocale } = getContentLanguages(content)
  const requestedLocale =
    normalizeLocale(requestedLanguage) ?? normalizeLocale(locale)
  const viewingOriginal = requestedLanguage === 'original'
  const isFallback = !viewingOriginal && requestedLocale !== contentLocale

  if (!content.isTranslated && !isFallback && !viewingOriginal) return null

  const t = await getTranslations({ locale, namespace: 'translation' })
  const common = await getTranslations({ locale, namespace: 'common' })
  const languageLabel = (language: Locale) => common(`language_${language}`)

  return (
    <p className="my-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral/60">
      <span>
        {content.isTranslated
          ? `${t('banner_title')} · ${t('banner_translatedFrom', { language: languageLabel(sourceLocale) })}`
          : isFallback
            ? t('unavailable', {
                language: languageLabel(requestedLocale ?? sourceLocale),
                sourceLanguage: languageLabel(sourceLocale),
              })
            : t('viewing_original')}
      </span>
      {content.isTranslated && (
        <Link
          href={buildLocalePrefixedPath(sourceLocale, pathname)}
          hrefLang={sourceLocale}
          prefetch={false}
          className="underline underline-offset-4 transition-colors hover:text-accent"
        >
          {t('banner_viewOriginal')}
        </Link>
      )}
    </p>
  )
}
