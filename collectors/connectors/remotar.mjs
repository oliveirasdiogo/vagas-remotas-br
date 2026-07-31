import { fetchText } from '../http.mjs'
import { stripHtml } from '../parsing.mjs'

const API_DOMAINS = ['remotar.com.br']
const API_URL = page => `https://api.remotar.com.br/timeline?page=${page}`
const levelFrom = text => /s[eê]nior|\bsr\.?\b/i.test(text) ? 'Sênior' : /j[uú]nior|\bjr\.?\b|estagi/i.test(text) ? 'Júnior' : /pleno/i.test(text) ? 'Pleno' : 'Não informado'
const safeExternal = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
const GENERIC_FORMS = ['docs.google.com', 'forms.gle', 'forms.office.com', 'forms.microsoft.com', 'microsoft365.com']
const PLATFORM_ICON_DOMAINS = ['gupy.io', 'inhire.app', 'solides.com.br', 'lever.co', 'zohorecruit.com', 'bairesdev.com', 'gestaotalentos.com.br', 'recrutei.com.br', 'linkedin.com', 'greenhouse.io', 'infojobs.com.br', 'oraclecloud.com', 'abler.com.br', 'empregare.com', 'myworkdayjobs.com', 'vagas.com.br', 'quickin.io', 'workable.com', 'ashbyhq.com', 'latojobs.com', 'ifood.com.br', 'micro1.ai', 'smartrecruiters.com']
const iconDomainFrom = value => {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '')
    if (GENERIC_FORMS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) return null
    return PLATFORM_ICON_DOMAINS.find(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || hostname
  } catch { return null }
}
const structuredText = value => {
  if (typeof value !== 'string') return ''
  const spaced = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<li\b[^>]*>/gi, '\n• ').replace(/<\/(?:p|div|li|h[1-6]|ul|ol)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  return spaced.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
const platformFrom = (value, company = 'Empresa') => {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '')
    if (GENERIC_FORMS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) return company.slice(0, 40)
    const known = [
      ['Gupy', 'gupy.io'], ['InHire', 'inhire.app'], ['Sólides', 'solides.com.br'], ['Lever', 'lever.co'],
      ['Zoho Recruit', 'zohorecruit.com'], ['BairesDev', 'bairesdev.com'], ['Gestão de Talentos', 'gestaotalentos.com.br'],
      ['Recrutei', 'recrutei.com.br'], ['LinkedIn', 'linkedin.com'], ['Greenhouse', 'greenhouse.io'],
      ['InfoJobs', 'infojobs.com.br'], ['Oracle Cloud', 'oraclecloud.com'], ['Abler', 'abler.com.br'],
      ['Empregare', 'empregare.com'], ['Workday', 'myworkdayjobs.com'], ['Vagas', 'vagas.com.br'],
      ['Quickin', 'quickin.io'], ['Workable', 'workable.com'], ['Ashby', 'ashbyhq.com'], ['LATOjobs', 'latojobs.com'],
      ['iFood', 'ifood.com.br'], ['Micro1', 'micro1.ai'], ['Remote Leverage Jobs', 'remoteleveragejobs.com'],
      ['Alignerr', 'alignerr.com'], ['TOTVS', 'totvs.app'], ['Taggui RH', 'tagguirh.com.br'],
      ['SmartRecruiters', 'smartrecruiters.com'], ['CloudWalk', 'cloudwalk.io'], ['We Work Remotely', 'weworkremotely.com'],
      ['Revolut', 'revolutpeople.com'], ['Virtustant', 'virtustant.com'], ['Recruit CRM', 'recruitcrm.io'],
      ['Blite', 'blite.com.br'], ['Empregos', 'empregos.com.br'], ['EPAM', 'epam.com'],
      ['Accenture', 'accenture.com'], ['Enlizt', 'enlizt.me'], ['Monks', 'monks.com'],
      ['DocuSign', 'docusign.com'], ['Cesar', 'breezy.hr'], ['Bitso', 'bitso.com'], ['Turing', 'turing.com']
    ]
    const identified = known.find(([, domain]) => hostname === domain || hostname.endsWith(`.${domain}`))?.[0]
    if (identified) return identified
    const name = hostname.split('.').filter(part => !['www', 'jobs', 'careers', 'carreiras', 'work', 'app', 'apply', 'vagas', 'com', 'br', 'io', 'ai'].includes(part))[0]
    return name ? `${name[0].toUpperCase()}${name.slice(1)}`.slice(0, 40) : company.slice(0, 40)
  } catch { return company.slice(0, 40) }
}
const itemDescriptions = (items, predicate = () => true) => [...new Set((items || []).filter(predicate).map(item => structuredText(item?.description || '').slice(0, 500)).filter(Boolean))].slice(0, 40)

