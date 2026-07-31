import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalSet } from './useLocalSet.js'

const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null } }
const MS_PER_DAY = 86_400_000
const jobDate = job => Date.parse(job.publishedAt || job.firstSeenAt || 0)
const jobAgeDays = job => Math.max(0, Math.floor((Date.now() - jobDate(job)) / MS_PER_DAY))
const ageLabel = job => {
  const days = jobAgeDays(job)
  if (days === 0) return 'Cadastrada hoje'
  if (days === 1) return 'Cadastrada há 1 dia'
  return `Cadastrada há ${days} dias`
}
const platformMark = name => name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
const platformClass = name => `platform-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}`

function JobCard({ job, visited, favorite, onVisit, onFavorite, onHide, onOpen }) {
  const destination = safeUrl(job.url)
  return <article className={`job ${visited ? 'seen' : ''} ${job.status !== 'active' ? 'inactive' : ''}`} onClick={onOpen} tabIndex="0" onKeyDown={event => { if (event.key === 'Enter') onOpen() }}>
    <div className="logo">{job.logo ? <img src={job.logo} alt="" loading="lazy" width="48" height="48" /> : job.company.slice(0, 2).toUpperCase()}</div>
    <div className="jobMain">
      <div className="titleRow"><h3>{job.title}</h3>{jobAgeDays(job) <= 3 && <span className="new">Nova</span>}{visited && <span className="viewed">✓ Já visualizada</span>}</div>
      <b>{job.company}</b>
      <div className="meta"><span className={`modeBadge ${job.workMode}`}>{job.workMode === 'hybrid' ? 'Híbrida' : 'Remota'}</span><span>{job.location}</span><span>{job.contract}</span><span>{job.level}</span></div>
      <div className="tags">{job.tags.map(tag => <i key={tag}>{tag}</i>)}</div>
    </div>
    <div className="jobSide">
      <span className="source"><i className={platformClass(job.source)} aria-hidden="true">{job.platformLogo ? <img src={job.platformLogo} alt="" loading="lazy" width="18" height="18" /> : platformMark(job.source)}</i>{job.source}</span><strong className="salary">{job.salary || 'Salário não informado'}</strong>
      {job.status !== 'active' && <span className="closed">Indisponível na última verificação</span>}
      <div className="actions">
        {job.status === 'active' && destination ? <button onClick={event => { event.stopPropagation(); onVisit(); onOpen() }}>Ver detalhes</button> : <button disabled>Vaga indisponível</button>}
        <button className={`icon ${favorite ? 'saved' : ''}`} onClick={event => { event.stopPropagation(); onFavorite() }} title="Favoritar">{favorite ? '★' : '☆'}</button>
        <button className="icon" onClick={event => { event.stopPropagation(); onHide() }} title="Ocultar vaga">×</button>
      </div><small>{ageLabel(job)}</small>
    </div>
  </article>
}

