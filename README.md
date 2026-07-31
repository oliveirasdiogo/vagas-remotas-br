# Vagas Remotas BR

Painel pessoal e open source para acompanhar vagas remotas disponíveis para profissionais no Brasil.

## Funcionalidades

- busca e filtros por área, plataforma e modalidade remota/híbrida;
- vagas visualizadas, favoritas e ocultas salvas apenas no navegador;
- ordenação por relevância, data e empresa;
- indicação da fonte e abertura da candidatura original em nova aba;
- catálogo estático atualizado por GitHub Actions;
- paginação de 30 vagas e detalhes carregados somente ao abrir um card;
- limpeza automática de imagens que não pertencem mais ao catálogo;
- proteção contra indexação de dados, crawlers de IA e coleta automatizada abusiva;
- deploy sem backend no Cloudflare Pages.

## Executar localmente

Requer Node.js 22 ou superior.

```bash
npm ci
npm run collect:fixtures
npm run dev
```

Validação completa:

```bash
npm run check
npm run build
```

## Arquitetura

```text
APIs configuradas ou importação manual → validação → catálogo estático
                                           ↓
                                     aplicação React
                                           ↓
                                  Cloudflare Pages
```

O MVP não usa Worker, D1, cookies, autenticação ou analytics. Preferências locais são armazenadas no `localStorage` e não saem do dispositivo. As vagas podem ser fornecidas por APIs configuradas pelo mantenedor ou inseridas por importação manual, sempre respeitando permissões, termos aplicáveis e a validação do projeto.

O arquivo inicial contém apenas os dados necessários para busca, filtros e cards. Descrições, requisitos e benefícios são divididos em blocos estáticos e carregados sob demanda. Isso reduz transferência e renderização sem acrescentar serviços pagos.

Os arquivos gerados de vagas e imagens são ignorados pelo Git e não devem ser publicados no repositório. O GitHub Actions monta o catálogo em um ambiente temporário e envia o diretório `dist` diretamente ao Cloudflare Pages. Ao concluir, o ambiente é descartado. O repositório público contém somente código, fixtures demonstrativas e documentação.

Logotipos fornecidos pelas integrações são validados como PNG, JPEG ou WebP, limitados a 300 KB e armazenados localmente. Assim, o navegador do visitante não faz requisições aos servidores de imagem externos. Imagens alternativas só podem ser processadas a partir de caminhos previamente validados; nenhum conteúdo externo é executado.

`npm run collect` executa os conectores configurados. `npm run collect:fixtures` gera somente o protótipo demonstrativo. A automação pode ser executada três vezes ao dia e o período de consulta é configurável.

## Cloudflare Pages

- comando de build: `npm run build`
- diretório de saída: `dist`
- versão do Node.js: `22`

O deploy automatizado exige dois GitHub Actions Secrets, `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN`, e a variável `CLOUDFLARE_PAGES_PROJECT`. Use um token limitado à permissão **Cloudflare Pages: Edit** na conta necessária. Nunca coloque esses valores em arquivos, commits ou logs.

Os cabeçalhos de segurança estão definidos em `public/_headers` e são publicados junto com o site.

## Proteção contra coleta automatizada

O projeto implementa `robots.txt` restritivo para `/data/` e diretórios de imagens, `X-Robots-Tag` para impedir indexação e arquivamento, política de mesma origem e divisão dos detalhes em blocos carregados sob demanda. No painel do Cloudflare, ative também:

1. **Security > Bots > Bot Fight Mode**;
2. **AI Crawl Control**, bloqueando crawlers que não deseja autorizar;
3. **Managed robots.txt** e bloqueio de bots de IA;
4. uma regra de rate limiting para o caminho `/data/*`, calibrada após observar o uso normal;
5. alertas e análise periódica de tráfego para identificar picos e violações.

Esses controles reduzem coleta automatizada e cópia em massa, mas não tornam conteúdo público incopiável. Qualquer informação enviada ao navegador pode ser salva manualmente. Não use tokens no frontend, parâmetros secretos em URLs ou proteções baseadas apenas em JavaScript.

Consulte o guia completo [Proteção contra coleta automatizada](docs/PROTECAO-CONTRA-COLETA.md) para configurar e validar as regras no Cloudflare.

### Acesso restrito recomendado

Para uso pessoal ou por um grupo pequeno, proteja todo o domínio com **Cloudflare Access**. Crie uma aplicação Access para o site, habilite login por código temporário (OTP) e faça a política `Allow` incluir somente endereços aprovados previamente pelo administrador. Uma pessoa nova só deve entrar depois que seu endereço for adicionado à política; ao removê-lo, ela deixa de ser autorizada nas próximas validações de acesso.

Não use `Include: Everyone` nem permita apenas o método de login `One-time PIN`, pois essas configurações podem aceitar qualquer pessoa com um e-mail válido. A lista real de usuários pertence à configuração privada da conta Cloudflare: não registre endereços pessoais, IDs da conta ou exportações de políticas no repositório.

Proteja também os endereços de preview e o subdomínio `pages.dev`, ou redirecione esse endereço para o domínio protegido. Sem isso, a URL padrão do Pages pode contornar a política aplicada somente ao domínio personalizado. O repositório de código pode continuar público; os dados gerados permanecem fora do Git e o catálogo publicado exige autenticação.

Antes do primeiro deploy real, siga o roteiro [Publicação segura](docs/PUBLICACAO-SEGURA.md). Ele orienta a publicar primeiro apenas as fixtures, ativar e testar o Access e somente depois liberar a automação do catálogo.

## Segurança

Leia [SECURITY.md](SECURITY.md). Dados coletados passam por validação de esquema, limites de tamanho e lista de domínios permitidos. Não faça commit de tokens, cookies, sessões ou arquivos `.env`.

## Licença

[MIT](LICENSE)
