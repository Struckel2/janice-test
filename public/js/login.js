document.addEventListener('DOMContentLoaded', function() {
    const googleLoginBtn = document.getElementById('google-login-btn');
    const errorMessage = document.getElementById('error-message');
    const loadingMessage = document.getElementById('loading-message');
    const errorText = document.getElementById('error-text');

    // Verificar se já está autenticado
    checkAuthStatus();

    // Event listener para o botão do Google (combinado com efeito ripple)
    googleLoginBtn.addEventListener('click', function(e) {
        // Primeiro: criar efeito ripple
        createRippleEffect(e, this);
        
        // Segundo: executar login
        startGoogleLogin();
    });

    // Verificar parâmetros de erro na URL
    checkUrlParams();

    function checkAuthStatus() {
        fetch('/auth/status')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated && data.user && data.user.ativo) {
                    // Usuário já está logado e ativo, redirecionar
                    console.log('Usuário já autenticado:', data.user.email);
                    window.location.href = '/';
                } else if (data.authenticated && data.user && !data.user.ativo) {
                    // Usuário logado mas não ativo, redirecionar para pending
                    console.log('Usuário não ativo:', data.user.email);
                    window.location.href = '/auth/pending';
                }
            })
            .catch(error => {
                console.log('Usuário não autenticado ou erro na verificação:', error);
                // Continuar na tela de login
            });
    }

    function startGoogleLogin() {
        showLoading();
        hideError();
        
        // Redirecionar para a rota de autenticação do Google
        window.location.href = '/auth/google';
    }

    function showLoading() {
        loadingMessage.style.display = 'flex';
        googleLoginBtn.disabled = true;
        googleLoginBtn.style.opacity = '0.6';
        googleLoginBtn.style.cursor = 'not-allowed';
    }

    function hideLoading() {
        loadingMessage.style.display = 'none';
        googleLoginBtn.disabled = false;
        googleLoginBtn.style.opacity = '1';
        googleLoginBtn.style.cursor = 'pointer';
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        hideLoading();
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function createRippleEffect(e, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    }

    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');

        if (error) {
            let errorMsg = 'Erro na autenticação. Tente novamente.';
            
            switch (error) {
                case 'auth_failed':
                    errorMsg = 'Falha na autenticação com Google. Verifique suas credenciais.';
                    break;
                case 'user_inactive':
                    errorMsg = 'Sua conta está pendente de aprovação pelo administrador.';
                    break;
                case 'access_denied':
                    errorMsg = 'Acesso negado. Você cancelou a autenticação.';
                    break;
                default:
                    errorMsg = 'Erro desconhecido na autenticação.';
            }
            
            showError(errorMsg);
            
            // Limpar parâmetros da URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    // Adicionar efeitos visuais extras
    addVisualEffects();

    function addVisualEffects() {
        // Efeito de parallax nas formas flutuantes
        document.addEventListener('mousemove', function(e) {
            const shapes = document.querySelectorAll('.floating-shape');
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.5;
                const x = (mouseX - 0.5) * speed * 20;
                const y = (mouseY - 0.5) * speed * 20;
                
                shape.style.transform = `translate(${x}px, ${y}px)`;
            });
        });

        // Event listener duplicado removido - agora está combinado no event listener principal

        // Adicionar CSS para o efeito ripple
        const style = document.createElement('style');
        style.textContent = `
            .google-login-button {
                position: relative;
                overflow: hidden;
            }
            
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(66, 133, 244, 0.3);
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

    // Detectar se o usuário voltou da autenticação
    window.addEventListener('focus', function() {
        // Pequeno delay para permitir que o redirecionamento aconteça
        setTimeout(checkAuthStatus, 500);
    });

    // Adicionar suporte a teclas
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !googleLoginBtn.disabled) {
            startGoogleLogin();
        }
    });

    console.log('🔐 Sistema de login inicializado');
});
