'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'

import { locales } from '~/i18n/config'
import { usePathname } from '~/i18n/navigation'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'

export const LocaleSwitcher = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('site_language')}
      className="flex flex-wrap items-center gap-3 text-sm"
    >
      {locales.map((language) => (
        <Link
          key={language}
          href={buildLocalePrefixedPath(language, pathname)}
          hrefLang={language}
          lang={language}
          prefetch={false}
          aria-current={language === locale ? 'true' : undefined}
          className={
            language === locale
              ? 'font-medium text-accent'
              : 'transition-colors hover:text-accent'
          }
        >
          {t(`locale_${language}`)}
        </Link>
      ))}
    </nav>
  )
}
