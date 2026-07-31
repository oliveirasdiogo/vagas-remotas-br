import { fetchText } from '../http.mjs'
import { stripHtml } from '../parsing.mjs'

const URL = 'https://www.apinfo.com/apinfo/inc/list4.cfm'
const DOMAINS = ['apinfo.com']

const parseDate = value => {
  const [, day, month, year] = value.match(/(\d{2})\/(\d{2})\/(\d{2})/) || []
  return day ? new Date(Date.UTC(2000 + Number(year), Number(month) - 1, Number(day), 12)).toISOString() : null
}
const levelFrom = title => /s[eê]nior|sr\.?/i.test(title) ? 'Sênior' : /j[uú]nior|jr\.?|estagi/i.test(title) ? 'Júnior' : /pleno/i.test(title) ? 'Pleno' : 'Não informado'
const contractFrom = text => /\bPJ\b|prestador/i.test(text) ? 'PJ' : /\bCLT\b/i.test(text) ? 'CLT' : 'Não informado'

export function parseApinfo(html, maxJobs = 30) {
  return [...html.matchAll(/<div class="box-vagas linha pd">([\s\S]*?)<\/div>\s*<\/div>/gi)].map(([, block]) => {
    const locationDate = stripHtml(block.match(/<div class="info-data">([\s\S]*?)<\/div>/i)?.[1] || '')
    const title = stripHtml(block.match(/<div class="cargo m-tb">([\s\S]*?)<\/div>/i)?.[1] || '')
    const description = stripHtml(block.match(/<div class="texto">([\s\S]*?)<strong>Empresa/i)?.[1] || '')
    const company = stripHtml(block.match(/<strong>Empresa \.{5}:<\/strong>([\s\S]*?)<BR>/i)?.[1] || '')
    const id = block.match(/codvaga=(\d+)/i)?.[1]
    const applyUrl = block.match(/href="(https:\/\/www\.apinfo\.com\/apinfo\/inc\/enviecv\.cfm\?[^"\s]+)"/i)?.[1]
    const remote = /home[ -]?office|100% remoto|trabalho remoto|atua[cç][aã]o remota/i.test(`${locationDate} ${description}`)
    const hybrid = /h[ií]brid[oa]/i.test(`${locationDate} ${description}`)
    if (!id || !title || !company || !applyUrl || (!remote && !hybrid)) return null
    return {
      externalId: id, title, company, area: 'Tecnologia', level: levelFrom(title), contract: contractFrom(description),
      source: 'APInfo', salary: null, tags: [], workMode: hybrid ? 'hybrid' : 'remote',
      location: remote && !hybrid ? 'Brasil' : locationDate.replace(/\s*-\s*\d{2}\/\d{2}\/\d{2}$/, ''),
      publishedAt: parseDate(locationDate), relevance: 65, url: applyUrl.replace(/&amp;/g, '&'), status: 'active'
    }
  }).filter(Boolean).slice(0, maxJobs)
}

export async function collectApinfo({ maxJobs = 30 } = {}) {
  const html = await fetchText(URL, { domains: DOMAINS, encoding: 'windows-1252' })
  if (/limite de consultas.+esgotado/is.test(stripHtml(html))) throw new Error('Limite de consultas temporariamente esgotado')
  return parseApinfo(html, maxJobs)
}
