# Correção do Problema com PDFs de Planos de Ação

## Problema Identificado

Os PDFs dos planos de ação não estavam sendo exibidos corretamente quando o usuário clicava no botão "Abrir PDF". O sistema retornava o erro:

```json
{"error":"Erro ao carregar PDF do servidor de arquivos"}
```

Enquanto o mesmo botão funcionava corretamente para as análises de mercado.

## Causa Raiz

Após análise detalhada do código, identificamos as seguintes causas:

1. **Pasta incorreta no Cloudinary**: Os PDFs dos planos de ação estavam sendo armazenados na pasta `janice/analises` (mesma pasta das análises de mercado), em vez de terem uma pasta específica.

2. **Extração de public_id inadequada**: A função `getPublicIdFromUrl` não estava tratando corretamente as URLs dos PDFs armazenados como arquivos `raw` no Cloudinary.

3. **Logs insuficientes**: Não havia logs detalhados para diagnosticar o problema quando ocorria.

## Soluções Implementadas

### 1. Alteração da Pasta de Armazenamento

Modificamos o serviço `planoAcaoService.js` para armazenar os PDFs dos planos de ação em uma pasta específica:

```javascript
// Antes
folder: 'janice/analises'

// Depois
folder: 'janice/planos-acao'
```

### 2. Melhoria na Extração de public_id

Aprimoramos a função `getPublicIdFromUrl` no arquivo `cloudinary.js` para lidar corretamente com diferentes formatos de URL:

```javascript
// Regex melhorada para capturar tanto arquivos raw quanto imagens
const regex = /\/v\d+\/(.+?)(?:\.\w+)?$/;
// Regex alternativa para URLs sem versão
const altRegex = /\/upload\/(.+?)(?:\.\w+)?$/;
```

### 3. Adição de Logs Detalhados

Adicionamos logs detalhados em pontos críticos para facilitar o diagnóstico:

- Na rota `/api/planos-acao/pdf/:id`
- Na função `uploadPDF` do Cloudinary
- No serviço de geração de planos de ação

### 4. Endpoint de Teste

Criamos um endpoint de teste para verificar a acessibilidade dos PDFs:

```
GET /api/planos-acao/teste-pdf/:id
```

Este endpoint verifica se o PDF de um plano de ação é acessível e retorna informações detalhadas sobre a URL.

### 5. Script de Migração

Desenvolvemos um script para migrar os PDFs existentes da pasta antiga para a nova:

```
scripts/migrate-planos-acao-pdfs.js
```

Este script:
- Identifica planos de ação com PDFs na pasta antiga
- Move os arquivos para a pasta correta no Cloudinary
- Atualiza as URLs no banco de dados

## Como Executar a Migração

Para migrar os PDFs existentes, execute:

```bash
node scripts/migrate-planos-acao-pdfs.js
```

## Verificação da Correção

Após implementar as correções, você pode verificar se um PDF específico está acessível usando:

```
GET /api/planos-acao/teste-pdf/:id
```

Substitua `:id` pelo ID do plano de ação que deseja verificar.

## Impacto da Correção

1. **Planos de ação novos**: Serão salvos automaticamente na pasta correta e funcionarão sem problemas.
2. **Planos de ação existentes**: Precisam ser migrados usando o script fornecido.

## Considerações Futuras

1. **Monitoramento**: Adicionar alertas para falhas no acesso a PDFs.
2. **Validação**: Implementar verificação automática da acessibilidade dos PDFs após o upload.
3. **Padronização**: Considerar uma estrutura de pastas mais organizada no Cloudinary para diferentes tipos de documentos.
