// ===== MÓDULO DE AUTENTICAÇÃO =====
window.AppModules = window.AppModules || {};

window.AppModules.Auth = (function() {
  'use strict';
  
  // ===== FUNÇÃO DE VERIFICAÇÃO DE AUTENTICAÇÃO =====
  
  // Verificar se o usuário está autenticado
  async function checkAuthentication() {
    try {
      const response = await fetch('/auth/status');
      const data = await response.json();
      
      if (!data.authenticated) {
        // Usuário não autenticado, redirecionar para login
        console.log('Usuário não autenticado, redirecionando para login...');
        window.location.href = '/login';
        return;
      }
      
      if (!data.user.ativo) {
        // Usuário não ativo, redirecionar para página de pendência
        console.log('Usuário não ativo, redirecionando para página de pendência...');
        window.location.href = '/auth/pending';
        return;
      }
      
      // Usuário autenticado e ativo, adicionar informações do usuário à interface
      addUserInfoToInterface(data.user);
      
      console.log('✅ Usuário autenticado:', data.user.email, 'Role:', data.user.role);
      
      return data.user;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      // Em caso de erro, redirecionar para login por segurança
      window.location.href = '/login';
    }
  }
  
  // Adicionar informações do usuário à interface
  function addUserInfoToInterface(user) {
    // Armazenar informações do usuário globalmente
    window.currentUser = user;
    
    // Adicionar botão de logout no header
    const header = document.querySelector('header');
    if (header && !header.querySelector('.user-info')) {
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <div class="user-details">
          <span class="user-name">${user.nome}</span>
          <span class="user-role">${user.isAdmin ? 'Administrador' : 'Usuário'}</span>
        </div>
        <button id="logout-btn" class="logout-button">
          <i class="fas fa-sign-out-alt"></i> Sair
        </button>
      `;
      
      // Adicionar estilos inline para o botão de logout
      const style = document.createElement('style');
      style.textContent = `
        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-left: auto;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 0.9rem;
        }
        
        .user-name {
          font-weight: 600;
          color: #333;
        }
        
        .user-role {
          font-size: 0.8rem;
          color: #666;
        }
        
        .logout-button {
          background: #ff4757;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.3s ease;
        }
        
        .logout-button:hover {
          background: #ff3742;
        }
        
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `;
      document.head.appendChild(style);
      
      header.appendChild(userInfo);
      
      // Adicionar evento de logout
      document.getElementById('logout-btn').addEventListener('click', logout);
    }
  }
  
  // Função de logout
  function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
      window.location.href = '/auth/logout';
    }
  }
  
  // ===== EXPORTAR FUNÇÕES PÚBLICAS =====
  return {
    checkAuthentication: checkAuthentication,
    addUserInfoToInterface: addUserInfoToInterface,
    logout: logout
  };
})();
