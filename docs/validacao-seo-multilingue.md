# Validação da implementação multilíngue

Data: 17/11/2026. Implementação e revisão por agentes Terra/High, seguidas de revisão independente e testes reais no Chrome. Nenhum commit ou deploy foi executado.

## Resultado funcional

- `pnpm lint`, `pnpm test` e `pnpm build` passaram: 29 arquivos e 314 testes.
- Build de preview com `PREVIEW_BASE=preview/pr-123/` passou; o `dist` final foi restaurado para produção.
- O build valida em disco os 20 documentos canônicos, idioma, canonical, cinco alternates por página, JSON-LD, links locais, referências compartilhadas de assets e `noindex` no preview.
- No Chrome, com storage bloqueado, a navegação por seletor e links do rodapé preservou IDs e valores dos modelos Monaco. Voltar entre idiomas e trocar o idioma durante a comparação preservaram o resultado e o documento. A única nova requisição HTTP durante esse cenário foi o DiffViewer ao abrir o resultado; a troca de idioma não recarregou Monaco.
- Testados no navegador tanto em produção local quanto no prefixo de preview: `?lang=pt&utm_source=test#section`, `#/es/faq`, `/en/` e acesso direto a `/zh/`. URLs, idioma, canonical e Open Graph ficaram coerentes; campanha e âncora comum foram preservadas na migração de query.
- A FAQ estática não carregou o JS da ferramenta. URLs inexistentes receberam 404 no servidor estático sem fallback de SPA. O sitemap existe somente no build de produção.
- A revisão final corrigiu o formato de `og:locale`, adicionou cobertura de navegação com storage bloqueado e configurou fila para as escritas de publicação. O GitHub documenta `queue: max` para evitar a substituição habitual da única execução pendente, até o limite de 100: [controle de concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Assets e desempenho

O baseline foi reconstruído a partir do `HEAD` anterior às alterações, com as mesmas dependências. Os dois builds foram servidos localmente como arquivos estáticos, sem fallback de SPA. A comparação abaixo usa Chrome 157 headless, viewport mobile 390 × 844, CPU 4×, latência de 80 ms e download de 200.000 bytes/s. Foram feitas três rodadas com cache frio e três com cache quente por versão. O armazenamento foi limpo antes de cada par frio/quente.

| Mediana | Baseline | Versão final |
|---|---:|---:|
| JS + CSS iniciais, gzip calculado com o mesmo Node/zlib | 136.957 bytes | 134.717 bytes |
| Editor disponível, cache frio | 7.524 ms | 7.653 ms |
| Editor disponível, cache quente | 630 ms | 673 ms |
| LCP observado, cache frio | 664 ms | 692 ms |
| LCP observado, cache quente | 280 ms | 276 ms |
| Soma de layout shifts sem interação, cache frio | 0,249 | 0,217 |
| Soma de layout shifts sem interação, cache quente | 0 | 0 |

O tamanho inicial caiu 2.240 bytes gzip, sem duplicação de assets por idioma. Essa soma exclui o DiffViewer carregado sob demanda e o worker; não é uma medição de transferência completa. A captura de rede também observou os recursos Monaco externos do jsDelivr já usados pelo projeto. O servidor local não aplica compressão aos assets próprios, portanto os bytes transferidos nesse ambiente não representam o CDN de produção.

A disponibilidade do editor foi amostrada a cada 200 ms, com imprecisão adicional do agendamento sob CPU limitada. Os tempos são uma comparação laboratorial, não Core Web Vitals de usuários reais. As medianas ficaram dentro do limite de regressão de 10% previsto no plano. A soma de layout shifts em carregamento frio ainda merece melhoria futura; a implementação reduziu o valor observado, mas não resolve toda a instabilidade de montagem existente.

A primeira versão usava imports dinâmicos imediatos para inicializar o app após normalizar URLs. A medição identificou uma cascata adicional com cache quente. A versão final normaliza a URL no primeiro módulo da entrada e usa imports estáticos; a revisão conferiu a ordem de avaliação nos bundles de produção e preview, antes de i18next e analytics.

## Verificações após publicação

Ainda precisam ser feitas no ambiente real: respostas e barras finais do GitHub Pages, execução dos workflows, ensaio de rollback, inspeção no Search Console e conferência da medição de page views no GA4. O procedimento está em [deploy-multilingue.md](deploy-multilingue.md). Essas verificações dependem de publicação e acessos externos; não foram simuladas como resultados de produção.
