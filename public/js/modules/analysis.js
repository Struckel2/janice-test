// ===== MÓDULO DE ANÁLISE DE EMPRESAS =====
window.AppModules = window.AppModules || {};

window.AppModules.Analysis = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  const Progress = window.AppModules.Progress;
  
  // ===== FUNÇÕES PARA ANÁLISE DE EMPRESAS =====
  
  // Analisar empresa
  async function analyzeCompany(formData) {
    try {
      // Mostrar container de loading
      const loadingContainer = document.getElementById('loading-container');
      const resultContainer = document.getElementById('result-container');
      const errorContainer = document.getElementById('error-container');
      
      if (loadingContainer) loadingContainer.style.display = 'flex';
      if (resultContainer) resultContainer.style.display = 'none';
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
          { name: 'Preparando análise...', weight: 10 },
          { name: 'Coletando dados da empresa...', weight: 20 },
          { name: 'Analisando informações...', weight: 30 },
          { name: 'Gerando relatório...', weight: 30 },
          { name: 'Finalizando...', weight: 10 }
        ]
      });
      
      progressManager.start();
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/analises', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao analisar empresa');
      }
      
      // Processar resposta
      const analysisData = await response.json();
      
      // Simular progresso até 100%
      await progressManager.completeAllStages();
      
      // Mostrar resultados
      displayResults(analysisData);
      
      // Salvar dados da análise atual
      window.currentAnalysisData = analysisData;
      
      return analysisData;
      
    } catch (error) {
      console.error('Erro ao analisar empresa:', error);
      
      // Mostrar erro
      const errorContainer = document.getElementById('error-container');
      const loadingContainer = document.getElementById('loading-container');
      
      if (errorContainer) {
        errorContainer.style.display = 'flex';
        
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
          errorMessage.textContent = error.message || 'Não foi possível analisar a empresa. Tente novamente.';
        }
      }
      
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      throw error;
    }
  }
  
  // Exibir resultados da análise
  function displayResults(analysisData) {
    const resultContainer = document.getElementById('result-container');
    const loadingContainer = document.getElementById('loading-container');
    
    if (!resultContainer || !analysisData) return;
    
    // Esconder loading e mostrar resultados
    if (loadingContainer) loadingContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    
    // Preencher dados básicos
    const resultTitle = document.getElementById('result-title');
    const resultDate = document.getElementById('result-date');
    
    if (resultTitle) resultTitle.textContent = analysisData.empresa || 'Análise de Empresa';
    if (resultDate) resultDate.textContent = Utils.formatDate(analysisData.dataCriacao);
    
    // Preencher resumo
    const resultSummary = document.getElementById('result-summary');
    if (resultSummary && analysisData.resumo) {
      resultSummary.innerHTML = `
        <h3>Resumo da Análise</h3>
        <p>${analysisData.resumo}</p>
      `;
    }
    
    // Preencher pontos fortes
    const resultStrengths = document.getElementById('result-strengths');
    if (resultStrengths && analysisData.pontosFortes && analysisData.pontosFortes.length) {
      resultStrengths.innerHTML = `
        <h3>Pontos Fortes</h3>
        <ul>
          ${analysisData.pontosFortes.map(point => `<li>${point}</li>`).join('')}
        </ul>
      `;
    }
    
    // Preencher pontos fracos
    const resultWeaknesses = document.getElementById('result-weaknesses');
    if (resultWeaknesses && analysisData.pontosFracos && analysisData.pontosFracos.length) {
      resultWeaknesses.innerHTML = `
        <h3>Pontos de Atenção</h3>
        <ul>
          ${analysisData.pontosFracos.map(point => `<li>${point}</li>`).join('')}
        </ul>
      `;
    }
    
    // Preencher recomendações
    const resultRecommendations = document.getElementById('result-recommendations');
    if (resultRecommendations && analysisData.recomendacoes && analysisData.recomendacoes.length) {
      resultRecommendations.innerHTML = `
        <h3>Recomendações</h3>
        <ul>
          ${analysisData.recomendacoes.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      `;
    }
    
    // Configurar botões de ação
    const saveAnalysisBtn = document.getElementById('save-analysis-btn');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');
    
    if (saveAnalysisBtn) {
      saveAnalysisBtn.onclick = () => {
        // Esconder botão após salvar
        saveAnalysisBtn.style.display = 'none';
        
        // Mostrar mensagem de sucesso
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Análise salva com sucesso!';
        
        saveAnalysisBtn.parentNode.appendChild(successMessage);
        
        // Remover mensagem após alguns segundos
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 3000);
        
        // Recarregar lista de análises
        loadClientAnalyses(window.currentClientId);
      };
    }
    
    if (newAnalysisBtn) {
      newAnalysisBtn.onclick = () => {
        showAnalysisForm();
      };
    }
  }
  
  // Carregar análises de um cliente
  async function loadClientAnalyses(clientId) {
    if (!clientId) return;
    
    try {
      const analysisList = document.getElementById('analysis-list');
      if (!analysisList) return;
      
      // Mostrar loading state
      analysisList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando análises...</p>
        </div>
      `;
      
      // Fazer requisição para o servidor usando safeFetch
      const analyses = await Utils.safeFetch(`/api/clientes/${clientId}/analises`);
      
      // Se a resposta for null (redirecionamento de autenticação), sair da função
      if (analyses === null) {
        return;
      }
      
      // Verificar se há análises
      if (!analyses.length) {
        analysisList.innerHTML = `
          <div class="analysis-list-empty">
            <i class="fas fa-chart-line"></i>
            <p>Nenhuma análise encontrada</p>
            <button id="new-analysis-btn-empty" class="btn btn-primary">
              <i class="fas fa-plus"></i> Nova Análise
            </button>
          </div>
        `;
        
        // Configurar botão de nova análise
        const newAnalysisBtn = document.getElementById('new-analysis-btn-empty');
        if (newAnalysisBtn) {
          newAnalysisBtn.addEventListener('click', showAnalysisForm);
        }
        
        return;
      }
      
      // Ordenar análises por data (mais recentes primeiro)
      analyses.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de análises
      analysisList.innerHTML = analyses.map(analysis => {
        return `
          <div class="analysis-item" data-id="${analysis._id}">
            <div class="analysis-item-header">
              <h4>${analysis.empresa || 'Análise de Empresa'}</h4>
              <span class="analysis-date">${Utils.formatDate(analysis.dataCriacao)}</span>
            </div>
            <div class="analysis-item-summary">
              <p>${analysis.resumo ? Utils.truncateText(analysis.resumo, 150) : 'Sem resumo disponível'}</p>
            </div>
            <div class="analysis-item-actions">
              <button class="btn btn-sm btn-primary view-analysis-btn">
                <i class="fas fa-eye"></i> Visualizar
              </button>
              <button class="btn btn-sm btn-danger delete-analysis-btn">
                <i class="fas fa-trash"></i> Excluir
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Configurar eventos para os botões
      document.querySelectorAll('.view-analysis-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const analysisItem = e.target.closest('.analysis-item');
          if (analysisItem) {
            const analysisId = analysisItem.dataset.id;
            viewAnalysis(analysisId);
          }
        });
      });
      
      document.querySelectorAll('.delete-analysis-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const analysisItem = e.target.closest('.analysis-item');
          if (analysisItem) {
            const analysisId = analysisItem.dataset.id;
            if (confirm('Tem certeza que deseja excluir esta análise?')) {
              deleteAnalysis(analysisId);
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
      
      const analysisList = document.getElementById('analysis-list');
      if (analysisList) {
        analysisList.innerHTML = `
          <div class="analysis-list-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar análises. Tente novamente.</p>
          </div>
        `;
      }
    }
  }
  
  // Excluir análise
  async function deleteAnalysis(analysisId) {
    if (!analysisId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/analises/${analysisId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir análise');
      }
      
      // Recarregar lista de análises
      loadClientAnalyses(window.currentClientId);
      
    } catch (error) {
      console.error('Erro ao excluir análise:', error);
      alert('Não foi possível excluir a análise. Tente novamente.');
    }
  }
  
  // Visualizar análise
  async function viewAnalysis(analysisId) {
    if (!analysisId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/analises/${analysisId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar análise');
      }
      
      // Processar resposta
      const analysisData = await response.json();
      
      // Mostrar resultados
      displayResults(analysisData);
      
      // Salvar dados da análise atual
      window.currentAnalysisData = analysisData;
      
      // Esconder formulário e mostrar resultados
      const analysisFormContainer = document.getElementById('analysis-form-container');
      const resultContainer = document.getElementById('result-container');
      
      if (analysisFormContainer) analysisFormContainer.style.display = 'none';
      if (resultContainer) resultContainer.style.display = 'block';
      
    } catch (error) {
      console.error('Erro ao visualizar análise:', error);
      alert('Não foi possível carregar a análise. Tente novamente.');
    }
  }
  
  // Mostrar formulário de análise
  function showAnalysisForm() {
    // Esconder containers de resultado e erro
    const resultContainer = document.getElementById('result-container');
    const errorContainer = document.getElementById('error-container');
    const analysisFormContainer = document.getElementById('analysis-form-container');
    
    if (resultContainer) resultContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (analysisFormContainer) analysisFormContainer.style.display = 'block';
    
    // Limpar formulário
    const analysisForm = document.getElementById('analysis-form');
    if (analysisForm) analysisForm.reset();
    
    // Preencher CNPJ do cliente atual
    const cnpjInput = document.getElementById('analysis-cnpj');
    const detailClientCnpj = document.getElementById('detail-client-cnpj');
    
    if (cnpjInput && detailClientCnpj && detailClientCnpj.textContent) {
      cnpjInput.value = detailClientCnpj.textContent;
    }
  }
  
  // Criar nova análise
  async function createNewAnalysis(event) {
    event.preventDefault();
    
    const cnpjInput = document.getElementById('analysis-cnpj');
    
    if (!cnpjInput || !cnpjInput.value.trim()) {
      alert('O CNPJ é obrigatório');
      return;
    }
    
    try {
      // Preparar dados do formulário
      const formData = new FormData();
      formData.append('cnpj', cnpjInput.value.trim());
      formData.append('clienteId', window.currentClientId);
      
      // Analisar empresa
      await analyzeCompany(formData);
      
    } catch (error) {
      console.error('Erro ao criar análise:', error);
      // Erro já tratado na função analyzeCompany
    }
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Configurar eventos
    setupAnalysisEvents();
    
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId) {
        loadClientAnalyses(clientId);
      }
    });
  }
  
  // Configurar eventos do módulo
  function setupAnalysisEvents() {
    // Submissão do formulário de análise
    const analysisForm = document.getElementById('analysis-form');
    if (analysisForm) {
      analysisForm.addEventListener('submit', createNewAnalysis);
    }
    
    // Botão para cancelar análise
    const cancelAnalysisBtn = document.getElementById('cancel-analysis-btn');
    if (cancelAnalysisBtn) {
      cancelAnalysisBtn.addEventListener('click', () => {
        const analysisFormContainer = document.getElementById('analysis-form-container');
        if (analysisFormContainer) analysisFormContainer.style.display = 'none';
      });
    }
    
    // Escutar evento para mostrar formulário de análise
    document.addEventListener('show-analysis-form', showAnalysisForm);
  }
  
  // ===== EXPORTAR FUNÇÕES PÚBLICAS =====
  return {
    init: init,
    analyzeCompany: analyzeCompany,
    displayResults: displayResults,
    loadClientAnalyses: loadClientAnalyses,
    deleteAnalysis: deleteAnalysis,
    viewAnalysis: viewAnalysis,
    showAnalysisForm: showAnalysisForm,
    createNewAnalysis: createNewAnalysis
  };
})();