export function parseRemotar(job) {
  if (!job.id || !job.title || !job.active || job.expired || !['remote', 'hybrid'].includes(job.type)) return null
  const company = job.companyDisplayName || job.company?.name || 'Confidencial'
  const category = job.jobCategories?.[0]?.category?.name || 'Outros'
  const tags = [...new Set((job.jobTags || []).map(item => item.tag?.name).filter(Boolean))].slice(0, 10)
  const salary = job.jobSalary
  const salaryLabel = salary?.from ? `${salary.currency || 'R$'} ${Number(salary.from).toLocaleString('pt-BR')}${salary.to ? ` – ${salary.currency || 'R$'} ${Number(salary.to).toLocaleString('pt-BR')}` : ''}` : null
  const originalUrl = safeExternal(job.externalLink)
  const summary = stripHtml(job.subtitle || '').slice(0, 500) || null
  const description = structuredText(job.description || job.moreInfos || '').slice(0, 12_000) || null
  const companyBenefits = job.ignoreCompanyBenefits ? [] : (job.company?.companyJobBenefits || [])
  const benefits = itemDescriptions([...(job.jobBenefits || []), ...companyBenefits])
  const requirements = itemDescriptions(job.jobRequirements, item => item?.mandatory !== false)
  const desirableRequirements = itemDescriptions(job.jobRequirements, item => item?.mandatory === false)
  return {
    externalId: String(job.id), title: job.title, company, area: category, level: levelFrom(`${job.title} ${tags.join(' ')}`),
    contract: 'Não informado', source: platformFrom(originalUrl, company), salary: salaryLabel, tags, workMode: job.type === 'hybrid' ? 'hybrid' : 'remote',
    location: job.type === 'hybrid' ? ([job.city, job.state].filter(Boolean).join(', ') || 'Brasil') : 'Brasil',
    publishedAt: new Date(job.createdAt).toISOString(), relevance: job.isPromoted ? 78 : 69, url: `https://remotar.com.br/job/${job.id}`,
    originalUrl, originalPlatform: platformFrom(originalUrl, company), summary, description, benefits, requirements, desirableRequirements,
    platformIconDomain: iconDomainFrom(originalUrl), platformUsesCompanyLogo: iconDomainFrom(originalUrl) == null,
    logoUrl: job.company?.companyProfilePicture?.url || job.company?.companyProfilePicture?.mediumUrl || null,
    logoKey: job.companyId ? `remotar-v2-${job.companyId}` : null,
    thumbnailPath: typeof job.thumbnailUrl === 'string' ? job.thumbnailUrl : null,
    status: 'active'
  }
}

export async function collectRemotar({ days = 30 } = {}) {
  const jobs = []
  const cutoff = Date.now() - days * 86_400_000
  for (let page = 1; ; page += 1) {
    const response = JSON.parse(await fetchText(API_URL(page), { domains: API_DOMAINS, headers: { accept: 'application/json' } }))
    if (!Array.isArray(response.data)) throw new Error('Formato inesperado')
    jobs.push(...response.data.filter(job => Date.parse(job.createdAt) >= cutoff).map(parseRemotar).filter(Boolean))
    if (page >= response.meta?.last_page || response.data.length === 0) break
    const newestOnPage = Math.max(...response.data.map(job => Date.parse(job.createdAt)).filter(Number.isFinite))
    if (newestOnPage < cutoff) break
  }
  return jobs
}
