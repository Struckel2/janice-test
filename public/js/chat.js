document.addEventListener('DOMContentLoaded', () => {
  // ===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
  checkAuthentication();

  // ===== ELEMENTOS DA UI =====
  // Elementos principais
  const chatContainer = document.querySelector('.chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendMessageBtn = document.getElementById('send-message-btn');
  const chatTitle = document.getElementById('chat-title');
  const chatTypeBadge = document.getElementById('chat-type-badge');
  
  // Elementos do cliente
  const chatClientName = document.getElementById('chat-client-name');
  const chatClientCnpj = document.getElementById('chat-client-cnpj');
  const chatClientLogo = document.getElementById('chat-client-logo');
  
  // Elementos de histórico
  const chatHistoryList = document.getElementById('chat-history-list');
  const newChatBtn = document.getElementById('new-chat-btn');
  
  // Elementos de documentos
  const analysesList = document.getElementById('analyses-list');
  const actionPlansList = document.getElementById('action-plans-list');
  
  // Elementos do modal de nova conversa
  const newChatModal = document.getElementById('new-chat-modal');
  const chatTypeOptions = document.querySelectorAll('.chat-type-option');
  const analysesSelectionList = document.getElementById('analyses-selection-list');
  const actionPlansSelectionList = document.getElementById('action-plans-selection-list');
  const selectedDocumentsList = document.getElementById('selected-documents-list');
  const selectedCount = document.getElementById('selected-count');
  const startChatBtn = document.getElementById('start-chat-btn');
  const cancelChatBtn = document.getElementById('cancel-chat-btn');
  
  // Elementos do modal de exclusão
  const deleteChatModal = document.getElementById('delete-chat-modal');
  const confirmDeleteChatBtn = document.getElementById('confirm-delete-chat-btn');
  const cancelDeleteChatBtn = document.getElementById('cancel-delete-chat-btn');
  const deleteChatBtn = document.getElementById('delete-chat-btn');
  
  // Elementos de exportação
  const exportChatBtn = document.getElementById('export-chat-btn');
  
  // Elementos de loading
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');

  // ===== VARIÁVEIS DE ESTADO =====
  let currentUser = null;
  let currentClientId = null;
  let currentChatId = null;
  let currentChatType = null;
  let selectedChatType = null;
  let selectedDocuments = [];
  let chatHistory = [];
  let isProcessing = false;

  // ===== FUNÇÕES UTILITÁRIAS =====
  
  // Função para fazer requisições de forma segura
  async function safeFetch(url, options = {}) {
    try {
      // Garantir que headers corretos sejam enviados
      const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Mesclar headers padrão com os fornecidos
      const headers = { ...defaultHeaders, ...(options.headers || {}) };
      
      // Se for FormData, remover Content-Type para deixar o browser definir
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type') || '';
      
      // Se a resposta não for JSON, pode ser um redirect de autenticação
      if (!contentType.includes('application/json')) {
        // Verificar se é um redirect de autenticação
        if (response.status === 302 || response.status === 401) {
          console.log('⚠️ Redirecionamento de autenticação detectado, redirecionando para login...');
          window.location.href = '/login';
          return null;
        }
        
        // Se for outro tipo de erro, tentar obter texto da resposta
        const responseText = await response.text();
        
        // Se a resposta contém HTML (provavelmente página de erro)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
          throw new Error('Sessão expirada. Redirecionando para login...');
        }
        
        // Caso contrário, usar o texto como mensagem de erro
        throw new Error(responseText || `Erro HTTP ${response.status}`);
      }
      
      // Se chegou até aqui, a resposta é JSON válida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // Se o erro menciona sessão expirada, redirecionar para login
      if (error.message.includes('Sessão expirada') || error.message.includes('Unexpected token')) {
        console.log('⚠️ Erro de parsing JSON detectado, redirecionando para login...');
        window.location.href = '/login';
        return null;
      }
      
      // Re-lançar outros erros
      throw error;
    }
  }
  
  // Função para formatar data
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Função para formatar CNPJ
  function formatCnpj(cnpj) {
    if (!cnpj) return '';
    
    // Remover caracteres não numéricos
    const numericCnpj = cnpj.replace(/\D/g, '');
    
    // Aplicar máscara XX.XXX.XXX/XXXX-XX
    return numericCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  
  // Função para mostrar loading
  function showLoading(message = 'Carregando...') {
    loadingMessage.textContent = message;
    loadingOverlay.classList.add('show');
    isProcessing = true;
  }
  
  // Função para esconder loading
  function hideLoading() {
    loadingOverlay.classList.remove('show');
    isProcessing = false;
  }
  
  // Função para mostrar erro
  function showError(message) {
    hideLoading();
    alert(message);
  }
  
  // Função para auto-redimensionar textarea
  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }

  // ===== FUNÇÕES DE AUTENTICAÇÃO =====
  
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
      
      // Obter ID do cliente da URL
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get('cliente');
      
      if (clientId) {
        // Carregar dados do cliente
        loadClientData(clientId);
      } else {
        // Redirecionar para a página inicial se não houver cliente especificado
        window.location.href = '/';
      }
      
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      // Em caso de erro, redirecionar para login por segurança
      window.location.href = '/login';
    }
  }
  
  // Adicionar informações do usuário à interface
  function addUserInfoToInterface(user) {
    // Armazenar informações do usuário globalmente
    currentUser = user;
    
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

  // ===== FUNÇÕES DE CARREGAMENTO DE DADOS =====
  
  // Carregar dados do cliente
  async function loadClientData(clientId) {
    try {
      showLoading('Carregando dados do cliente...');
      
      const client = await safeFetch(`/api/clientes/${clientId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (client === null) return;
      
      // Armazenar ID do cliente
      currentClientId = clientId;
      
      // Preencher dados do cliente na interface
      chatClientName.textContent = client.nome;
      chatClientCnpj.textContent = formatCnpj(client.cnpj);
      
      // Atualizar logo do cliente
      if (client.logo) {
        chatClientLogo.innerHTML = `<img src="${client.logo}" alt="${client.nome}">`;
      } else {
        chatClientLogo.innerHTML = `<i class="fas fa-building"></i>`;
      }
      
      // Carregar histórico de chats
      await loadChatHistory(clientId);
      
      // Carregar documentos disponíveis
      await Promise.all([
        loadClientAnalyses(clientId),
        loadClientActionPlans(clientId)
      ]);
      
      hideLoading();
      
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      showError('Não foi possível carregar os dados do cliente. Tente novamente.');
    }
  }
  
  // Carregar histórico de chats
  async function loadChatHistory(clientId) {
    try {
      const chats = await safeFetch(`/api/chat/cliente/${clientId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (chats === null) return;
      
      if (!chats.data || chats.data.length === 0) {
        chatHistoryList.innerHTML = `
          <div class="chat-history-empty">
            <i class="fas fa-comments"></i>
            <p>Nenhuma conversa iniciada</p>
            <small>Inicie uma nova conversa usando o botão abaixo</small>
          </div>
        `;
        return;
      }
      
      // Ordenar chats por data (mais recente primeiro)
      chats.data.sort((a, b) => new Date(b.dataUltimaInteracao) - new Date(a.dataUltimaInteracao));
      
      // Renderizar lista de chats
      chatHistoryList.innerHTML = chats.data.map(chat => {
        const chatDate = formatDate(chat.dataUltimaInteracao || chat.dataCriacao);
        const chatTypeClass = chat.tipo;
        const chatTypeLabel = chat.tipo === 'strategy' ? 'Estratégia' : 'Cliente Ideal';
        const messageCount = chat.mensagens ? chat.mensagens.length : 0;
        
        return `
          <div class="chat-history-item" data-id="${chat._id}" data-type="${chat.tipo}">
            <div class="chat-history-header">
              <div class="chat-history-title">Chat #${chat._id.substring(0, 6)}</div>
              <div class="chat-history-type ${chatTypeClass}">${chatTypeLabel}</div>
            </div>
            <div class="chat-history-meta">
              <span>${chatDate}</span>
              <span>${messageCount} mensagens</span>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar eventos de clique
      document.querySelectorAll('.chat-history-item').forEach(item => {
        item.addEventListener('click', () => {
          const chatId = item.dataset.id;
          const chatType = item.dataset.type;
          loadChat(chatId, chatType);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar histórico de chats:', error);
      chatHistoryList.innerHTML = `
        <div class="chat-history-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar histórico. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Carregar análises do cliente
  async function loadClientAnalyses(clientId) {
    try {
      const response = await safeFetch(`/api/analises/cliente/${clientId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (response === null) return;
      
      if (!response.length) {
        analysesList.innerHTML = `
          <div class="documents-empty">
            <i class="fas fa-file-alt"></i>
            <p>Nenhuma análise disponível</p>
          </div>
        `;
        
        analysesSelectionList.innerHTML = `
          <div class="document-selection-empty">
            <i class="fas fa-file-alt"></i>
            <p>Nenhuma análise disponível</p>
          </div>
        `;
        return;
      }
      
      // Ordenar análises por data (mais recente primeiro)
      response.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de análises na aba de documentos
      analysesList.innerHTML = response.map(analysis => {
        const analysisDate = formatDate(analysis.dataCriacao);
        
        return `
          <div class="document-item" data-id="${analysis._id}">
            <div class="document-item-title">Análise de Mercado</div>
            <div class="document-item-meta">
              <span>${analysisDate}</span>
            </div>
          </div>
        `;
      }).join('');
      
      // Renderizar lista de análises para seleção
      analysesSelectionList.innerHTML = response.map(analysis => {
        const analysisDate = formatDate(analysis.dataCriacao);
        
        return `
          <div class="document-selection-item" data-id="${analysis._id}" data-type="analysis">
            <div class="document-selection-info">
              <div class="document-selection-title">Análise de Mercado</div>
              <div class="document-selection-meta">${analysisDate}</div>
            </div>
            <div class="document-selection-checkbox">
              <i class="fas fa-check"></i>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar eventos de clique para seleção
      document.querySelectorAll('.document-selection-item').forEach(item => {
        item.addEventListener('click', () => toggleDocumentSelection(item));
      });
      
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
      analysesList.innerHTML = `
        <div class="documents-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar análises. Tente novamente.</p>
        </div>
      `;
      
      analysesSelectionList.innerHTML = `
        <div class="document-selection-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar análises. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Carregar planos de ação do cliente
  async function loadClientActionPlans(clientId) {
    try {
      const response = await safeFetch(`/api/planos-acao/${clientId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (response === null) return;
      
      if (!response.length) {
        actionPlansList.innerHTML = `
          <div class="documents-empty">
            <i class="fas fa-tasks"></i>
            <p>Nenhum plano de ação disponível</p>
          </div>
        `;
        
        actionPlansSelectionList.innerHTML = `
          <div class="document-selection-empty">
            <i class="fas fa-tasks"></i>
            <p>Nenhum plano de ação disponível</p>
          </div>
        `;
        return;
      }
      
      // Ordenar planos por data (mais recente primeiro)
      response.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de planos na aba de documentos
      actionPlansList.innerHTML = response.map(plan => {
        const planDate = formatDate(plan.dataCriacao);
        
        return `
          <div class="document-item" data-id="${plan._id}">
            <div class="document-item-title">${plan.titulo}</div>
            <div class="document-item-meta">
              <span>${planDate}</span>
            </div>
          </div>
        `;
      }).join('');
      
      // Renderizar lista de planos para seleção
      actionPlansSelectionList.innerHTML = response.map(plan => {
        const planDate = formatDate(plan.dataCriacao);
        
        return `
          <div class="document-selection-item" data-id="${plan._id}" data-type="plan">
            <div class="document-selection-info">
              <div class="document-selection-title">${plan.titulo}</div>
              <div class="document-selection-meta">${planDate}</div>
            </div>
            <div class="document-selection-checkbox">
              <i class="fas fa-check"></i>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar eventos de clique para seleção
      document.querySelectorAll('.document-selection-item').forEach(item => {
        item.addEventListener('click', () => toggleDocumentSelection(item));
      });
      
    } catch (error) {
      console.error('Erro ao carregar planos de ação:', error);
      actionPlansList.innerHTML = `
        <div class="documents-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar planos de ação. Tente novamente.</p>
        </div>
      `;
      
      actionPlansSelectionList.innerHTML = `
        <div class="document-selection-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar planos de ação. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Carregar chat específico
  async function loadChat(chatId, chatType) {
    try {
      showLoading('Carregando conversa...');
      
      const chat = await safeFetch(`/api/chat/${chatId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (chat === null) return;
      
      // Armazenar dados do chat atual
      currentChatId = chatId;
      currentChatType = chatType;
      chatHistory = chat.data.mensagens || [];
      
      // Atualizar interface
      chatTitle.textContent = `Chat #${chatId.substring(0, 6)}`;
      chatTypeBadge.textContent = chatType === 'strategy' ? 'Estratégia' : 'Cliente Ideal';
      chatTypeBadge.className = `chat-type-badge ${chatType}`;
      
      // Marcar chat como ativo na lista
      document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === chatId) {
          item.classList.add('active');
        }
      });
      
      // Renderizar mensagens
      renderMessages(chatHistory);
      
      // Habilitar input
      chatInput.disabled = false;
      sendMessageBtn.disabled = false;
      
      hideLoading();
      
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      showError('Não foi possível carregar a conversa. Tente novamente.');
    }
  }

  // ===== FUNÇÕES DE MANIPULAÇÃO DE MENSAGENS =====
  
  // Renderizar mensagens
  function renderMessages(messages) {
    if (!messages || messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="chat-welcome">
          <div class="chat-welcome-icon">
            <i class="fas fa-comments"></i>
          </div>
          <h3>Bem-vindo ao Chat</h3>
          <p>Digite sua mensagem abaixo para começar a conversar.</p>
        </div>
      `;
      return;
    }
    
    // Filtrar mensagens do sistema
    const visibleMessages = messages.filter(msg => msg.role !== 'system');
    
    chatMessages.innerHTML = visibleMessages.map(message => {
      const isUser = message.role === 'user';
      const messageClass = isUser ? 'message-user' : 'message-assistant';
      const messageTime = message.timestamp ? formatDate(message.timestamp) : '';
      
      return `
        <div class="message ${messageClass}">
          <div class="message-content">
            ${message.content}
            <div class="message-time">${messageTime}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Rolar para a última mensagem
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Enviar mensagem
  async function sendMessage() {
    // Verificar se há um chat ativo
    if (!currentChatId) {
      showError('Selecione ou inicie uma conversa primeiro.');
      return;
    }
    
    // Obter mensagem do input
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Desabilitar input durante processamento
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
    
    try {
      // Adicionar mensagem do usuário à interface
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      // Atualizar histórico local
      chatHistory.push(userMessage);
      
      // Renderizar mensagens
      renderMessages(chatHistory);
      
      // Limpar input
      chatInput.value = '';
      chatInput.style.height = 'auto';
      
      // Adicionar mensagem ao chat no servidor
      await safeFetch(`/api/chat/${currentChatId}/message`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });
      
      // Mostrar indicador de digitação
      showTypingIndicator();
      
      // Obter documentos base do chat
      const chat = await safeFetch(`/api/chat/${currentChatId}`);
      const documentIds = [];
      
      // Preparar IDs de documentos
      if (chat.data.documentosBase) {
        if (chat.data.documentosBase.analises) {
          chat.data.documentosBase.analises.forEach(analise => {
            documentIds.push({ type: 'analysis', id: analise._id });
          });
        }
        
        if (chat.data.documentosBase.planosAcao) {
          chat.data.documentosBase.planosAcao.forEach(plano => {
            documentIds.push({ type: 'plan', id: plano._id });
          });
        }
      }
      
      // Obter resposta da API
      const response = await safeFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: currentClientId,
          chatType: currentChatType,
          message: message,
          documentIds: documentIds,
          history: chatHistory.slice(-10) // Enviar últimas 10 mensagens como contexto
        })
      });
      
      // Remover indicador de digitação
      removeTypingIndicator();
      
      // Adicionar resposta do assistente
      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      // Atualizar histórico local
      chatHistory.push(assistantMessage);
      
      // Renderizar mensagens
      renderMessages(chatHistory);
      
      // Adicionar mensagem do assistente ao chat no servidor
      await safeFetch(`/api/chat/${currentChatId}/message`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'assistant',
          content: response.message
        })
      });
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showError('Não foi possível enviar a mensagem. Tente novamente.');
      
      // Remover indicador de digitação se existir
      removeTypingIndicator();
    } finally {
      // Reabilitar input
      chatInput.disabled = false;
      sendMessageBtn.disabled = false;
      chatInput.focus();
    }
  }
  
  // Mostrar indicador de digitação
  function showTypingIndicator() {
    // Verificar se já existe um indicador
    if (document.querySelector('.typing-indicator')) return;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message message-assistant typing-indicator';
    typingIndicator.innerHTML = `
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Adicionar estilos para os dots
    const style = document.createElement('style');
    style.textContent = `
      .typing-dots {
        display: flex;
        gap: 4px;
        padding: 5px 0;
      }
      
      .typing-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #adb5bd;
        display: inline-block;
        animation: typing-dot 1.4s infinite ease-in-out both;
      }
      
      .typing-dots span:nth-child(1) {
        animation-delay: 0s;
      }
      
      .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes typing-dot {
        0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Remover indicador de digitação
  function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // ===== FUNÇÕES DE CRIAÇÃO DE CHAT =====
  
  // Mostrar modal de nova conversa
  function showNewChatModal() {
    // Resetar seleções
    selectedChatType = null;
    selectedDocuments = [];
    
    // Resetar UI
    chatTypeOptions.forEach(option => {
      option.classList.remove('selected');
    });
    
    updateSelectedDocumentsList();
    updateStartButtonState();
    
    // Mostrar modal
    newChatModal.classList.add('show');
  }
  
  // Esconder modal de nova conversa
  function hideNewChatModal() {
    newChatModal.classList.remove('show');
  }
  
  // Alternar seleção de tipo de chat
  function toggleChatTypeSelection(option) {
    // Remover seleção de todas as opções
    chatTypeOptions.forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Adicionar seleção à opção clicada
    option.classList.add('selected');
    
    // Armazenar tipo selecionado
    selectedChatType = option.dataset.type;
    
    // Atualizar estado do botão de início
    updateStartButtonState();
  }
  
  // Alternar seleção de documento
  function toggleDocumentSelection(item) {
    const id = item.dataset.id;
    const type = item.dataset.type;
    const title = item.querySelector('.document-selection-title').textContent;
    
    // Verificar se já está selecionado
    const isSelected = item.classList.contains('selected');
    
    if (isSelected) {
      // Remover da seleção
      item.classList.remove('selected');
      selectedDocuments = selectedDocuments.filter(doc => doc.id !== id);
    } else {
      // Adicionar à seleção
      item.classList.add('selected');
      selectedDocuments.push({ id, type, title });
    }
    
    // Atualizar lista de documentos selecionados
    updateSelectedDocumentsList();
    
    // Atualizar estado do botão de início
    updateStartButtonState();
  }
  
  // Atualizar lista de documentos selecionados
  function updateSelectedDocumentsList() {
    // Atualizar contador
    selectedCount.textContent = selectedDocuments.length;
    
    if (selectedDocuments.length === 0) {
      selectedDocumentsList.innerHTML = `
        <div class="no-documents-selected">
          <i class="fas fa-info-circle"></i>
          <p>Selecione pelo menos um documento para continuar</p>
        </div>
      `;
      return;
    }
    
    selectedDocumentsList.innerHTML = selectedDocuments.map(doc => `
      <div class="selected-document-item" data-id="${doc.id}">
        <div class="selected-document-info">
          <div class="selected-document-title">${doc.title}</div>
          <div class="selected-document-type">${doc.type === 'analysis' ? 'Análise' : 'Plano de Ação'}</div>
        </div>
        <button class="remove-document-btn" data-id="${doc.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
    
    // Adicionar eventos para remover documentos
    document.querySelectorAll('.remove-document-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.dataset.id;
        
        // Remover da lista de selecionados
        selectedDocuments = selectedDocuments.filter(doc => doc.id !== docId);
        
        // Remover classe selected do item na lista de disponíveis
        document.querySelectorAll(`.document-selection-item[data-id="${docId}"]`).forEach(item => {
          item.classList.remove('selected');
        });
        
        // Atualizar lista
        updateSelectedDocumentsList();
        
        // Atualizar estado do botão de início
        updateStartButtonState();
      });
    });
  }
  
  // Atualizar estado do botão de início
  function updateStartButtonState() {
    startChatBtn.disabled = !selectedChatType || selectedDocuments.length === 0;
  }
  
  // Iniciar nova conversa
  async function startNewChat() {
    if (!selectedChatType || selectedDocuments.length === 0) {
      showError('Selecione o tipo de conversa e pelo menos um documento.');
      return;
    }
    
    try {
      showLoading('Iniciando conversa...');
      
      // Preparar dados para a API
      const analiseIds = selectedDocuments
        .filter(doc => doc.type === 'analysis')
        .map(doc => doc.id);
      
      const planoAcaoIds = selectedDocuments
        .filter(doc => doc.type === 'plan')
        .map(doc => doc.id);
      
      // Criar novo chat
      const newChat = await safeFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: currentClientId,
          tipo: selectedChatType,
          analiseIds,
          planoAcaoIds
        })
      });
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (newChat === null) return;
      
      // Esconder modal
      hideNewChatModal();
      
      // Preparar documentos para mensagem de boas-vindas
      const documentIds = selectedDocuments.map(doc => ({
        type: doc.type,
        id: doc.id
      }));
      
      // Gerar mensagem de boas-vindas
      const welcomeResponse = await safeFetch('/api/chat/welcome', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: currentClientId,
          chatType: selectedChatType,
          documentIds
        })
      });
      
      // Adicionar mensagem de boas-vindas ao chat
      await safeFetch(`/api/chat/${newChat.data._id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'assistant',
          content: welcomeResponse.message
        })
      });
      
      // Recarregar histórico de chats
      await loadChatHistory(currentClientId);
      
      // Carregar o novo chat
      loadChat(newChat.data._id, selectedChatType);
      
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      showError('Não foi possível iniciar a conversa. Tente novamente.');
    } finally {
      hideLoading();
    }
  }

  // ===== FUNÇÕES DE EXCLUSÃO DE CHAT =====
  
  // Mostrar modal de exclusão
  function showDeleteChatModal() {
    if (!currentChatId) {
      showError('Selecione uma conversa primeiro.');
      return;
    }
    
    deleteChatModal.classList.add('show');
  }
  
  // Esconder modal de exclusão
  function hideDeleteChatModal() {
    deleteChatModal.classList.remove('show');
  }
  
  // Excluir chat
  async function deleteChat() {
    if (!currentChatId) return;
    
    try {
      showLoading('Excluindo conversa...');
      
      await safeFetch(`/api/chat/${currentChatId}`, {
        method: 'DELETE'
      });
      
      // Recarregar histórico de chats
      await loadChatHistory(currentClientId);
      
      // Resetar estado
      currentChatId = null;
      currentChatType = null;
      chatHistory = [];
      
      // Atualizar interface
      chatTitle.textContent = 'Chat';
      chatTypeBadge.textContent = '';
      chatTypeBadge.className = 'chat-type-badge';
      
      // Renderizar mensagens vazias
      renderMessages([]);
      
      // Desabilitar input
      chatInput.disabled = true;
      sendMessageBtn.disabled = true;
      
      // Esconder modal
      hideDeleteChatModal();
      
    } catch (error) {
      console.error('Erro ao excluir chat:', error);
      showError('Não foi possível excluir a conversa. Tente novamente.');
    } finally {
      hideLoading();
    }
  }

  // ===== FUNÇÕES DE EXPORTAÇÃO =====
  
  // Exportar conversa
  function exportChat() {
    if (!currentChatId || !chatHistory.length) {
      showError('Selecione uma conversa com mensagens para exportar.');
      return;
    }
    
    try {
      // Filtrar mensagens do sistema
      const visibleMessages = chatHistory.filter(msg => msg.role !== 'system');
      
      // Criar texto formatado
      let exportText = `CONVERSA: Chat #${currentChatId.substring(0, 6)}\n`;
      exportText += `TIPO: ${currentChatType === 'strategy' ? 'Estratégia' : 'Cliente Ideal'}\n`;
      exportText += `DATA: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      
      visibleMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Você' : 'Assistente';
        const time = msg.timestamp ? formatDate(msg.timestamp) : '';
        
        exportText += `[${role} - ${time}]\n${msg.content}\n\n`;
      });
      
      // Criar blob e link para download
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_${currentChatId.substring(0, 6)}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Limpeza
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao exportar conversa:', error);
      showError('Não foi possível exportar a conversa. Tente novamente.');
    }
  }

  // ===== CONFIGURAÇÃO DE ABAS =====
  
  // Configurar abas
  function setupTabs() {
    // Abas de chat
    document.querySelectorAll('.chat-tab-button').forEach(button => {
      button.addEventListener('click', () => {
        // Remover classe active de todos os botões e conteúdos
        document.querySelectorAll('.chat-tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        
        document.querySelectorAll('.chat-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        // Mostrar conteúdo correspondente
        const tabName = button.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
    
    // Abas de seleção de documentos
    document.querySelectorAll('.document-tab-button').forEach(button => {
      button.addEventListener('click', () => {
        // Remover classe active de todos os botões e conteúdos
        document.querySelectorAll('.document-tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        
        document.querySelectorAll('.document-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        // Mostrar conteúdo correspondente
        const tabName = button.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  }

  // ===== EVENTOS =====
  
  // Configurar eventos
  function setupEvents() {
    // Configurar abas
    setupTabs();
    
    // Evento de nova conversa
    newChatBtn.addEventListener('click', showNewChatModal);
    
    // Eventos do modal de nova conversa
    chatTypeOptions.forEach(option => {
      option.addEventListener('click', () => toggleChatTypeSelection(option));
    });
    
    startChatBtn.addEventListener('click', startNewChat);
    cancelChatBtn.addEventListener('click', hideNewChatModal);
    
    // Fechar modais ao clicar no X
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) {
          modal.classList.remove('show');
        }
      });
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
      if (e.target === newChatModal) {
        hideNewChatModal();
      }
      
      if (e.target === deleteChatModal) {
        hideDeleteChatModal();
      }
    });
    
    // Eventos do modal de exclusão
    deleteChatBtn.addEventListener('click', showDeleteChatModal);
    confirmDeleteChatBtn.addEventListener('click', deleteChat);
    cancelDeleteChatBtn.addEventListener('click', hideDeleteChatModal);
    
    // Evento de exportação
    exportChatBtn.addEventListener('click', exportChat);
    
    // Eventos de input
    chatInput.addEventListener('input', () => {
      // Auto-resize
      autoResizeTextarea(chatInput);
      
      // Habilitar/desabilitar botão de envio
      sendMessageBtn.disabled = !chatInput.value.trim();
    });
    
    // Enviar mensagem ao clicar no botão
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Enviar mensagem ao pressionar Enter (sem Shift)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendMessageBtn.disabled) {
          sendMessage();
        }
      }
    });
  }

  // Inicializar
  setupEvents();
});
