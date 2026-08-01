# Histórico de alterações

As mudanças relevantes deste projeto são registradas neste arquivo.

## 2026-08-01

### Interface

- A interface adotou o novo layout em preto, grafite, cinza e branco, com modo escuro como padrão e modo claro de alto contraste.
- A navegação lateral passou a reunir visão geral, exploração, favoritas, visualizadas e ocultas, com recolhimento responsivo no desktop e painel móvel.
- GitHub e Feedback foram movidos para o topo da navegação lateral e são ocultados junto com o menu recolhido.
- A seção **Explorar vagas** ganhou navegação por áreas e plataformas, alimentada pelas contagens reais do catálogo.
- Os seis indicadores do painel são responsivos e funcionam como filtros: novas, visualizadas, favoritas, disponíveis, ocultas e plataformas.
- O cartão **Plataformas** abre diretamente a exploração por plataforma original de candidatura.
- O cabeçalho foi reduzido para uma identificação compacta do painel, sem repetir título e subtítulo.
- O projeto recebeu um favicon vetorial próprio, local e sem dependências externas.
- A ordenação foi simplificada para **Mais recentes**, **Ordem alfabética** e **Empresas**, com as vagas mais recentes como padrão.
- Um botão de início foi adicionado ao lado do GitHub para retornar à visão geral e limpar os filtros ativos.
- O horário original de publicação passou a aparecer nos cards e nos detalhes, convertido para o horário de Brasília a partir da data informada pela fonte.
- A visualização mobile foi compactada para duas colunas de indicadores, cards menores, margens reduzidas e menu lateral com sobreposição segura, eliminando a rolagem horizontal e o excesso de altura.
- No mobile, os indicadores passaram a funcionar como uma faixa horizontal de filtros rápidos, ocupando apenas uma linha e mantendo os cards completos no desktop.
- O menu de filtros mobile ganhou fechamento próprio, fundo clicável, bloqueio da rolagem da página e rolagem interna limitada a `100dvh`, evitando sobreposição e conteúdo cortado.
- O menu mobile passou a usar um cabeçalho interno com fechamento e posicionamento fixo por `top`/`bottom`, corrigindo o recorte observado no Brave para Android e removendo totalmente o acionador externo enquanto aberto.
- Logos de empresas e plataformas agora possuem fallback automático para iniciais quando o arquivo estiver ausente ou falhar no navegador.
- O modal de detalhes foi adaptado aos temas claro e escuro e mantém a candidatura na plataforma original em nova aba segura.
- Os indicadores **Novas hoje**, **Visualizadas**, **Favoritas** e **Disponíveis** passaram a funcionar como filtros clicáveis e mutuamente exclusivos.
- Clicar novamente no filtro ativo restaura a listagem normal.
- O filtro **Apenas favoritas** da barra lateral permanece sincronizado com o card de favoritas.
- A contagem de visualizadas e favoritas considera somente vagas presentes e não ocultas no catálogo atual.
- A ação **Restaurar ocultas** foi removida da barra lateral e transformada no card **Ocultas** no topo da página.
- O card **Ocultas** informa quantas vagas foram removidas da lista e restaura todas elas ao ser acionado.
- O rodapé passou a exibir um link para o perfil do mantenedor com o ícone do GitHub.
- O link do GitHub foi reposicionado para o lado esquerdo e apresentado como um botão quadrado para permanecer visível em diferentes larguras de tela.
- A marca do cabeçalho foi simplificada para **Vagas BR**, com apresentação consistente no desktop e no celular.

### Automação e segurança

- A coleta automatizada foi ativada três vezes ao dia pelo GitHub Actions.
- O deploy passou a recusar catálogos vazios, demonstrativos, antigos, inconsistentes ou gerados após falha de uma fonte.
- O catálogo real, os detalhes e as imagens continuam fora do histórico Git e são enviados diretamente ao Cloudflare Pages.
- O acesso à interface e aos arquivos de dados foi validado com Cloudflare Access.
