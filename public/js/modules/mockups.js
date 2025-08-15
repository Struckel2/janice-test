// ===== MÓDULO DE MOCKUPS =====
window.AppModules = window.AppModules || {};

window.AppModules.Mockups = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  const Progress = window.AppModules.Progress;
  
  // ===== FUNÇÕES PARA GERENCIAMENTO DE MOCKUPS =====
  
  // Carregar mockups de um cliente
  async function loadClientMockups(clientId) {
    if (!clientId) return;
    
    try {
      const mockupsList = document.getElementById('mockups-list');
      if (!mockupsList) return;
      
      // Mostrar loading state
      mockupsList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando mockups...</p>
        </div>
      `;
      
      // Fazer requisição para o servidor usando safeFetch
      const mockups = await Utils.safeFetch(`/api/clientes/${clientId}/mockups`);
      
      // Se a resposta for null (redirecionamento de autenticação), sair da função
      if (mockups === null) {
        return;
      }
      
      // Verificar se há mockups
      if (!mockups.length) {
        mockupsList.innerHTML = `
          <div class="mockups-list-empty">
            <i class="fas fa-image"></i>
            <p>Nenhum mockup encontrado</p>
            <button id="new-mockup-btn-empty" class="btn btn-primary">
              <i class="fas fa-plus"></i> Novo Mockup
            </button>
          </div>
        `;
        
        // Configurar botão de novo mockup
        const newMockupBtn = document.getElementById('new-mockup-btn-empty');
        if (newMockupBtn) {
          newMockupBtn.addEventListener('click', showMockupModal);
        }
        
        return;
      }
      
      // Ordenar mockups por data (mais recentes primeiro)
      mockups.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de mockups
      mockupsList.innerHTML = `
        <div class="mockups-header">
          <h3>Mockups</h3>
          <button id="new-mockup-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> Novo Mockup
          </button>
        </div>
        <div class="mockups-grid">
          ${mockups.map(mockup => {
            return `
              <div class="mockup-item" data-id="${mockup._id}">
                <div class="mockup-preview">
                  ${mockup.imagemUrl ? 
                    `<img src="${mockup.imagemUrl}" alt="${mockup.titulo || 'Mockup'}" loading="lazy">` : 
                    `<div class="mockup-no-image"><i class="fas fa-image"></i></div>`
                  }
                </div>
                <div class="mockup-info">
                  <h4>${mockup.titulo || 'Mockup'}</h4>
                  <p class="mockup-date">${Utils.formatDate(mockup.dataCriacao)}</p>
                </div>
                <div class="mockup-actions">
                  <button class="btn btn-sm btn-primary view-mockup-btn" title="Visualizar">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-mockup-btn" title="Excluir">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      // Configurar botão de novo mockup
      const newMockupBtn = document.getElementById('new-mockup-btn');
      if (newMockupBtn) {
        newMockupBtn.addEventListener('click', showMockupModal);
      }
      
      // Configurar eventos para os botões
      document.querySelectorAll('.view-mockup-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const mockupItem = e.target.closest('.mockup-item');
          if (mockupItem) {
            const mockupId = mockupItem.dataset.id;
            showMockupVariations(mockupId);
          }
        });
      });
      
      document.querySelectorAll('.delete-mockup-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const mockupItem = e.target.closest('.mockup-item');
          if (mockupItem) {
            const mockupId = mockupItem.dataset.id;
            if (confirm('Tem certeza que deseja excluir este mockup?')) {
              deleteMockup(mockupId);
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar mockups:', error);
      
      const mockupsList = document.getElementById('mockups-list');
      if (mockupsList) {
        mockupsList.innerHTML = `
          <div class="mockups-list-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar mockups. Tente novamente.</p>
          </div>
        `;
      }
    }
  }
  
  // Mostrar modal de criação de mockup
  function showMockupModal() {
    const mockupModal = document.getElementById('mockup-modal');
    const mockupForm = document.getElementById('mockup-form');
    
    if (!mockupModal || !mockupForm) return;
    
    // Resetar formulário
    mockupForm.reset();
    
    // Resetar campos de range para valores padrão
    document.querySelectorAll('#mockup-form .range-control').forEach(control => {
      const range = control.querySelector('input[type="range"]');
      const value = control.querySelector('.range-value');
      
      if (range && value) {
        range.value = range.defaultValue;
        value.textContent = range.defaultValue;
      }
    });
    
    // Esconder seção de configurações avançadas
    const advancedSettings = document.getElementById('advanced-settings');
    if (advancedSettings) {
      advancedSettings.style.display = 'none';
    }
    
    // Mostrar modal
    mockupModal.style.display = 'flex';
    
    // Configurar controles de range
    setupRangeControls();
    
    // Configurar configurações avançadas
    setupAdvancedSettings();
    
    // Gerar sugestões de prompt
    generatePromptSuggestions();
  }
  
  // Fechar modal de mockup
  function closeMockupModal() {
    const mockupModal = document.getElementById('mockup-modal');
    if (mockupModal) {
      mockupModal.style.display = 'none';
    }
  }
  
  // Configurar controles de range
  function setupRangeControls() {
    document.querySelectorAll('#mockup-form .range-control').forEach(control => {
      const range = control.querySelector('input[type="range"]');
      const value = control.querySelector('.range-value');
      
      if (range && value) {
        // Atualizar valor inicial
        value.textContent = range.value;
        
        // Adicionar evento para atualizar valor ao mover o slider
        range.addEventListener('input', () => {
          value.textContent = range.value;
        });
      }
    });
  }
  
  // Configurar configurações avançadas
  function setupAdvancedSettings() {
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedSettings = document.getElementById('advanced-settings');
    
    if (advancedToggle && advancedSettings) {
      advancedToggle.addEventListener('click', () => {
        if (advancedSettings.style.display === 'none') {
          advancedSettings.style.display = 'block';
          advancedToggle.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar Configurações Avançadas';
        } else {
          advancedSettings.style.display = 'none';
          advancedToggle.innerHTML = '<i class="fas fa-chevron-down"></i> Mostrar Configurações Avançadas';
        }
      });
    }
  }
  
  // Gerar sugestões de prompt
  function generatePromptSuggestions() {
    const promptSuggestions = document.getElementById('prompt-suggestions');
    if (!promptSuggestions) return;
    
    // Exemplos de sugestões
    const suggestions = [
      'Website moderno para empresa de tecnologia',
      'Landing page para produto de beleza',
      'Interface de aplicativo de finanças',
      'Site de e-commerce minimalista',
      'Dashboard administrativo com gráficos',
      'Blog com design responsivo',
      'Página de portfólio para fotógrafo'
    ];
    
    // Renderizar sugestões
    promptSuggestions.innerHTML = suggestions.map(suggestion => {
      return `<button type="button" class="suggestion-btn">${suggestion}</button>`;
    }).join('');
    
    // Adicionar eventos para os botões de sugestão
    document.querySelectorAll('.suggestion-btn').forEach(button => {
      button.addEventListener('click', () => {
        const promptInput = document.getElementById('mockup-prompt');
        if (promptInput) {
          promptInput.value = button.textContent;
        }
      });
    });
  }
  
  // Submeter formulário de mockup
  async function submitMockupForm(event) {
    event.preventDefault();
    
    const mockupForm = document.getElementById('mockup-form');
    const mockupModal = document.getElementById('mockup-modal');
    const loadingContainer = document.getElementById('mockup-loading-container');
    
    if (!mockupForm || !mockupModal || !loadingContainer) return;
    
    // Obter dados do formulário
    const formData = new FormData(mockupForm);
    const mockupData = {
      titulo: formData.get('titulo'),
      prompt: formData.get('prompt'),
      clienteId: window.currentClientId,
      configuracoes: {
        estilo: formData.get('estilo'),
        qualidade: parseInt(formData.get('qualidade')),
        criatividade: parseFloat(formData.get('criatividade')),
        detalhamento: parseInt(formData.get('detalhamento'))
      }
    };
    
    // Validar dados
    if (!mockupData.prompt) {
      alert('O prompt é obrigatório');
      return;
    }
    
    if (!mockupData.clienteId) {
      alert('Selecione um cliente');
      return;
    }
    
    try {
      // Esconder modal e mostrar loading
      mockupModal.style.display = 'none';
      loadingContainer.style.display = 'flex';
      
      // Iniciar simulação de progresso
      startMockupProgressSimulation();
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/mockups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockupData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar mockup');
      }
      
      // Processar resposta
      const mockupResult = await response.json();
      
      // Iniciar monitoramento do mockup
      startMockupMonitoring(mockupResult._id);
      
    } catch (error) {
      console.error('Erro ao criar mockup:', error);
      
      // Esconder loading e mostrar erro
      loadingContainer.style.display = 'none';
      alert('Não foi possível criar o mockup. Tente novamente.');
    }
  }
  
  // Iniciar simulação de progresso do mockup
  function startMockupProgressSimulation() {
    const progressBar = document.getElementById('mockup-progress-bar');
    const progressText = document.getElementById('mockup-progress-text');
    const progressStage = document.getElementById('mockup-progress-stage');
    
    if (!progressBar || !progressText || !progressStage) return;
    
    // Usar o módulo de progresso para gerenciar o progresso
    const progressManager = new Progress.ProgressManager({
      progressBar,
      progressText,
      progressStage,
      stages: [
        { name: 'Analisando prompt...', weight: 10 },
        { name: 'Gerando conceitos...', weight: 20 },
        { name: 'Criando mockups...', weight: 50 },
        { name: 'Finalizando...', weight: 20 }
      ]
    });
    
    progressManager.start();
    
    // Salvar referência para uso posterior
    window.currentMockupProgressManager = progressManager;
  }
  
  // Iniciar monitoramento do mockup
  async function startMockupMonitoring(mockupId) {
    if (!mockupId) return;
    
    try {
      // Verificar status do mockup a cada 2 segundos
      const checkStatus = async () => {
        const response = await fetch(`/api/mockups/${mockupId}/status`);
        
        if (!response.ok) {
          throw new Error('Erro ao verificar status do mockup');
        }
        
        const statusData = await response.json();
        
        // Atualizar progresso
        if (window.currentMockupProgressManager) {
          if (statusData.progresso) {
            window.currentMockupProgressManager.updateProgress(statusData.progresso);
          }
          
          if (statusData.estagio) {
            window.currentMockupProgressManager.updateStage(statusData.estagio);
          }
        }
        
        if (statusData.status === 'concluido') {
          // Mockup concluído, mostrar resultado
          showMockupVariationsForSelection(mockupId);
          
          // Recarregar lista de mockups
          loadClientMockups(window.currentClientId);
          
          return;
        }
        
        // Continuar verificando
        setTimeout(checkStatus, 2000);
      };
      
      // Iniciar verificação
      checkStatus();
      
    } catch (error) {
      console.error('Erro ao monitorar mockup:', error);
      
      // Esconder loading e mostrar erro
      const loadingContainer = document.getElementById('mockup-loading-container');
      if (loadingContainer) {
        loadingContainer.style.display = 'none';
      }
      
      alert('Erro ao processar mockup. Tente novamente.');
    }
  }
  
  // Mostrar variações de mockup para seleção
  async function showMockupVariationsForSelection(mockupId) {
    if (!mockupId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/mockups/${mockupId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar mockup');
      }
      
      // Processar resposta
      const mockupData = await response.json();
      
      // Esconder loading
      const loadingContainer = document.getElementById('mockup-loading-container');
      if (loadingContainer) {
        loadingContainer.style.display = 'none';
      }
      
      // Mostrar container de variações
      const variationsContainer = document.getElementById('mockup-variations-container');
      if (!variationsContainer) return;
      
      variationsContainer.style.display = 'block';
      
      // Renderizar variações
      const variationsGrid = document.getElementById('variations-grid');
      if (!variationsGrid) return;
      
      if (!mockupData.variacoes || !mockupData.variacoes.length) {
        variationsGrid.innerHTML = `
          <div class="variations-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Nenhuma variação disponível</p>
          </div>
        `;
        return;
      }
      
      variationsGrid.innerHTML = mockupData.variacoes.map((variation, index) => {
        return `
          <div class="variation-item" data-index="${index}">
            <div class="variation-preview">
              <img src="${variation.imagemUrl}" alt="Variação ${index + 1}" loading="lazy">
            </div>
            <div class="variation-select">
              <input type="checkbox" id="variation-${index}" class="variation-checkbox">
              <label for="variation-${index}"></label>
            </div>
          </div>
        `;
      }).join('');
      
      // Configurar eventos para seleção de variações
      document.querySelectorAll('.variation-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          updateSelectionCounter();
          updateSaveButton();
        });
      });
      
      // Configurar botão de salvar
      const saveVariationsBtn = document.getElementById('save-variations-btn');
      if (saveVariationsBtn) {
        saveVariationsBtn.addEventListener('click', () => {
          saveSelectedVariations(mockupId, mockupData.variacoes);
        });
        
        // Desabilitar botão inicialmente
        saveVariationsBtn.disabled = true;
      }
      
      // Salvar referência para uso posterior
      window.currentMockupData = mockupData;
      
    } catch (error) {
      console.error('Erro ao carregar variações de mockup:', error);
      
      // Esconder loading e mostrar erro
      const loadingContainer = document.getElementById('mockup-loading-container');
      if (loadingContainer) {
        loadingContainer.style.display = 'none';
      }
      
      alert('Não foi possível carregar as variações do mockup. Tente novamente.');
    }
  }
  
  // Mostrar variações de mockup (visualização)
  async function showMockupVariations(mockupId) {
    if (!mockupId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/mockups/${mockupId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar mockup');
      }
      
      // Processar resposta
      const mockupData = await response.json();
      
      // Mostrar modal de visualização
      const viewModal = document.getElementById('mockup-view-modal');
      if (!viewModal) return;
      
      viewModal.style.display = 'flex';
      
      // Preencher dados do mockup
      const viewTitle = document.getElementById('view-mockup-title');
      const viewDate = document.getElementById('view-mockup-date');
      const viewPrompt = document.getElementById('view-mockup-prompt');
      
      if (viewTitle) viewTitle.textContent = mockupData.titulo || 'Mockup';
      if (viewDate) viewDate.textContent = Utils.formatDate(mockupData.dataCriacao);
      if (viewPrompt) viewPrompt.textContent = mockupData.prompt;
      
      // Renderizar variações
      const viewVariationsGrid = document.getElementById('view-variations-grid');
      if (!viewVariationsGrid) return;
      
      if (!mockupData.variacoes || !mockupData.variacoes.length) {
        viewVariationsGrid.innerHTML = `
          <div class="variations-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Nenhuma variação disponível</p>
          </div>
        `;
        return;
      }
      
      viewVariationsGrid.innerHTML = mockupData.variacoes.map((variation, index) => {
        return `
          <div class="view-variation-item">
            <div class="view-variation-preview">
              <img src="${variation.imagemUrl}" alt="Variação ${index + 1}" loading="lazy">
            </div>
            <div class="view-variation-actions">
              <a href="${variation.imagemUrl}" class="btn btn-sm btn-primary" download target="_blank">
                <i class="fas fa-download"></i> Download
              </a>
            </div>
          </div>
        `;
      }).join('');
      
      // Configurar botão de fechar
      const closeViewBtn = document.getElementById('close-view-btn');
      if (closeViewBtn) {
        closeViewBtn.onclick = () => {
          viewModal.style.display = 'none';
        };
      }
      
    } catch (error) {
      console.error('Erro ao carregar variações de mockup:', error);
      alert('Não foi possível carregar as variações do mockup. Tente novamente.');
    }
  }
  
  // Selecionar variação
  function selectVariation(index) {
    const variationItem = document.querySelector(`.variation-item[data-index="${index}"]`);
    if (!variationItem) return;
    
    const checkbox = variationItem.querySelector('.variation-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      
      // Atualizar contador e botão
      updateSelectionCounter();
      updateSaveButton();
    }
  }
  
  // Atualizar contador de seleção
  function updateSelectionCounter() {
    const selectionCounter = document.getElementById('selection-counter');
    if (!selectionCounter) return;
    
    const checkedCount = document.querySelectorAll('.variation-checkbox:checked').length;
    selectionCounter.textContent = `${checkedCount} variação(ões) selecionada(s)`;
  }
  
  // Atualizar estado do botão de salvar
  function updateSaveButton() {
    const saveVariationsBtn = document.getElementById('save-variations-btn');
    if (!saveVariationsBtn) return;
    
    const checkedCount = document.querySelectorAll('.variation-checkbox:checked').length;
    saveVariationsBtn.disabled = checkedCount === 0;
  }
  
  // Salvar variações selecionadas
  async function saveSelectedVariations(mockupId, variations) {
    if (!mockupId || !variations) return;
    
    // Obter índices das variações selecionadas
    const selectedIndices = [];
    document.querySelectorAll('.variation-checkbox').forEach((checkbox, index) => {
      if (checkbox.checked) {
        selectedIndices.push(index);
      }
    });
    
    if (!selectedIndices.length) {
      alert('Selecione pelo menos uma variação');
      return;
    }
    
    // Mostrar loading
    const variationsContainer = document.getElementById('mockup-variations-container');
    const loadingContainer = document.getElementById('mockup-loading-container');
    
    if (variationsContainer) variationsContainer.style.display = 'none';
    if (loadingContainer) loadingContainer.style.display = 'flex';
    
    // Atualizar mensagem de progresso
    const progressStage = document.getElementById('mockup-progress-stage');
    if (progressStage) progressStage.textContent = 'Salvando variações selecionadas...';
    
    try {
      // Salvar cada variação selecionada
      for (const index of selectedIndices) {
        const variation = variations[index];
        if (variation) {
          await saveSelectedVariation(mockupId, variation);
        }
      }
      
      // Esconder loading
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Recarregar lista de mockups
      loadClientMockups(window.currentClientId);
      
      // Recarregar galeria se estiver disponível
      if (window.AppModules.Gallery && typeof window.AppModules.Gallery.loadClientGallery === 'function') {
        window.AppModules.Gallery.loadClientGallery(window.currentClientId);
      }
      
      // Mostrar mensagem de sucesso
      alert('Variações salvas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar variações:', error);
      
      // Esconder loading e mostrar erro
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      alert('Não foi possível salvar as variações. Tente novamente.');
    }
  }
  
  // Salvar variação selecionada
  async function saveSelectedVariation(mockupId, variation) {
    if (!mockupId || !variation) return;
    
    try {
      // Preparar dados
      const saveData = {
        mockupId,
        variacao: variation
      };
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/mockups/salvar-variacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar variação');
      }
      
      // Processar resposta
      return await response.json();
      
    } catch (error) {
      console.error('Erro ao salvar variação:', error);
      throw error;
    }
  }
  
  // Excluir mockup
  async function deleteMockup(mockupId) {
    if (!mockupId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/mockups/${mockupId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir mockup');
      }
      
      // Recarregar lista de mockups
      loadClientMockups(window.currentClientId);
      
    } catch (error) {
      console.error('Erro ao excluir mockup:', error);
      alert('Não foi possível excluir o mockup. Tente novamente.');
    }
  }
  
  // Iniciar polling de mockup
  function startMockupPolling(mockupId) {
    if (!mockupId) return;
    
    // Verificar status a cada 2 segundos
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/mockups/${mockupId}/status`);
        
        if (!response.ok) {
          clearInterval(pollInterval);
          throw new Error('Erro ao verificar status do mockup');
        }
        
        const statusData = await response.json();
        
        if (statusData.status === 'concluido') {
          clearInterval(pollInterval);
          
          // Recarregar lista de mockups
          loadClientMockups(window.currentClientId);
        }
        
      } catch (error) {
        console.error('Erro ao verificar status do mockup:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Configurar eventos
    setupMockupEvents();
    
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId) {
        loadClientMockups(clientId);
      }
    });
  }
  
  // Configurar eventos do módulo
  function setupMockupEvents() {
    // Botão para fechar modal de mockup
    const closeMockupBtn = document.getElementById('close-mockup-btn');
    if (closeMockupBtn) {
      closeMockupBtn.addEventListener('click', closeMockupModal);
    }
    
    // Formulário de mockup
    const mockupForm = document.getElementById('mockup-form');
    if (mockupForm) {
      mockupForm.addEventListener('submit', submitMockupForm);
    }
    
    // Botão para fechar container de variações
    const closeVariationsBtn = document.getElementById('close-variations-btn');
    if (closeVariationsBtn) {
      closeVariationsBtn.addEventListener('click', () => {
        const variationsContainer = document.getElementById('mockup-variations-container');
        if (variationsContainer) {
          variationsContainer.style.display = 'none';
        }
      });
    }
    
    // Eventos para itens de variação
    document.querySelectorAll('.variation-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Ignorar clique no checkbox
        if (e.target.closest('.variation-checkbox')) return;
        
        const index = item.dataset.index;
        if (index !== undefined) {
          selectVariation(parseInt(index));
        }
      });
    });
  }
  
  // Retornar API pública do módulo
  return {
    init,
    loadClientMockups,
    showMockupModal
  };
})();
