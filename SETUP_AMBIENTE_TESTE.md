# 🧪 Setup do Ambiente de Teste - Janice

## 📋 Checklist de Configuração

### 1. ✅ CONCLUÍDO - Preparação Local
- [x] Código clonado e modificado para ambiente de teste
- [x] `.env.example` atualizado com configurações de teste
- [x] `package.json` modificado para refletir ambiente de teste
- [x] `README-TEST.md` criado com instruções
- [x] Commit realizado com as mudanças

### 2. 🔄 PRÓXIMOS PASSOS - GitHub

#### Criar Repositório no GitHub:
1. **Acesse:** https://github.com/new
2. **Nome:** `Janice-test`
3. **Descrição:** `Ambiente de teste para Janice - Análise de CNPJ`
4. **Visibilidade:** Private (recomendado)
5. **NÃO** inicialize com README (já temos)

#### Conectar Repositório Local:
```bash
# No diretório Janice-test
git remote add origin https://github.com/Struckel2/Janice-test.git
git branch -M main
git push -u origin main
```

### 3. 🚀 PRÓXIMOS PASSOS - Railway

#### Criar Novo Projeto:
1. **Acesse:** https://railway.app/dashboard
2. **New Project** → **Deploy from GitHub repo**
3. **Selecione:** `Janice-test`
4. **Configure as variáveis de ambiente:**

#### Variáveis de Ambiente Railway:
```env
# Database de TESTE
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/janice-test

# Cloudinary - Pasta de TESTE
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
CLOUDINARY_FOLDER=janice-test

# APIs (mesmas da produção)
REPLICATE_API_TOKEN=seu_token_replicate
OPENROUTER_API_KEY=sua_chave_openrouter
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_CLAUDE_MODEL=anthropic/claude-sonnet-4
OPENROUTER_CLAUDE_37_MODEL=anthropic/claude-3.7-sonnet
OPENROUTER_PERPLEXITY_MODEL=perplexity/sonar-deep-research
OPENROUTER_PERPLEXITY_BASIC_MODEL=perplexity/sonar-pro

# Autenticação Google (pode usar as mesmas)
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# Configurações de Teste
APP_ENV=test
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true
VERBOSE_LOGGING=true
SESSION_SECRET=seu_session_secret_teste
ADMIN_EMAIL=admin@yourcompany.com
PORT=3000
```

### 4. 🗄️ MongoDB - Configuração

#### No MongoDB Atlas:
1. **Acesse seu cluster**
2. **Browse Collections**
3. **Create Database:** `janice-test`
4. **Primeira Collection:** `usuarios` (será criada automaticamente)

### 5. ☁️ Cloudinary - Configuração

#### Organização de Pastas:
- **Produção:** `janice-prod/`
  - `janice-prod/logos/`
  - `janice-prod/pdfs/`
  - `janice-prod/uploads/`

- **Teste:** `janice-test/`
  - `janice-test/logos/`
  - `janice-test/pdfs/`
  - `janice-test/uploads/`

### 6. ✅ Verificação Final

#### Após Deploy:
1. **Acesse a URL do Railway de teste**
2. **Faça login com Google**
3. **Teste criação de cliente**
4. **Teste análise de CNPJ**
5. **Verifique logs no Railway**
6. **Confirme separação de dados:**
   - MongoDB: database `janice-test`
   - Cloudinary: pasta `janice-test/`

## 🔄 Workflow de Desenvolvimento

### Para Novas Funcionalidades:
1. **Desenvolver** no repositório `Janice-test`
2. **Testar** no Railway de teste
3. **Validar** funcionalidades
4. **Migrar** código aprovado para `Janice` (produção)

### Comandos Úteis:
```bash
# Desenvolvimento local
npm run dev

# Ver logs detalhados
npm run test

# Deploy manual (se necessário)
git push origin main
```

## 🚨 Importante

- ⚠️ **NUNCA** misture dados de teste com produção
- ⚠️ **SEMPRE** use `CLOUDINARY_FOLDER=janice-test`
- ⚠️ **SEMPRE** use database `janice-test`
- ⚠️ **VERIFIQUE** as variáveis antes do deploy

---

**Status Atual:** ✅ Código preparado | 🔄 Aguardando criação do repositório GitHub
