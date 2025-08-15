// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
  console.log(`🔐 [AUTH-CHECK] Verificando auth para ${req.method} ${req.path}`);
  console.log(`🔐 [AUTH-STATUS] Autenticado: ${req.isAuthenticated()}`);
  
  if (req.isAuthenticated()) {
    console.log(`✅ [AUTH-SUCCESS] Usuário autenticado: ${req.user ? req.user.email : 'N/A'}`);
    return next();
  }
  
  console.log(`❌ [AUTH-FAIL] Usuário não autenticado`);
  console.log(`🔍 [AUTH-HEADERS] xhr: ${req.xhr}, accept: ${req.headers.accept}, x-requested-with: ${req.headers['x-requested-with']}`);
  
  // Melhorar a detecção de requisições AJAX/API
  const isAjaxRequest = 
    req.xhr || 
    (req.headers.accept && req.headers.accept.indexOf('json') > -1) ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.path.startsWith('/api/');
  
  if (isAjaxRequest) {
    console.log(`📤 [AUTH-RESPONSE] Retornando JSON 401 para requisição AJAX/API`);
    return res.status(401).json({ 
      error: 'Não autenticado',
      message: 'Sessão expirada ou usuário não autenticado',
      redirect: '/login'
    });
  }
  
  // Se é uma requisição normal, redirecionar para login
  console.log(`🔄 [AUTH-REDIRECT] Redirecionando para /login`);
  res.redirect('/login');
};

// Middleware para verificar se o usuário está ativo
const isActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuário não encontrado',
      message: 'Sessão expirada ou usuário não autenticado',
      redirect: '/login'
    });
  }
  
  if (!req.user.isAtivo()) {
    // Melhorar a detecção de requisições AJAX/API
    const isAjaxRequest = 
      req.xhr || 
      (req.headers.accept && req.headers.accept.indexOf('json') > -1) ||
      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      req.path.startsWith('/api/');
    
    if (isAjaxRequest) {
      return res.status(403).json({ 
        error: 'Usuário não ativo',
        message: 'Sua conta está pendente de aprovação.',
        redirect: '/pending'
      });
    }
    
    // Redirecionar para página de pendência
    return res.redirect('/pending');
  }
  
  next();
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuário não encontrado' 
    });
  }
  
  if (!req.user.isAdmin()) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Apenas administradores podem acessar esta funcionalidade.'
    });
  }
  
  next();
};

// Middleware combinado: autenticado + ativo
const requireAuth = [isAuthenticated, isActive];

// Middleware combinado: autenticado + ativo + admin
const requireAdmin = [isAuthenticated, isActive, isAdmin];

// Middleware para adicionar informações do usuário nas respostas
const addUserInfo = (req, res, next) => {
  // Adicionar método helper para incluir info do usuário nas respostas JSON
  res.jsonWithUser = function(data) {
    const response = {
      ...data,
      user: req.user ? {
        id: req.user._id,
        nome: req.user.nome,
        email: req.user.email,
        foto: req.user.foto,
        role: req.user.role,
        isAdmin: req.user.isAdmin()
      } : null
    };
    return res.json(response);
  };
  
  next();
};

module.exports = {
  isAuthenticated,
  isActive,
  isAdmin,
  requireAuth,
  requireAdmin,
  addUserInfo
};
