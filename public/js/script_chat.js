/**
 * Script para funcionalidade de chat
 * Implementa a conexão entre o botão de chat e os modais de opções e seleção de documentos
 */

// Função para inicializar a funcionalidade de chat
function initChatFunctionality() {
  console.log('🗨️ Inicializando funcionalidade de chat...');
  
  // Elementos do chat
  const chatClientBtn = document.getElementById('chat-client-btn');
  const chatOptionsModal = document.getElementById('chat-options-modal');
  const chatDocumentsModal = document.getElementById('chat-documents-modal');
  
  // Elementos de opções de chat
  const chatStrategyOption = document.getElementById('chat-strategy-option');
  const chatClientOption = document.getElementById('chat-client-option');
  
  // Elementos de seleção de documentos
  const chatAvailableAnalyses = document.getElementById('chat-available-analyses');
  const chatAvailablePlans = document.getElementById('chat-available-plans');
  const chatSelectedDocumentsList = document.getElementById('chat-selected-documents-list');
  const startChatBtn = document.getElementById('start-chat-btn');
  const cancelChatDocumentsBtn = document.getElementById('cancel-chat-documents-btn');
  
  // Botões de fechar modais
  const closeModalButtons = document.querySelectorAll('.close-modal');
  
  // Estado do chat
  let selectedChatType = null;
  let selectedDocuments = [];
  
  // Verificar se os elementos existem
  if (!chatClientBtn) {
    console.error('❌ Botão de chat não encontrado');
    return;
  }
  
  // Adicionar evento de clique ao botão de chat
  chatClientBtn.addEventListener('click', () => {
    console.log('🗨️ Botão de chat clicado');
    
    // Resetar seleções
    selectedChatType = null;
    selectedDocuments = [];
    
    // Remover seleção das opções
    if (chatStrategyOption) chatStrategyOption.classList.remove('selected');
    if (chatClientOption) chatClientOption.classList.remove('selected');
    
    // Mostrar modal de opções
    if (chatOptionsModal) {
      chatOptionsModal.classList.add('show');
    } else {
      console.error('❌ Modal de opções de chat não encontrado');
    }
  });
  
  // Adicionar eventos às opções de chat
  if (chatStrategyOption) {
    chatStrategyOption.addEventListener('click', () => {
      console.log('🗨️ Opção de estratégia selecionada');
      selectedChatType = 'strategy';
      
      // Atualizar UI
      chatStrategyOption.classList.add('selected');
      if (chatClientOption) chatClientOption.classList.remove('selected');
      
      // Fechar modal de opções
      if (chatOptionsModal) chatOptionsModal.classList.remove('show');
      
      // Carregar documentos disponíveis
      loadAvailableDocuments();
      
      // Mostrar modal de seleção de documentos
      if (chatDocumentsModal) chatDocumentsModal.classList.add('show');
    });
  }
  
  if (chatClientOption) {
    chatClientOption.addEventListener('click', () => {
      console.log('🗨️ Opção de cliente ideal selecionada');
      selectedChatType = 'client';
      
      // Atualizar UI
      chatClientOption.classList.add('selected');
      if (chatStrategyOption) chatStrategyOption.classList.remove('selected');
      
      // Fechar modal de opções
      if (chatOptionsModal) chatOptionsModal.classList.remove('show');
      
      // Carregar documentos disponíveis
      loadAvailableDocuments();
      
      // Mostrar modal de seleção de documentos
      if (chatDocumentsModal) chatDocumentsModal.classList.add('show');
    });
  }
  
  // Adicionar evento ao botão de cancelar seleção de documentos
  if (cancelChatDocumentsBtn) {
    cancelChatDocumentsBtn.addEventListener('click', () => {
      console.log('🗨️ Seleção de documentos cancelada');
      
      // Fechar modal de documentos
      if (chatDocumentsModal) chatDocumentsModal.classList.remove('show');
      
      // Resetar seleções
      selectedChatType = null;
      selectedDocuments = [];
    });
  }
  
  // Adicionar evento ao botão de iniciar chat
  if (startChatBtn) {
    startChatBtn.addEventListener('click', () => {
      console.log('🗨️ Iniciando chat...');
      
      // Verificar se há tipo de chat e documentos selecionados
      if (!selectedChatType) {
        console.error('❌ Tipo de chat não selecionado');
        return;
      }
      
      if (selectedDocuments.length === 0) {
        console.error('❌ Nenhum documento selecionado');
        return;
      }
      
      // Iniciar chat
      startChat();
    });
  }
  
  // Adicionar eventos aos botões de fechar modais
  closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) modal.classList.remove('show');
    });
  });
  
  // Fechar modais ao clicar fora
  window.addEventListener('click', (e) => {
    if (e.target === chatOptionsModal) {
      chatOptionsModal.classList.remove('show');
    }
    
    if (e.target === chatDocumentsModal) {
      chatDocumentsModal.classList.remove('show');
    }
  });
  
  // Função para carregar documentos disponíveis
  async function loadAvailableDocuments() {
    console.log('🗨️ Carregando documentos disponíveis...');
    
    // Verificar se há cliente selecionado
    if (!currentClientId) {
      console.error('❌ Nenhum cliente selecionado');
      return;
    }
    
    try {
      // Mostrar indicador de carregamento
      if (chatAvailableAnalyses) {
        chatAvailableAnalyses.innerHTML = `
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Carregando análises...</p>
          </div>
        `;
      }
      
      if (chatAvailablePlans) {
        chatAvailablePlans.innerHTML = `
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Carregando planos de ação...</p>
          </div>
        `;
      }
      
      // Carregar análises
      const analyses = await safeFetch(`/api/analises/cliente/${currentClientId}`);
      
      // Carregar planos de ação
      const plans = await safeFetch(`/api/planos-acao/${currentClientId}`);
      
      // Filtrar documentos com erro ou em progresso
      const validAnalyses = Array.isArray(analyses) ? analyses.filter(analysis => !analysis.erro && !analysis.emProgresso) : [];
      const validPlans = Array.isArray(plans) ? plans.filter(plan => !plan.erro && !plan.emProgresso) : [];
      
      console.log(`🗨️ Análises válidas: ${validAnalyses.length} de ${analyses ? analyses.length : 0}`);
      console.log(`🗨️ Planos válidos: ${validPlans.length} de ${plans ? plans.length : 0}`);
      
      // Renderizar análises
      renderAvailableAnalyses(validAnalyses);
      
      // Renderizar planos de ação
      renderAvailablePlans(validPlans);
      
      // Atualizar lista de documentos selecionados
      updateSelectedDocumentsList();
      
      // Atualizar estado do botão de iniciar chat
      updateStartChatButtonState();
      
    } catch (error) {
      console.error('❌ Erro ao carregar documentos:', error);
      
      // Mostrar mensagem de erro
      if (chatAvailableAnalyses) {
        chatAvailableAnalyses.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar análises</p>
          </div>
        `;
      }
      
      if (chatAvailablePlans) {
        chatAvailablePlans.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar planos de ação</p>
          </div>
        `;
      }
    }
  }
  
  // Função para renderizar análises disponíveis
  function renderAvailableAnalyses(analyses) {
    if (!chatAvailableAnalyses) return;
    
    if (!analyses || analyses.length === 0) {
      chatAvailableAnalyses.innerHTML = `
        <div class="no-documents">
          <i class="fas fa-info-circle"></i>
          <p>Nenhuma análise disponível</p>
        </div>
      `;
      return;
    }
    
    // Ordenar análises por data (mais recente primeiro)
    analyses.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    
    // Renderizar lista
    chatAvailableAnalyses.innerHTML = analyses.map(analysis => `
      <div class="document-item" data-id="${analysis._id}" data-type="analysis">
        <div class="document-item-content">
          <div class="document-item-title">Análise de Mercado</div>
          <div class="document-item-meta">
            <span>${new Date(analysis.dataCriacao).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="document-item-checkbox"></div>
      </div>
    `).join('');
    
    // Adicionar eventos de clique
    chatAvailableAnalyses.querySelectorAll('.document-item').forEach(item => {
      item.addEventListener('click', () => toggleDocumentSelection(item));
    });
  }
  
  // Função para renderizar planos de ação disponíveis
  function renderAvailablePlans(plans) {
    if (!chatAvailablePlans) return;
    
    if (!plans || plans.length === 0) {
      chatAvailablePlans.innerHTML = `
        <div class="no-documents">
          <i class="fas fa-info-circle"></i>
          <p>Nenhum plano de ação disponível</p>
        </div>
      `;
      return;
    }
    
    // Ordenar planos por data (mais recente primeiro)
    plans.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    
    // Renderizar lista
    chatAvailablePlans.innerHTML = plans.map(plan => `
      <div class="document-item" data-id="${plan._id}" data-type="plan">
        <div class="document-item-content">
          <div class="document-item-title">${plan.titulo}</div>
          <div class="document-item-meta">
            <span>${new Date(plan.dataCriacao).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="document-item-checkbox"></div>
      </div>
    `).join('');
    
    // Adicionar eventos de clique
    chatAvailablePlans.querySelectorAll('.document-item').forEach(item => {
      item.addEventListener('click', () => toggleDocumentSelection(item));
    });
  }
  
  // Função para alternar seleção de documento
  function toggleDocumentSelection(item) {
    const id = item.dataset.id;
    const type = item.dataset.type;
    const title = item.querySelector('.document-item-title').textContent;
    
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
    
    // Atualizar estado do botão de iniciar chat
    updateStartChatButtonState();
  }
  
  // Função para atualizar lista de documentos selecionados
  function updateSelectedDocumentsList() {
    if (!chatSelectedDocumentsList) return;
    
    if (selectedDocuments.length === 0) {
      chatSelectedDocumentsList.innerHTML = `
        <div class="no-selection">
          <i class="fas fa-hand-pointer"></i>
          <p>Selecione pelo menos um documento acima</p>
        </div>
      `;
      return;
    }
    
    chatSelectedDocumentsList.innerHTML = selectedDocuments.map(doc => `
      <div class="selected-item">
        <div class="selected-item-content">
          <div class="selected-item-title">${doc.title}</div>
          <div class="selected-item-type">${doc.type === 'analysis' ? 'Análise' : 'Plano de Ação'}</div>
        </div>
        <button class="remove-selected-btn" data-id="${doc.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
    
    // Adicionar eventos para remover documentos
    chatSelectedDocumentsList.querySelectorAll('.remove-selected-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        removeDocumentFromSelection(id);
      });
    });
  }
  
  // Função para remover documento da seleção
  function removeDocumentFromSelection(id) {
    // Remover da lista de selecionados
    selectedDocuments = selectedDocuments.filter(doc => doc.id !== id);
    
    // Remover classe selected do item na lista de disponíveis
    const item = document.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.remove('selected');
    }
    
    // Atualizar listas
    updateSelectedDocumentsList();
    updateStartChatButtonState();
  }
  
  // Função para atualizar estado do botão de iniciar chat
  function updateStartChatButtonState() {
    if (!startChatBtn) return;
    
    startChatBtn.disabled = selectedDocuments.length === 0;
  }
  
  // Função para iniciar chat
  async function startChat() {
    console.log('🗨️ Iniciando chat...');
    console.log('🗨️ Tipo:', selectedChatType);
    console.log('🗨️ Documentos:', selectedDocuments);
    
    // Verificar se há cliente selecionado
    if (!currentClientId) {
      console.error('❌ Nenhum cliente selecionado');
      return;
    }
    
    try {
      // Mostrar indicador de carregamento
      if (startChatBtn) {
        const originalText = startChatBtn.innerHTML;
        startChatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
        startChatBtn.disabled = true;
      }
      
      // Preparar dados para a API
      const analiseIds = selectedDocuments
        .filter(doc => doc.type === 'analysis')
        .map(doc => doc.id);
      
      const planoAcaoIds = selectedDocuments
        .filter(doc => doc.type === 'plan')
        .map(doc => doc.id);
      
      // Criar novo chat
      const response = await safeFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: currentClientId,
          tipo: selectedChatType,
          analiseIds,
          planoAcaoIds
        })
      });
      
      // Verificar resposta
      if (!response || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }
      
      // Fechar modal
      if (chatDocumentsModal) chatDocumentsModal.classList.remove('show');
      
      // Redirecionar para a página de chat
      window.location.href = `/chat.html?cliente=${currentClientId}`;
      
    } catch (error) {
      console.error('❌ Erro ao iniciar chat:', error);
      
      // Restaurar botão
      if (startChatBtn) {
        startChatBtn.innerHTML = '<i class="fas fa-comment-alt"></i> Iniciar Chat';
        startChatBtn.disabled = false;
      }
      
      // Mostrar mensagem de erro
      alert('Não foi possível iniciar o chat. Tente novamente.');
    }
  }
}

  // Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se a funcionalidade já foi inicializada
  if (window.chatFunctionalityInitialized) return;
  
  // Definir codificação UTF-8 para garantir caracteres especiais
  document.characterSet = "UTF-8";
  
  // Inicializar funcionalidade de chat
  initChatFunctionality();
  
  // Marcar como inicializado
  window.chatFunctionalityInitialized = true;
});
