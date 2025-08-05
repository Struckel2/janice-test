# Janice - Ambiente de Teste 🧪

Este é o ambiente de **TESTE** da aplicação Janice. Use este ambiente para desenvolver e testar novas funcionalidades antes de fazer deploy em produção.

## ⚠️ IMPORTANTE - Configuração de Ambiente

### Diferenças entre Produção e Teste:

| Configuração | Produção | Teste |
|-------------|----------|-------|
| **Repositório** | `Janice` | `Janice-test` |
| **Database MongoDB** | `janice-prod` | `janice-test` |
| **Cloudinary Folder** | `janice-prod/` | `janice-test/` |
| **APP_ENV** | `production` | `test` |
| **LOG_LEVEL** | `info` | `debug` |
| **DEBUG_MODE** | `false` | `true` |

## 🚀 Configuração Rápida

### 1. Variáveis de Ambiente (.env)

Copie o `.env.example` para `.env` e configure:

```bash
# Database de TESTE
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/janice-test

# Cloudinary - Pasta de TESTE
CLOUDINARY_FOLDER=janice-test

# Ambiente de TESTE
APP_ENV=test
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true
```

### 2. Deploy no Railway

1. **Conecte este repositório** (`Janice-test`) ao Railway
2. **Configure as variáveis de ambiente** específicas de teste
3. **Teste as funcionalidades** antes de migrar para produção

## 🔄 Workflow de Desenvolvimento

1. **Desenvolver** no `Janice-test`
2. **Testar** no Railway de teste
3. **Validar** funcionalidades
4. **Migrar** código aprovado para `Janice` (produção)

## 📊 Monitoramento

- **Logs detalhados** habilitados (`LOG_LEVEL=debug`)
- **Debug mode** ativo para troubleshooting
- **Dados isolados** do ambiente de produção

## 🛡️ Segurança

- ✅ **Database separado** - sem risco para dados de produção
- ✅ **Assets separados** - Cloudinary em pasta isolada
- ✅ **Deploy independente** - falhas não afetam produção

---

**⚡ Lembre-se:** Este é um ambiente de TESTE. Dados podem ser perdidos ou resetados durante o desenvolvimento.
