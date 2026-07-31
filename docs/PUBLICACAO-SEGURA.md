# Publicação segura

Este roteiro evita publicar o catálogo real antes da validação do controle de acesso. Não registre e-mails autorizados, tokens, IDs da conta ou dados coletados no repositório.

## 1. GitHub

1. Publique somente os arquivos permitidos pelo `.gitignore`.
2. Confirme que `public/data`, `public/company-logos`, `public/platform-logos`, `dist` e `.env` não estão no commit.
3. Ative proteção da branch principal, Dependabot e alertas de segurança.
4. Ainda não cadastre os segredos do deploy automático.

## 2. Primeiro Pages sem catálogo real

1. Gere localmente apenas o protótipo demonstrativo com `npm run collect:fixtures && npm run build`.
2. Crie o projeto no Cloudflare Pages e faça o primeiro Direct Upload do diretório `dist`.
3. Se usar domínio personalizado, adicione e valide o domínio no Pages antes de criar a aplicação Access.

## 3. Cloudflare Access

1. Configure One-time PIN em **Zero Trust > Integrations > Identity providers**, se necessário.
2. Proteja o domínio personalizado com uma aplicação **Self-hosted and private** e uma política `Allow` baseada em endereços exatos.
3. Em **Workers & Pages > projeto > Settings**, habilite Access para `<projeto>.pages.dev` e previews.
4. Confirme que não há política `Everyone`, `Bypass` ou permissão baseada somente no método OTP.
5. Teste o domínio personalizado, `pages.dev` e uma URL de preview em janela anônima.
6. Valide um e-mail permitido e outro não cadastrado.

## 4. Automação somente após o Access

Depois que todos os endereços estiverem protegidos:

1. crie um token limitado a **Cloudflare Pages: Edit** apenas na conta necessária;
2. cadastre `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` como GitHub Actions Secrets;
3. cadastre `CLOUDFLARE_PAGES_PROJECT` como variável do repositório;
4. execute manualmente o workflow **Coletar e publicar**;
5. confirme que o workflow passou e que o catálogo continua exigindo autenticação;
6. só então mantenha as três execuções diárias programadas.

## 5. Validação posterior

- Revise os logs de autenticação do Access.
- Confirme os cabeçalhos de segurança em `/`, `/data/jobs.json` e nos diretórios de imagens.
- Verifique que o GitHub não recebeu arquivos gerados nem segredos.
- Teste a remoção de um e-mail e encerre sessões ativas se a revogação precisar ser imediata.
- Revise periodicamente políticas, previews e URLs alternativas.

Consulte as instruções oficiais de [OTP](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/), [políticas do Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) e [proteção de `pages.dev` e previews](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).
