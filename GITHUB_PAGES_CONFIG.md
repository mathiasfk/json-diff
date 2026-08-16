# Instruções: Configurar GitHub Pages para usar branch gh-pages

## Problema
O GitHub Pages está configurado com **Source = GitHub Actions**. Isso significa que o Pages só serve conteúdo deployado via `actions/deploy-pages`. O workflow de preview (`preview.yml`) usa `peaceiris/actions-gh-pages` que faz push para o branch `gh-pages` — mas o Pages não lê esse branch, então os previews são inacessíveis.

## Solução
Mudar a source do Pages para **branch `gh-pages`**. Isso permite que tanto o deploy de produção (`pages.yaml`) quanto o preview (`preview.yml`) funcionem no mesmo mecanismo.

## Passo a passo

### 1. No painel do GitHub

1. Acesse: **Settings → Pages**
2. Em **Source**, mude de "GitHub Actions" para **"Deploy from a branch"**
3. Selecione branch: **`gh-pages`**
4. Folderer: **/(root)**
5. Clique em **Save**

### 2. Verificar

Após salvar, o GitHub levará alguns segundos para reconfigurar. O site deve continuar acessível em:
```
https://smartjsondiff.com/
```

O preview passará a ficar disponível em:
```
https://smartjsondiff.com/preview/pr-<N>/
```

### 3. O que o PR já faz

O PR #4 já contém os workflows ajustados para esse modelo:

| Workflow | O que faz |
|---|---|
| `pages.yaml` | Deploy de produção → `gh-pages/` (raiz) |
| `preview.yml` | Deploy de preview → `gh-pages/preview/pr-<N>/` |
| `preview-cleanup.yml` | Remove preview ao fechar PR/deletar branch |

Todos usam `peaceiris/actions-gh-pages@v4` fazendo push para o branch `gh-pages`.

### 4. Verificar se está funcionando

1. Abra ou atualize um PR
2. Aguarde o workflow **Preview Deploy** rodar (Actions tab)
3. Verifique o comentário no PR com a URL do preview
4. Acesse a URL — deve carregar a versão preview da aplicação

### 5. Rollback (se necessário)

Se quiser voltar ao source = GitHub Actions:
1. Settings → Pages → Source → "GitHub Actions"
2. O `pages.yaml` precisa ser revertido para usar `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages`
3. Os workflows de preview precisariam de outra abordagem (não há suporte nativo para preview com source = Actions)

## Notas

- O branch `gh-pages` já existe no repositório
- O domínio `smartjsondiff.com` é um custom domain — a configuração do Pages não afeta isso
- Após a mudança, o primeiro deploy via `pages.yaml` pode levar ~1-2 minutos para propagar
