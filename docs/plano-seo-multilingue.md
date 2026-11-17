# Plano de build e indexação por idioma

Data: 17/11/2026. Escopo: análise e proposta; nenhuma mudança funcional ou publicação nesta etapa.

## Recomendação

Manter Vite, React e GitHub Pages. Executar **um único build dos assets** e gerar HTML próprio para cada idioma, reaproveitando os mesmos JS, CSS, imagens e workers. A ferramenta terá quatro URLs canônicas; as páginas de apoio continuarão estáticas e leves.

Não é necessário introduzir servidor de SSR ou migrar de framework. A estrutura permite indexação independente das versões traduzidas; posição e indexação continuam dependendo do Google, da qualidade do conteúdo e da demanda em cada idioma.

## 1. Diagnóstico dos repositórios

### JSON Diff

- `src/main.tsx` usa `HashRouter`: as versões da ferramenta são `/#/en`, `/#/pt`, `/#/es` e `/#/zh`. No código analisado, o idioma da ferramenta é controlado pelo fragmento e pelo i18next, e não por query param. Mesmo assim, vale aceitar `?lang=` como compatibilidade com links anteriores.
- `index.html` tem metadados e um conteúdo inicial mínimo em inglês, com canonical na raiz. `LocaleLayout` atualiza o idioma depois da montagem; não há HTML próprio da ferramenta para cada idioma.
- Já existe uma boa base: `scripts/support-pages.js` gera **16 páginas estáticas**, quatro idiomas × FAQ, funcionamento, privacidade e contato. Elas já têm conteúdo traduzido, canonical e alternates; não carregam a aplicação React ou Monaco. Seus links de retorno à ferramenta ainda usam hash.
- O sitemap já lista a raiz e essas 16 páginas, mas não as três novas versões localizadas da ferramenta. `scripts/update-sitemap.js` apenas altera datas e não integra o comando de build atual.
- Os quatro dicionários são importados diretamente em `src/i18n.ts`. A configuração inicial considera storage/navegador antes de o layout sincronizar a URL.
- `DiffViewer` já usa import dinâmico. Os editores de entrada são montados na ferramenta; a transferência real do Monaco precisa ser medida no navegador, incluindo recursos externos eventualmente carregados pelo loader.
- O deploy usa GitHub Pages e os previews têm `PREVIEW_BASE`. O suporte estático já recebe esse prefixo e `noindex`; as novas páginas precisam manter essa proteção.
- Os documentos antigos de SEO descrevem um estado anterior às páginas estáticas de apoio. Servem como histórico, não como retrato completo da implementação atual.

### Referência: sorteio-volei

`scripts/build-multilang.js` executa Vite uma vez, reutiliza o HTML compilado e escreve variantes por idioma. O projeto mantém inglês na raiz, caminhos para os outros idiomas, canonical e hreflang, além de migração de `?lang=` em `src/utils/languageUrl.js`.

**Aproveitar:** um build compartilhado, HTML por idioma e idioma definido pela URL.

**Ajustar na adaptação:** a geração traduz principalmente o head, sem prerenderizar o conteúdo React; usa substituições por regex; mantém listas de idiomas em vários arquivos; registra falhas individuais sem necessariamente reprovar o build; e o sitemap usa a data de execução como modificação de todas as páginas. Aqui devemos validar os resultados, centralizar a configuração e entregar também conteúdo visível traduzido no HTML inicial.

## 2. Contrato de URLs

| Conteúdo | Inglês | Português | Espanhol | Chinês |
|---|---|---|---|---|
| Ferramenta | `/` | `/pt/` | `/es/` | `/zh/` |
| FAQ | `/en/faq/` | `/pt/faq/` | `/es/faq/` | `/zh/faq/` |
| Funcionamento | `/en/how-it-works/` | `/pt/how-it-works/` | `/es/how-it-works/` | `/zh/how-it-works/` |
| Privacidade | `/en/privacy/` | `/pt/privacy/` | `/es/privacy/` | `/zh/privacy/` |
| Contato | `/en/contact/` | `/pt/contact/` | `/es/contact/` | `/zh/contact/` |

Preservar inglês na raiz evita mover a URL principal existente. Preservar os caminhos de apoio evita uma segunda migração desnecessária. Total: **20 URLs canônicas**, sem contar aliases de compatibilidade.

