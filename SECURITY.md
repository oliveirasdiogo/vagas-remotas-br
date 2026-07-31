# Política de segurança

## Dados e privacidade

O projeto não coleta dados pessoais, não possui login e não envia o histórico do navegador ao servidor. Visualizadas, favoritas e ocultas são armazenadas no `localStorage` do próprio domínio.

## Controles implementados

- Content Security Policy restrita a recursos da própria origem;
- bloqueio de iframe, objetos, formulários e APIs sensíveis do navegador;
- links externos apenas em HTTPS, sem credenciais na URL e com `noopener noreferrer`;
- validação dos campos, comprimentos, fontes e domínios no pipeline;
- React sem `dangerouslySetInnerHTML`;
- arquivos `.env` ignorados pelo Git;
- Dependabot para npm e GitHub Actions;
- workflow com timeout, concorrência controlada e instalação sem scripts de pacotes.
- dados gerados fora do histórico Git e deploy direto para o Cloudflare Pages;
- `robots.txt`, `X-Robots-Tag`, política de mesma origem e detalhes sob demanda;
- compatibilidade com Bot Fight Mode, AI Crawl Control e rate limiting do Cloudflare.

## Limites da proteção contra cópia

O catálogo é público e precisa ser enviado ao navegador para ser visualizado. Portanto, nenhum controle impede totalmente que uma pessoa ou automação sofisticada copie o conteúdo. As proteções deste projeto têm como objetivo bloquear crawlers conhecidos, reduzir enumeração em massa, detectar abuso e aumentar o custo de coleta automatizada.

Não confie em ofuscação, chaves embutidas no JavaScript, cookies públicos ou URLs supostamente secretas. Para restringir o conteúdo de forma efetiva seria necessário exigir autenticação e autorização no servidor, o que mudaria a proposta do projeto.

Para instalações pessoais, recomenda-se colocar Cloudflare Access diante de todo o site e autorizar apenas e-mails aprovados previamente pelo administrador, usando código temporário. A lista de pessoas autorizadas deve existir somente na configuração privada do Cloudflare, nunca no código ou na documentação pública. Proteja também a URL `pages.dev` e previews para não deixar um caminho alternativo sem autenticação. Nunca configure `Include: Everyone` nem uma política baseada somente em `Login Methods: One-time PIN`.

## Relato responsável

Não abra uma issue pública contendo segredo ou vulnerabilidade explorável. Use o recurso **Security Advisories** do GitHub no repositório.

## Checklist antes de publicar

1. Execute `npm audit --omit=dev` e `npm run check`.
2. Verifique o repositório com uma ferramenta de detecção de segredos.
3. Confirme que os GitHub Secrets não aparecem em logs.
4. Revise alterações em coletores e domínios permitidos.
5. Ative proteção da branch principal e revisão do Dependabot.
6. Confirme que dados gerados continuam ignorados pelo Git.
7. Ative Bot Fight Mode, AI Crawl Control e uma regra de rate limiting para `/data/*`.
8. Se usar Access, teste um e-mail aprovado e outro não cadastrado; somente o primeiro deve receber o código e abrir o site.
