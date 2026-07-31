import { readFile } from 'node:fs/promises'
import { fetchText } from '../http.mjs'
import { stripHtml } from '../parsing.mjs'

const DOMAINS = ['lever.co']
const brazil = value => /\b(?:brazil|brasil|s[aã]o paulo|bras[ií]lia|campinas|rio de janeiro|curitiba)\b/i.test(value)
const remote = value => /\b(?:remote|remot[oa]|home\s*office|homeoffice)\b/i.test(value)
const hybrid = value => /\bhybrid|h[ií]brid[oa]\b/i.test(value)
const levelFrom = title => /s[eê]nior|\bsr\.?\b|master|architect/i.test(title) ? 'Sênior' : /j[uú]nior|\bjr\.?\b|estagi/i.test(title) ? 'Júnior' : /pleno|mid.level/i.test(title) ? 'Pleno' : 'Não informado'
const tagsFrom = text => [...new Set(text.match(/\b(?:React|Node(?:\.js)?|TypeScript|JavaScript|Python|Java|Kotlin|Swift|\.NET|C#|AWS|Azure|GCP|SQL|Salesforce|DevOps|SRE|QA|IA|AI)\b/gi) || [])].slice(0, 10)

export function parseLever(posting, company) {
  const location = [...new Set([posting.categories?.location, ...(posting.categories?.allLocations || [])].filter(Boolean))].join(' / ')
  const modeText = `${posting.text || ''} ${location} ${posting.categories?.commitment || ''} ${posting.workplaceType || ''}`
  const searchable = `${modeText} ${stripHtml(posting.descriptionPlain || posting.description || '')}`
  const isHybrid = hybrid(modeText) || posting.workplaceType === 'hybrid'
  const isRemote = remote(modeText) || posting.workplaceType === 'remote'
  if (!posting.id || !posting.text || !posting.hostedUrl || !brazil(searchable) || (!isRemote && !isHybrid)) return null
  return {
    externalId: posting.id, title: posting.text, company, area: posting.categories?.team || posting.categories?.department || 'Outros',
    level: levelFrom(posting.text), contract: posting.categories?.commitment || 'Não informado', source: 'Lever', salary: null,
    tags: tagsFrom(searchable), workMode: isHybrid ? 'hybrid' : 'remote', location: location || 'Brasil',
    publishedAt: Number.isFinite(posting.createdAt) ? new Date(posting.createdAt).toISOString() : null,
    relevance: 75, url: posting.hostedUrl, status: 'active'
  }
}

export async function collectLever({ maxJobs = 30 } = {}) {
  const config = JSON.parse(await readFile(new URL('../sources.json', import.meta.url), 'utf8'))
  const jobs = []
  const perCompany = Math.max(5, Math.ceil(maxJobs / Math.max(1, config.lever?.length || 1)))
  for (const source of config.lever || []) {
    try {
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json&limit=100`
      const postings = JSON.parse(await fetchText(url, { domains: DOMAINS, headers: { accept: 'application/json' } }))
      if (!Array.isArray(postings)) throw new Error('Formato inesperado')
      jobs.push(...postings.map(posting => {
        const job = parseLever(posting, source.company)
        return job ? { ...job, logoUrl: source.logoUrl || null, logoKey: `lever-${source.site}` } : null
      }).filter(Boolean).slice(0, perCompany))
    } catch (error) {
      console.error(`Lever ${source.site}: ${error.message}`)
    }
  }
  return jobs.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0)).slice(0, maxJobs)
}
