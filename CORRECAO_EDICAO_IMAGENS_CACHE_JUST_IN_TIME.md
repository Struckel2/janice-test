# CORREÇÃO EDIÇÃO DE IMAGENS - CACHE JUST-IN-TIME

## INSTRUÇÕES DETALHADAS - CORREÇÃO EDIÇÃO DE IMAGENS

### FASE 1: Correção da Validação de Estilo Artístico (30 min)

**Problema:** Função `updateProcessButtonValidation()` no script.js exige instruções de texto mesmo com estilo artístico selecionado.

**Arquivo:** `../Janice-test/public/js/script.js`
**Localização:** Linha ~6506 - função `updateProcessButtonValidation()`

**Correções necessárias:**
1. Modificar lógica para aceitar apenas `hasArtisticStyle` como válido
2. Ajustar mensagens do botão para estilos artísticos
3. Separar validação de estilo artístico da validação de instruções de texto
4. Corrigir condicionais que estão impedindo estilos artísticos de funcionar

**Resultado esperado:** Usuário pode aplicar estilo artístico sem precisar escrever instruções adicionais.

---

### FASE 2: Implementação do Cache Just-in-Time (1h)

**Problema:** URLs do Replicate expiram causando erro 404 na edição.

**Arquivos a criar:**
1. `../Janice-test/server/middleware/imageCache.js` - Middleware de cache
2. `../Janice-test/server/services/cacheService.js` - Serviço de gerenciamento
3. `../Janice-test/server/config/cache.js` - Configurações

**Arquivos a modificar:**
1. `../Janice-test/server/routes/mockups.js` - Rota `/galeria/editar`
2. `../Janice-test/server/index.js` - Registrar middleware

**Funcionalidades:**
1. Verificação de validade de URL (HEAD request)
2. Download e cache local quando URL expirada
3. Retorno de URL válida (original ou cached)
4. Estrutura de diretórios para cache

**Resultado esperado:** Edição funciona mesmo com URLs expiradas.

---

### FASE 3: Sistema de Limpeza Automática (30 min)

**Problema:** Cache pode acumular arquivos antigos.

**Implementações:**
1. Limpeza automática de arquivos > 24h
2. Limite de tamanho máximo (100MB)
3. Índice de cache para controle
4. Cleanup job periódico

**Arquivos a modificar:**
1. `../Janice-test/server/services/cacheService.js` - Adicionar cleanup
2. `../Janice-test/server/index.js` - Iniciar cleanup job

**Resultado esperado:** Cache se mantém limpo automaticamente.

---

### VERIFICAÇÕES PÓS-IMPLEMENTAÇÃO:

**Após Fase 1:**
- [ ] Estilo artístico funciona sem instruções de texto
- [ ] Botão mostra mensagem correta para estilos
- [ ] Validação não bloqueia estilos artísticos

**Após Fase 2:**
- [ ] URLs expiradas são detectadas
- [ ] Cache local é criado automaticamente
- [ ] Edição funciona com URLs cached

**Após Fase 3:**
- [ ] Arquivos antigos são removidos
- [ ] Cache não excede limite de tamanho
- [ ] Sistema roda sem intervenção manual

---

## STATUS DA IMPLEMENTAÇÃO

- [ ] FASE 1: Correção da Validação de Estilo Artístico
- [ ] FASE 2: Implementação do Cache Just-in-Time  
- [ ] FASE 3: Sistema de Limpeza Automática