- Usar barra final em links, canonical, hreflang e sitemap. Testar também o acesso sem barra no host real.
- `/en/` será apenas um alias para `/`, fora do sitemap e dos alternates. No Pages, gerar um HTML mínimo com canonical para `/`, link visível e redirecionamento no cliente; isso não equivale a HTTP 301.
- Manter códigos genéricos `en`, `pt`, `es`, `zh` nesta entrega. Não criar variantes regionais sem conteúdo específico e revisão da tradução correspondente.
- A raiz permanece em inglês mesmo com navegador/storage em português. Pode sugerir outro idioma com um link, sem redirecionar automaticamente.
- Caminhos inexistentes devem receber uma página 404 real, com links úteis; não servir indiscriminadamente a home como resposta a qualquer caminho.

## 3. HTML e sinais de SEO

Cada URL deve entregar diretamente, antes de executar JavaScript:

- `html lang` correto, título e descrição próprios do conteúdo e idioma.
- Um H1, apresentação traduzida, explicação curta e útil das funções e links para apoio e idiomas. O texto deve continuar visível na aplicação montada; não criar texto exclusivo para robôs.
- Canonical absoluto para a própria versão, sem `lang`, UTMs ou fragmentos. `/pt/` aponta para `/pt/`, nunca para `/`.
- Hreflang autorreferente e recíproco entre versões **do mesmo conteúdo**. FAQ aponta para as quatro FAQs, não para as homes. `x-default` aponta para a versão inglesa correspondente.
- Open Graph/Twitter coerentes com título, descrição e URL. Compartilhar a imagem atual nesta fase.
- JSON-LD da ferramenta com URL e `inLanguage` da versão atual; preservar os dados globais da marca. Nas páginas de apoio, usar somente schemas pertinentes e compatíveis com conteúdo visível, sem prometer rich results.
- Links HTML reais entre idiomas e páginas; o seletor não deve ser o único meio de descoberta.

Para reduzir o risco, manter `createRoot` nesta entrega. Gerar um shell público traduzido e estilizado dentro de `#root`, que será substituído pela aplicação. Compartilhar os textos e, quando viável, os componentes de apresentação entre gerador e React. Não importar a aplicação inteira, analytics ou Monaco no processo de geração estática. Reservar espaço de layout para evitar saltos visuais durante a montagem.

Isso é geração estática de conteúdo público, não hidratação completa do editor. Se futuramente houver adoção de `hydrateRoot`, será outro trabalho, com HTML e primeira renderização equivalentes e estado de storage restaurado depois.

