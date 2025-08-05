# 🗄️ Configuração do MongoDB para o Projeto Janice

## 📋 **Problema Identificado**

O sistema de autenticação não está funcionando porque o MongoDB não está instalado no sistema. O servidor está tentando conectar ao MongoDB mas não consegue.

## 🔧 **Soluções Disponíveis**

### **Opção 1: MongoDB Local (Recomendado para desenvolvimento)**

#### **1.1 Instalar MongoDB Community Edition**

1. **Baixar MongoDB:**
   - Acesse: https://www.mongodb.com/try/download/community
   - Selecione: Windows x64
   - Baixe o arquivo `.msi`

2. **Instalar MongoDB:**
   - Execute o arquivo baixado
   - Siga o assistente de instalação
   - Marque "Install MongoDB as a Service"
   - Marque "Install MongoDB Compass" (interface gráfica)

3. **Verificar Instalação:**
   ```cmd
   mongod --version
   mongo --version
   ```

#### **1.2 Iniciar o Serviço MongoDB**

```cmd
# Iniciar serviço
net start MongoDB

# Verificar se está rodando
sc query MongoDB
```

#### **1.3 Testar Conexão**

```cmd
# Conectar ao MongoDB
mongo

# Dentro do mongo shell:
show dbs
use janice
show collections
exit
```

### **Opção 2: MongoDB Atlas (Cloud - Gratuito)**

#### **2.1 Criar Conta no MongoDB Atlas**

1. Acesse: https://www.mongodb.com/cloud/atlas
2. Crie uma conta gratuita
3. Crie um novo cluster (M0 - Free Tier)

#### **2.2 Configurar Acesso**

1. **Database Access:**
   - Crie um usuário de banco
   - Anote usuário e senha

2. **Network Access:**
   - Adicione seu IP atual
   - Ou adicione `0.0.0.0/0` (qualquer IP - apenas para desenvolvimento)

#### **2.3 Obter String de Conexão**

1. Clique em "Connect" no seu cluster
2. Escolha "Connect your application"
3. Copie a connection string
4. Substitua `<password>` pela senha do usuário

#### **2.4 Atualizar .env**

```env
# Substituir a linha atual:
MONGODB_URI=mongodb://localhost:27017/janice

# Por algo como:
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/janice?retryWrites=true&w=majority
```

### **Opção 3: Docker (Para usuários avançados)**

```cmd
# Instalar MongoDB via Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verificar se está rodando
docker ps
```

## 🚀 **Próximos Passos**

### **Após instalar o MongoDB:**

1. **Reiniciar o servidor:**
   ```cmd
   # Parar servidor atual (Ctrl+C no terminal)
   # Depois executar:
   node server/index.js
   ```

2. **Verificar logs:**
   - Deve aparecer: "MongoDB conectado com sucesso"

3. **Testar autenticação:**
   - Acessar: http://localhost:3000
   - Clicar em "Entrar com Google"
   - Deve redirecionar para o Google OAuth

## 🔍 **Verificação de Problemas**

### **Se ainda não funcionar após instalar MongoDB:**

1. **Verificar se o serviço está rodando:**
   ```cmd
   sc query MongoDB
   ```

2. **Verificar logs do servidor:**
   - Procurar por mensagens de erro do MongoDB

3. **Testar conexão manual:**
   ```cmd
   mongo mongodb://localhost:27017/janice
   ```

### **Configuração do Google OAuth**

Certifique-se de que no Google Cloud Console:

1. **APIs & Services > Credentials**
2. **OAuth 2.0 Client IDs**
3. **Authorized redirect URIs:**
   - `http://localhost:3000/auth/google/callback`

## 📝 **Status Atual**

✅ **Configurado:**
- Credenciais do Google OAuth
- Estrutura de autenticação
- Páginas de login e pendência
- Middleware de autenticação

❌ **Pendente:**
- Instalação do MongoDB
- Conexão com banco de dados

## 🎯 **Recomendação**

Para desenvolvimento local, recomendo a **Opção 1 (MongoDB Local)**:
- Mais rápido para desenvolvimento
- Não depende de internet
- Dados ficam localmente
- Fácil de gerenciar

Para produção ou se preferir não instalar localmente, use a **Opção 2 (MongoDB Atlas)**.
