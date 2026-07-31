# Documentação

Este índice organiza os guias operacionais e de segurança do Vagas Remotas BR.

## Ordem recomendada

1. Leia a [política de segurança](../SECURITY.md).
2. Prepare o primeiro deploy com o roteiro de [publicação segura](PUBLICACAO-SEGURA.md).
3. Configure os controles descritos em [proteção contra coleta automatizada](PROTECAO-CONTRA-COLETA.md).
4. Valide o acesso antes de habilitar o catálogo real.

## Guias

| Documento | Quando usar |
| --- | --- |
| [Publicação segura](PUBLICACAO-SEGURA.md) | Ao criar o GitHub, o Pages e a automação |
| [Proteção contra coleta automatizada](PROTECAO-CONTRA-COLETA.md) | Ao configurar Access, bots, rate limiting e verificações |
| [Política de segurança](../SECURITY.md) | Antes de publicar ou relatar uma vulnerabilidade |
| [Como contribuir](../CONTRIBUTING.md) | Antes de enviar alterações ao projeto |

## Princípios

- O repositório contém código e fixtures, não o catálogo real.
- Segredos e listas de usuários ficam nas plataformas responsáveis, nunca no Git.
- O primeiro deploy usa somente dados demonstrativos.
- A automação real só é habilitada após o teste do controle de acesso.
- Nenhuma proteção substitui permissões e termos aplicáveis às integrações configuradas.

[Voltar ao README principal](../README.md)
