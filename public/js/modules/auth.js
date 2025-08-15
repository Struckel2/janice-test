// ===== MÓDULO DE AUTENTICAÇÃO =====
window.AppModules = window.AppModules || {};

window.AppModules.Auth = (function() {
  'use strict';
  
  // Importar módulos dependentes
  const Utils = window.AppModules.Utils;
  
  // ===== FUNÇÃO DE VERIFICAÇÃO DE AUTENTICAÇÃO =====
  
  // Verificar se o usuário está autenticado
  async function checkAuthentication() {
    try {
      console.log('🔄 [AUTH] Verificando autenticação...');
      
      // Usar safeFetch para lidar com redirecionamentos e erros de autenticação
      const data = await Utils.safeFetch('/auth/status', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      // Se safeFetch retornar null, significa que já está redirecionando
      if (!data) {
        console.log('🔄 [AUTH] Redirecionamento em andamento...');
        return null;
      }
      
      if (!data.authenticated) {
        // Usuário não autenticado, redirecionar para login
        console.log('❌ [AUTH] Usuário não autenticado, redirecionando para login...');
        window.location.href = '/login';
        return null;
      }
      
      if (!data.user.ativo) {
        // Usuário não ativo, redirecionar para página de pendência
        console.log('⚠️ [AUTH] Usuário não ativo, redirecionando para página de pendência...');
        window.location.href = '/pending';
        return null;
      }
      
      // Usuário autenticado e ativo, adicionar informações do usuário à interface
      addUserInfoToInterface(data.user);
      
      console.log('✅ Usuário autenticado:', data.user.email, 'Role:', data.user.role);
      
      // Disparar evento de autenticação bem-sucedida
      const authEvent = new CustomEvent('auth-success', { detail: data.user });
      document.dispatchEvent(authEvent);
      console.log('🔔 Evento auth-success disparado');
      
      return data.user;
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar autenticação:', error);
      
      // Verificar se o erro é de autenticação
      if (error.message && (
          error.message.includes('Não autenticado') || 
          error.message.includes('Unauthorized') || 
          error.message.includes('401')
      )) {
        console.log('🔄 [AUTH] Erro de autenticação, redirecionando para login...');
        window.location.href = '/login';
      } else {
        // Mostrar mensagem de erro genérica
        alert('Erro ao verificar autenticação. Por favor, recarregue a página.');
      }
      
      return null;
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
