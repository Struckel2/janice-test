// Configurar fetch polyfill ANTES de qualquer outra importação
require('./config/fetch-polyfill');

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Carrega variáveis de ambiente (somente em ambiente de desenvolvimento)
// Em produção como Railway, as variáveis já são injetadas no ambiente
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Log das variáveis de ambiente importantes (sem exibir os valores secretos)
console.log('Verificação de variáveis de ambiente:');
console.log('MONGODB_URI configurado:', process.env.MONGODB_URI ? 'Sim' : 'Não');
console.log('CLOUDINARY_CLOUD_NAME configurado:', process.env.CLOUDINARY_CLOUD_NAME ? 'Sim' : 'Não');
console.log('CLOUDINARY_API_KEY configurado:', process.env.CLOUDINARY_API_KEY ? 'Sim' : 'Não');
console.log('CLOUDINARY_API_SECRET configurado:', process.env.CLOUDINARY_API_SECRET ? 'Sim' : 'Não');
console.log('GOOGLE_CLIENT_ID configurado:', process.env.GOOGLE_CLIENT_ID ? 'Sim' : 'Não');
console.log('GOOGLE_CLIENT_SECRET configurado:', process.env.GOOGLE_CLIENT_SECRET ? 'Sim' : 'Não');
console.log('SESSION_SECRET configurado:', process.env.SESSION_SECRET ? 'Sim' : 'Não');
console.log('ADMIN_EMAIL configurado:', process.env.ADMIN_EMAIL ? 'Sim' : 'Não');

// Conexão com o banco de dados
const connectDB = require('./config/database');

// Importa configuração do Passport
const passport = require('./config/passport');

// Importa middleware de autenticação
const { requireAuth, addUserInfo } = require('./middleware/auth');

// Importa rotas
const apiRoutes = require('./routes/api');
const clientesRoutes = require('./routes/clientes');
const analisesRoutes = require('./routes/analises');
const transcricoesRoutes = require('./routes/transcricoes');
const planosAcaoRoutes = require('./routes/planosAcao');
const authRoutes = require('./routes/auth');
const mockupRoutes = require('./routes/mockups');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(morgan('dev')); // Logging HTTP requests

// Configuração de sessões
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: false, // Temporariamente desabilitar HTTPS obrigatório
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    sameSite: 'lax' // Melhor compatibilidade com OAuth
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware para adicionar informações do usuário
app.use(addUserInfo);

// Middleware de debug global para rastrear todas as requisições
app.use((req, res, next) => {
  console.log(`🔍 [DEBUG-REQUEST] ${req.method} ${req.path} - Auth: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'} - User: ${req.user ? req.user.email : 'None'}`);
  console.log(`🔍 [DEBUG-HEADERS] Accept: ${req.headers.accept} - Content-Type: ${req.headers['content-type']}`);
  next();
});

