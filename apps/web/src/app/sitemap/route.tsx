import { escapeXml } from '~/lib/helper.server'
import { getQueryClient } from '~/lib/query-client.server'
import { apiClient } from '~/lib/request'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour
export const GET = async () => {
  const queryClient = getQueryClient()

  const { data } = await queryClient.fetchQuery({
    queryKey: ['sitemap'],
    queryFn: async () => {
      const path = apiClient.aggregate.proxy.sitemap.toString(true)
      return fetch(path).then((res) => res.json())
    },
  })

  // Language alternates are emitted by each content page, where the API's
  // actual translation availability is known. Do not invent them from URLs.
  const xml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${data
    .map((item: any) => {
      const loc = escapeXml(String(item.url ?? ''))
      const lastmod = item.published_at
        ? escapeXml(String(item.published_at))
        : ''

      return `<url>
  <loc>${loc}</loc>
${lastmod ? `  <lastmod>${lastmod}</lastmod>` : ''}
  <changefreq>daily</changefreq>
</url>`
    })
    .join('')}
  </urlset>
  `.trim()
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