function JobDetails({ job, onClose, onVisit }) {
  const original = safeUrl(job.originalUrl)
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])
  return <div className="modalBackdrop" onMouseDown={onClose} role="presentation"><section className="jobModal" role="dialog" aria-modal="true" aria-labelledby="job-title" onMouseDown={event => event.stopPropagation()}>
    <button className="modalClose" onClick={onClose} aria-label="Fechar">×</button>
    <div className="modalCompany"><div className="logo">{job.logo ? <img src={job.logo} alt="" width="48" height="48" /> : job.company.slice(0, 2).toUpperCase()}</div><div><span>{job.company}</span><h2 id="job-title">{job.title}</h2></div></div>
    <div className="modalMeta"><div><small>Modalidade</small><span className={`modeBadge ${job.workMode}`}>{job.workMode === 'hybrid' ? 'Híbrida' : 'Remota'}</span></div><div><small>Localização</small><b>{job.location}</b></div><div><small>Nível</small><b>{job.level}</b></div><div><small>Contrato</small><b>{job.contract}</b></div></div>
    {job.salary && <strong className="modalSalary">{job.salary}</strong>}
    {job.summary && <p className="modalSummary">{job.summary}</p>}
    <h3>Sobre a vaga</h3><div className="description">{job.detailsLoading ? 'Carregando informações…' : (job.description || 'A descrição completa está disponível na plataforma original.')}</div>
    {!!job.requirements?.length && <section className="detailSection"><h3>Requisitos</h3><ul>{job.requirements.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.desirableRequirements?.length && <section className="detailSection"><h3>Diferenciais</h3><ul>{job.desirableRequirements.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.benefits?.length && <section className="detailSection benefits"><h3>Benefícios</h3><ul>{job.benefits.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.tags.length && <div className="tags">{job.tags.map(tag => <i key={tag}>{tag}</i>)}</div>}
    <footer><small>{ageLabel(job)} · Plataforma: {job.source}</small>{original && <a href={original} target="_blank" rel="noopener noreferrer" onClick={onVisit}>Abrir na {job.originalPlatform || 'plataforma original'} ↗</a>}</footer>
  </section></div>
}

export default function App() {
  const [jobs, setJobs] = useState([]), [meta, setMeta] = useState({ updatedAt: null })
  const [query, setQuery] = useState(''), [area, setArea] = useState(''), [source, setSource] = useState(''), [sort, setSort] = useState('relevance')
  const [workMode, setWorkMode] = useState('remote')
  const [selectedJob, setSelectedJob] = useState(null)
  const [page, setPage] = useState(1)
  const detailsCache = useRef(new Map())
  const [onlyUnseen, setOnlyUnseen] = useState(false), [onlyFavorites, setOnlyFavorites] = useState(false), [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false)
  const visited = useLocalSet('vagas-remotas-br.visited'), favorites = useLocalSet('vagas-remotas-br.favorites'), hidden = useLocalSet('vagas-remotas-br.hidden')

  useEffect(() => { fetch('/data/jobs.json').then(r => r.json()).then(data => { setJobs(data.jobs); setMeta(data.meta) }).catch(() => setJobs([])) }, [])
  const visible = useMemo(() => jobs.filter(job => !hidden.value.has(job.id) && (workMode === 'all' || job.workMode === workMode) && (!query || [job.title, job.company, job.area, job.location, ...job.tags].join(' ').toLowerCase().includes(query.toLowerCase())) && (!area || job.area === area) && (!source || job.source === source) && (!onlyUnseen || !visited.value.has(job.id)) && (!onlyFavorites || favorites.value.has(job.id))).sort((a,b) => sort === 'company' ? a.company.localeCompare(b.company) : sort === 'date' ? jobDate(b) - jobDate(a) : b.relevance - a.relevance), [jobs, hidden.value, workMode, query, area, source, onlyUnseen, onlyFavorites, visited.value, favorites.value, sort])
  const pageSize = 30, totalPages = Math.max(1, Math.ceil(visible.length / pageSize)), currentPage = Math.min(page, totalPages)
  const pagedJobs = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const openJob = job => {
    visited.add(job.id)
    const cached = detailsCache.current.get(job.detailChunk)
    if (cached?.[job.id]) { setSelectedJob({ ...job, ...cached[job.id] }); return }
    setSelectedJob({ ...job, detailsLoading: true })
    if (!Number.isInteger(job.detailChunk) || job.detailChunk < 0) return
    fetch(`/data/details/${job.detailChunk}.json`).then(response => {
      if (!response.ok) throw new Error('Detalhes indisponíveis')
      return response.json()
    }).then(details => {
      detailsCache.current.set(job.detailChunk, details)
      setSelectedJob(current => current?.id === job.id ? { ...job, ...details[job.id], detailsLoading: false } : current)
    }).catch(() => setSelectedJob(current => current?.id === job.id ? { ...job, detailsLoading: false } : current))
  }
  const areas = [...new Set(jobs.map(j => j.area))].sort(), sources = [...new Set(jobs.map(j => j.source))].sort()
  const updated = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'carregando…'

  return <div className={`${collapsed ? 'collapsed ' : ''}${mobile ? 'menuOpen' : ''}`}>
    <aside><div className="brandRow"><div className="brand">VagasRemotasBR</div><button onClick={() => setCollapsed(v => !v)} title="Recolher menu">☰</button></div><p className="about">Seu painel pessoal de vagas remotas disponíveis para profissionais no Brasil.</p>
      <div className="filter"><label>Buscar</label><input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder="Cargo, empresa, tecnologia" /></div>
      <div className="filter"><label>Área</label><select value={area} onChange={e => { setArea(e.target.value); setPage(1) }}><option value="">Todas as áreas</option>{areas.map(x => <option key={x}>{x}</option>)}</select></div>
      <div className="filter"><label>Fonte</label><select value={source} onChange={e => { setSource(e.target.value); setPage(1) }}><option value="">Todas as vagas</option>{sources.map(x => <option key={x}>{x}</option>)}</select></div>
      <div className="checks"><label><input checked={onlyUnseen} onChange={e => { setOnlyUnseen(e.target.checked); setPage(1) }} type="checkbox" /> Apenas não visualizadas</label><label><input checked={onlyFavorites} onChange={e => { setOnlyFavorites(e.target.checked); setPage(1) }} type="checkbox" /> Apenas favoritas</label></div>
      <div className="asideBottom"><div className="update">Última coleta<br/><b>{updated}</b></div><button className="restore" onClick={hidden.clear}>Restaurar ocultas ({hidden.value.size})</button></div>
    </aside>
    <main><div className="mobileTop"><div className="brand">VagasRemotasBR</div><button onClick={() => setMobile(v => !v)}>Filtros ☰</button></div>
      <div className="heading"><div><small>PAINEL PESSOAL</small><h1>VAGAS DISPONÍVEIS</h1></div><div className="sort"><label>Ordenar por</label><select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}><option value="relevance">Relevância</option><option value="date">Mais recentes</option><option value="company">Empresa</option></select></div></div>
      <nav className="workTabs" aria-label="Modalidade de trabalho"><button className={workMode === 'remote' ? 'active' : ''} onClick={() => { setWorkMode('remote'); setPage(1) }}>Remotas <b>{jobs.filter(j => j.workMode === 'remote').length}</b></button><button className={workMode === 'hybrid' ? 'active' : ''} onClick={() => { setWorkMode('hybrid'); setPage(1) }}>Híbridas <b>{jobs.filter(j => j.workMode === 'hybrid').length}</b></button><button className={workMode === 'all' ? 'active' : ''} onClick={() => { setWorkMode('all'); setPage(1) }}>Todas <b>{jobs.length}</b></button></nav>
      <section className="stats"><div className="stat accent"><span>Novas hoje</span><strong>{jobs.filter(j => jobAgeDays(j) === 0 && !hidden.value.has(j.id)).length}</strong></div><div className="stat"><span>Visualizadas</span><strong>{visited.value.size}</strong></div><div className="stat"><span>Favoritas</span><strong>{favorites.value.size}</strong></div><div className="stat"><span>Disponíveis</span><strong>{jobs.filter(j => j.status === 'active').length}</strong></div></section>
      <div className="sectionTitle"><h2>Vagas recomendadas</h2><span><b>{visible.length}</b> resultados</span></div><div className="grid">{visible.length ? pagedJobs.map(job => <JobCard key={job.id} job={job} visited={visited.value.has(job.id)} favorite={favorites.value.has(job.id)} onVisit={() => visited.add(job.id)} onFavorite={() => favorites.toggle(job.id)} onHide={() => hidden.add(job.id)} onOpen={() => openJob(job)} />) : <div className="empty">Nenhuma vaga corresponde aos filtros.<button onClick={hidden.clear}>Restaurar vagas ocultas</button></div>}</div>
      {visible.length > pageSize && <nav className="pagination" aria-label="Paginação"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>Página <b>{currentPage}</b> de {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Próxima →</button></nav>}
      {selectedJob && <JobDetails job={selectedJob} onClose={() => setSelectedJob(null)} onVisit={() => visited.add(selectedJob.id)} />}
    </main>
  </div>
}