// Conectar ao MongoDB
connectDB()
  .then(() => console.log('MongoDB conectado com sucesso'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas de autenticação (não protegidas)
app.use('/auth', authRoutes);

// Rota para página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Rota para página de pendência
app.get('/pending', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pending.html'));
});

// Rotas específicas da API (devem vir antes da rota geral /api)
console.log('📋 [ROUTE-REGISTER] Registrando /api/clientes (com auth para sub-rotas)');

// Middleware para verificar se a requisição é AJAX
const isAjaxRequest = (req, res, next) => {
  req.isAjaxRequest = 
    req.xhr || 
    (req.headers.accept && req.headers.accept.indexOf('json') > -1) ||
    req.headers['x-requested-with'] === 'XMLHttpRequest';
  
  console.log(`🔍 [AJAX-CHECK] Requisição para ${req.path} é AJAX: ${req.isAjaxRequest}`);
  next();
};

// Middleware para extrair o ID do cliente
const extractClientId = (req, res, next) => {
  const clientId = req.params.clientId;
  console.log(`🔍 [CLIENT-ID] Extraído ID do cliente: ${clientId}`);
  req.clientId = clientId;
  next();
};

// Aplicar middleware global para verificar se é AJAX
app.use(isAjaxRequest);

// Rota base de clientes sem autenticação para listar/buscar
app.use('/api/clientes', clientesRoutes);

// Middleware para sub-rotas de clientes
app.use('/api/clientes/:clientId', extractClientId, requireAuth);

// Sub-rotas específicas de clientes com autenticação
app.get('/api/clientes/:clientId/analises', (req, res) => {
  console.log(`📋 [ROUTE] GET /api/clientes/${req.params.clientId}/analises`);
  // Redirecionar para a rota de análises com o ID do cliente
  req.url = `/cliente/${req.params.clientId}`;
  analisesRoutes(req, res);
});

app.get('/api/clientes/:clientId/transcricoes', (req, res) => {
  console.log(`📋 [ROUTE] GET /api/clientes/${req.params.clientId}/transcricoes`);
  // Redirecionar para a rota de transcrições com o ID do cliente
  req.url = `/cliente/${req.params.clientId}`;
  transcricoesRoutes(req, res);
});

app.get('/api/clientes/:clientId/planos-acao', (req, res) => {
  console.log(`📋 [ROUTE] GET /api/clientes/${req.params.clientId}/planos-acao`);
  // Redirecionar para a rota de planos de ação com o ID do cliente
  req.url = `/cliente/${req.params.clientId}`;
  planosAcaoRoutes(req, res);
});

app.get('/api/clientes/:clientId/mockups', (req, res) => {
  console.log(`📋 [ROUTE] GET /api/clientes/${req.params.clientId}/mockups`);
  // Redirecionar para a rota de mockups com o ID do cliente
  req.url = `/cliente/${req.params.clientId}`;
  mockupRoutes(req, res);
});

// Rotas principais da API
console.log('📋 [ROUTE-REGISTER] Registrando /api/analises (com auth)');
app.use('/api/analises', requireAuth, analisesRoutes);

console.log('📋 [ROUTE-REGISTER] Registrando /api/transcricoes (com auth)');
app.use('/api/transcricoes', requireAuth, transcricoesRoutes);

console.log('📋 [ROUTE-REGISTER] Registrando /api/planos-acao (com auth)');
app.use('/api/planos-acao', requireAuth, planosAcaoRoutes);

console.log('📋 [ROUTE-REGISTER] Registrando /api/processos (com auth)');
app.use('/api/processos', requireAuth, require('./routes/processos'));

console.log('📋 [ROUTE-REGISTER] Registrando /api/mockups (com auth)');
app.use('/api/mockups', requireAuth, mockupRoutes);

console.log('📋 [ROUTE-REGISTER] Registrando /api/artistic-style (com auth)');
app.use('/api/artistic-style', requireAuth, require('./routes/artisticStyle'));

// Rota geral da API (deve vir por último)
console.log('📋 [ROUTE-REGISTER] Registrando /api (geral - por último)');
app.use('/api', apiRoutes);

// Servir arquivos estáticos (DEPOIS das rotas da API, mas ANTES das rotas protegidas)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota para a página principal (protegida)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Middleware para capturar erros do Multer e outros erros específicos
app.use((error, req, res, next) => {
  console.error('🚨 [ERROR-HANDLER] Erro capturado:', error);
  
  // Erros específicos do Multer
  if (error.code === 'LIMIT_FILE_SIZE') {
    console.error('❌ [MULTER-ERROR] Arquivo muito grande');
    return res.status(400).json({ 
      erro: 'Arquivo muito grande. Tamanho máximo permitido: 500MB' 
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    console.error('❌ [MULTER-ERROR] Muitos arquivos');
    return res.status(400).json({ 
      erro: 'Muitos arquivos enviados. Envie apenas um arquivo por vez.' 
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    console.error('❌ [MULTER-ERROR] Campo de arquivo inesperado');
    return res.status(400).json({ 
      erro: 'Campo de arquivo inesperado. Verifique o formulário.' 
    });
  }
  
  // Erro de tipo de arquivo não suportado (do fileFilter)
  if (error.message && error.message.includes('Tipo de arquivo não suportado')) {
    console.error('❌ [MULTER-ERROR] Tipo de arquivo não suportado');
    return res.status(400).json({ 
      erro: 'Tipo de arquivo não suportado. Envie apenas arquivos de áudio ou vídeo.' 
    });
  }
  
  // Erros de parsing JSON
  if (error.type === 'entity.parse.failed') {
    console.error('❌ [JSON-ERROR] Erro ao fazer parse do JSON');
    return res.status(400).json({ 
      erro: 'Dados inválidos enviados. Verifique o formato dos dados.' 
    });
  }
  
  // Erros de payload muito grande
  if (error.type === 'entity.too.large') {
    console.error('❌ [PAYLOAD-ERROR] Payload muito grande');
    return res.status(413).json({ 
      erro: 'Dados enviados são muito grandes. Reduza o tamanho do arquivo.' 
    });
  }
  
  // Erro genérico
  console.error('❌ [GENERIC-ERROR] Erro não tratado:', error.message);
  res.status(500).json({ 
    erro: 'Erro interno do servidor. Tente novamente em alguns instantes.',
    detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Middleware para capturar rotas não encontradas
app.get('*', (req, res) => {
  // Se não está autenticado, redirecionar para login
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  // Se está autenticado mas a rota não existe, redirecionar para home
  res.redirect('/');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
