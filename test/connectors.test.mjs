import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTramposJob } from '../collectors/connectors/trampos.mjs'
import { parseApinfo } from '../collectors/connectors/apinfo.mjs'
import { parseLever } from '../collectors/connectors/lever.mjs'
import { parseEmpregare } from '../collectors/connectors/empregare.mjs'
import { parseSolides } from '../collectors/connectors/solides.mjs'
import { applyGreenhouseContent, greenhouseReference, parseRemotar } from '../collectors/connectors/remotar.mjs'
import { safeRemotarThumbnail } from '../collectors/logos.mjs'

test('Trampos aceita vaga remota e ignora vaga presencial', () => {
  const remote = '<script>opportunity: {"opportunity":{"id":7,"name":"Dev Pleno","category_name":"TI","home_office":true,"hybrid":false,"published_at":"2026-07-30T12:00:00.000-03:00","salary":"NÃO DIVULGADA","regime":"CLT","description":"React e Node.js","prerequisite":"TypeScript","company":{"id":42,"name":"Acme","logo_mini":"//cdn0.trampos.co/logo.png"}}}</script>'
  const parsed = parseTramposJob(remote, 'https://www.trampos.co/oportunidade/7-dev')
  assert.equal(parsed.workMode, 'remote')
  assert.equal(parsed.logoUrl, 'https://cdn0.trampos.co/logo.png')
  assert.equal(parsed.logoKey, 'trampos-42')
  assert.equal(parseTramposJob(remote.replace('"home_office":true', '"home_office":false'), 'https://www.trampos.co/oportunidade/7-dev'), null)
})

test('APInfo extrai vaga híbrida sem reutilizar HTML na interface', () => {
  const html = `<div class="box-vagas linha pd"><div class="info-data">São Paulo - SP - 30/07/26</div><div class="cargo m-tb"><span>Dev Java Pleno</span></div><div class="texto"><p>Atuação híbrido 1x. Contratação CLT.</p><p><strong>Empresa .....:</strong> Acme<BR><strong>Código .......:</strong> 123 <a href="https://www.apinfo.com/apinfo/inc/enviecv.cfm?codvaga=123&amp;pkey=abc">Envie</a></p></div></div>`
  const [job] = parseApinfo(html)
  assert.equal(job.externalId, '123')
  assert.equal(job.workMode, 'hybrid')
  assert.equal(job.company, 'Acme')
  assert.equal(job.url, 'https://www.apinfo.com/apinfo/inc/enviecv.cfm?codvaga=123&pkey=abc')
})

test('Lever aceita vaga remota brasileira e rejeita vaga estrangeira', () => {
  const posting = { id:'abc', text:'Software Engineer', hostedUrl:'https://jobs.lever.co/acme/abc', createdAt:1781291897317, workplaceType:'remote', categories:{ location:'Brazil / Remote', commitment:'Full-time', team:'Engineering', allLocations:['Brazil / Remote'] }, descriptionPlain:'React TypeScript' }
  assert.equal(parseLever(posting, 'Acme').workMode, 'remote')
  assert.equal(parseLever({ ...posting, categories:{ ...posting.categories, location:'Chicago', allLocations:['Chicago'] } }, 'Acme'), null)
})

test('Empregare lê somente JobPosting remoto estruturado', () => {
  const data = { '@type':'JobPosting', identifier:{value:'42'}, title:'Dev Pleno Remoto', datePosted:'2026-07-30T12:00:00.000Z', validThrough:'2026-08-30T12:00:00.000Z', employmentType:'FULL_TIME', jobLocationType:'TELECOMMUTE', hiringOrganization:{name:'Acme'}, description:'React e Node.js', jobLocation:[] }
  const html = `<script type="application/ld&#x2B;json">${JSON.stringify(data)}</script>`
  assert.equal(parseEmpregare(html, 'https://www.empregare.com/pt-br/vaga-dev_42').workMode, 'remote')
  assert.equal(parseEmpregare(html.replace('TELECOMMUTE', 'ON_SITE').replace('Remoto', 'Local'), 'https://www.empregare.com/pt-br/vaga-dev_42'), null)
})

