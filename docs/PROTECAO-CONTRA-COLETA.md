# Proteção contra coleta automatizada

Este projeto combina controles no código, no processo de publicação e no Cloudflare. O objetivo é reduzir cópia em massa, bloquear crawlers conhecidos e manter os dados gerados fora do repositório público.

## Limite técnico

Conteúdo público enviado ao navegador pode ser salvo. `robots.txt`, ofuscação e JavaScript não impedem um agente malicioso. Para uma instalação pessoal, a proteção recomendada é exigir autenticação com Cloudflare Access.

## Dados fora do Git

Os diretórios gerados estão no `.gitignore`. O GitHub Actions cria o catálogo em um ambiente temporário, executa testes, monta `dist` e publica diretamente no Cloudflare Pages. Não faça commit de `public/data`, `public/company-logos` ou `public/platform-logos`.

Configure no GitHub:

- secret `CLOUDFLARE_ACCOUNT_ID`;
- secret `CLOUDFLARE_API_TOKEN`, limitado a **Cloudflare Pages: Edit**;
- variável `CLOUDFLARE_PAGES_PROJECT` com o nome do projeto.

O procedimento segue o guia oficial de [Direct Upload com integração contínua](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Cloudflare Access — recomendado

Para um grupo pequeno, proteja todo o site. Se usar domínio personalizado, adicione e valide esse domínio no projeto Pages **antes** de criar a aplicação Access; o Pages pode não conseguir adicionar um domínio que já esteja protegido. Consulte também as [instruções atuais para proteger `pages.dev` e previews](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).

### Código temporário e e-mails aprovados

1. Acesse **Zero Trust > Integrations > Identity providers**.
2. Em **Your identity providers**, selecione **Add new identity provider > One-time PIN** se OTP ainda não estiver disponível na conta.
3. Acesse **Zero Trust > Access controls > Applications**.
4. Crie uma aplicação **Self-hosted and private** para o domínio público do site.
5. Crie uma política `Allow` com o seletor **Emails** e inclua somente endereços aprovados previamente pelo administrador.
6. Selecione o login **One-time PIN** para essa aplicação.
7. Não use `Include: Everyone` nem `Include: Login Methods: One-time PIN` sozinho, pois isso aceitaria qualquer pessoa com um e-mail válido.

### Proteger o Pages e os previews

1. No painel principal, acesse **Workers & Pages** e selecione o projeto.
2. Em **Settings**, habilite a política de Access para o projeto.
3. Confirme em **Zero Trust > Access controls > Applications** que existem proteções para o domínio `<projeto>.pages.dev` e para os previews `*.<projeto>.pages.dev`.
4. Se usar domínio personalizado, mantenha também a aplicação Access específica para esse domínio.
5. Não crie regras `Bypass` para `/data/`, `/company-logos/` ou `/platform-logos/`.

### Aprovar ou revogar uma pessoa

- Para aprovar alguém, adicione o endereço exato à regra de e-mails da política `Allow`.
- Para revogar o acesso, remova o endereço da política e revise sessões ativas quando for necessário encerrar o acesso imediatamente.
- Não mantenha a lista de usuários em arquivos versionados, variáveis do frontend, issues ou exemplos da documentação.
- Não publique capturas de tela que revelem e-mails, identificadores da conta ou detalhes internos da política.

No login por OTP, o Cloudflare só envia o código quando o endereço corresponde à política de acesso. A tela pode informar genericamente que o código foi enviado mesmo para uma pessoa bloqueada, evitando revelar quais endereços estão autorizados.

Consulte [login por código temporário](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) e [políticas do Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).

## Bots e crawlers de IA

No painel do domínio:

1. Ative **Security > Bots > Bot Fight Mode**.
2. Em **AI Crawl Control**, bloqueie crawlers que não deseja autorizar.
3. Ative **Managed robots.txt** e o bloqueio gerenciado de bots de IA.
4. Mantenha o `public/robots.txt` do projeto para impedir indexação de `/data/` e imagens.
5. Revise periodicamente violações de `robots.txt` e picos de tráfego.

Cloudflare informa que o [AI Crawl Control está disponível em todos os planos](https://developers.cloudflare.com/ai-crawl-control/). O `robots.txt` é apenas declarativo; o bloqueio efetivo depende dos controles de segurança.

## Rate limiting

Crie uma regra para o caminho `/data/*`:

- característica de contagem: endereço IP;
- ponto inicial sugerido: 60 solicitações por minuto;
- ação inicial: Managed Challenge;
- exclua bots verificados apenas se desejar indexação legítima;
- observe o tráfego e ajuste antes de usar bloqueio definitivo.

A aplicação baixa um índice no início e reutiliza blocos de detalhes, portanto uma pessoa normalmente fica muito abaixo desse valor. Evite limites agressivos que possam afetar redes compartilhadas. Consulte a documentação de [rate limiting do WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/).

## Verificação

Depois do deploy:

1. Em uma janela anônima, confirme que o domínio personalizado recebe a tela de login do Access.
2. Repita o teste em `<projeto>.pages.dev` e em uma URL de preview; nenhuma delas pode abrir o catálogo sem autenticação.
3. Solicite acesso com um e-mail aprovado: ele deve receber o código e abrir o site.
4. Solicite acesso com um e-mail não cadastrado: ele não deve receber o código nem abrir o site.
5. Depois do login autorizado, execute `curl -I https://SEU_DOMINIO/data/jobs.json` com uma sessão válida e confirme `X-Robots-Tag` e `Cross-Origin-Resource-Policy`.
6. Confirme que `/robots.txt` bloqueia `/data/`, `/company-logos/` e `/platform-logos/`.
7. Revise os logs de autenticação do Access e confirme que a política `Allow` esperada foi aplicada.
8. Verifique se não existe política `Bypass`, `Everyone` ou outra regra mais ampla com precedência sobre a lista de e-mails.
9. Gere tráfego de teste controlado e confira eventos no Security Analytics.
10. Verifique no GitHub que nenhum arquivo real do catálogo entrou no commit.

## Resposta a abuso

Se detectar coleta excessiva:

1. identifique caminho, ASN, país, user-agent e padrão de IP no Security Analytics;
2. aplique Managed Challenge antes de bloquear faixas amplas;
3. reduza temporariamente o limite para `/data/*`;
4. encerre sessões ou remova e-mails no Access, se aplicável;
5. revise previews, URLs alternativas e regras de bypass;
6. não exponha logs com e-mails, tokens ou identificadores sensíveis em issues públicas.
