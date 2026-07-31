import { fetchText } from '../http.mjs'

const DOMAINS = ['solides.com.br']
const API_URL = 'https://apigw.solides.com.br/jobs/v3/portal-vacancies-new?page=1'
const levelFrom = value => /s[eê]nior/i.test(value) ? 'Sênior' : /j[uú]nior|estagi/i.test(value) ? 'Júnior' : /pleno/i.test(value) ? 'Pleno' : 'Não informado'

export function parseSolides(vacancy) {
  const mode = String(vacancy.jobType || '').toLowerCase()
  if (!['remoto', 'hibrido', 'híbrido'].includes(mode) || !vacancy.id || !vacancy.title || !vacancy.redirectLink) return null
  const tags = [...new Set((vacancy.hardSkills || []).map(skill => skill.name).filter(Boolean))].slice(0, 10)
  const city = typeof vacancy.city === 'string' ? vacancy.city : vacancy.city?.name
  const state = typeof vacancy.state === 'string' ? vacancy.state : vacancy.state?.name
  return {
    externalId: String(vacancy.id), title: vacancy.title, company: vacancy.companyName || 'Confidencial',
    area: vacancy.occupationAreas?.[0]?.name || 'Outros', level: vacancy.seniority?.[0]?.name || levelFrom(vacancy.title),
    contract: vacancy.recruitmentContractType?.[0]?.name || 'Não informado', source: 'Sólides', salary: null, tags,
    workMode: mode.startsWith('h') ? 'hybrid' : 'remote', location: mode.startsWith('h') ? ([city, state].filter(Boolean).join(', ') || 'Brasil') : 'Brasil',
    publishedAt: new Date(`${vacancy.createdAt}T12:00:00.000Z`).toISOString(), relevance: 72,
    url: new URL(vacancy.redirectLink, 'https://vagas.solides.com.br').href, status: vacancy.isDisabled ? 'closed' : 'active'
  }
}

export async function collectSolides({ maxJobs = 30 } = {}) {
  const response = JSON.parse(await fetchText(API_URL, { domains: DOMAINS, headers: { accept: 'application/json' } }))
  if (!response.success || !Array.isArray(response.data?.data)) throw new Error('Formato inesperado')
  return response.data.data.map(parseSolides).filter(Boolean).slice(0, maxJobs)
}
