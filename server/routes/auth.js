const express = require('express');
const passport = require('../config/passport');
const { requireAuth, addUserInfo } = require('../middleware/auth');
const router = express.Router();

// Rota para iniciar autenticação com Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback do Google OAuth
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login?error=auth_failed' 
  }),
  (req, res) => {
    console.log('✅ Login bem-sucedido:', req.user.email);
    
    // Verificar se o usuário está ativo
    if (!req.user.isAtivo()) {
      console.log('⚠️ Usuário não ativo:', req.user.email);
      return res.redirect('/auth/pending');
    }
    
    // Redirecionar para a aplicação principal
    res.redirect('/');
  }
);

// Rota para logout
router.get('/logout', (req, res) => {
  const userEmail = req.user?.email || 'usuário desconhecido';
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Erro no logout:', err);
      return res.status(500).json({ error: 'Erro no logout' });
    }
    
    console.log('👋 Logout realizado:', userEmail);
    
    // Destruir a sessão
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Erro ao destruir sessão:', err);
      }
      
      // Limpar cookie de sessão
      res.clearCookie('connect.sid');
      
      // Redirecionar para login
      res.redirect('/login');
    });
  });
});

// Rota para obter dados do usuário atual
router.get('/user', requireAuth, addUserInfo, (req, res) => {
  res.jsonWithUser({
    success: true,
    message: 'Usuário autenticado'
  });
});

// Rota para verificar status de autenticação (sem middleware requireAuth)
router.get('/status', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        nome: req.user.nome,
        email: req.user.email,
        foto: req.user.foto,
        role: req.user.role,
        isAdmin: req.user.isAdmin(),
        ativo: req.user.isAtivo()
      }
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

// Rota para página de pendência (usuário não ativo)
router.get('/pending', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  if (req.user.isAtivo()) {
    return res.redirect('/');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conta Pendente - Janice</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          max-width: 500px;
        }
        h1 { color: #fff; margin-bottom: 20px; }
        p { font-size: 18px; line-height: 1.6; margin-bottom: 20px; }
        .user-info { 
          background: rgba(255,255,255,0.1); 
          padding: 15px; 
          border-radius: 10px; 
          margin: 20px 0;
        }
        .logout-btn {
          background: #ff4757;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        }
        .logout-btn:hover { background: #ff3742; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🕐 Conta Pendente de Aprovação</h1>
        <div class="user-info">
          <p><strong>Usuário:</strong> ${req.user.nome}</p>
          <p><strong>Email:</strong> ${req.user.email}</p>
        </div>
        <p>Sua conta foi criada com sucesso, mas está pendente de aprovação pelo administrador.</p>
        <p>Você receberá um email quando sua conta for ativada.</p>
        <a href="/auth/logout" class="logout-btn">Fazer Logout</a>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
