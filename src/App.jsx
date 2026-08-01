import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalSet } from './useLocalSet.js'

const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null } }
const MS_PER_DAY = 86_400_000
const jobDate = job => Date.parse(job.publishedAt || job.firstSeenAt || 0)
const jobAgeDays = job => Math.max(0, Math.floor((Date.now() - jobDate(job)) / MS_PER_DAY))
const jobTime = job => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(jobDate(job)))
const ageLabel = job => { const days = jobAgeDays(job), time = jobTime(job); return days === 0 ? `Cadastrada hoje às ${time}` : days === 1 ? `Cadastrada há 1 dia, às ${time}` : `Cadastrada há ${days} dias, às ${time}` }
const mark = value => value.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
const platformClass = name => `platform-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}`
const countBy = (items, field) => [...items.reduce((map, item) => map.set(item[field], (map.get(item[field]) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])

function SafeImage({ src, alt = '', fallback, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  return src && failedSrc !== src ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} /> : fallback
}

function JobCard({ job, visited, favorite, hiddenView, onVisit, onFavorite, onHide, onOpen }) {
  const destination = safeUrl(job.url)
  return <article className={`job ${visited ? 'seen' : ''} ${job.status !== 'active' ? 'inactive' : ''}`} onClick={onOpen} tabIndex="0" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() } }}>
    <div className="logo"><SafeImage src={job.logo} alt={`Logo da ${job.company}`} fallback={mark(job.company)} /></div>
    <div className="jobMain">
      <div className="titleRow"><h3>{job.title}</h3>{jobAgeDays(job) <= 3 && <span className="new">Nova</span>}{visited && <span className="viewed">✓ Já visualizada</span>}</div>
      <b>{job.company}</b>
      <div className="meta"><span className={`modeBadge ${job.workMode}`}>{job.workMode === 'hybrid' ? 'Híbrida' : 'Remota'}</span><span>{job.location}</span><span>{job.contract}</span><span>{job.level}</span></div>
      <div className="tags">{job.tags.map(tag => <i key={tag}>{tag}</i>)}</div>
    </div>
    <div className="jobSide">
      <span className="source"><i className={platformClass(job.source)} aria-hidden="true"><SafeImage src={job.platformLogo} fallback={mark(job.source)} /></i>{job.source}</span><strong className="salary">{job.salary || 'Salário não informado'}</strong>
      {job.status !== 'active' && <span className="closed">Indisponível na última verificação</span>}
      <div className="actions">
        {job.status === 'active' && destination ? <button onClick={event => { event.stopPropagation(); onVisit(); onOpen() }}>Ver detalhes</button> : <button disabled>Vaga indisponível</button>}
        <button className={`icon ${favorite ? 'saved' : ''}`} onClick={event => { event.stopPropagation(); onFavorite() }} title="Favoritar" aria-label="Favoritar vaga">{favorite ? '★' : '☆'}</button>
        <button className="icon" onClick={event => { event.stopPropagation(); onHide() }} title={hiddenView ? 'Restaurar vaga' : 'Ocultar vaga'} aria-label={hiddenView ? 'Restaurar vaga' : 'Ocultar vaga'}>{hiddenView ? '↺' : '×'}</button>
      </div><small>{ageLabel(job)}</small>
    </div>
  </article>
}

