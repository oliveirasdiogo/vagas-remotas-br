const text = (value, field, max = 160) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Campo inválido: ${field}`)
  return [...value].filter(character => { const code = character.charCodeAt(0); return code >= 32 && code !== 127 }).join('').trim()
}

const multilineText = (value, field, max) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Campo inválido: ${field}`)
  return [...value].filter(character => character === '\n' || (character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)).join('').trim()
}
const textList = (value, field) => Array.isArray(value) ? value.slice(0, 40).map((item, index) => text(item, `${field}[${index}]`, 500)) : []

const isoDate = (value, field, { required = false } = {}) => {
  if (value == null && !required) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error(`Campo inválido: ${field}`)
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error(`Campo inválido: ${field}`)
  return date.toISOString()
}

function trustedUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL insegura')
  if (url.hostname !== 'remotar.com.br' && !url.hostname.endsWith('.remotar.com.br')) throw new Error('Domínio interno não permitido')
  return url.href
}

function externalUrl(value) {
  if (value == null) return null
  if (typeof value !== 'string' || value.length > 2_000) throw new Error('URL externa inválida')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL externa insegura')
  return url.href
}

export function normalizeJob(input, collectedAt = new Date().toISOString()) {
  const source = text(input.source, 'source', 40)
  const externalId = text(input.externalId, 'externalId', 100)
  const tags = Array.isArray(input.tags) ? input.tags.slice(0, 10).map((tag, i) => text(tag, `tags[${i}]`, 40)) : []
  return Object.freeze({
    id: `${source.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${externalId}`,
    externalId,
    title: text(input.title, 'title'), company: text(input.company, 'company'), area: text(input.area, 'area', 60),
    level: text(input.level, 'level', 40), contract: text(input.contract, 'contract', 40), source,
    salary: input.salary == null ? null : text(input.salary, 'salary', 80), tags,
    workMode: ['remote', 'hybrid'].includes(input.workMode) ? input.workMode : 'remote',
    location: input.location == null ? 'Brasil' : text(input.location, 'location', 100),
    publishedAt: isoDate(input.publishedAt, 'publishedAt'),
    firstSeenAt: isoDate(input.firstSeenAt ?? collectedAt, 'firstSeenAt', { required: true }),
    logo: input.logo == null ? null : (/^\/company-logos\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/.test(input.logo) ? input.logo : null),
    platformLogo: input.platformLogo == null ? null : (/^\/(?:company|platform)-logos\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/.test(input.platformLogo) ? input.platformLogo : null),
    relevance: Number.isFinite(input.relevance) ? Math.min(100, Math.max(0, input.relevance)) : 0,
    url: trustedUrl(input.url),
    originalUrl: externalUrl(input.originalUrl),
    originalPlatform: input.originalPlatform == null ? null : text(input.originalPlatform, 'originalPlatform', 80),
    summary: input.summary == null ? null : text(input.summary, 'summary', 500),
    description: input.description == null ? null : multilineText(input.description, 'description', 50_000),
    benefits: textList(input.benefits, 'benefits'),
    requirements: textList(input.requirements, 'requirements'),
    desirableRequirements: textList(input.desirableRequirements, 'desirableRequirements'),
    status: input.status === 'active' ? 'active' : 'closed'
  })
}
