# Preparação para Deploy no Railway

Este documento contém instruções para preparar a aplicação Janice para deploy no Railway.

## Adaptações Realizadas

### 1. Integração com Cloudinary para Armazenamento de Imagens

O Railway tem um sistema de arquivos efêmero, o que significa que qualquer arquivo salvo no sistema de arquivos será perdido quando a aplicação for reiniciada ou uma nova versão for implantada. Para resolver isso, implementamos uma integração com o Cloudinary para armazenamento de imagens (logos de clientes).

**Mudanças realizadas:**

- Criação do arquivo `server/config/cloudinary.js` para configuração e funções utilitárias do Cloudinary
- Modificação do arquivo `server/routes/clientes.js` para usar o Cloudinary em vez do armazenamento local
- Criação de um script de migração (`scripts/migrate-logos.js`) para transferir imagens existentes para o Cloudinary

### 2. Configuração de Variáveis de Ambiente

Para que a aplicação funcione corretamente no Railway, todas as variáveis de ambiente necessárias foram adicionadas ao arquivo `.env` local.

## Preparação para Deploy

### 1. Migrar Logos Existentes para o Cloudinary

Se você já tem clientes com logos armazenados localmente, execute o script de migração:

```bash
node scripts/migrate-logos.js
```

Este script irá:
- Buscar todos os clientes com logos armazenados em `/uploads/logos/`
- Fazer upload de cada logo para o Cloudinary
- Atualizar o banco de dados com as novas URLs do Cloudinary

### 2. Testar a Aplicação Localmente

Certifique-se de que a aplicação está funcionando corretamente com as novas configurações do Cloudinary:

```bash
npm run dev
```

### 3. Preparar para Deploy no Railway

1. **Commit das alterações no Git**:
   ```bash
   git add .
   git commit -m "Integração com Cloudinary para armazenamento de imagens"
   git push
   ```

2. **Configurar o Projeto no Railway**:
   - Conecte o repositório Git ao Railway
   - Configure as variáveis de ambiente necessárias no dashboard do Railway:

     ```
     PORT=3000
     MONGODB_URI=mongodb+srv://...
     OPENROUTER_API_KEY=...
     OPENROUTER_API_URL=...
     OPENROUTER_CLAUDE_MODEL=...
     OPENROUTER_PERPLEXITY_MODEL=...
     OPENROUTER_PERPLEXITY_BASIC_MODEL=...
     GEMINI_API_KEY=...
     GEMINI_API_URL=...
     PDF_EXPIRY_DAYS=30
     CLOUDINARY_CLOUD_NAME=du9a3e1nj
     CLOUDINARY_API_KEY=357374562979762
     CLOUDINARY_API_SECRET=U2CGTMgWo5u_Gk5lI6vWsgCsTSI
     ```

3. **Deploy**:
   - O Railway detectará o arquivo `package.json` e usará o comando `npm start` para iniciar a aplicação
   - Monitore os logs para garantir que a aplicação está sendo iniciada corretamente

## Verificação Pós-Deploy

Após o deploy, verifique se:

1. A aplicação está online e acessível
2. O upload de logos de clientes está funcionando corretamente
3. As logos existentes estão sendo exibidas corretamente

## Solução de Problemas

Se encontrar problemas com o Cloudinary após o deploy:

1. Verifique se todas as variáveis de ambiente do Cloudinary estão configuradas corretamente no Railway
2. Confira os logs da aplicação para mensagens de erro específicas
3. Certifique-se de que os limites de armazenamento gratuito do Cloudinary não foram excedidos
