# Configuração de Autenticação Google OAuth

Este documento explica como configurar a autenticação Google OAuth para o sistema Janice.

## 📋 Pré-requisitos

- Conta Google (Gmail)
- Acesso ao Google Cloud Console
- Projeto Janice já configurado

## 🔧 Configuração no Google Cloud Console

### 1. Criar/Acessar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o nome do projeto

### 2. Habilitar Google+ API

1. No menu lateral, vá em **APIs & Services** > **Library**
2. Procure por "Google+ API" ou "Google OAuth2 API"
3. Clique em **Enable**

### 3. Configurar OAuth Consent Screen

1. Vá em **APIs & Services** > **OAuth consent screen**
2. Escolha **External** (para uso geral) ou **Internal** (apenas para sua organização)
3. Preencha as informações obrigatórias:
   - **App name**: Janice
   - **User support email**: seu email
   - **Developer contact information**: seu email
4. Clique em **Save and Continue**
5. Em **Scopes**, adicione:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
6. Continue até finalizar

### 4. Criar Credenciais OAuth

1. Vá em **APIs & Services** > **Credentials**
2. Clique em **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Escolha **Web application**
4. Configure:
   - **Name**: Janice Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seudominio.com` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (desenvolvimento)
     - `https://seudominio.com/auth/google/callback` (produção)
5. Clique em **Create**
6. **IMPORTANTE**: Copie o **Client ID** e **Client Secret**

## ⚙️ Configuração no Projeto

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `.env` (crie baseado no `.env.example`):

```env
# Configurações de Autenticação Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# Configurações de Sessão (gere uma chave aleatória segura)
SESSION_SECRET=uma_chave_muito_secreta_e_aleatoria

# Email do administrador (será automaticamente definido como admin)
ADMIN_EMAIL=seu_email@gmail.com
```

### 2. Gerar SESSION_SECRET

Para gerar uma chave segura, você pode usar:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Ou online
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

## 🚀 Testando a Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
```

### 3. Testar Login

1. Acesse `http://localhost:3000`
2. Você deve ser redirecionado para `/login`
3. Clique em "Entrar com Google"
4. Complete o fluxo de autenticação
5. Se o email configurado em `ADMIN_EMAIL` for usado, você será automaticamente admin

## 🔐 Sistema de Permissões

### Tipos de Usuário

- **Admin**: Acesso total ao sistema
  - Definido automaticamente pelo email em `ADMIN_EMAIL`
  - Pode gerenciar todos os clientes e funcionalidades

- **Usuário**: Acesso padrão
  - Todos os outros usuários que fizerem login
  - Por padrão, ficam ativos automaticamente (pode ser alterado no código)

### Fluxo de Autenticação

1. **Login**: Usuário clica em "Entrar com Google"
2. **Redirecionamento**: Sistema redireciona para Google OAuth
3. **Autorização**: Usuário autoriza o acesso
4. **Callback**: Google retorna para `/auth/google/callback`
5. **Verificação**: Sistema verifica se usuário existe ou cria novo
6. **Ativação**: 
   - Se email = `ADMIN_EMAIL`: vira admin e fica ativo
   - Senão: vira usuário comum e fica ativo (configuração atual)
7. **Redirecionamento**: 
   - Se ativo: vai para aplicação principal (`/`)
   - Se inativo: vai para página de pendência (`/auth/pending`)

## 🛠️ Personalização

### Alterar Comportamento de Ativação

Para que novos usuários precisem de aprovação manual, edite `server/models/Usuario.js`:

```javascript
// Linha atual (todos ficam ativos):
if (this.isNew) {
  this.ativo = true;
}

// Alterar para (apenas admin fica ativo automaticamente):
if (this.isNew && this.email !== process.env.ADMIN_EMAIL) {
  this.ativo = false; // Precisará de aprovação
}
```

### Adicionar Mais Administradores

Você pode modificar a lógica em `server/models/Usuario.js` para aceitar múltiplos emails de admin:

```javascript
// Lista de emails de admin
const adminEmails = [
  process.env.ADMIN_EMAIL,
  'outro_admin@empresa.com',
  'admin2@empresa.com'
];

// Verificar se é admin
if (adminEmails.includes(this.email)) {
  this.role = 'admin';
  this.ativo = true;
}
```

## 🚨 Segurança

### Boas Práticas

1. **SESSION_SECRET**: Use uma chave longa e aleatória
2. **HTTPS**: Em produção, sempre use HTTPS
3. **Domínios**: Configure apenas os domínios necessários no Google Console
4. **Logs**: Monitore logs de autenticação
5. **Backup**: Mantenha backup das credenciais em local seguro

### Variáveis Sensíveis

**NUNCA** commite no Git:
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- Arquivo `.env`

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"

- Verifique se a URL de callback está correta no Google Console
- Certifique-se de que a URL inclui o protocolo (`http://` ou `https://`)

### Erro: "invalid_client"

- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
- Confirme se as credenciais são do tipo "Web application"

### Usuário não consegue acessar

- Verifique se o usuário está ativo no banco de dados
- Confirme se o email está correto
- Verifique logs do servidor para erros

### Sessão expira rapidamente

- Verifique se `SESSION_SECRET` está configurado
- Confirme se o MongoDB está funcionando (sessões são armazenadas lá)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Confirme todas as variáveis de ambiente
3. Teste com um usuário diferente
4. Verifique se todas as dependências estão instaladas

---

**Importante**: Mantenha suas credenciais seguras e nunca as compartilhe publicamente!
