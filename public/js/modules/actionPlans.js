// ===== MÓDULO DE PLANOS DE AÇÃO =====
window.AppModules = window.AppModules || {};

window.AppModules.ActionPlans = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  const Progress = window.AppModules.Progress;
  
  // Carregar planos de ação de um cliente
  async function loadClientActionPlans(clientId) {
    if (!clientId) return;
    
    try {
      const actionPlansList = document.getElementById('action-plans-list');
      if (!actionPlansList) return;
      
      // Mostrar loading state
      actionPlansList.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando planos de ação...</p>
        </div>
      `;
      
      // Fazer requisição para o servidor usando safeFetch
      const actionPlans = await Utils.safeFetch(`/api/clientes/${clientId}/planos-acao`);
      
      // Se a resposta for null (redirecionamento de autenticação), sair da função
      if (actionPlans === null) {
        return;
      }
      
      // Verificar se há planos de ação
      if (!actionPlans.length) {
        actionPlansList.innerHTML = `
          <div class="action-plans-list-empty">
            <i class="fas fa-tasks"></i>
            <p>Nenhum plano de ação encontrado</p>
            <button id="new-action-plan-btn-empty" class="btn btn-primary">
              <i class="fas fa-plus"></i> Novo Plano de Ação
            </button>
          </div>
        `;
        
        // Configurar botão de novo plano de ação
        const newActionPlanBtn = document.getElementById('new-action-plan-btn-empty');
        if (newActionPlanBtn) {
          newActionPlanBtn.addEventListener('click', showActionPlanForm);
        }
        
        return;
      }
      
      // Ordenar planos de ação por data (mais recentes primeiro)
      actionPlans.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de planos de ação
      actionPlansList.innerHTML = actionPlans.map(actionPlan => {
        return `
          <div class="action-plan-item" data-id="${actionPlan._id}">
            <div class="action-plan-item-header">
              <h4>${actionPlan.titulo || 'Plano de Ação'}</h4>
              <span class="action-plan-date">${Utils.formatDate(actionPlan.dataCriacao)}</span>
            </div>
            <div class="action-plan-item-summary">
              <p>${actionPlan.descricao ? Utils.truncateText(actionPlan.descricao, 150) : 'Sem descrição disponível'}</p>
            </div>
            <div class="action-plan-item-actions">
              <button class="btn btn-sm btn-primary view-action-plan-btn">
                <i class="fas fa-eye"></i> Visualizar
              </button>
              <button class="btn btn-sm btn-danger delete-action-plan-btn">
                <i class="fas fa-trash"></i> Excluir
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Configurar eventos para os botões
      document.querySelectorAll('.view-action-plan-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const actionPlanItem = e.target.closest('.action-plan-item');
          if (actionPlanItem) {
            const actionPlanId = actionPlanItem.dataset.id;
            viewActionPlan(actionPlanId);
          }
        });
      });
      
      document.querySelectorAll('.delete-action-plan-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const actionPlanItem = e.target.closest('.action-plan-item');
          if (actionPlanItem) {
            const actionPlanId = actionPlanItem.dataset.id;
            if (confirm('Tem certeza que deseja excluir este plano de ação?')) {
              deleteActionPlan(actionPlanId);
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar planos de ação:', error);
      
      const actionPlansList = document.getElementById('action-plans-list');
      if (actionPlansList) {
        actionPlansList.innerHTML = `
          <div class="action-plans-list-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar planos de ação. Tente novamente.</p>
          </div>
        `;
      }
    }
  }
  
  // Visualizar plano de ação
  async function viewActionPlan(actionPlanId) {
    console.log('Visualizando plano de ação:', actionPlanId);
    // Implementação simplificada
  }
  
  // Mostrar formulário de plano de ação
  function showActionPlanForm() {
    console.log('Mostrando formulário de plano de ação');
    // Implementação simplificada
  }
  
  // Carregar documentos disponíveis para o plano de ação
  async function loadAvailableDocuments() {
    console.log('Carregando documentos disponíveis');
    // Implementação simplificada
  }
  
  // Renderizar transcrições disponíveis
  function renderAvailableTranscriptions(transcriptions) {
    console.log('Renderizando transcrições disponíveis');
    // Implementação simplificada
  }
  
  // Renderizar análises disponíveis
  function renderAvailableAnalyses(analyses) {
    console.log('Renderizando análises disponíveis');
    // Implementação simplificada
  }
  
  // Alternar seleção de documento
  function toggleDocumentSelection(documentItem, isSelected) {
    console.log('Alternando seleção de documento');
    // Implementação simplificada
  }
  
  // Atualizar lista de documentos selecionados
  function updateSelectedDocumentsList(documentId, documentType, documentTitle, documentDate, isAdding) {
    console.log('Atualizando lista de documentos selecionados');
    // Implementação simplificada
  }
  
  // Remover documento da seleção
  function removeDocumentFromSelection(documentId) {
    console.log('Removendo documento da seleção');
    // Implementação simplificada
  }
  
  // Atualizar estado do botão de envio
  function updateSubmitButtonState() {
    console.log('Atualizando estado do botão de envio');
    // Implementação simplificada
  }
  
  // Submeter formulário de plano de ação
  async function submitActionPlanForm(event) {
    if (event) event.preventDefault();
    console.log('Submetendo formulário de plano de ação');
    // Implementação simplificada
  }
  
  // Iniciar monitoramento do plano de ação
  async function startActionPlanMonitoring(actionPlanId) {
    console.log('Iniciando monitoramento do plano de ação:', actionPlanId);
    // Implementação simplificada
  }
  
  // Excluir plano de ação
  async function deleteActionPlan(actionPlanId) {
    console.log('Excluindo plano de ação:', actionPlanId);
    // Implementação simplificada
  }
  
  // Obter classe CSS para prioridade
  function getPriorityClass(priority) {
    switch (priority) {
      case 'alta':
        return 'priority-high';
      case 'media':
        return 'priority-medium';
      case 'baixa':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }
  
  // Obter label para prioridade
  function getPriorityLabel(priority) {
    switch (priority) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
      default:
        return 'Média';
    }
  }
  
  // Configurar eventos do módulo
  function setupActionPlanEvents() {
    console.log('Configurando eventos do módulo de planos de ação');
    // Implementação simplificada
  }
  
  // Função de inicialização
  function init() {
    // Configurar eventos
    setupActionPlanEvents();
    
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId) {
        loadClientActionPlans(clientId);
      }
    });
  }
  
  // Retornar API pública do módulo
  return {
    init,
    loadClientActionPlans
  };
})();
