// ===== MÓDULO DE TRANSCRIÇÕES =====
window.AppModules = window.AppModules || {};

window.AppModules.Transcriptions = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  const Progress = window.AppModules.Progress;
  
  // ===== FUNÇÕES PARA GERENCIAMENTO DE TRANSCRIÇÕES =====
  
  // Carregar transcrições de um cliente
  async function loadClientTranscriptions(clientId) {
    if (!clientId) return;
    
    try {
      const transcriptionList = document.getElementById('transcription-list');
      if (!transcriptionList) return;
      
      // Mostrar loading state
      transcriptionList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando transcrições...</p>
        </div>
      `;
      
      // Fazer requisição para o servidor usando safeFetch
      const transcriptions = await Utils.safeFetch(`/api/clientes/${clientId}/transcricoes`);
      
      // Se a resposta for null (redirecionamento de autenticação), sair da função
      if (transcriptions === null) {
        return;
      }
      
      // Verificar se há transcrições
      if (!transcriptions.length) {
        transcriptionList.innerHTML = `
          <div class="transcription-list-empty">
            <i class="fas fa-file-audio"></i>
            <p>Nenhuma transcrição encontrada</p>
            <button id="new-transcription-btn-empty" class="btn btn-primary">
              <i class="fas fa-plus"></i> Nova Transcrição
            </button>
          </div>
        `;
        
        // Configurar botão de nova transcrição
        const newTranscriptionBtn = document.getElementById('new-transcription-btn-empty');
        if (newTranscriptionBtn) {
          newTranscriptionBtn.addEventListener('click', showTranscriptionForm);
        }
        
        return;
      }
      
      // Ordenar transcrições por data (mais recentes primeiro)
      transcriptions.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de transcrições
      transcriptionList.innerHTML = transcriptions.map(transcription => {
        return `
          <div class="transcription-item" data-id="${transcription._id}">
            <div class="transcription-item-header">
              <h4>${transcription.titulo || 'Transcrição'}</h4>
              <span class="transcription-date">${Utils.formatDate(transcription.dataCriacao)}</span>
            </div>
            <div class="transcription-item-summary">
              <p>${transcription.texto ? Utils.truncateText(transcription.texto, 150) : 'Sem texto disponível'}</p>
            </div>
            <div class="transcription-item-actions">
              <button class="btn btn-sm btn-primary view-transcription-btn">
                <i class="fas fa-eye"></i> Visualizar
              </button>
              <button class="btn btn-sm btn-danger delete-transcription-btn">
                <i class="fas fa-trash"></i> Excluir
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Configurar eventos para os botões
      document.querySelectorAll('.view-transcription-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const transcriptionItem = e.target.closest('.transcription-item');
          if (transcriptionItem) {
            const transcriptionId = transcriptionItem.dataset.id;
            viewTranscription(transcriptionId);
          }
        });
      });
      
      document.querySelectorAll('.delete-transcription-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const transcriptionItem = e.target.closest('.transcription-item');
          if (transcriptionItem) {
            const transcriptionId = transcriptionItem.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta transcrição?')) {
              deleteTranscription(transcriptionId);
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar transcrições:', error);
      
      const transcriptionList = document.getElementById('transcription-list');
      if (transcriptionList) {
        transcriptionList.innerHTML = `
          <div class="transcription-list-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar transcrições. Tente novamente.</p>
          </div>
        `;
      }
    }
  }
  
  // Visualizar transcrição
  async function viewTranscription(transcriptionId) {
    if (!transcriptionId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/transcricoes/${transcriptionId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar transcrição');
      }
      
      // Processar resposta
      const transcriptionData = await response.json();
      
      // Mostrar resultados
      showTranscriptionResult(transcriptionData);
      
      // Salvar dados da transcrição atual
      window.currentTranscriptionData = transcriptionData;
      
    } catch (error) {
      console.error('Erro ao visualizar transcrição:', error);
      alert('Não foi possível carregar a transcrição. Tente novamente.');
    }
  }
  
  // Mostrar formulário de transcrição
  function showTranscriptionForm() {
    // Esconder containers de resultado
    const transcriptionResultContainer = document.getElementById('transcription-result-container');
    const transcriptionFormContainer = document.getElementById('transcription-form-container');
    
    if (transcriptionResultContainer) transcriptionResultContainer.style.display = 'none';
    if (transcriptionFormContainer) transcriptionFormContainer.style.display = 'block';
    
    // Limpar formulário
    const transcriptionForm = document.getElementById('transcription-form');
    if (transcriptionForm) transcriptionForm.reset();
    
    // Limpar preview de arquivo
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
      filePreview.innerHTML = '';
      filePreview.style.display = 'none';
    }
  }
  
  // Mostrar resultado da transcrição
  function showTranscriptionResult(transcriptionData) {
    const transcriptionResultContainer = document.getElementById('transcription-result-container');
    const transcriptionFormContainer = document.getElementById('transcription-form-container');
    
    if (!transcriptionResultContainer || !transcriptionData) return;
    
    // Esconder formulário e mostrar resultados
    if (transcriptionFormContainer) transcriptionFormContainer.style.display = 'none';
    transcriptionResultContainer.style.display = 'block';
    
    // Preencher dados básicos
    const resultTitle = document.getElementById('transcription-result-title');
    const resultDate = document.getElementById('transcription-result-date');
    
    if (resultTitle) resultTitle.textContent = transcriptionData.titulo || 'Transcrição';
    if (resultDate) resultDate.textContent = Utils.formatDate(transcriptionData.dataCriacao);
    
    // Preencher texto da transcrição
    const resultText = document.getElementById('transcription-result-text');
    if (resultText && transcriptionData.texto) {
      resultText.innerHTML = `
        <div class="transcription-text">
          ${transcriptionData.texto.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
      `;
    }
    
    // Configurar botões de ação
    const newTranscriptionBtn = document.getElementById('new-transcription-btn-result');
    
    if (newTranscriptionBtn) {
      newTranscriptionBtn.onclick = () => {
        showTranscriptionForm();
      };
    }
  }
  
  // Submeter formulário de transcrição
  async function submitTranscriptionForm(event) {
    event.preventDefault();
    
    const titleInput = document.getElementById('transcription-title');
    const fileInput = document.getElementById('transcription-file');
    
    if (!titleInput || !fileInput) return;
    
    if (!titleInput.value.trim()) {
      alert('O título é obrigatório');
      return;
    }
    
    if (!fileInput.files.length) {
      alert('Por favor, selecione um arquivo de áudio');
      return;
    }
    
    try {
      // Mostrar container de loading
      const loadingContainer = document.getElementById('loading-container');
      const transcriptionFormContainer = document.getElementById('transcription-form-container');
      const errorContainer = document.getElementById('error-container');
      
      if (loadingContainer) loadingContainer.style.display = 'flex';
      if (transcriptionFormContainer) transcriptionFormContainer.style.display = 'none';
      if (errorContainer) errorContainer.style.display = 'none';
      
      // Iniciar simulação de progresso
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      const progressStage = document.getElementById('progress-stage');
      
      // Usar o módulo de progresso para gerenciar o progresso
      const progressManager = new Progress.ProgressManager({
        progressBar,
        progressText,
        progressStage,
        stages: [
          { name: 'Preparando arquivo...', weight: 10 },
          { name: 'Enviando áudio...', weight: 20 },
          { name: 'Processando transcrição...', weight: 50 },
          { name: 'Finalizando...', weight: 20 }
        ]
      });
      
      progressManager.start();
      
      // Preparar dados do formulário
      const formData = new FormData();
      formData.append('titulo', titleInput.value.trim());
      formData.append('arquivo', fileInput.files[0]);
      formData.append('clienteId', window.currentClientId);
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/transcricoes', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar transcrição');
      }
      
      // Processar resposta
      const transcriptionData = await response.json();
      
      // Simular progresso até 100%
      await progressManager.completeAllStages();
      
      // Mostrar resultados
      showTranscriptionResult(transcriptionData);
      
      // Salvar dados da transcrição atual
      window.currentTranscriptionData = transcriptionData;
      
      // Esconder loading
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Recarregar lista de transcrições
      loadClientTranscriptions(window.currentClientId);
      
    } catch (error) {
      console.error('Erro ao processar transcrição:', error);
      
      // Mostrar erro
      const errorContainer = document.getElementById('error-container');
      const loadingContainer = document.getElementById('loading-container');
      
      if (errorContainer) {
        errorContainer.style.display = 'flex';
        
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
          errorMessage.textContent = error.message || 'Não foi possível processar a transcrição. Tente novamente.';
        }
      }
      
      if (loadingContainer) loadingContainer.style.display = 'none';
    }
  }
  
  // Excluir transcrição
  async function deleteTranscription(transcriptionId) {
    if (!transcriptionId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/transcricoes/${transcriptionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir transcrição');
      }
      
      // Recarregar lista de transcrições
      loadClientTranscriptions(window.currentClientId);
      
      // Se a transcrição atual foi excluída, esconder o container de resultado
      if (window.currentTranscriptionData && window.currentTranscriptionData._id === transcriptionId) {
        const transcriptionResultContainer = document.getElementById('transcription-result-container');
        if (transcriptionResultContainer) transcriptionResultContainer.style.display = 'none';
        
        window.currentTranscriptionData = null;
      }
      
    } catch (error) {
      console.error('Erro ao excluir transcrição:', error);
      alert('Não foi possível excluir a transcrição. Tente novamente.');
    }
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Configurar eventos
    setupTranscriptionEvents();
    
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId) {
        loadClientTranscriptions(clientId);
      }
    });
  }
  
  // Configurar eventos do módulo
  function setupTranscriptionEvents() {
    // Submissão do formulário de transcrição
    const transcriptionForm = document.getElementById('transcription-form');
    if (transcriptionForm) {
      transcriptionForm.addEventListener('submit', submitTranscriptionForm);
    }
    
    // Botão para cancelar transcrição
    const cancelTranscriptionBtn = document.getElementById('cancel-transcription-btn');
    if (cancelTranscriptionBtn) {
      cancelTranscriptionBtn.addEventListener('click', () => {
        const transcriptionFormContainer = document.getElementById('transcription-form-container');
        if (transcriptionFormContainer) transcriptionFormContainer.style.display = 'none';
      });
    }
    
    // Preview de arquivo ao selecionar
    const fileInput = document.getElementById('transcription-file');
    const filePreview = document.getElementById('file-preview');
    
    if (fileInput && filePreview) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          
          // Verificar se é um arquivo de áudio
          if (!file.type.startsWith('audio/')) {
            alert('Por favor, selecione apenas arquivos de áudio');
            fileInput.value = '';
            filePreview.style.display = 'none';
            return;
          }
          
          // Mostrar informações do arquivo
          filePreview.innerHTML = `
            <div class="file-info">
              <i class="fas fa-file-audio"></i>
              <div class="file-details">
                <p class="file-name">${file.name}</p>
                <p class="file-size">${formatFileSize(file.size)}</p>
              </div>
            </div>
          `;
          filePreview.style.display = 'block';
        } else {
          filePreview.style.display = 'none';
        }
      });
    }
    
    // Escutar evento para mostrar formulário de transcrição
    document.addEventListener('show-transcription-form', showTranscriptionForm);
  }
  
  // ===== FUNÇÕES UTILITÁRIAS =====
  
  // Formatar tamanho de arquivo
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // ===== EXPORTAR FUNÇÕES PÚBLICAS =====
  return {
    init: init,
    loadClientTranscriptions: loadClientTranscriptions,
    viewTranscription: viewTranscription,
    showTranscriptionForm: showTranscriptionForm,
    showTranscriptionResult: showTranscriptionResult,
    submitTranscriptionForm: submitTranscriptionForm,
    deleteTranscription: deleteTranscription
  };
})();
