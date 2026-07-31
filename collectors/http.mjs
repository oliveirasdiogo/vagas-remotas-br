const USER_AGENT = process.env.COLLECTOR_USER_AGENT || 'VagasRemotasBR/0.1 (open-source job indexer)'
const MAX_BYTES = 5_000_000

export async function fetchBytes(url, { domains, method = 'GET', body, headers = {} } = {}) {
  let target = new URL(url)
  let response
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Destino HTTP inseguro')
    if (!domains?.some(domain => target.hostname === domain || target.hostname.endsWith(`.${domain}`))) throw new Error('Domínio HTTP não permitido')
    response = await fetch(target, {
      method: redirects ? 'GET' : method,
      body: redirects ? undefined : body,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml;q=0.9,*/*;q=0.5', ...headers }
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) break
    const location = response.headers.get('location')
    if (!location || redirects === 3) throw new Error('Redirecionamento inválido')
    target = new URL(location, target)
  }
  if (response.status === 403 || response.status === 429) throw new Error(`Fonte recusou a coleta (${response.status})`)
  if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`)
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_BYTES) throw new Error('Resposta excede o limite')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) throw new Error('Resposta excede o limite')
  return bytes
}

export async function fetchText(url, { encoding = 'utf-8', ...options } = {}) {
  return new TextDecoder(encoding).decode(await fetchBytes(url, options))
}

export async function mapLimited(items, concurrency, callback) {
  const output = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await callback(items[index], index)
    }
  }))
  return output
}
