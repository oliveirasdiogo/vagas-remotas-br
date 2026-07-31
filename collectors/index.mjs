import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectRemotar } from './connectors/remotar.mjs'
import { normalizeJob } from './security.mjs'
import { cacheLogo, cachePlatformIcon } from './logos.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outputPath = `${root}/public/data/jobs.json`
const collectedAt = new Date().toISOString()
const days = Math.min(45, Math.max(1, Number(process.env.COLLECTION_DAYS || 30)))
const retentionDays = Math.min(90, Math.max(days, Number(process.env.RETENTION_DAYS || 45)))

let previous = { meta: {}, jobs: [] }
try { previous = JSON.parse(await readFile(outputPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const previousFirstSeen = new Map((previous.jobs || []).map(job => [job.id, job.firstSeenAt]).filter(([, value]) => value))
const previousBySource = new Map()
if (previous.meta?.mode === 'live') for (const job of previous.jobs || []) previousBySource.set(job.source, [...(previousBySource.get(job.source) || []), job])

const connectors = [
  ['Remotar', () => collectRemotar({ days })]
]
const statuses = []
const collected = []
for (const [source, collect] of connectors) {
  try {
    const jobs = await collect()
    collected.push(...jobs)
    statuses.push({ source, status: 'ok', count: jobs.length })
  } catch (error) {
    const retained = previousBySource.get(source) || []
    collected.push(...retained)
    statuses.push({ source, status: 'error', count: retained.length, message: String(error.message).slice(0, 120) })
    console.error(`${source}: ${error.message}; ${retained.length} vagas anteriores preservadas`)
  }
}

const cutoff = Date.parse(collectedAt) - retentionDays * 86_400_000
const unique = new Map()
const seenDestinations = new Set()
for (const input of collected) {
  try {
    const sourceKey = input.source.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const externalId = input.externalId || (input.id?.startsWith(`${sourceKey}-`) ? input.id.slice(sourceKey.length + 1) : input.id)
    const id = `${sourceKey}-${externalId}`
    let logo = input.logo || null
    try { logo = logo || await cacheLogo(root, input) } catch (error) { console.error(`Logo ${input.logoKey || input.company}: ${error.message}`) }
    let platformLogo = input.platformUsesCompanyLogo ? logo : null
    try { platformLogo = platformLogo || await cachePlatformIcon(root, input) } catch (error) { console.error(`Ícone ${input.source}: ${error.message}`) }
    const job = normalizeJob({ ...input, externalId, logo, platformLogo, tags: (input.tags || []).filter(tag => typeof tag === 'string' && tag.trim()), firstSeenAt: previousFirstSeen.get(id) || input.firstSeenAt || collectedAt }, collectedAt)
    const effectiveDate = Date.parse(job.publishedAt || job.firstSeenAt)
    const destinationKey = (() => {
      try { const target = new URL(input.dedupeUrl || job.url); target.search = ''; target.hash = ''; return target.href } catch { return null }
    })()
    if (effectiveDate >= cutoff && (!destinationKey || !seenDestinations.has(destinationKey))) {
      unique.set(job.id, job)
      if (destinationKey) seenDestinations.add(destinationKey)
    }
  } catch (error) { console.error(`Vaga inválida de ${input.source || 'fonte desconhecida'}: ${error.message}`) }
}
const jobs = [...unique.values()].sort((a, b) => Date.parse(b.publishedAt || b.firstSeenAt) - Date.parse(a.publishedAt || a.firstSeenAt))
const detailKeys = ['originalUrl', 'originalPlatform', 'summary', 'description', 'benefits', 'requirements', 'desirableRequirements']
const detailDirectory = `${root}/public/data/details`
const detailChunks = []
const summaries = jobs.map((job, index) => {
  const detailChunk = Math.floor(index / 50)
  detailChunks[detailChunk] ||= {}
  detailChunks[detailChunk][job.id] = Object.fromEntries(detailKeys.map(key => [key, job[key]]))
  return { ...Object.fromEntries(Object.entries(job).filter(([key]) => !detailKeys.includes(key))), detailChunk }
})
const output = { meta: { schemaVersion: 3, mode: 'live', updatedAt: collectedAt, count: jobs.length, collectionDays: days, retentionDays, sources: statuses }, jobs: summaries }
await mkdir(dirname(outputPath), { recursive: true })
await mkdir(detailDirectory, { recursive: true })
await writeFile(outputPath, `${JSON.stringify(output)}\n`, { encoding: 'utf8', mode: 0o644 })
for (let index = 0; index < detailChunks.length; index += 1) await writeFile(`${detailDirectory}/${index}.json`, JSON.stringify(detailChunks[index]), { encoding: 'utf8', mode: 0o644 })

async function removeUnused(directory, usedNames, allowed = () => true) {
  let entries = []
  try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) { if (error.code !== 'ENOENT') throw error }
  for (const entry of entries) if (entry.isFile() && allowed(entry.name) && !usedNames.has(entry.name)) await unlink(`${directory}/${entry.name}`)
}
const companyImages = new Set(jobs.flatMap(job => [job.logo, job.platformLogo]).filter(path => path?.startsWith('/company-logos/')).map(path => path.split('/').pop()))
const platformImages = new Set(jobs.map(job => job.platformLogo).filter(path => path?.startsWith('/platform-logos/')).map(path => path.split('/').pop()))
await removeUnused(detailDirectory, new Set(detailChunks.map((_, index) => `${index}.json`)), name => /^\d+\.json$/.test(name))
await removeUnused(`${root}/public/company-logos`, companyImages)
await removeUnused(`${root}/public/platform-logos`, platformImages)
console.log(`${jobs.length} vagas reais validadas e gravadas em public/data/jobs.json`)
