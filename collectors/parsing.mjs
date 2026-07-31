export const stripHtml = value => value
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ').trim()

export function extractJsonObject(source, marker) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Marcador ausente: ${marker}`)
  const start = source.indexOf('{', markerIndex + marker.length)
  if (start < 0) throw new Error('Objeto JSON ausente')
  let depth = 0, quoted = false, escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
      continue
    }
    if (character === '"') quoted = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return JSON.parse(source.slice(start, index + 1))
  }
  throw new Error('Objeto JSON incompleto')
}
