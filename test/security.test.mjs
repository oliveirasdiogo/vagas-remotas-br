import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeJob } from '../collectors/security.mjs'

const valid = { externalId:'1', title:'Analista de Dados', company:'Empresa', area:'Dados', level:'Júnior', contract:'CLT', source:'Gupy', salary:null, tags:['SQL'], age:'hoje', publishedLabel:'Hoje', relevance:80, url:'https://remotar.com.br/job/1', status:'active' }

test('aceita uma vaga válida em subdomínio permitido', () => assert.equal(normalizeJob(valid).url, valid.url))
test('rejeita protocolo javascript', () => assert.throws(() => normalizeJob({ ...valid, url:'javascript:alert(1)' }), /URL insegura/))
test('rejeita HTTP sem TLS', () => assert.throws(() => normalizeJob({ ...valid, url:'http://empresa.gupy.io/jobs/1' }), /URL insegura/))
test('rejeita domínio semelhante ao permitido', () => assert.throws(() => normalizeJob({ ...valid, url:'https://remotar.com.br.evil.example/job/1' }), /Domínio interno não permitido/))
test('rejeita credenciais embutidas na URL', () => assert.throws(() => normalizeJob({ ...valid, url:'https://user:pass@remotar.com.br/job/1' }), /URL insegura/))
test('trata o nome da plataforma apenas como texto', () => assert.equal(normalizeJob({ ...valid, source:'Nova plataforma' }).source, 'Nova plataforma'))
test('remove caracteres de controle', () => assert.equal(normalizeJob({ ...valid, title:'Analista\u0000 de Dados' }).title, 'Analista de Dados'))
test('preserva parágrafos seguros na descrição', () => assert.equal(normalizeJob({ ...valid, description:'Sobre a vaga\n\n• React\u0000' }).description, 'Sobre a vaga\n\n• React'))
test('valida benefícios e requisitos como listas de texto', () => {
  const job = normalizeJob({ ...valid, benefits:['Plano de saúde'], requirements:['React'] })
  assert.deepEqual(job.benefits, ['Plano de saúde'])
  assert.deepEqual(job.requirements, ['React'])
})
test('limita tamanho de texto', () => assert.throws(() => normalizeJob({ ...valid, title:'a'.repeat(161) }), /Campo inválido/))
test('aceita Remotar apenas no domínio oficial', () => assert.equal(normalizeJob({ ...valid, source:'Remotar', url:'https://remotar.com.br/job/1/empresa/vaga' }).source, 'Remotar'))
test('aceita candidatura externa HTTPS sem credenciais', () => assert.equal(normalizeJob({ ...valid, originalUrl:'https://empresa.gupy.io/jobs/1' }).originalUrl, 'https://empresa.gupy.io/jobs/1'))
test('rejeita candidatura externa com javascript', () => assert.throws(() => normalizeJob({ ...valid, originalUrl:'javascript:alert(1)' }), /URL externa insegura/))
test('preserva datas ISO seguras para calcular há quantos dias a vaga existe', () => {
  const job = normalizeJob({ ...valid, publishedAt:'2026-07-28T12:00:00.000Z', firstSeenAt:'2026-07-29T12:00:00.000Z' })
  assert.equal(job.publishedAt, '2026-07-28T12:00:00.000Z')
  assert.equal(job.firstSeenAt, '2026-07-29T12:00:00.000Z')
})
test('rejeita data com formato ambíguo', () => assert.throws(() => normalizeJob({ ...valid, publishedAt:'28/07/2026' }), /Campo inválido/))
