import { access, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const catalogPath = `${root}/public/data/jobs.json`
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const errors = []

if (catalog.meta?.mode !== 'live') errors.push('o catálogo não está em modo live')
if (!Array.isArray(catalog.jobs) || catalog.jobs.length === 0) errors.push('nenhuma vaga foi coletada')
if (catalog.meta?.count !== catalog.jobs?.length) errors.push('a contagem do catálogo está inconsistente')

const updatedAt = Date.parse(catalog.meta?.updatedAt)
if (!Number.isFinite(updatedAt) || Math.abs(Date.now() - updatedAt) > 3_600_000) {
  errors.push('a data da coleta está ausente ou tem mais de uma hora')
}

const failedSources = (catalog.meta?.sources || []).filter(source => source.status !== 'ok')
if (!catalog.meta?.sources?.length) errors.push('o catálogo não informa as fontes processadas')
if (failedSources.length) errors.push(`fontes com falha: ${failedSources.map(source => source.source).join(', ')}`)

const ids = new Set()
const chunks = new Set()
for (const job of catalog.jobs || []) {
  if (!job.id || ids.has(job.id)) errors.push(`ID ausente ou duplicado: ${job.id || '(vazio)'}`)
  ids.add(job.id)
  if (!Number.isInteger(job.detailChunk) || job.detailChunk < 0) errors.push(`bloco de detalhes inválido: ${job.id}`)
  else chunks.add(job.detailChunk)
}

for (const chunk of chunks) {
  const path = `${root}/public/data/details/${chunk}.json`
  try {
    const details = JSON.parse(await readFile(path, 'utf8'))
    const expected = catalog.jobs.filter(job => job.detailChunk === chunk).map(job => job.id)
    if (expected.some(id => !Object.hasOwn(details, id))) errors.push(`o bloco ${chunk} não contém todas as vagas esperadas`)
  } catch {
    errors.push(`o bloco de detalhes ${chunk} está ausente ou inválido`)
  }
}

for (const job of catalog.jobs || []) {
  for (const image of [job.logo, job.platformLogo]) {
    if (!image?.startsWith('/')) continue
    try { await access(`${root}/public${image}`) } catch { errors.push(`imagem local ausente: ${image}`) }
  }
}

if (errors.length) {
  console.error(`Catálogo recusado:\n- ${[...new Set(errors)].join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(`Catálogo válido: ${catalog.jobs.length} vagas, ${chunks.size} blocos de detalhes.`)
}