O Google recomenda URLs distintas por idioma e conteúdo claramente localizado; hreflang relaciona as versões, sem garantir ranking. Ver [sites multilíngues](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) e [versões localizadas](https://developers.google.com/search/docs/specialty/international/localized-versions).

## 4. Build e organização

Criar uma configuração compartilhada, importável pelo Node e pelo cliente, com idiomas, idioma padrão, nomes, caminhos, tipos de página e funções de resolução de URLs. Separar `SITE_ORIGIN` de produção do prefixo de deploy `BASE_URL`/`PREVIEW_BASE`.

Pipeline proposto:

1. Verificação de tipos, preservando o `tsc` atual.
2. Um `vite build`, produzindo o conjunto compartilhado de assets.
3. Geração dos quatro HTMLs da ferramenta a partir do HTML já processado pelo Vite, preservando os caminhos e hashes dos assets. Usar template com marcadores explícitos ou transformação estruturada e validada, sem substituições silenciosas dependentes da formatação das tags.
4. Geração das páginas de apoio, aliases, sitemap e 404 a partir do mesmo registro de rotas. O plugin atual pode ser estendido, desde que não haja dois geradores concorrendo pelo mesmo arquivo.
5. Validação do artefato completo; falhar se faltar tradução, HTML, referência de asset ou metadado obrigatório.

Exemplo de saída:

```text
dist/index.html
dist/pt/index.html
dist/es/index.html
dist/zh/index.html
dist/en/index.html                 # alias
dist/{en,pt,es,zh}/faq/index.html   # e demais páginas de apoio
dist/assets/*                     # um conjunto compartilhado
dist/monacoeditorwork/*            # um conjunto compartilhado
dist/sitemap.xml
dist/robots.txt
dist/404.html
```

Não compilar a aplicação quatro vezes, copiar assets para cada subdiretório ou multiplicar entradas JS por idioma. Desenvolvimento, preview local e produção devem seguir a mesma resolução de caminhos, inclusive em `/preview/pr-123/`.

Gerar o sitemap em `dist`, listando apenas páginas canônicas de produção. Pode incluir os mesmos alternates, gerados da mesma configuração para evitar divergências. Omitir `lastmod` até haver data confiável de alteração relevante; não usar automaticamente a data de qualquer build. Ver [orientação para sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## 5. Roteamento e compatibilidade

- Substituir `HashRouter` por roteamento baseado em pathname na ferramenta, com `basename` derivado da base do deploy. Manter as páginas de apoio como documentos estáticos, acessados por links normais.
- A instância de `App` deve permanecer montada ao trocar o idioma da ferramenta: evitar `key={locale}` e árvores de rotas que desmontem o editor ao passar de `/` para `/pt/`. Atualizar URL, i18next e metadados sem recarregar o documento.
- Inicializar i18next com o idioma da URL antes de montar React, evitando flash de outro idioma e metadados divergentes. A preferência salva não pode sobrescrever um caminho explícito. Back/forward devem sincronizar idioma e head.
- Remover o caminho ativo de FAQ via React/hash depois de mapear os links antigos para a FAQ estática. Manter a fonte compartilhada de perguntas e traduções.
- Executar a normalização de links antigos antes da montagem e, quando possível, antes de inicializar analytics. Restringir a migração aos formatos reconhecidos; não interpretar qualquer âncora como rota.

| Entrada antiga | Destino |
|---|---|
| `/#/en` | `/` |
| `/#/pt` ou `/#/pt/` | `/pt/` |
| `/#/es/faq` | `/es/faq/` |
| `/?lang=zh` | `/zh/` |
| `/en/` | `/` |

Precedência: um pathname localizado válido prevalece; na raiz, reconhecer primeiro um hash de rota legado válido e depois `?lang=` válido; sem indicação explícita, usar inglês. Remover só o parâmetro/fragmento consumido e preservar parâmetros de campanha e âncoras normais quando aplicável. Não navegar para URLs arbitrárias recebidas por parâmetros.

Usar substituição de histórico para não criar um passo extra no botão Voltar. Os fragments não chegam ao servidor e GitHub Pages não fornece uma regra geral de 301 por query; essa compatibilidade será no cliente. A indexação nova deve depender dos documentos estáticos, links e sitemap, não desses redirects.

Preservar todas as chaves de storage, formatos, textos dos editores, resultado, tema e modo de comparação. Testar também storage bloqueado: a troca de idioma precisa conservar o estado em memória mesmo sem persistência.

## 6. Proteção do carregamento de assets

Os HTMLs extras aumentam o artefato publicado, mas não fazem o visitante baixar todas as versões. Todas as homes devem referenciar exatamente os mesmos URLs de JS/CSS/worker dentro de cada deploy, permitindo reaproveitar cache.

Medição indicativa do `dist` já existente, sem reconstrução e sem equivaler a uma captura de rede:

| Arquivo/grupo | Bytes gzip aproximados |
|---|---:|
| JS principal | 25.640 |
| React vendor | 97.873 |
| Outros vendor/runtime | 8.465 |
| CSS principal | 4.979 |
| DiffViewer separado | 973 |
| Worker JSON emitido | 186.895 |

Os quatro JSONs de tradução têm aproximadamente 2,4–2,8 KB gzip cada, medidos individualmente. Essa soma não é o custo exato dentro do bundle.

**Decisão inicial:** manter os quatro dicionários no bundle compartilhado. Para esse tamanho, elimina uma requisição adicional de idioma e reduz risco na inicialização. Separar por idioma fica para quando a medição ou o crescimento justificar; nesse caso, usar imports dinâmicos explícitos, cache e tratamento de erro, sem preload de todos os idiomas.

- Manter as páginas de apoio sem React, Monaco e bundle da ferramenta; não torná-las rotas pesadas de SPA.
- Preservar o lazy loading existente do DiffViewer. Não alterar a estratégia do Monaco na mesma entrega, salvo correção necessária de caminhos; medir loader, recursos externos e workers em acesso profundo.
- Não introduzir biblioteca de SEO no cliente se um helper pequeno compartilhado resolver o head.
- Não embutir o dicionário inteiro em cada HTML além do bundle; o HTML contém o texto público necessário.
- Não gerar imagens, fontes ou dependências diferentes por idioma nesta fase.
- Medir antes/depois no mesmo ambiente, com cache frio e quente. Separar tamanho emitido, bytes transferidos, requests e tempo até o editor utilizável.
- Orçamento proposto: nenhum novo JS de framework em runtime; aumento de JS+CSS inicial comprimido limitado a 5 KB por home frente ao baseline reconstruído; nenhuma transferência adicional de Monaco ao trocar idioma na mesma sessão; páginas de apoio sem novas dependências pesadas. Exceções exigem justificativa baseada na medição.
- A comparação de LCP, CLS e tempo até editor utilizável deve usar várias execuções mobile equivalentes. Regressões consistentes acima de 10% exigem investigação; esse limite é um critério do projeto, não um limiar oficial de SEO.

## 7. Etapas de implementação e aceite

1. **Baseline e contrato:** reconstruir o estado atual, registrar tamanhos e waterfall de rede, fechar o registro de URLs e escrever testes de resolução/normalização.
2. **Geração estática:** implementar configuração compartilhada, HTML traduzido, metadados, alternates e sitemap. Reaproveitar as páginas de apoio e seus conteúdos.
3. **Navegação:** mudar o roteamento da ferramenta, inicializar idioma pela URL, adaptar Header/LocaleLayout/footer, adicionar links rastreáveis e migrar hashes/queries. Validar preservação do estado dos editores.
4. **Preview e CI:** validar artefato e servir os documentos como arquivos estáticos, sem fallback de SPA que esconda arquivos ausentes. Repetir com base de preview.
5. **Publicação e acompanhamento:** publicar o conjunto completo, verificar respostas no host e acompanhar descoberta, indexação e tráfego por caminho/idioma.

Critérios para publicação:

- As 20 URLs canônicas retornam HTTP 200 com conteúdo no idioma esperado, sem depender de JavaScript para H1, descrição e links.
- Cada documento tem um canonical correto, alternates recíprocos e JSON-LD válido quando presente; o head continua coerente após montagem e troca de idioma.
- Refresh e acesso direto funcionam nos caminhos localizados; assets e workers não retornam 404; caminhos inventados retornam 404 no host.
- Todos os HTMLs de preview recebem `noindex`; links e assets respeitam o prefixo e não escapam para produção. Não publicar sitemap de preview como alternativa indexável.
- Links antigos, Voltar/Avançar, troca de idioma com storage bloqueado e troca entre idiomas sem perda de conteúdo funcionam.
- Comparação JSON/YAML/JSONL, modos de arrays, importação, formatação, resultados e tema passam pelos testes existentes e verificações de navegador pertinentes.
- `pnpm lint`, `pnpm test`, `pnpm build` e as novas verificações do HTML/rotas passam. Os testes existentes de apoio e localização devem ser adaptados ao contrato novo.
- O orçamento de assets e as verificações de desempenho são atendidos.

O Google recomenda prerenderização e tratamento correto de status, incluindo evitar soft 404 em aplicações JavaScript. Ver [JavaScript e SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## 8. Deploy, rollback e acompanhamento

O workflow atual usa `keep_files: true`: arquivos antigos podem sobreviver ao deploy. Ajustar a publicação para substituir o conjunto de produção de maneira controlada, preservando explicitamente a árvore de previews, `CNAME` e os arquivos necessários. Não remover previews indiscriminadamente ao limpar arquivos obsoletos.

Manter o artefato da versão anterior. Se houver regressão, republicá-lo; depois que as novas URLs estiverem públicas, preservar respostas úteis para elas também durante o rollback, evitando transformá-las em links quebrados. Testar esse procedimento no preview.

Depois da publicação: conferir `/`, `/pt/`, `/es/`, `/zh/`, uma página de cada tipo, sitemap, robots e recursos no host real. Enviar o sitemap ao Search Console quando houver acesso e inspecionar amostras por idioma, verificando canonical escolhido, HTML renderizado e descoberta. Monitorar 404, impressões, cliques e CTR por caminho e conversões da ferramenta. Não assumir que acessos antigos ao Search Console descritos nos documentos continuam válidos.

Garantir um page view por navegação efetiva da ferramenta, sem duplicar o automático do GA4; preservar o evento `language_change` e os eventos de comparação. Validar a configuração de medição antes de adicionar envio manual de page views. O monitoramento de SEO deve comparar períodos e consultas por idioma; não prometer ganho imediato ou posição fixa.

Revisar os resultados em aproximadamente 2, 4 e 8 semanas. A expansão para novos idiomas e páginas editoriais deve ser priorizada pela demanda observada e por traduções revisadas.
