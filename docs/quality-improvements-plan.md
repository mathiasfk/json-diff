# Plano de melhoria de qualidade

## Objetivo
Preservar a ferramenta limpa e rápida; oferecer conteúdo original, acessível e rastreável em páginas de apoio. Não prometer aprovação ou receita do AdSense.

## 1. Conteúdo útil fora da área de trabalho
- Enriquecer o FAQ com exemplos comentados de propriedades reordenadas, arrays reordenados, duplicatas e alterações reais.
- Criar Como funciona: passos de uso, formatos suportados, cores, correspondência de itens e limites. Confirmar as afirmações no código, especialmente YAML/JSONL e comparação entre formatos.
- Explicar que a ordem é ignorada e que sequências, rankings e históricos podem precisar de outra forma de comparação.
- Evitar promessas absolutas sobre privacidade, segurança, precisão ou tamanho de arquivo.

## 2. Navegação e rastreamento
- Publicar páginas de apoio como HTML em URLs reais, compatíveis com GitHub Pages e o prefixo dos previews; não exigir execução de JavaScript para ler o conteúdo.
- Manter a aplicação e seus hashes existentes; preservar links antigos do FAQ quando possível.
- Ligar as páginas pelo rodapé, pela ajuda e entre si; preservar o idioma.
- Atualizar sitemap e metadados (título, descrição, idioma, canonical) para as páginas publicadas.
- Evitar duplicação de fontes do FAQ: geração estática deve reutilizar conteúdo compartilhado.

## 3. Confiança e transparência
- Criar privacidade e contato em páginas de apoio.
- Explicar processamento no navegador, persistência em localStorage, Analytics e serviços externos efetivamente presentes.
- Usar apenas contato já presente no repositório; não inventar identidade do mantenedor nem garantias legais.
- Oferecer rodapé discreto, sem cards ou textos longos na ferramenta.

## 4. Anúncios
- Remover carregamento global de AdSense, espaços vazios e scripts com IDs fictícios da ferramenta e das páginas de apoio nesta etapa.
- Preservar ads.txt e identificação da conta para futura integração manual.
- Não alterar configuração da conta AdSense nem publicar remotamente.

## 5. Aparência e acessibilidade
- Manter tema escuro e identidade visual existentes.
- Usar largura confortável para leitura, hierarquia clara, espaço moderado e exemplos de código que não provoquem overflow.
- Garantir foco visível, links distinguíveis, navegação de retorno e idioma coerentes.
- Manter os controles dos editores e o exemplo no lugar; acomodar rodapé sem sobreposição.
- Inspecionar versão desktop e mobile renderizadas, corrigindo cortes, desalinhamento e contraste insuficiente.

## 6. Validação e revisão
- Testar navegação, conteúdo/HTML gerado e integração com prefixo de preview, além dos testes existentes pertinentes.
- Executar testes, TypeScript, lint e build.
- Revisar manualmente diff e HTML entregue; abrir páginas renderizadas e testar retorno à ferramenta, FAQ, idiomas e exemplo.
- Iterar com o implementador até corrigir problemas concretos de funcionalidade e aparência.
- Entregar alterações locais na branch atual; commit e push apenas quando solicitados.

## Revisão inicial da interface
- Desktop 1280×720: preservar editores lado a lado e a alternativa de exemplo sob Comparar.
- Mobile 390×844: detectado overflow horizontal da barra de cinco ações (documento com 485 px de largura). Corrigir sem esconder controles ou deslocar o exemplo de sua associação com Comparar.
- A revisão final deve incluir screenshots e medição de overflow após a implementação.

## Resultado da implementação e revisão
- Implementado por subagente Terra/High, com duas rodadas de revisão do agente principal.
- Páginas estáticas de FAQ, Como funciona (com três exemplos comentados), Privacidade e Contato nos quatro idiomas. Links antigos do FAQ preservados; sitemap atualizado; previews recebem noindex.
- Removidos anúncios globais, espaços vazios e scripts de IDs fictícios; ads.txt preservado.
- Revisão visual do build: desktop 1280×720 e mobile 390×844. Ferramenta e ajuda sem overflow horizontal no celular (scrollWidth = innerWidth = 390). Barra de ações adaptada e exemplo centralizado sob Comparar.
- Testados no navegador: exemplo → comparação com alteração real de cargo, retorno aos editores, navegação da ajuda e troca de idioma da página de privacidade.
- Validação: 264 testes, lint, TypeScript e build de produção. Build de preview separado confirmou prefixo /preview/review/, noindex e ads.txt preservado.
- Alterações locais na branch existente; sem commit, push ou publicação.
- A validação de preview detectou um defeito anterior do plugin Monaco: seu caminho padrão de saída inclui indevidamente o prefixo da URL e trata mal outDir absoluto. A revisão solicitou configurar customDistPath para resolver o diretório de saída sem repetir o prefixo.
- Corrigido customDistPath do Monaco e confirmado o arquivo worker no build de preview com prefixo. Adicionadas definições de desenvolvimento @types/node para validar também tsconfig.node.json. Lint, TypeScript da aplicação/configuração e build de produção passaram na verificação final do agente principal.
