import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeJob } from './security.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const raw = JSON.parse(await readFile(`${root}/collectors/fixtures/sample-jobs.json`, 'utf8'))
if (!Array.isArray(raw) || raw.length > 10_000) throw new Error('Carga de entrada inválida')
const collectedAt = new Date().toISOString()
const legacyDays = { hoje: 0, ontem: 1, antiga: 2 }
const jobs = raw.map(input => {
  const { url: originalUrl, ...fixture } = input
  return normalizeJob({
    ...fixture,
    url: `https://remotar.com.br/vaga-demonstrativa/${encodeURIComponent(input.externalId)}`,
    originalUrl,
    publishedAt: new Date(Date.parse(collectedAt) - (legacyDays[input.age] ?? 0) * 86_400_000).toISOString()
  }, collectedAt)
})
const output = { meta: { schemaVersion: 2, mode: 'demo', updatedAt: collectedAt, count: jobs.length }, jobs }
await mkdir(`${root}/public/data`, { recursive: true })
await writeFile(`${root}/public/data/jobs.json`, `${JSON.stringify(output, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 })
console.log(`${jobs.length} vagas demonstrativas gravadas em public/data/jobs.json`)
