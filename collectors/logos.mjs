import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fetchBytes } from './http.mjs'

const run = promisify(execFile)
const REMOTAR_ASSETS = 'https://s3.sa-east-1.amazonaws.com/remotar-assets-prod/'

const FORMATS = [
  { extension: 'png', matches: bytes => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  { extension: 'jpg', matches: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { extension: 'webp', matches: bytes => String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' }
]

export function safeRemotarThumbnail(value) {
  return typeof value === 'string' && /^job-thumbnails\/\d+\.png$/.test(value) ? value : null
}

async function cropRemotarThumbnail(thumbnailPath) {
  const bytes = await fetchBytes(`${REMOTAR_ASSETS}${thumbnailPath}`, { domains: ['amazonaws.com'] })
  if (bytes.byteLength > 300_000 || !FORMATS[0].matches(bytes)) throw new Error('Thumbnail inválido')
  const temporary = await mkdtemp(join(tmpdir(), 'vagas-logo-'))
  const input = join(temporary, 'thumbnail.png')
  const output = join(temporary, 'logo.png')
  try {
    await writeFile(input, bytes, { mode: 0o600 })
    const arguments_ = [input, '-crop', '180x180+35+35', '+repage', '-resize', '128x128', '-strip', output]
    try {
      await run('magick', arguments_, { timeout: 15_000 })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await run('convert', arguments_, { timeout: 15_000 })
    }
    const cropped = await readFile(output)
    if (cropped.byteLength > 300_000 || !FORMATS[0].matches(cropped)) throw new Error('Recorte inválido')
    return cropped
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

export async function cacheLogo(root, input) {
  if (!input.logoKey || (!input.logoUrl && !safeRemotarThumbnail(input.thumbnailPath))) return null
  const safeKey = String(input.logoKey).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
  if (!safeKey) return null
  const directory = `${root}/public/company-logos`
  for (const { extension } of FORMATS) {
    try { await access(`${directory}/${safeKey}.${extension}`); return `/company-logos/${safeKey}.${extension}` } catch { /* ainda não existe */ }
  }
  let bytes
  if (input.logoUrl) {
    try {
      bytes = await fetchBytes(input.logoUrl, { domains: ['amazonaws.com', 'attachments.gupy.io', 'files.inhire.app', 'trampos.co'] })
      if (bytes.byteLength > 300_000) throw new Error('Logotipo excede 300 KB')
    } catch (error) {
      const thumbnail = safeRemotarThumbnail(input.thumbnailPath)
      if (!thumbnail) throw error
      bytes = await cropRemotarThumbnail(thumbnail)
    }
  } else {
    bytes = await cropRemotarThumbnail(safeRemotarThumbnail(input.thumbnailPath))
  }
  if (bytes.byteLength > 300_000) throw new Error('Logotipo excede 300 KB')
  const format = FORMATS.find(candidate => candidate.matches(bytes))
  if (!format) throw new Error('Formato de logotipo não permitido')
  await mkdir(directory, { recursive: true })
  await writeFile(`${directory}/${safeKey}.${format.extension}`, bytes, { mode: 0o644 })
  return `/company-logos/${safeKey}.${format.extension}`
}

const platformIconRequests = new Map()

async function downloadPlatformIcon(root, input) {
  if (!input.platformIconDomain) return null
  const safeKey = String(input.platformIconDomain).toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/\./g, '-').slice(0, 80)
  if (!safeKey) return null
  const directory = `${root}/public/platform-logos`
  const destination = `${directory}/${safeKey}.png`
  try { await access(destination); return `/platform-logos/${safeKey}.png` } catch { /* ainda não existe */ }
  const domain = encodeURIComponent(`https://${input.platformIconDomain}`)
  const bytes = await fetchBytes(`https://www.google.com/s2/favicons?domain_url=${domain}&sz=64`, { domains: ['google.com', 'gstatic.com'] })
  if (bytes.byteLength > 50_000 || !FORMATS[0].matches(bytes)) throw new Error('Ícone de plataforma inválido')
  await mkdir(directory, { recursive: true })
  await writeFile(destination, bytes, { mode: 0o644 })
  return `/platform-logos/${safeKey}.png`
}

export function cachePlatformIcon(root, input) {
  const key = input.platformIconDomain || ''
  if (!key) return Promise.resolve(null)
  if (!platformIconRequests.has(key)) platformIconRequests.set(key, downloadPlatformIcon(root, input))
  return platformIconRequests.get(key)
}
