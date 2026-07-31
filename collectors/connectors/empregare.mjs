import { fetchText, mapLimited } from '../http.mjs'
import { stripHtml } from '../parsing.mjs'

const DOMAINS = ['empregare.com']
const SITEMAP = 'https://www.empregare.com/pt-br/sitemap-vagas.xml'
const levelFrom = title => /s[eê]nior|\bsr\.?\b/i.test(title) ? 'Sênior' : /j[uú]nior|\bjr\.?\b|estagi/i.test(title) ? 'Júnior' : /pleno/i.test(title) ? 'Pleno' : 'Não informado'
const tagsFrom = text => [...new Set(text.match(/\b(?:React|Node(?:\.js)?|TypeScript|JavaScript|Python|Java|Kotlin|\.NET|C#|AWS|Azure|GCP|SQL|Power BI|Excel|SAP|DevOps|QA)\b/gi) || [])].slice(0, 10)

export function parseEmpregare(html, canonicalUrl) {
  const raw = html.match(/<script\s+type="application\/ld(?:\+|&#x2B;)json">([\s\S]*?)<\/script>/i)?.[1]
  if (!raw) throw new Error('JobPosting ausente')
  const data = JSON.parse(raw)
  if (data['@type'] !== 'JobPosting') throw new Error('Schema inesperado')
  const description = stripHtml(data.description || '')
  const modeText = `${data.title || ''} ${data.jobLocationType || ''} ${description}`
  const isHybrid = /h[ií]brid[oa]/i.test(modeText)
  const isRemote = /TELECOMMUTE|home[ -]?office|100% remot|trabalho remot|vaga remot|atua[cç][aã]o remot/i.test(modeText)
  if (!isHybrid && !isRemote) return null
  const addresses = (Array.isArray(data.jobLocation) ? data.jobLocation : [data.jobLocation]).filter(Boolean).map(place => place.address || {})
  const location = [...new Set(addresses.map(address => [address.addressLocality, address.addressRegion].filter(Boolean).join(', ')).filter(Boolean))].join(' / ')
  const salary = data.baseSalary?.value
  const salaryLabel = salary?.minValue ? `R$ ${Number(salary.minValue).toLocaleString('pt-BR')}${salary.maxValue && salary.maxValue !== salary.minValue ? ` – R$ ${Number(salary.maxValue).toLocaleString('pt-BR')}` : ''}` : null
  return {
    externalId: String(data.identifier?.value || canonicalUrl.match(/_(\d+)$/)?.[1]), title: data.title,
    company: data.hiringOrganization?.name === 'confidential' ? 'Confidencial' : data.hiringOrganization?.name,
    area: 'Outros', level: levelFrom(data.title), contract: data.employmentType || 'Não informado', source: 'Empregare',
    salary: salaryLabel, tags: tagsFrom(description), workMode: isHybrid ? 'hybrid' : 'remote', location: isHybrid ? (location || 'Brasil') : 'Brasil',
    publishedAt: new Date(data.datePosted).toISOString(), relevance: 68, url: canonicalUrl, status: Date.parse(data.validThrough) >= Date.now() ? 'active' : 'closed'
  }
}

export async function collectEmpregare({ maxJobs = 30, days = 30 } = {}) {
  const xml = await fetchText(SITEMAP, { domains: DOMAINS })
  const urls = [...xml.matchAll(/<loc>(https:\/\/www\.empregare\.com\/pt-br\/vaga-[^<]+_(\d+))<\/loc>/g)]
    .map(([, url, id]) => ({ url, id: Number(id) }))
    .sort((a, b) => b.id - a.id)
    .slice(0, maxJobs)
    .map(entry => entry.url)
  const cutoff = Date.now() - days * 86_400_000
  const jobs = await mapLimited(urls, 2, async url => {
    try {
      const job = parseEmpregare(await fetchText(url, { domains: DOMAINS }), url)
      return job && Date.parse(job.publishedAt) >= cutoff ? job : null
    } catch (error) {
      console.error(`Empregare ${url}: ${error.message}`)
      return null
    }
  })
  return jobs.filter(Boolean)
}
