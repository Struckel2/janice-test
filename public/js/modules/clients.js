// ===== MÓDULO DE GERENCIAMENTO DE CLIENTES =====
window.AppModules = window.AppModules || {};

window.AppModules.Clients = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  
  // Carregar lista de clientes
  async function loadClients() {
    try {
      const clients = await Utils.safeFetch('/api/clientes');
      
      if (clients === null) return;
      
      window.currentClients = clients;
      renderClientList(clients);
      
      return clients;
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      const clientList = document.getElementById('client-list');
      if (clientList) {
        clientList.innerHTML = `
          <div class="client-list-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar clientes. Tente novamente.</p>
          </div>
        `;
      }
    }
  }
  
  // Renderizar lista de clientes
  function renderClientList(clients) {
    const clientList = document.getElementById('client-list');
    if (!clientList) return;
    
    if (!clients.length) {
      clientList.innerHTML = `
        <div class="client-list-empty">
          <i class="fas fa-users"></i>
          <p>Nenhum cliente cadastrado</p>
        </div>
      `;
      return;
    }
    
    clients.sort((a, b) => a.nome.localeCompare(b.nome));
    
    clientList.innerHTML = clients.map(client => {
      const clientColor = client.cor || '#6a5acd';
      const backgroundStyle = `background-color: ${Utils.hexToRgba(clientColor, 0.1)};`;
      
      return `
        <div class="client-item" data-id="${client._id}" style="${backgroundStyle}">
          <div class="client-item-logo">
            ${client.logo 
              ? `<img src="${client.logo}" alt="${client.nome}">`
              : `<i class="fas fa-building"></i>`}
          </div>
          <div class="client-item-info">
            <h4>${client.nome}</h4>
            <p>CNPJ: ${Utils.formatCnpj(client.cnpj)}</p>
          </div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.client-item').forEach(item => {
      item.addEventListener('click', () => {
        const clientId = item.dataset.id;
        loadClientDetails(clientId);
        
        document.querySelectorAll('.client-item').forEach(el => {
          el.classList.remove('active');
        });
        item.classList.add('active');
      });
    });
  }
  
  // Carregar detalhes de um cliente
  async function loadClientDetails(clientId) {
    try {
      console.log(`🔄 [DEBUG] Carregando detalhes do cliente: ${clientId}`);
      
      showTabLoadingStates();
      
      const actionPlanResultContainer = document.getElementById('action-plan-result-container');
      const transcriptionResultContainer = document.getElementById('transcription-result-container');
      const resultContainer = document.getElementById('result-container');
      const loadingContainer = document.getElementById('loading-container');
      const errorContainer = document.getElementById('error-container');
      
      if (actionPlanResultContainer) actionPlanResultContainer.style.display = 'none';
      if (transcriptionResultContainer) transcriptionResultContainer.style.display = 'none';
      if (resultContainer) resultContainer.style.display = 'none';
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (errorContainer) errorContainer.style.display = 'none';
      
      window.currentActionPlanData = null;
      window.currentTranscriptionData = null;
      window.currentAnalysisData = null;
      
      window.currentClientId = clientId;
      
      const response = await fetch(`/api/clientes/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do cliente');
      }
      
      const client = await response.json();
      
      const detailClientName = document.getElementById('detail-client-name');
      const detailClientCnpj = document.getElementById('detail-client-cnpj');
      
      if (detailClientName) detailClientName.textContent = client.nome;
      if (detailClientCnpj) detailClientCnpj.textContent = Utils.formatCnpj(client.cnpj);
      
      const centralClientName = document.getElementById('central-client-name');
      const centralClientCnpj = document.getElementById('central-client-cnpj');
      
      if (centralClientName) centralClientName.textContent = client.nome;
      if (centralClientCnpj) centralClientCnpj.textContent = Utils.formatCnpj(client.cnpj);
      
      updateClientLogos(client.logo);
      
      const clientFormContainer = document.getElementById('client-form-container');
      const clientDetailsContainer = document.getElementById('client-details-container');
      const welcomeContainer = document.getElementById('welcome-container');
      const clientDetailsPanel = document.getElementById('client-details-panel');
      
      if (clientFormContainer) clientFormContainer.style.display = 'none';
      if (clientDetailsContainer) clientDetailsContainer.style.display = 'block';
      if (welcomeContainer) welcomeContainer.style.display = 'none';
      if (clientDetailsPanel) clientDetailsPanel.style.display = 'block';
      if (resultContainer) resultContainer.style.display = 'none';
      
      console.log(`📊 [DEBUG] Carregando todos os dados do cliente ${clientId} simultaneamente...`);
      
      try {
        const event = new CustomEvent('client-selected', { detail: { clientId } });
        document.dispatchEvent(event);
        
        console.log(`✅ [DEBUG] Todos os dados do cliente ${clientId} carregados com sucesso`);
        
        hideTabLoadingStates();
        
      } catch (error) {
        console.error(`❌ [DEBUG] Erro ao carregar dados do cliente ${clientId}:`, error);
        hideTabLoadingStates();
        
        showTabErrors();
      }
      
      const editClientBtn = document.getElementById('edit-client-btn');
      const newAnalysisBtn = document.getElementById('new-analysis-btn');
      const deleteClientBtn = document.getElementById('delete-client-btn');
      
      if (editClientBtn) {
        editClientBtn.onclick = () => {
          setupClientForm('edit', client);
        };
      }
      
      if (newAnalysisBtn) {
        newAnalysisBtn.onclick = () => {
          const event = new CustomEvent('show-analysis-form');
          document.dispatchEvent(event);
        };
      }
      
      const newTranscriptionBtn = document.getElementById('new-transcription-btn');
      if (newTranscriptionBtn) {
        newTranscriptionBtn.onclick = () => {
          const event = new CustomEvent('show-transcription-form');
          document.dispatchEvent(event);
        };
      }
      
      if (deleteClientBtn) {
        deleteClientBtn.onclick = () => {
          showDeleteConfirmation(client);
        };
      }
      
    } catch (error) {
      console.error('Erro ao carregar detalhes do cliente:', error);
      alert('Não foi possível carregar os detalhes do cliente. Tente novamente.');
    }
  }
  
  function showTabLoadingStates() {
    console.log('🔄 [DEBUG] Mostrando loading states nas abas...');
    
    const analysisList = document.getElementById('analysis-list');
    if (analysisList) {
      analysisList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando análises...</p>
        </div>
      `;
    }
    
    const transcriptionList = document.getElementById('transcription-list');
    if (transcriptionList) {
      transcriptionList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando transcrições...</p>
        </div>
      `;
    }
    
    const actionPlansList = document.getElementById('action-plans-list');
    if (actionPlansList) {
      actionPlansList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando planos de ação...</p>
        </div>
      `;
    }
  }
  
  function hideTabLoadingStates() {
    console.log('✅ [DEBUG] Escondendo loading states das abas...');
  }
  
  function showTabErrors() {
    console.log('❌ [DEBUG] Mostrando erros nas abas...');
    
    const analysisList = document.getElementById('analysis-list');
    if (analysisList && analysisList.innerHTML.includes('tab-loading')) {
      analysisList.innerHTML = `
        <div class="analysis-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar análises. Tente novamente.</p>
        </div>
      `;
    }
    
    const transcriptionList = document.getElementById('transcription-list');
    if (transcriptionList && transcriptionList.innerHTML.includes('tab-loading')) {
      transcriptionList.innerHTML = `
        <div class="transcription-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar transcrições. Tente novamente.</p>
        </div>
      `;
    }
    
    const actionPlansList = document.getElementById('action-plans-list');
    if (actionPlansList && actionPlansList.innerHTML.includes('tab-loading')) {
      actionPlansList.innerHTML = `
        <div class="action-plans-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar planos de ação. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  function setupClientTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        button.classList.add('active');
        
        const tabName = button.getAttribute('data-tab');
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
          tabContent.classList.add('active');
        }
        
        console.log(`📋 [DEBUG] Aba ${tabName} ativada - dados já carregados`);
      });
    });
  }
  
  function setupClientForm(mode, clientData = null) {
    const clientForm = document.getElementById('client-form');
    const logoPreview = document.getElementById('logo-preview');
    const clientFormTitle = document.getElementById('client-form-title');
    const clientNameInput = document.getElementById('client-name');
    const clientCnpjInput = document.getElementById('client-cnpj');
    
    if (clientForm) clientForm.reset();
    if (logoPreview) {
      logoPreview.style.display = 'none';
      logoPreview.innerHTML = '';
    }
    
    if (mode === 'new') {
      if (clientFormTitle) clientFormTitle.textContent = 'Novo Cliente';
      if (clientCnpjInput) clientCnpjInput.disabled = false;
      if (clientForm) {
        clientForm.dataset.mode = 'new';
        clientForm.dataset.id = '';
      }
      
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        colorInput.value = '#6a5acd';
        setupColorPicker();
      }
    } else if (mode === 'edit' && clientData) {
      if (clientFormTitle) clientFormTitle.textContent = 'Editar Cliente';
      if (clientNameInput) clientNameInput.value = clientData.nome;
      if (clientCnpjInput) {
        clientCnpjInput.value = Utils.formatCnpj(clientData.cnpj);
        clientCnpjInput.disabled = true;
      }
      
      if (clientData.logo && logoPreview) {
        logoPreview.innerHTML = `<img src="${clientData.logo}" alt="Logo">`;
        logoPreview.style.display = 'block';
      }
      
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        colorInput.value = clientData.cor || '#6a5acd';
        setupColorPicker();
      }
      
      if (clientForm) {
        clientForm.dataset.mode = 'edit';
        clientForm.dataset.id = clientData._id;
      }
    }
    
    const clientDetailsContainer = document.getElementById('client-details-container');
    const clientFormContainer = document.getElementById('client-form-container');
    const welcomeContainer = document.getElementById('welcome-container');
    
    if (clientDetailsContainer) clientDetailsContainer.style.display = 'none';
    if (clientFormContainer) clientFormContainer.style.display = 'block';
    if (welcomeContainer) welcomeContainer.style.display = 'none';
  }
  
  async function saveClient(event) {
    event.preventDefault();
    
    const clientForm = document.getElementById('client-form');
    const clientNameInput = document.getElementById('client-name');
    const clientCnpjInput = document.getElementById('client-cnpj');
    const clientLogoInput = document.getElementById('client-logo');
    
    if (!clientForm || !clientNameInput || !clientCnpjInput) return;
    
    const mode = clientForm.dataset.mode;
    const clientId = clientForm.dataset.id;
    
    if (!clientNameInput.value.trim()) {
      alert('O nome da empresa é obrigatório');
      return;
    }
    
    if (mode === 'new' && !clientCnpjInput.value.trim()) {
      alert('O CNPJ é obrigatório');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('nome', clientNameInput.value.trim());
      
      if (mode === 'new') {
        formData.append('cnpj', clientCnpjInput.value.trim());
      }
      
      if (clientLogoInput && clientLogoInput.files.length > 0) {
        formData.append('logo', clientLogoInput.files[0]);
      }
      
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        formData.append('cor', colorInput.value);
      }
      
      let url, method;
      
      if (mode === 'new') {
        url = '/api/clientes';
        method = 'POST';
      } else {
        url = `/api/clientes/${clientId}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.code === 'INVALID_CNPJ') {
          throw new Error(`CNPJ inválido: ${errorData.message}`);
        }
        else if (errorData.code === 'DUPLICATE_CNPJ') {
          throw new Error(`CNPJ duplicado: ${errorData.message}`);
        }
        else if (errorData.code === 'FILE_TOO_LARGE') {
          throw new Error('Imagem muito grande: A imagem do logo deve ter no máximo 5MB.');
        }
        else if (errorData.code === 'VALIDATION_ERROR') {
          const details = errorData.details ? Object.values(errorData.details).join('\n- ') : '';
          throw new Error(`Dados inválidos:\n- ${details || errorData.message}`);
        }
        else {
          throw new Error(errorData.message || 'Erro ao salvar cliente');
        }
      }
      
      const savedClient = await response.json();
      
      await loadClients();
      
      loadClientDetails(savedClient._id);
      
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert(`⚠️ ${error.message || 'Não foi possível salvar o cliente. Tente novamente.'}`);
    }
  }
  
  function setupClickableLogos() {
    const centralLogo = document.getElementById('central-client-logo');
    const detailLogo = document.getElementById('detail-client-logo');
    const centralLogoInput = document.getElementById('central-logo-input');
    const detailLogoInput = document.getElementById('detail-logo-input');
    
    if (!centralLogo || !detailLogo) return;
    
    centralLogo.classList.add('clickable');
    detailLogo.classList.add('clickable');
    
    centralLogo.innerHTML += '<div class="logo-upload-hint">Clique para alterar logo</div>';
    detailLogo.innerHTML += '<div class="logo-upload-hint">Clique para alterar logo</div>';
    
    centralLogo.addEventListener('click', () => {
      if (window.currentClientId && centralLogoInput) {
        centralLogoInput.click();
      }
    });
    
    detailLogo.addEventListener('click', () => {
      if (window.currentClientId && detailLogoInput) {
        detailLogoInput.click();
      }
    });
    
    if (centralLogoInput) {
      centralLogoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          uploadClientLogo(e.target.files[0]);
        }
      });
    }
    
    if (detailLogoInput) {
      detailLogoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          uploadClientLogo(e.target.files[0]);
        }
      });
    }
  }
  
  async function uploadClientLogo(file) {
    if (!window.currentClientId) {
      alert('Nenhum cliente selecionado');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    
    try {
      const centralLogo = document.getElementById('central-client-logo');
      const detailLogo = document.getElementById('detail-client-logo');
      
      if (centralLogo) centralLogo.style.opacity = '0.5';
      if (detailLogo) detailLogo.style.opacity = '0.5';
      
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`/api/clientes/${window.currentClientId}`, {
        method: 'PUT',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar logo');
      }
      
      const updatedClient = await response.json();
      
      updateClientLogos(updatedClient.logo);
      
      await loadClients();
      
      console.log('✅ Logo atualizado com sucesso');
      
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      alert(`Não foi possível atualizar o logo: ${error.message}`);
    } finally {
      const centralLogo = document.getElementById('central-client-logo');
      const detailLogo = document.getElementById('detail-client-logo');
      const centralLogoInput = document.getElementById('central-logo-input');
      const detailLogoInput = document.getElementById('detail-logo-input');
      
      if (centralLogo) centralLogo.style.opacity = '1';
      if (detailLogo) detailLogo.style.opacity = '1';
      
      if (centralLogoInput) centralLogoInput.value = '';
      if (detailLogoInput) detailLogoInput.value = '';
    }
  }
  
  function updateClientLogos(logoUrl) {
    const centralLogo = document.getElementById('central-client-logo');
    const detailLogo = document.getElementById('detail-client-logo');
    
    if (!centralLogo || !detailLogo) return;
    
    if (logoUrl) {
      centralLogo.innerHTML = `
        <img src="${logoUrl}" alt="Logo da empresa">
        <div class="logo-upload-hint">Clique para alterar logo</div>
      `;
      
      detailLogo.innerHTML = `
        <img src="${logoUrl}" alt="Logo da empresa">
        <div class="logo-upload-hint">Clique para alterar logo</div>
      `;
    } else {
      centralLogo.innerHTML = `
        <i class="fas fa-building"></i>
        <div class="logo-upload-hint">Clique para adicionar logo</div>
      `;
      
      detailLogo.innerHTML = `
        <i class="fas fa-building"></i>
        <div class="logo-upload-hint">Clique para adicionar logo</div>
      `;
    }
  }
  
  function setupColorPicker() {
    const colorInput = document.getElementById('client-color');
    const colorSample = document.getElementById('color-sample');
    const colorValue = document.getElementById('color-value');
    
    if (colorInput && colorSample && colorValue) {
      function updateColorPreview(color) {
        colorSample.style.backgroundColor = color;
        colorValue.textContent = color.toUpperCase();
      }
      
      colorInput.addEventListener('input', (e) => {
        updateColorPreview(e.target.value);
      });
      
      colorInput.addEventListener('change', (e) => {
        updateColorPreview(e.target.value);
      });
      
      updateColorPreview(colorInput.value);
    }
  }
  
  function showDeleteConfirmation(client) {
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteClientName = document.getElementById('delete-client-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    if (!deleteConfirmModal || !deleteClientName || !confirmDeleteBtn) return;
    
    deleteClientName.textContent = client.nome;
    
    confirmDeleteBtn.onclick = () => {
      deleteClient(client._id);
    };
    
    deleteConfirmModal.classList.add('show');
  }
  
  async function deleteClient(clientId) {
    try {
      const response = await fetch(`/api/clientes/${clientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir cliente');
      }
      
      const deleteConfirmModal = document.getElementById('delete-confirm-modal');
      if (deleteConfirmModal) {
        deleteConfirmModal.classList.remove('show');
      }
      
      await loadClients();
      
      const clientDetailsContainer = document.getElementById('client-details-container');
      const clientDetailsPanel = document.getElementById('client-details-panel');
      const welcomeContainer = document.getElementById('welcome-container');
      
      if (clientDetailsContainer) clientDetailsContainer.style.display = 'none';
      if (clientDetailsPanel) clientDetailsPanel.style.display = 'none';
      if (welcomeContainer) welcomeContainer.style.display = 'block';
      
      window.currentClientId = null;
      
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert(error.message || 'Não foi possível excluir o cliente. Tente novamente.');
    }
  }
  
  function init() {
    setupClientEvents();
    setupClickableLogos();
    setupClientTabs();
  }
  
  function setupClientEvents() {
    const newClientBtn = document.getElementById('new-client-btn');
    if (newClientBtn) {
      newClientBtn.addEventListener('click', () => {
        setupClientForm('new');
      });
    }
    
    const cancelClientBtn = document.getElementById('cancel-client-btn');
    if (cancelClientBtn) {
      cancelClientBtn.addEventListener('click', () => {
        if (window.currentClientId) {
          const clientFormContainer = document.getElementById('client-form-container');
          const clientDetailsContainer = document.getElementById('client-details-container');
          
          if (clientFormContainer) clientFormContainer.style.display = 'none';
          if (clientDetailsContainer) clientDetailsContainer.style.display = 'block';
        } else {
          const clientFormContainer = document.getElementById('client-form-container');
          const welcomeContainer = document.getElementById('welcome-container');
          
          if (clientFormContainer) clientFormContainer.style.display = 'none';
          if (welcomeContainer) welcomeContainer.style.display = 'block';
        }
      });
    }
    
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
      clientForm.addEventListener('submit', saveClient);
    }
    
    const clientLogoInput = document.getElementById('client-logo');
    const logoPreview = document.getElementById('logo-preview');
    
    if (clientLogoInput && logoPreview) {
      clientLogoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          const reader = new FileReader();
          
          reader.onload = function(event) {
            logoPreview.innerHTML = `<img src="${event.target.result}" alt="Logo Preview">`;
            logoPreview.style.display = 'block';
          };
          
          reader.readAsDataURL(file);
        } else {
          logoPreview.style.display = 'none';
        }
      });
    }
    
    const clientSearchInput = document.getElementById('client-search-input');
    if (clientSearchInput) {
      clientSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
          renderClientList(window.currentClients || []);
          return;
        }
        
        const filteredClients = (window.currentClients || []).filter(client => 
          client.nome.toLowerCase().includes(searchTerm) || 
          client.cnpj.includes(searchTerm)
        );
        
        renderClientList(filteredClients);
      });
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        if (deleteConfirmModal) deleteConfirmModal.classList.remove('show');
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        if (deleteConfirmModal) deleteConfirmModal.classList.remove('show');
      });
    }
    
    window.addEventListener('click', (e) => {
      if (e.target === deleteConfirmModal) {
        deleteConfirmModal.classList.remove('show');
      }
    });
  }
  
  return {
    init: init,
    loadClients: loadClients,
    renderClientList: renderClientList,
    loadClientDetails: loadClientDetails,
    setupClientForm: setupClientForm,
    saveClient: saveClient,
    updateClientLogos: updateClientLogos,
    setupClickableLogos: setupClickableLogos,
    uploadClientLogo: uploadClientLogo,
    setupColorPicker: setupColorPicker,
    showDeleteConfirmation: showDeleteConfirmation,
    deleteClient: deleteClient,
    setupClientTabs: setupClientTabs
  };
})();
