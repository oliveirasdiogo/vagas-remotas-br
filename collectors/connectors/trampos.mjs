import { fetchBytes, fetchText, mapLimited } from '../http.mjs'
import { extractJsonObject } from '../parsing.mjs'
import { gunzipSync } from 'node:zlib'

const DOMAINS = ['trampos.co']
const SITEMAP = 'https://trampos.co/sitemaps/sitemap.xml.gz'

const levelFrom = title => /s[eê]nior|sr\.?/i.test(title) ? 'Sênior' : /j[uú]nior|jr\.?|estagi/i.test(title) ? 'Júnior' : /pleno/i.test(title) ? 'Pleno' : 'Não informado'
const tagsFrom = job => [...new Set(`${job.description || ''} ${job.prerequisite || ''}`.match(/\b(?:React|Node\.js|TypeScript|JavaScript|Python|Java|SQL|Figma|Google Ads|Meta Ads|SEO|CRM|BI)\b/gi) || [])].slice(0, 10)

export function parseTramposJob(html, canonicalUrl) {
  const data = extractJsonObject(html, 'opportunity:').opportunity
  if (!data || (!data.home_office && !data.hybrid)) return null
  const rawLogo = data.company?.logo_mini || data.company?.logo || null
  const logoUrl = typeof rawLogo === 'string' ? (rawLogo.startsWith('//') ? `https:${rawLogo}` : rawLogo) : null
  return {
    externalId: String(data.id), title: data.name, company: data.company?.name || data.custom_company_name || 'Confidencial',
    area: data.category_name || 'Outros', level: levelFrom(data.name), contract: data.regime || data.type_name || 'Não informado',
    source: 'Trampos', salary: data.salary && !/não divulgada/i.test(data.salary) ? data.salary : null, tags: tagsFrom(data),
    workMode: data.hybrid ? 'hybrid' : 'remote', location: data.hybrid ? (data.address || 'Brasil') : 'Brasil',
    publishedAt: new Date(data.published_at).toISOString(), relevance: 70, url: canonicalUrl,
    logoUrl, logoKey: data.company?.id ? `trampos-${data.company.id}` : null, status: 'active'
  }
}

export async function collectTrampos({ maxJobs = 30, days = 30 } = {}) {
  const compressed = await fetchBytes(SITEMAP, { domains: DOMAINS })
  const xml = gunzipSync(compressed).toString('utf8')
  const cutoff = Date.now() - days * 86_400_000
  const entries = [...xml.matchAll(/<url>[\s\S]*?<loc>(https:\/\/www\.trampos\.co\/oportunidade\/[^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g)]
    .map(([, url, modified]) => ({ url, modified: Date.parse(modified) }))
    .filter(entry => entry.modified >= cutoff)
    .sort((a, b) => b.modified - a.modified)
    .slice(0, maxJobs)
  const jobs = await mapLimited(entries, 2, async entry => {
    try {
      const html = await fetchText(entry.url, { domains: DOMAINS })
      return parseTramposJob(html, entry.url)
    } catch (error) {
      console.error(`Trampos ${entry.url}: ${error.message}`)
      return null
    }
  })
  return jobs.filter(Boolean)
}