function JobDetails({ job, onClose, onVisit }) {
  const original = safeUrl(job.originalUrl)
  useEffect(() => { const close = event => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modalBackdrop" onMouseDown={onClose} role="presentation"><section className="jobModal" role="dialog" aria-modal="true" aria-labelledby="job-title" onMouseDown={event => event.stopPropagation()}>
    <button className="modalClose" onClick={onClose} aria-label="Fechar">×</button>
    <div className="modalCompany"><div className="logo"><SafeImage src={job.logo} alt={`Logo da ${job.company}`} fallback={mark(job.company)} /></div><div><span>{job.company}</span><h2 id="job-title">{job.title}</h2></div></div>
    <div className="modalMeta"><div><small>Modalidade</small><span className={`modeBadge ${job.workMode}`}>{job.workMode === 'hybrid' ? 'Híbrida' : 'Remota'}</span></div><div><small>Localização</small><b>{job.location}</b></div><div><small>Nível</small><b>{job.level}</b></div><div><small>Contrato</small><b>{job.contract}</b></div></div>
    {job.salary && <strong className="modalSalary">{job.salary}</strong>}{job.summary && <p className="modalSummary">{job.summary}</p>}
    <h3>Sobre a vaga</h3><div className="description">{job.detailsLoading ? 'Carregando informações…' : (job.description || 'A descrição completa está disponível na plataforma original.')}</div>
    {!!job.requirements?.length && <section className="detailSection"><h3>Requisitos</h3><ul>{job.requirements.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.desirableRequirements?.length && <section className="detailSection"><h3>Diferenciais</h3><ul>{job.desirableRequirements.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.benefits?.length && <section className="detailSection benefits"><h3>Benefícios</h3><ul>{job.benefits.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {!!job.tags.length && <div className="tags">{job.tags.map(tag => <i key={tag}>{tag}</i>)}</div>}
    <footer><small>{ageLabel(job)} · Plataforma: {job.source}</small>{original && <a href={original} target="_blank" rel="noopener noreferrer" onClick={onVisit}>Abrir na {job.originalPlatform || 'plataforma original'} ↗</a>}</footer>
  </section></div>
}

const NAV_ITEMS = [['overview', '⌂', 'Visão geral'], ['explore', '⌕', 'Explorar vagas'], ['favorites', '☆', 'Favoritas'], ['visited', '✓', 'Visualizadas'], ['hidden', '×', 'Ocultas']]

export default function App() {
  const [jobs, setJobs] = useState([]), [meta, setMeta] = useState({ updatedAt: null })
  const [query, setQuery] = useState(''), [area, setArea] = useState(''), [source, setSource] = useState(''), [sort, setSort] = useState('date')
  const [workMode, setWorkMode] = useState('remote'), [view, setView] = useState('overview'), [discovery, setDiscovery] = useState('areas')
  const [selectedJob, setSelectedJob] = useState(null), [page, setPage] = useState(1), [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false), [feedback, setFeedback] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('vagas-remotas-br.theme') !== 'light')
  const [onlyUnseen, setOnlyUnseen] = useState(false)
  const detailsCache = useRef(new Map())
  const visited = useLocalSet('vagas-remotas-br.visited'), favorites = useLocalSet('vagas-remotas-br.favorites'), hidden = useLocalSet('vagas-remotas-br.hidden')

  useEffect(() => { fetch('/data/jobs.json').then(r => r.json()).then(data => { setJobs(data.jobs); setMeta(data.meta) }).catch(() => setJobs([])) }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('vagas-remotas-br.theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { const overflow = mobile ? 'hidden' : ''; document.body.style.overflow = overflow; document.documentElement.style.overflow = overflow; return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = '' } }, [mobile])

  const availableForFilters = useMemo(() => jobs.filter(job => job.status === 'active' && !hidden.value.has(job.id) && (workMode === 'all' || job.workMode === workMode)), [jobs, hidden.value, workMode])
  const effectiveSource = source && availableForFilters.some(job => job.source === source) ? source : ''
  const areas = useMemo(() => countBy(availableForFilters.filter(job => !effectiveSource || job.source === effectiveSource), 'area'), [availableForFilters, effectiveSource])
  const effectiveArea = area && areas.some(([name]) => name === area) ? area : ''
  const sources = useMemo(() => countBy(availableForFilters.filter(job => !effectiveArea || job.area === effectiveArea), 'source'), [availableForFilters, effectiveArea])

  const visible = useMemo(() => jobs.filter(job => {
    const isHidden = hidden.value.has(job.id)
    if (view === 'hidden' ? !isHidden : isHidden) return false
    if (workMode !== 'all' && job.workMode !== workMode) return false
    if (query && ![job.title, job.company, job.area, job.location, job.source, ...job.tags].join(' ').toLowerCase().includes(query.toLowerCase())) return false
    if (effectiveArea && job.area !== effectiveArea) return false
    if (effectiveSource && job.source !== effectiveSource) return false
    if (onlyUnseen && visited.value.has(job.id)) return false
    if (view === 'favorites' && !favorites.value.has(job.id)) return false
    if (view === 'visited' && !visited.value.has(job.id)) return false
    if (view === 'new' && jobAgeDays(job) !== 0) return false
    if (view === 'available' && job.status !== 'active') return false
    return true
  }).sort((a, b) => sort === 'company' ? a.company.localeCompare(b.company, 'pt-BR') : sort === 'title' ? a.title.localeCompare(b.title, 'pt-BR') : jobDate(b) - jobDate(a)), [jobs, hidden.value, workMode, query, effectiveArea, effectiveSource, onlyUnseen, view, visited.value, favorites.value, sort])

  const pageSize = 30, totalPages = Math.max(1, Math.ceil(visible.length / pageSize)), currentPage = Math.min(page, totalPages)
  const pagedJobs = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const updated = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'carregando…'
  const sectionTitle = ({ overview: 'Vagas recomendadas', explore: 'Explorar todas as vagas', favorites: 'Vagas favoritas', visited: 'Vagas visualizadas', hidden: 'Vagas ocultas', new: 'Vagas cadastradas hoje', available: 'Vagas disponíveis' })[view]

  const selectView = next => { setView(next); if (next === 'explore') setDiscovery('areas'); setOnlyUnseen(false); setPage(1); setMobile(false) }
  const goHome = () => { setView('overview'); setQuery(''); setArea(''); setSource(''); setOnlyUnseen(false); setPage(1); setMobile(false) }
  const openJob = job => {
    visited.add(job.id)
    const cached = detailsCache.current.get(job.detailChunk)
    if (cached?.[job.id]) { setSelectedJob({ ...job, ...cached[job.id] }); return }
    setSelectedJob({ ...job, detailsLoading: true })
    if (!Number.isInteger(job.detailChunk) || job.detailChunk < 0) return
    fetch(`/data/details/${job.detailChunk}.json`).then(response => { if (!response.ok) throw new Error('Detalhes indisponíveis'); return response.json() }).then(details => { detailsCache.current.set(job.detailChunk, details); setSelectedJob(current => current?.id === job.id ? { ...job, ...details[job.id], detailsLoading: false } : current) }).catch(() => setSelectedJob(current => current?.id === job.id ? { ...job, detailsLoading: false } : current))
  }
  const toggleTheme = () => { const change = () => setDark(value => !value); if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(change); else change() }

  return <div className={`appShell ${collapsed ? 'collapsed ' : ''}${mobile ? 'menuOpen' : ''}`}>
    <aside className="sidebar">
      {mobile && <div className="mobileMenuHeader"><strong>Filtros</strong><button onClick={() => setMobile(false)} aria-label="Fechar filtros">×</button></div>}
      <div className="sideActions"><button className="homeButton" onClick={goHome} title="Ir para o início" aria-label="Ir para o início"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.7 10.3 12.8 2.9a1.25 1.25 0 0 0-1.6 0l-8.9 7.4a1 1 0 0 0 1.28 1.54L4.5 11v8.25A2.75 2.75 0 0 0 7.25 22h9.5a2.75 2.75 0 0 0 2.75-2.75V11l.92.84a1 1 0 0 0 1.28-1.54ZM14.75 20h-5.5v-6.25c0-.41.34-.75.75-.75h4c.41 0 .75.34.75.75V20Z"/></svg></button><a href="https://github.com/oliveirasdiogo" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="Abrir GitHub"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .8A11.2 11.2 0 0 0 8.5 22.6c.6.1.8-.3.8-.6v-2.1c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6A4.7 4.7 0 0 1 6.4 8c-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2a4.7 4.7 0 0 1 1.2 3.3c0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2V22c0 .4.2.7.8.6A11.2 11.2 0 0 0 12 .8Z"/></svg></a><button onClick={() => setFeedback(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg><span>Feedback</span></button></div>
      <div className="navLabel">Navegação</div><nav className="sideNav">{NAV_ITEMS.map(([id, icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => selectView(id)}><i>{icon}</i><span>{label}</span></button>)}</nav>
      <div className="sideFilters"><label>Buscar</label><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Cargo, empresa, tecnologia"/><label>Área</label><select value={effectiveArea} onChange={event => { setArea(event.target.value); setPage(1) }}><option value="">Todas as áreas</option>{areas.map(([name]) => <option key={name}>{name}</option>)}</select><label>Plataforma</label><select value={effectiveSource} onChange={event => { setSource(event.target.value); setPage(1) }}><option value="">Todas as plataformas</option>{sources.map(([name]) => <option key={name}>{name}</option>)}</select><label className="check"><input checked={onlyUnseen} onChange={event => { setOnlyUnseen(event.target.checked); setPage(1) }} type="checkbox"/> Apenas não visualizadas</label></div>
      <div className="sideMeta"><span>Última coleta<br/><b>{updated}</b></span><strong>{jobs.length}<small> vagas verificadas</small></strong></div>
    </aside>
    {mobile && <button className="mobileMenuBackdrop" onClick={() => setMobile(false)} aria-label="Fechar menu de filtros"/>}
    <button className="collapseButton" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Abrir menu lateral' : 'Recolher menu lateral'}>{collapsed ? '›' : '‹'}</button>
    <main className="content">
      {!mobile && <div className="mobileTop"><button onClick={() => setMobile(true)}>Filtros ☰</button></div>}
      <header className="topbar"><p className="compactTitle">Painel de vagas remotas e híbridas disponíveis no Brasil</p><button className="themeButton" onClick={toggleTheme} title={dark ? 'Usar modo claro' : 'Usar modo escuro'} aria-label={dark ? 'Usar modo claro' : 'Usar modo escuro'}>{dark ? '☀' : '☾'}</button></header>
      <nav className="workTabs" aria-label="Modalidade de trabalho"><button className={workMode === 'remote' ? 'active' : ''} onClick={() => { setWorkMode('remote'); setPage(1) }}>Remotas <b>{jobs.filter(job => job.workMode === 'remote').length}</b></button><button className={workMode === 'hybrid' ? 'active' : ''} onClick={() => { setWorkMode('hybrid'); setPage(1) }}>Híbridas <b>{jobs.filter(job => job.workMode === 'hybrid').length}</b></button><button className={workMode === 'all' ? 'active' : ''} onClick={() => { setWorkMode('all'); setPage(1) }}>Todas <b>{jobs.length}</b></button></nav>
      <section className="stats"><button className={`stat ${view === 'new' ? 'active' : ''}`} onClick={() => selectView(view === 'new' ? 'overview' : 'new')}><span>Novas hoje</span><strong>{jobs.filter(job => jobAgeDays(job) === 0 && !hidden.value.has(job.id)).length}</strong></button><button className={`stat ${view === 'visited' ? 'active' : ''}`} onClick={() => selectView(view === 'visited' ? 'overview' : 'visited')}><span>Visualizadas</span><strong>{jobs.filter(job => visited.value.has(job.id) && !hidden.value.has(job.id)).length}</strong></button><button className={`stat ${view === 'favorites' ? 'active' : ''}`} onClick={() => selectView(view === 'favorites' ? 'overview' : 'favorites')}><span>Favoritas</span><strong>{jobs.filter(job => favorites.value.has(job.id) && !hidden.value.has(job.id)).length}</strong></button><button className={`stat ${view === 'available' ? 'active' : ''}`} onClick={() => selectView(view === 'available' ? 'overview' : 'available')}><span>Disponíveis</span><strong>{jobs.filter(job => job.status === 'active' && !hidden.value.has(job.id)).length}</strong></button><button className={`stat ${view === 'hidden' ? 'active' : ''}`} onClick={() => selectView(view === 'hidden' ? 'overview' : 'hidden')}><span>Ocultas</span><strong>{hidden.value.size}</strong></button><button className={`stat ${view === 'explore' && discovery === 'platforms' ? 'active' : ''}`} onClick={() => { selectView('explore'); setDiscovery('platforms') }}><span>Plataformas</span><strong>{sources.length}</strong></button></section>
      {view === 'explore' && <section className="discoveryPanel"><header><div><h2>{discovery === 'platforms' ? 'Explore por plataforma' : 'Explore por área'}</h2><p>{discovery === 'platforms' ? 'Filtre pela plataforma original de candidatura' : 'Encontre oportunidades por especialidade profissional'}</p></div><div className="discoverySwitch"><button className={discovery === 'areas' ? 'active' : ''} onClick={() => setDiscovery('areas')}>Áreas</button><button className={discovery === 'platforms' ? 'active' : ''} onClick={() => setDiscovery('platforms')}>Plataformas</button></div></header><div className="discoveryGrid">{(discovery === 'platforms' ? sources : areas).slice(0, 8).map(([name, count]) => <button key={name} onClick={() => { if (discovery === 'platforms') setSource(name); else setArea(name); setPage(1) }}><b>{name}</b><span>{count.toLocaleString('pt-BR')} vagas</span></button>)}</div></section>}
      <div className="sectionHead"><div><h2>{sectionTitle}</h2><p>{view === 'overview' ? 'Oportunidades mais recentes para o seu perfil' : `${visible.length.toLocaleString('pt-BR')} resultados`}</p></div><select value={sort} onChange={event => { setSort(event.target.value); setPage(1) }} aria-label="Ordenar vagas"><option value="date">Mais recentes</option><option value="title">Ordem alfabética</option><option value="company">Empresas</option></select></div>
      <div className="grid">{visible.length ? pagedJobs.map(job => <JobCard key={job.id} job={job} visited={visited.value.has(job.id)} favorite={favorites.value.has(job.id)} hiddenView={view === 'hidden'} onVisit={() => visited.add(job.id)} onFavorite={() => favorites.toggle(job.id)} onHide={() => view === 'hidden' ? hidden.toggle(job.id) : hidden.add(job.id)} onOpen={() => openJob(job)}/>) : <div className="empty">Nenhuma vaga corresponde aos filtros.{view === 'hidden' && hidden.value.size > 0 && <button onClick={hidden.clear}>Restaurar todas as ocultas</button>}</div>}</div>
      {visible.length > pageSize && <nav className="pagination" aria-label="Paginação"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>Página <b>{currentPage}</b> de {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Próxima →</button></nav>}
      <footer className="siteFooter">Projeto pessoal de vagas remotas para o Brasil.</footer>
      {selectedJob && <JobDetails job={selectedJob} onClose={() => setSelectedJob(null)} onVisit={() => visited.add(selectedJob.id)}/>}
    </main>
    {feedback && <div className="feedbackBackdrop" onMouseDown={() => setFeedback(false)}><section className="feedbackModal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onMouseDown={event => event.stopPropagation()}><h2 id="feedback-title">Enviar feedback</h2><p>Conte o que podemos melhorar na experiência.</p><textarea placeholder="Escreva sua sugestão…"/><div><button onClick={() => setFeedback(false)}>Cancelar</button><a href="mailto:oliveirasdiogo@proton.me?subject=Feedback%20-%20Vagas%20Remotas%20BR">Enviar por e-mail</a></div></section></div>}
  </div>
}