test('Sólides aceita modalidade remota e ignora presencial', () => {
  const vacancy = { id:7, title:'Dev Pleno', companyName:'Acme', jobType:'remoto', createdAt:'2026-07-31', redirectLink:'/vacancies/7', hardSkills:[{name:'React'}] }
  assert.equal(parseSolides(vacancy).workMode, 'remote')
  assert.equal(parseSolides({ ...vacancy, jobType:'presencial' }), null)
})

test('Remotar mantém a vaga no catálogo próprio e preserva a candidatura original', () => {
  const job = { id:9, title:'Dev Júnior', active:true, expired:false, type:'remote', createdAt:'2026-07-31T12:00:00.000-03:00', externalLink:'https://empresa.gupy.io/jobs/9', company:{name:'Acme'}, jobCategories:[{category:{name:'Tecnologia'}}], jobTags:[{tag:{name:'React'}}] }
  const parsed = parseRemotar(job)
  assert.equal(parsed.source, 'Gupy')
  assert.equal(parsed.workMode, 'remote')
  assert.equal(parsed.url, 'https://remotar.com.br/job/9')
  assert.equal(parsed.originalUrl, 'https://empresa.gupy.io/jobs/9')
  assert.equal(parsed.originalPlatform, 'Gupy')
  assert.equal(parseRemotar({ ...job, active:false }), null)
})

test('Remotar não executa HTML recebido na descrição', () => {
  const job = { id:10, title:'Dev Remoto', active:true, expired:false, type:'remote', createdAt:'2026-07-31T12:00:00.000-03:00', integrationSource:'gupy', externalLink:'https://acme.gupy.io/job/abc', company:{name:'Acme'} }
  const parsed = parseRemotar({ ...job, description:'<p>React</p><script>alert(1)</script>' })
  assert.equal(parsed.description, 'React')
})

test('Remotar usa a empresa como plataforma para formulário genérico', () => {
  const job = { id:11, title:'Dev Remoto', active:true, expired:false, type:'remote', createdAt:'2026-07-31T12:00:00.000-03:00', externalLink:'https://docs.google.com/forms/d/e/abc', company:{name:'Empresa Acme'} }
  assert.equal(parseRemotar(job).source, 'Empresa Acme')
  assert.equal(parseRemotar(job).originalPlatform, 'Empresa Acme')
})

test('Remotar converte qualquer domínio de plataforma em nome legível', () => {
  const base = { id:12, title:'Dev Remoto', active:true, expired:false, type:'remote', createdAt:'2026-07-31T12:00:00.000-03:00', company:{name:'Empresa'} }
  assert.equal(parseRemotar({ ...base, externalLink:'https://latojobs.com/vaga/12' }).source, 'LATOjobs')
  assert.equal(parseRemotar({ ...base, externalLink:'https://jobs.novaplataforma.com.br/vaga/12' }).source, 'Novaplataforma')
})

test('Greenhouse preserva a descrição pública completa com segurança', () => {
  assert.deepEqual(greenhouseReference('https://job-boards.greenhouse.io/quintoandar/jobs/4113918009'), { board:'quintoandar', jobId:'4113918009' })
  assert.equal(greenhouseReference('https://greenhouse.io.evil.example/quintoandar/jobs/4113918009'), null)
  const enriched = applyGreenhouseContent({ description:'Resumo', requirements:['SQL'], benefits:['VR'] }, '<h2>Sobre a empresa</h2><p>Informações completas.</p><h2>Benefícios</h2><ul><li>Plano de saúde</li></ul><script>alert(1)</script>')
  assert.match(enriched.description, /Sobre a empresa[\s\S]*Informações completas[\s\S]*Benefícios[\s\S]*Plano de saúde/)
  assert.doesNotMatch(enriched.description, /alert/)
  assert.deepEqual(enriched.requirements, [])
  assert.deepEqual(enriched.benefits, [])
})

test('Thumbnail da Remotar aceita somente caminho numérico esperado', () => {
  assert.equal(safeRemotarThumbnail('job-thumbnails/157497.png'), 'job-thumbnails/157497.png')
  assert.equal(safeRemotarThumbnail('../segredo.png'), null)
  assert.equal(safeRemotarThumbnail('job-thumbnails/x.png'), null)
})
