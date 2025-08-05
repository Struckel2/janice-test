document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');

    // Carregar informações do usuário
    loadUserInfo();

    // Event listeners
    refreshBtn.addEventListener('click', checkStatus);
    logoutBtn.addEventListener('click', logout);

    // Verificar status automaticamente a cada 30 segundos
    setInterval(checkStatus, 30000);

    // Carregar informações do usuário
    async function loadUserInfo() {
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.authenticated && data.user) {
                displayUserInfo(data.user);
                
                // Se o usuário ficou ativo, redirecionar
                if (data.user.ativo) {
                    showSuccessMessage('Sua conta foi aprovada! Redirecionando...');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            } else {
                // Usuário não autenticado, redirecionar para login
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Erro ao carregar informações do usuário:', error);
            showError('Erro ao carregar informações. Tente novamente.');
        }
    }

    // Exibir informações do usuário
    function displayUserInfo(user) {
        const createdDate = new Date(user.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        userInfo.innerHTML = `
            <h3>Informações da Conta</h3>
            <p><strong>Nome:</strong> ${user.nome}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Conta criada em:</strong> ${createdDate}</p>
            <p><strong>Status:</strong> <span style="color: #ffa726; font-weight: 600;">Aguardando aprovação</span></p>
        `;
    }

    // Verificar status da conta
    async function checkStatus() {
        // Mostrar loading no botão
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Verificando...';
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.authenticated && data.user) {
                if (data.user.ativo) {
                    // Usuário foi aprovado
                    showSuccessMessage('🎉 Sua conta foi aprovada! Redirecionando para o sistema...');
                    
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                    return;
                } else {
                    // Ainda pendente
                    showInfo('Status verificado. Sua conta ainda está aguardando aprovação.');
                    displayUserInfo(data.user);
                }
            } else {
                // Não autenticado
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            showError('Erro ao verificar status. Tente novamente.');
        } finally {
            // Restaurar botão
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.classList.remove('loading');
                refreshBtn.disabled = false;
            }, 1000);
        }
    }

    // Fazer logout
    function logout() {
        if (confirm('Tem certeza que deseja sair?')) {
            window.location.href = '/auth/logout';
        }
    }

    // Mostrar mensagem de sucesso
    function showSuccessMessage(message) {
        // Remover mensagens anteriores
        removeMessages();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        successDiv.style.display = 'block';
        
        // Inserir antes das ações
        const actions = document.querySelector('.actions');
        actions.parentNode.insertBefore(successDiv, actions);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }

    // Mostrar mensagem de informação
    function showInfo(message) {
        // Remover mensagens anteriores
        removeMessages();
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-message';
        infoDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${message}
        `;
        infoDiv.style.cssText = `
            background: #e3f2fd;
            color: #1976d2;
            border: 1px solid #bbdefb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: block;
        `;
        
        // Inserir antes das ações
        const actions = document.querySelector('.actions');
        actions.parentNode.insertBefore(infoDiv, actions);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (infoDiv.parentNode) {
                infoDiv.parentNode.removeChild(infoDiv);
            }
        }, 3000);
    }

    // Mostrar mensagem de erro
    function showError(message) {
        // Remover mensagens anteriores
        removeMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        `;
        errorDiv.style.cssText = `
            background: #fee;
            color: #c53030;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: block;
        `;
        
        // Inserir antes das ações
        const actions = document.querySelector('.actions');
        actions.parentNode.insertBefore(errorDiv, actions);
        
        // Remover após 4 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 4000);
    }

    // Remover mensagens existentes
    function removeMessages() {
        const messages = document.querySelectorAll('.success-message, .info-message, .error-message');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
    }

    // Adicionar efeitos visuais
    addVisualEffects();

    function addVisualEffects() {
        // Efeito de parallax nas formas flutuantes
        document.addEventListener('mousemove', function(e) {
            const shapes = document.querySelectorAll('.floating-shape');
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.3;
                const x = (mouseX - 0.5) * speed * 15;
                const y = (mouseY - 0.5) * speed * 15;
                
                shape.style.transform = `translate(${x}px, ${y}px)`;
            });
        });

        // Efeito de ripple nos botões
        const buttons = document.querySelectorAll('.refresh-button, .logout-button');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Adicionar CSS para o efeito ripple
        const style = document.createElement('style');
        style.textContent = `
            .refresh-button, .logout-button {
                position: relative;
                overflow: hidden;
            }
            
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.4);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                pointer-events: none;
            }
            
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Detectar se o usuário voltou para a aba
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Usuário voltou para a aba, verificar status
            setTimeout(checkStatus, 1000);
        }
    });

    // Adicionar suporte a teclas
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            // Interceptar F5 e Ctrl+R para usar nossa função de refresh
            e.preventDefault();
            checkStatus();
        }
    });

    console.log('⏳ Sistema de pendência inicializado');
});
