# Histórico de alterações

As mudanças relevantes deste projeto são registradas neste arquivo.

## 2026-08-01

### Interface

- Os indicadores **Novas hoje**, **Visualizadas**, **Favoritas** e **Disponíveis** passaram a funcionar como filtros clicáveis e mutuamente exclusivos.
- Clicar novamente no filtro ativo restaura a listagem normal.
- O filtro **Apenas favoritas** da barra lateral permanece sincronizado com o card de favoritas.
- A contagem de visualizadas e favoritas considera somente vagas presentes e não ocultas no catálogo atual.
- A ação **Restaurar ocultas** foi removida da barra lateral e transformada no card **Ocultas** no topo da página.
- O card **Ocultas** informa quantas vagas foram removidas da lista e restaura todas elas ao ser acionado.
- O rodapé passou a exibir um link para o perfil do mantenedor com o ícone do GitHub.

### Automação e segurança

- A coleta automatizada foi ativada três vezes ao dia pelo GitHub Actions.
- O deploy passou a recusar catálogos vazios, demonstrativos, antigos, inconsistentes ou gerados após falha de uma fonte.
- O catálogo real, os detalhes e as imagens continuam fora do histórico Git e são enviados diretamente ao Cloudflare Pages.
- O acesso à interface e aos arquivos de dados foi validado com Cloudflare Access.
