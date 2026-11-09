import './page.css'

import type {
  ModelWithLiked,
  ModelWithTranslation,
  NoteModel,
} from '@mx-space/api-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AckRead } from '~/components/common/AckRead'
import { ArticleRoomReporter } from '~/components/common/ArticleRoomReporter'
import { ClientOnly } from '~/components/common/ClientOnly'
import { CommentAreaRootLazy } from '~/components/modules/comment'
import {
  NoteActionAside,
  NoteBottomBarAction,
  NoteBottomTopic,
  NoteFooterNavigationBarForMobile,
  NoteMetaBar,
  NotePasswordForm,
} from '~/components/modules/note'
import {
  NoteBanner,
  NoteRootBanner,
} from '~/components/modules/note/NoteBanner'
import { NoteFontSettingFab } from '~/components/modules/note/NoteFontFab'
import { NoteMainContainer } from '~/components/modules/note/NoteMainContainer'
import { BanCopyWrapper } from '~/components/modules/shared/BanCopyWrapper'
import { ContentLanguageNotice } from '~/components/modules/shared/ContentLanguageNotice'
import { ReadIndicatorForMobile } from '~/components/modules/shared/ReadIndicator'
import { TocFAB } from '~/components/modules/toc/TocFAB'
import { TocHeadingStrategyProvider } from '~/components/modules/toc/TocHeadingStrategy'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { getOgUrl } from '~/lib/helper.server'
import { getSummaryFromMd } from '~/lib/markdown'
import { definePrerenderPage } from '~/lib/request.server'
import { buildContentAlternates } from '~/lib/seo/hreflang'
import {
  CurrentNoteDataProvider,
  SyncNoteDataAfterLoggedIn,
} from '~/providers/note/CurrentNoteDataProvider'
import { CurrentNoteNidProvider } from '~/providers/note/CurrentNoteIdProvider'
import { LayoutRightSidePortal } from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

import { Paper } from '../../../../components/layout/container/Paper'
import { NoteHeadCover } from '../../../../components/modules/note/NoteHeadCover'
import { NoteHideIfSecret } from '../../../../components/modules/note/NoteHideIfSecret'
import type { NoteDataResult } from './api'
import { getData } from './api'
import { NoteContent } from './NoteContent'
import {
  IndentArticleContainer,
  MarkdownSelection,
  NoteDataReValidate,
  NoteHeaderDate,
  NoteMarkdownImageRecordProvider,
  NoteTitle,
} from './pageExtra'
import { Transition } from './Transition'

type NoteWithTranslation = ModelWithLiked<ModelWithTranslation<NoteModel>>

export const dynamic = 'force-dynamic'

function PageInner({
  data,
  privateLoginOnlyMessage,
  locale,
  requestedLanguage,
}: {
  data: NoteWithTranslation
  privateLoginOnlyMessage: string
  locale: string
  requestedLanguage?: string
}) {
  return (
    <>
      <ArticleRoomReporter id={data.id} />
      <AckRead id={data.id} type="note" />

      <NoteHeadCover image={data.meta?.cover} />

      <div>
        <NoteTitle />
        <span className="flex flex-wrap items-center text-sm text-neutral/60">
          <NoteHeaderDate />

          <NoteMetaBar />
        </span>

        <NoteRootBanner />
        {!data.isPublished && (
          <NoteBanner type="warning" message={privateLoginOnlyMessage} />
        )}
      </div>

      <NoteHideIfSecret>
        <ContentLanguageNotice
          content={data}
          pathname={`/notes/${data.nid}`}
          locale={locale}
          requestedLanguage={requestedLanguage}
        />
        <WrappedElementProvider eoaDetect>
          <ReadIndicatorForMobile />
          <NoteMarkdownImageRecordProvider>
            <BanCopyWrapper>
              <MarkdownSelection>
                <IndentArticleContainer
                  prose={data.contentFormat !== 'lexical'}
                >
                  <header className="sr-only">
                    <NoteTitle />
                  </header>
                  <NoteContent contentFormat={data.contentFormat} />
                </IndentArticleContainer>
              </MarkdownSelection>
            </BanCopyWrapper>
          </NoteMarkdownImageRecordProvider>

          <LayoutRightSidePortal>
            <NoteActionAside />
          </LayoutRightSidePortal>
        </WrappedElementProvider>
      </NoteHideIfSecret>
      {/* <SubscribeBell defaultType="note_c" /> */}
      <ClientOnly>
        <div className="mt-8" data-hide-print />
        <NoteBottomBarAction />
        <NoteBottomTopic />
        <NoteFooterNavigationBarForMobile />
      </ClientOnly>
    </>
  )
}

type NoteDetailPageParams = LocaleParams & {
  id: string
  password?: string
  lang?: string
}
export const generateMetadata = async (props: {
  params: Promise<NoteDetailPageParams>
  searchParams?: Promise<{
    password?: string | string[]
    lang?: string
  }>
}): Promise<Metadata> => {
  const params = await props.params
  const searchParams = (await props.searchParams) ?? {}
  const password = Array.isArray(searchParams.password)
    ? searchParams.password[0]
    : searchParams.password
  try {
    const { note: res } = await getData({
      ...params,
      password,
      lang: searchParams.lang,
    })

    const { data } = res
    const description = getSummaryFromMd(data.text ?? '')

    const ogUrl = await getOgUrl(
      'note',
      {
        nid: params.id,
      },
      params.locale,
    )

    const canonicalPathNoLocale = `/notes/${params.id}`

    return {
      title: data.title,
      description,
      openGraph: {
        title: data.title,
        description,
        images: ogUrl,
        type: 'article',
      },
      twitter: {
        images: ogUrl,
        title: data.title,
        description,
        card: 'summary_large_image',
      },
      alternates: buildContentAlternates(canonicalPathNoLocale, data),
    } satisfies Metadata
  } catch {
    return {}
  }
}

export default definePrerenderPage<NoteDetailPageParams>()<NoteDataResult>({
  fetcher: getData,
  requestErrorRenderer(_error, parsed, { id }) {
    const { status } = parsed

    if (status === 403) {
      return (
        <Paper>
          <NotePasswordForm />
          <CurrentNoteNidProvider nid={id} />
        </Paper>
      )
    }
  },
  async Component({
    data: fetchedData,
    params: { id: nid, locale, lang },
    fetchedAt,
  }) {
    const { note: data } = fetchedData
    const t = await getTranslations({
      namespace: 'note',
      locale,
    })

    return (
      <TocHeadingStrategyProvider
        contentFormat={data.data.contentFormat}
        hasContent={!!data.data.content}
      >
        <CurrentNoteNidProvider nid={nid} />
        <CurrentNoteDataProvider data={data} />
        <NoteDataReValidate fetchedAt={fetchedAt} />
        <SyncNoteDataAfterLoggedIn />
        <Transition className="min-w-0" lcpOptimization>
          <Paper key={nid} as={NoteMainContainer}>
            <PageInner
              data={data.data}
              locale={locale}
              requestedLanguage={lang}
              privateLoginOnlyMessage={t('private_login_only')}
            />
          </Paper>
          <BottomToUpSoftScaleTransitionView delay={500}>
            <CommentAreaRootLazy
              refId={data.data.id}
              allowComment={data.data.allowComment}
            />
          </BottomToUpSoftScaleTransitionView>
        </Transition>

        <NoteFontSettingFab />

        <OnlyMobile>
          <TocFAB />
        </OnlyMobile>
      </TocHeadingStrategyProvider>
    )
  },
})
