# Análise de Internacionalização com Detecção Automática e Override Opcional

## Objetivo
Implementar suporte a múltiplos idiomas no Smart JSON Diff, permitindo:
- Detecção automática do idioma baseado nas preferências do navegador (Accept-Language) ou geolocalização IP.
- Override opcional pelo usuário via seletor de idioma na UI.
- Persistência da escolha do usuário (localStorage ou cookie).
- Cobertura de UI, FAQ e SEO para garantir experiência e indexação adequadas.

---

## 1. UI (Interface do Usuário)

### 1.1 Seletor de Idioma
- Adicionar um dropdown ou botão de idioma no canto superior direito da barra de navegação.
- Exibir códigos de idioma (pt-BR, en, es) ou nomes completos (Português, English, Español).
- Ao clicar, atualizar o idioma imediatamente sem recarregar a página (via React state + Context ou store como Redux/Zustand).
- Salvar a escolha em `localStorage` (ou cookie) para manter em visitas futuras.
- Se nenhum override estiver definido, usar o idioma detectado automaticamente na primeira carga.

### 1.2 Detecção Automática
- Na inicialização do app (useEffect no componente raiz), ler:
  - `localStorage.getItem('i18n_locale')` → se existir, usar esse.
  - Caso contrário, analisar `navigator.language` ou `navigator.languages` (primeiro valor).
  - Fallback para `en` se nenhum idioma suportado for detectado.
- Mapear códigos de idioma para os suportados (ex.: `pt-BR`, `pt`, `en-US`, `en`, `es-ES`, `es`).

### 1.3 Estrutura de Traduções
- Usar arquivos JSON por locale em `/src/locales/`:
  ```
  /locales
    ├── pt-BR.json
    ├── en.json
    └── es.json
  ```
- Cada arquivo contém chaves hierárquicas (ex.: `header.title`, `faq.question1`).
- Utilizar uma biblioteca leve como `i18next` ou `react-i18next` ou um custom hook simples.

### 1.4 Componentes a Traduzir
- Barra de navegação (Home, Sobre, FAQ, etc.)
- Rótulos dos inputs (JSON A, JSON B)
- Botões (Compare, Clear, Export)
- Mensagens de erro/sucesso (ex.: "JSON inválido", "Comparação concluída")
- Rodapé (créditos, links)
- Tooltips e placeholders
- Modal de ajuda/sobre

### 1.5 Override Manual
- O seletor de idioma permite ao usuário forçar um idioma, sobrescrevendo a detecção automática.
- Ao mudar o idioma via seletor, atualizar o estado global e recarregar as traduções.
- A escolha tem prioridade sobre a detecção automática enquanto o override estiver ativo (salvo em storage).
- Opcional: oferecer um botão "Usar idioma do navegador" para limpar o override e voltar à detecção automática.

---

## 2. FAQ (Perguntas Frequentes)

### 2.1 Estrutura Multilíngue
- Criar uma página FAQ separada por idioma (ex.: `/faq/pt-BR`, `/faq/en`, `/faq/es`) ou usar anchors com locale em estado.
- Como o app é um SPA com HashRouter, podemos usar `#/faq?lang=pt-BR` ou manter o estado de idioma global e renderizar o FAQ nesse idioma.
- Alternativa: criar rotas estáticas via pré-renderização (ver SEO abaixo).

### 2.2 Conteúdo a Traduzir
- Perguntas comuns:
  - "Como comparar dois arquivos JSON?"
  - "O que significa a cor vermelha/verde na diff?"
  - "Posso comparar mais de dois JSONs?"
  - "A ferramenta salva meus dados?"
  - "É possível ignorar diferenças de espaçamento?"
  - "Como exportar o resultado?"
- Respostas claras, com exemplos e links para seções relevantes do app.

### 2.3 Implementação
- Componente `FAQ` que recebe as traduções via props (usando o mesmo contexto de i18n).
- Manter uma única fonte de dados (array de objetos com `question` e `answer`) por idioma.
- Permitir navegação suave entre perguntas (accordion ou lista com anchors).

---

## 3. SEO (Search Engine Optimization)

### 3.1 Desafio do HashRouter
- O Smart JSON Diff usa `HashRouter` do React Router, onde as rotas são fragmentos de URL (ex.: `#/faq`).
- Mecanismos de busca tradicionalmente não indexam conteúdo após `#` (hash) como páginas separadas.
- Para melhorar SEO, considerar:
  - Migração para `BrowserRouter` com suporte do servidor (GitHub Pages pode servir `index.html` para qualquer rota via 404 override).
  - Ou usar pré-renderização estática para cada idioma e rota (ex.: usando `react-snap` ou `next-static` export).

### 3.2 Estratégia de URLs Amigáveis
- Se mantivermos HashRouter, usar parâmetros de query para indicar idioma e página:
  - Ex.: `index.html#/?lang=pt-BR&page=faq`
  - Porém, ainda não é ideal para crawlers.
- Melhor abordagem: gerar versões estáticas do site para cada idioma suportado durante o build:
  ```
  /build/
    ├── pt-BR/
    │   ├── index.html
    │   └── faq.html
    ├── en/
    │   ├── index.html
    │   └── faq.html
    └── es/
        ├── index.html
        └── faq.html
  ```
- GitHub Pages pode servir um site assim se configurarmos um `CNAME` ou usando subpastas (ex.: `smartjsondiff.com/pt-BR/`).

### 3.3 Meta Tags Dinâmicos
- Atualizar dinamicamente as tags `<title>`, `<meta name="description">` e `<meta property="og:*">` com base no idioma e página atual.
- Usar react-helmet ou equivalente para injectar esses tags no `<head>`.

### 3.4 Sitemap e Robots
- Gerar um `sitemap.xml` listando todas as combinações de idioma e rota (ex.: `/pt-BR/`, `/pt-BR/faq`, `/en/`, `/en/faq`, etc.).
- Incluir no build e colocar na raiz do site publicado.
- Garantir que o `robots.txt` permita o rastreamento dessas páginas.

### 3.5 Evitar Conteúdo Duplicado
- Usar tag `<link rel="canonical" href="...">` apontando para a versão preferida (ex.: versão em inglês como canonical, ou usar hreflang).
- Implementar tags `hreflang` para indicar relações entre versões de idiomas:
  ```html
  <link rel="alternate" hreflang="pt-BR" href="https://smartjsondiff.com/pt-BR/" />
  <link rel="alternate" hreflang="en" href="https://smartjsondiff.com/en/" />
  <link rel="alternate" hreflang="es" href="https://smartjsondiff.com/es/" />
  ```

### 3.6 Performance e Cache
- Garantir que os arquivos de tradução sejam pequenos e carregados de forma assíncrona se necessário.
- Usar code splitting para carregar apenas o idioma necessário (dynamic import() dos arquivos de locale).
- Definir cabeçalhos de cache adequados (JSON de traduções pode ser cached por longo tempo, já que mudam raramente).

---

## 4. Implementação Passo a Passo (Resumo)

1. **Adicionar dependência** de i18n (ex.: `i18next`, `react-i18next` ou custom).
2. **Criar estrutura de pastas** `/src/locales/` com arquivos JSON por idioma.
3. **Extrair textos estáticos** dos componentes para chaves de tradução.
4. **Criar contexto/i18n provider** que gerencia detecção automática, override e estado de idioma.
5. **Adicionar seletor de idioma** na UI (header).
6. **Atualizar FAQ** para usar traduções e permitir troca de idioma.
7. **(Opcional) Gerar build estático por idioma** para melhorar SEO.
8. **Adicionar meta tags dinâmicas** (title, description, og:tags).
9. **Gerar sitemap.xml** e hreflang tags no build.
10. **Testar** detecção automática, override, persistência e troca de idioma sem perda de estado.
11. **Validar** com ferramentas de SEO (Lighthouse, Google Search Console) após deploy.

---

## 5. Considerações Finais

- Manter as traduções simples e atualizáveis; sempre que houver novo texto no UI, adicionar aos arquivos de locale.
- Considerar contribuição da comunidade para traduções (arquivos JSON são fácéis de editar via PR).
- Monitorar uso de idiomas via analytics (ex.: Google Analytics com eventos de mudança de idioma) para priorizar melhorias.
- Garantir que a detecção automática respeite a privacidade (não enviar dados de localização desnecessariamente; apenas usar `navigator.language`).
- Avaliar o impacto no tamanho do bundle; arquivos de JSON de traduções são tipicamente poucos KB.

Este plano cobre UI, FAQ e SEO, fornecendo uma base sólida para uma experiência internacionalizada amigável e bem indexada.