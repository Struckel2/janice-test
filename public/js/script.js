document.addEventListener('DOMContentLoaded', () => {
  // ===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
  checkAuthentication();

  // ===== ELEMENTOS DA UI PRINCIPAL =====
  const welcomeContainer = document.getElementById('welcome-container');
  const clientDetailsPanel = document.getElementById('client-details-panel');
  const loadingContainer = document.getElementById('loading-container');
  const resultContainer = document.getElementById('result-container');
  const transcriptionContainer = document.getElementById('transcription-container');
  const transcriptionResultContainer = document.getElementById('transcription-result-container');
  const actionPlanContainer = document.getElementById('action-plan-container');
  const actionPlanResultContainer = document.getElementById('action-plan-result-container');
  
  // Elementos de progresso
  const loadingStatus = document.getElementById('loading-status');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressSteps = {
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    step4: document.getElementById('step-4')
  };
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const tryAgainButton = document.getElementById('try-again');
  const exportPdfButton = document.getElementById('export-pdf');
  const copyReportButton = document.getElementById('copy-report');
  const companyNameEl = document.getElementById('company-name');
  const resultCnpjEl = document.getElementById('result-cnpj');
  const resultDateEl = document.getElementById('result-date');
  
  // Elemento para exibição do PDF
  const pdfViewer = document.getElementById('pdf-viewer');

  // ===== ELEMENTOS DE TRANSCRIÇÃO =====
  const newTranscriptionBtn = document.getElementById('new-transcription-btn');
  const cancelTranscriptionBtn = document.getElementById('cancel-transcription-btn');
  const startTranscriptionBtn = document.getElementById('start-transcription-btn');
  const transcriptionForm = document.getElementById('transcription-form');
  const transcriptionTitleInput = document.getElementById('transcription-title');
  const transcriptionLanguageSelect = document.getElementById('transcription-language');
  const transcriptionFileInput = document.getElementById('transcription-file');
  const audioPreview = document.getElementById('audio-preview');
  const transcriptionList = document.getElementById('transcription-list');
  const transcriptionTitleDisplay = document.getElementById('transcription-title-display');
  const transcriptionDate = document.getElementById('transcription-date');
  const transcriptionDuration = document.getElementById('transcription-duration');
  const transcriptionText = document.getElementById('transcription-text');
  const copyTranscriptionBtn = document.getElementById('copy-transcription');
  const exportTxtBtn = document.getElementById('export-txt');
  const backToClientBtn = document.getElementById('back-to-client');
  
  // ===== ELEMENTOS DO PAINEL DE CLIENTES =====
  const clientList = document.getElementById('client-list');
  const clientSearchInput = document.getElementById('client-search-input');
  const newClientBtn = document.getElementById('new-client-btn');
  const clientFormContainer = document.getElementById('client-form-container');
  const clientForm = document.getElementById('client-form');
  const clientFormTitle = document.getElementById('client-form-title');
  const clientNameInput = document.getElementById('client-name');
  const clientCnpjInput = document.getElementById('client-cnpj');
  const clientLogoInput = document.getElementById('client-logo');
  const logoPreview = document.getElementById('logo-preview');
  const saveClientBtn = document.getElementById('save-client-btn');
  const cancelClientBtn = document.getElementById('cancel-client-btn');
  const clientDetailsContainer = document.getElementById('client-details-container');
  const detailClientName = document.getElementById('detail-client-name');
  const detailClientCnpj = document.getElementById('detail-client-cnpj');
  const detailClientLogo = document.getElementById('detail-client-logo');
  
  // Elementos do painel central de detalhes do cliente
  const centralClientName = document.getElementById('central-client-name');
  const centralClientCnpj = document.getElementById('central-client-cnpj');
  const centralClientLogo = document.getElementById('central-client-logo');
  const editClientBtn = document.getElementById('edit-client-btn');
  const newAnalysisBtn = document.getElementById('new-analysis-btn');
  const deleteClientBtn = document.getElementById('delete-client-btn');
  const analysisList = document.getElementById('analysis-list');
  
  // Elementos do container de análise
  const analysisContainer = document.getElementById('analysis-container');
  const cancelAnalysisBtn = document.getElementById('cancel-analysis-btn');
  const startAnalysisBtn = document.getElementById('start-analysis-btn');
  
  // Elementos do modal de confirmação
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const deleteClientName = document.getElementById('delete-client-name');
  const closeModalBtn = document.querySelector('.close-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  
  // ===== VARIÁVEIS DE ESTADO =====
  let currentAnalysisData = null;
  let currentClients = [];
  let currentClientId = null;
  let currentTranscriptionData = null;
  let currentUser = null; // Informações do usuário logado
  
  // ===== GERENCIADOR DE PROCESSOS ATIVOS =====
  class ActiveProcessesManager {
    constructor() {
      console.log(`🔍 [DEBUG-FRONTEND] ===== INICIALIZANDO ActiveProcessesManager =====`);
      
      this.panel = document.getElementById('active-processes-panel');
      this.processList = document.getElementById('processes-list');
      this.processCount = document.getElementById('process-count');
      this.appWrapper = document.querySelector('.app-wrapper');
      this.eventSource = null;
      this.processes = new Map();
      
      console.log(`🔍 [DEBUG-FRONTEND] Elementos encontrados:`, {
        panel: this.panel ? 'presente' : 'ausente',
        processList: this.processList ? 'presente' : 'ausente',
        processCount: this.processCount ? 'presente' : 'ausente',
        appWrapper: this.appWrapper ? 'presente' : 'ausente'
      });
      
      this.init();
    }
    
    init() {
      console.log(`🔍 [DEBUG-FRONTEND] ===== INICIANDO INICIALIZAÇÃO =====`);
      
      // Carregar processos ativos existentes
      console.log(`🔍 [DEBUG-FRONTEND] Carregando processos ativos existentes...`);
      this.loadActiveProcesses();
      
      // Iniciar conexão SSE
      console.log(`🔍 [DEBUG-FRONTEND] Iniciando conexão SSE...`);
      this.startSSEConnection();
      
      // Configurar eventos de clique nos processos
      console.log(`🔍 [DEBUG-FRONTEND] Configurando event listeners...`);
      this.setupEventListeners();
      
      console.log(`🔍 [DEBUG-FRONTEND] ===== INICIALIZAÇÃO CONCLUÍDA =====`);
    }
    
    async loadActiveProcesses() {
      try {
        console.log('🔍 [DEBUG-LOAD] ===== CARREGANDO PROCESSOS ATIVOS =====');
        
        const response = await fetch('/api/processos/ativos');
        console.log('🔍 [DEBUG-LOAD] Response status:', response.status);
        console.log('🔍 [DEBUG-LOAD] Response ok:', response.ok);
        
        if (response.ok) {
          const processes = await response.json();
          
          console.log('🔍 [DEBUG-LOAD] Resposta da API:', processes);
          console.log('🔍 [DEBUG-LOAD] Tipo da resposta:', typeof processes);
          console.log('🔍 [DEBUG-LOAD] É array?', Array.isArray(processes));
          console.log('🔍 [DEBUG-LOAD] Length:', processes?.length);
          
          // Validar se processes é um array antes de usar forEach
          if (Array.isArray(processes)) {
            console.log('✅ [DEBUG-LOAD] Processando array de processos...');
            processes.forEach((process, index) => {
              console.log(`🔍 [DEBUG-LOAD] Processo ${index}:`, {
                id: process.id,
                tipo: process.tipo,
                status: process.status,
                progresso: process.progresso
              });
              this.processes.set(process.id, process);
            });
            console.log(`✅ [DEBUG-LOAD] ${processes.length} processos carregados no Map local`);
          } else {
            console.warn('⚠️ [DEBUG-LOAD] API retornou dados inválidos para processos ativos:', processes);
            console.warn('⚠️ [DEBUG-LOAD] Esperado: Array, Recebido:', typeof processes);
            // Se não for array, assumir que não há processos ativos
          }
          
          console.log('🔍 [DEBUG-LOAD] Estado final do Map:', {
            totalProcessos: this.processes.size,
            processIds: Array.from(this.processes.keys())
          });
          
          this.updateUI();
        } else {
          console.error('❌ [DEBUG-LOAD] Resposta não OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ [DEBUG-LOAD] Erro ao carregar processos ativos:', error);
      }
    }
    
    startSSEConnection() {
      console.log(`🔍 [DEBUG-SSE] ===== INICIANDO CONEXÃO SSE =====`);
      
      // Fechar conexão anterior se existir
      if (this.eventSource) {
        console.log('🔍 [DEBUG-SSE] Fechando conexão SSE anterior');
        console.log('🔍 [DEBUG-SSE] Estado da conexão anterior:', this.eventSource.readyState);
        this.eventSource.close();
      }
      
      // Limpar timeout de reconexão se existir
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Abrir nova conexão SSE
      console.log('🔍 [DEBUG-SSE] Abrindo nova conexão SSE para /api/processos/sse');
      console.log('🔍 [DEBUG-SSE] URL completa:', window.location.origin + '/api/processos/sse');
      
      try {
        this.eventSource = new EventSource('/api/processos/sse');
        console.log('🔍 [DEBUG-SSE] EventSource criado com sucesso');
        console.log('🔍 [DEBUG-SSE] Estado inicial da conexão:', this.eventSource.readyState);
      } catch (error) {
        console.error('❌ [DEBUG-SSE] Erro ao criar EventSource:', error);
        this.scheduleReconnect();
        return;
      }
      
      this.eventSource.addEventListener('open', () => {
        console.log('✅ [DEBUG-SSE] ===== CONEXÃO SSE ESTABELECIDA COM SUCESSO =====');
        console.log('🔍 [DEBUG-SSE] Estado da conexão:', this.eventSource.readyState);
        console.log('🔍 [DEBUG-SSE] URL da conexão:', this.eventSource.url);
      });
      
      this.eventSource.addEventListener('message', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento message genérico recebido:', event.data);
      });
      
      this.eventSource.addEventListener('processes-list', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento processes-list recebido:', event.data);
        const data = JSON.parse(event.data);
        // Processar lista inicial de processos se necessário
      });
      
      this.eventSource.addEventListener('process-registered', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento process-registered recebido:', event.data);
        const data = JSON.parse(event.data);
        this.addProcess(data.process);
      });
      
      this.eventSource.addEventListener('process-update', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento process-update recebido:', event.data);
        const data = JSON.parse(event.data);
        this.handleProcessUpdate(data);
      });
      
      this.eventSource.addEventListener('process-complete', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento process-complete recebido:', event.data);
        const data = JSON.parse(event.data);
        this.handleProcessComplete(data);
      });
      
      this.eventSource.addEventListener('process-error', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento process-error recebido:', event.data);
        const data = JSON.parse(event.data);
        this.handleProcessError(data);
      });
      
      this.eventSource.addEventListener('process-auto-removed', (event) => {
        console.log('🔍 [DEBUG-SSE] Evento process-auto-removed recebido:', event.data);
        const data = JSON.parse(event.data);
        this.handleProcessAutoRemoved(data);
      });
      
      this.eventSource.addEventListener('error', (event) => {
        console.error('❌ [DEBUG-SSE] ===== ERRO NA CONEXÃO SSE =====');
        console.error('❌ [DEBUG-SSE] Evento de erro:', event);
        console.error('❌ [DEBUG-SSE] ReadyState:', this.eventSource.readyState);
        console.error('❌ [DEBUG-SSE] URL:', this.eventSource.url);
        
        // ReadyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (this.eventSource.readyState === 2) {
          console.log('🔄 [DEBUG-SSE] Conexão fechada, agendando reconexão...');
          this.scheduleReconnect();
        } else {
          console.log('🔍 [DEBUG-SSE] Conexão ainda ativa, aguardando...');
        }
      });
      
      // Timeout de segurança para detectar se a conexão não abre
      setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === 0) {
          console.error('❌ [DEBUG-SSE] TIMEOUT: Conexão SSE não foi estabelecida em 10 segundos');
          console.error('❌ [DEBUG-SSE] ReadyState ainda é CONNECTING (0)');
          console.error('❌ [DEBUG-SSE] Possível problema de autenticação ou rota');
        }
      }, 10000);
    }
    
    handleProcessUpdate(data) {
      const process = this.processes.get(data.processId);
      if (process) {
        process.progresso = data.progresso;
        process.mensagem = data.mensagem;
        process.status = 'em-progresso';
        this.updateUI();
      }
    }
    
    handleProcessComplete(data) {
      console.log('🔍 [DEBUG-FRONTEND] Evento process-complete recebido:', data);
      
      const process = this.processes.get(data.processId);
      if (process) {
        console.log('🔍 [DEBUG-FRONTEND] Processo encontrado no Map local:', process);
        
        process.progresso = 100;
        process.status = 'concluido';
        process.mensagem = 'Processo concluído!';
        process.resourceId = data.resourceId;
        
        console.log('🔍 [DEBUG-FRONTEND] Processo atualizado para concluído:', process);
        
        this.updateUI();
        console.log('🔍 [DEBUG-FRONTEND] UI atualizada após conclusão');
        
        // Agendar remoção automática após 5 segundos (um pouco antes do backend)
        setTimeout(() => {
          console.log('🔍 [DEBUG-FRONTEND] Removendo processo automaticamente após 5 segundos:', data.processId);
          this.removeProcess(data.processId);
        }, 5000);
      } else {
        console.log('❌ [DEBUG-FRONTEND] Processo NÃO encontrado no Map local para processId:', data.processId);
        console.log('🔍 [DEBUG-FRONTEND] Processos disponíveis no Map:', Array.from(this.processes.keys()));
      }
    }
    
    handleProcessError(data) {
      const process = this.processes.get(data.processId);
      if (process) {
        process.status = 'erro';
        process.mensagem = data.erro || 'Erro no processamento';
        this.updateUI();
      }
    }
    
    handleProcessAutoRemoved(data) {
      // Remover processo automaticamente (chamado pelo backend)
      this.removeProcess(data.processId);
    }
    
    addProcess(processData) {
      this.processes.set(processData.id, processData);
      this.updateUI();
    }
    
    removeProcess(processId) {
      this.processes.delete(processId);
      this.updateUI();
      
      // Remover do servidor também
      fetch(`/api/processos/${processId}`, { method: 'DELETE' })
        .catch(error => console.error('Erro ao remover processo:', error));
    }
    
    updateUI() {
      const processCount = this.processes.size;
      
      // Atualizar contador
      this.processCount.textContent = processCount;
      
      // Mostrar/esconder painel
      if (processCount > 0) {
        this.showPanel();
      } else {
        this.hidePanel();
      }
      
      // Renderizar lista de processos
      this.renderProcesses();
    }
    
    showPanel() {
      this.panel.classList.remove('hidden');
      this.panel.classList.add('show');
      this.appWrapper.classList.add('with-processes');
    }
    
    hidePanel() {
      this.panel.classList.remove('show');
      this.panel.classList.add('hidden');
      this.appWrapper.classList.remove('with-processes');
    }
    
    renderProcesses() {
      if (this.processes.size === 0) {
        this.processList.innerHTML = `
          <div class="processes-empty">
            <i class="fas fa-tasks"></i>
            <h4>Nenhum processo ativo</h4>
            <p>Quando você iniciar análises, transcrições ou planos de ação, eles aparecerão aqui.</p>
          </div>
        `;
        return;
      }
      
        // Converter Map para Array e ordenar por data de criação
        const processArray = Array.from(this.processes.values())
          .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      
      this.processList.innerHTML = processArray.map(process => this.renderProcess(process)).join('');
    }
    
    renderProcess(process) {
      const statusClass = process.status === 'concluido' ? 'completed' : 
                         process.status === 'erro' ? 'error' : 'in-progress';
      
      const typeClass = process.tipo;
      const typeLabel = process.tipo === 'transcricao' ? 'Transcrição' :
                       process.tipo === 'analise' ? 'Análise' :
                       process.tipo === 'plano-acao' ? 'Plano de Ação' : process.tipo;
      
      const clientName = process.cliente ? process.cliente.nome : 'Cliente';
      const timeAgo = this.getTimeAgo(process.criadoEm);
      
      // Calcular tempo decorrido e estimativa
      const timeInfo = this.getTimeInfo(process);
      
      return `
        <div class="process-item ${statusClass}" data-id="${process.id}" data-type="${process.tipo}" data-resource-id="${process.resourceId || ''}">
          <div class="process-header">
            <h4 class="process-title">${process.titulo}</h4>
            <span class="process-type ${typeClass}">${typeLabel}</span>
          </div>
          
          <div class="process-client">
            <i class="fas fa-building"></i>
            ${clientName}
          </div>
          
          ${process.status === 'em-progresso' ? `
            <div class="process-progress">
              <div class="process-progress-bar">
                <div class="process-progress-fill" style="width: ${process.progresso || 0}%"></div>
              </div>
              <div class="process-message">${process.mensagem || 'Processando...'}</div>
              <div class="process-time-estimate">
                <span class="time-elapsed">⏱️ ${timeInfo.elapsed}</span>
                <span class="time-estimate">📅 Est: ${timeInfo.estimate}</span>
              </div>
            </div>
          ` : process.status === 'erro' ? `
            <div class="process-error">
              <div class="process-error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${process.mensagem || process.mensagemErro || 'Erro no processamento'}
              </div>
            </div>
          ` : ''}
          
          <div class="process-time">
            <span>${timeAgo}</span>
            <span class="process-status-badge ${statusClass}">
              ${process.status === 'concluido' ? 'Concluído' :
                process.status === 'erro' ? 'Erro' : 'Em progresso'}
            </span>
          </div>
        </div>
      `;
    }
    
    getTimeAgo(dateString) {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins}min atrás`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h atrás`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d atrás`;
    }
    
    getTimeInfo(process) {
      const now = new Date();
      const startTime = new Date(process.criadoEm);
      const elapsedMs = now - startTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      
      // Calcular tempo decorrido formatado
      let elapsed;
      if (elapsedMinutes < 1) {
        elapsed = 'Agora';
      } else if (elapsedMinutes < 60) {
        elapsed = `${elapsedMinutes}min`;
      } else {
        const hours = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        elapsed = `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
      }
      
      // Calcular estimativa baseada no tipo e metadados
      let estimate = '~5min'; // fallback padrão
      
      if (process.tempoEstimadoMinutos) {
        const estimatedMinutes = process.tempoEstimadoMinutos;
        if (estimatedMinutes < 60) {
          estimate = `~${estimatedMinutes}min`;
        } else {
          const hours = Math.floor(estimatedMinutes / 60);
          const mins = estimatedMinutes % 60;
          estimate = `~${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
        }
      } else {
        // Estimativas melhoradas baseadas no tipo e metadados específicos
        switch (process.tipo) {
          case 'transcricao':
            // Para transcrições, tentar usar duração do áudio se disponível
            if (process.metadados && process.metadados.duracaoAudioMinutos) {
              const audioDuration = process.metadados.duracaoAudioMinutos;
              // Whisper leva aproximadamente 20% do tempo real do áudio
              const estimatedMinutes = Math.ceil(audioDuration * 0.2);
              
              if (estimatedMinutes < 60) {
                estimate = `~${estimatedMinutes}min`;
              } else {
                const hours = Math.floor(estimatedMinutes / 60);
                const mins = estimatedMinutes % 60;
                estimate = `~${hours}h${mins > 0 ? `${mins}min` : ''}`;
              }
            } else {
              // Fallback genérico para transcrições sem metadados
              estimate = '~10-40min';
            }
            break;
          case 'analise':
            estimate = '~3min';
            break;
          case 'plano-acao':
            estimate = '~2-5min';
            break;
        }
      }
      
      return { elapsed, estimate };
    }
    
    setupEventListeners() {
      // Clique nos processos concluídos para navegar para resultado
      this.processList.addEventListener('click', (e) => {
        const processItem = e.target.closest('.process-item');
        if (!processItem) return;
        
        const processId = processItem.dataset.id;
        const processType = processItem.dataset.type;
        const resourceId = processItem.dataset.resourceId;
        
        // Só permitir clique em processos concluídos
        if (processItem.classList.contains('completed') && resourceId) {
          this.navigateToResult(processType, resourceId, processId);
        }
      });
    }
    
    navigateToResult(type, resourceId, processId) {
      // Remover o processo do painel ANTES de navegar para o resultado
      if (processId) {
        this.removeProcess(processId);
      }
      
      switch (type) {
        case 'analise':
          viewAnalysis(resourceId);
          break;
        case 'transcricao':
          viewTranscription(resourceId);
          break;
        case 'plano-acao':
          viewActionPlan(resourceId);
          break;
      }
    }
    
    // Método para registrar novo processo (chamado quando processo é iniciado)
    registerProcess(type, clientId, titulo, resourceId = null, metadados = null) {
      // 🚀 CORREÇÃO: Não criar processo duplicado no frontend
      // O backend já cria o processo real via progressService.registerActiveProcess
      // Apenas retornar um ID temporário para compatibilidade
      const tempProcessId = `temp_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🔍 [DEBUG-FRONTEND] Processo será criado pelo backend. ID temporário:', tempProcessId);
      console.log('🔍 [DEBUG-FRONTEND] Dados do processo:', {
        type,
        clientId,
        titulo,
        resourceId,
        metadados
      });
      
      // Não adicionar ao Map local nem enviar para servidor
      // O processo real será recebido via SSE quando o backend o criar
      
      return tempProcessId;
    }
    
    scheduleReconnect() {
      console.log('🔄 [DEBUG-SSE] Agendando reconexão em 5 segundos...');
      
      // Limpar timeout anterior se existir
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      // Agendar nova tentativa de conexão
      this.reconnectTimeout = setTimeout(() => {
        console.log('🔄 [DEBUG-SSE] Tentando reconectar...');
        this.startSSEConnection();
      }, 5000);
    }
    
    destroy() {
      if (this.eventSource) {
        this.eventSource.close();
      }
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }
  }
  
  // Instância global do gerenciador de processos
  let activeProcessesManager = null;
  
  // ===== FUNÇÃO UTILITÁRIA PARA REQUISIÇÕES SEGURAS =====
  
  // Função para fazer requisições de forma segura, tratando redirects de autenticação
  async function safeFetch(url, options = {}) {
    try {
      // Verificar se é uma rota de planos de ação (sem verificação de auth)
      const isActionPlanRoute = url.includes('/api/planos-acao');
      
      // Garantir que headers corretos sejam enviados para requisições AJAX
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
      
      // Para rotas de planos de ação, não verificar autenticação
      if (isActionPlanRoute) {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Erro HTTP ${response.status}` }));
          throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
        }
        return await response.json();
      }
      
      // Verificar o tipo de conteúdo da resposta (apenas para outras rotas)
      const contentType = response.headers.get('content-type') || '';
      
      // Se a resposta não for JSON, pode ser um redirect de autenticação
      if (!contentType.includes('application/json')) {
        // Verificar se é um redirect de autenticação
        if (response.status === 302 || response.status === 401) {
          console.log('🔄 Redirecionamento de autenticação detectado, redirecionando para login...');
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
      // Para rotas de planos de ação, não redirecionar para login
      if (url.includes('/api/planos-acao')) {
        throw error;
      }
      
      // Se o erro menciona sessão expirada, redirecionar para login
      if (error.message.includes('Sessão expirada') || error.message.includes('Unexpected token')) {
        console.log('🔄 Erro de parsing JSON detectado, redirecionando para login...');
        window.location.href = '/login';
        return null;
      }
      
      // Re-lançar outros erros
      throw error;
    }
  }
  
  // ===== FUNÇÃO UTILITÁRIA PARA SCROLL AUTOMÁTICO =====
  
  // Função para fazer scroll suave para um elemento
  function scrollToElement(elementId, behavior = 'smooth', block = 'start') {
    const element = document.getElementById(elementId);
    if (element) {
      // Pequeno delay para garantir que o elemento esteja visível
      setTimeout(() => {
        element.scrollIntoView({ 
          behavior: behavior, 
          block: block,
          inline: 'nearest'
        });
      }, 100);
    }
  }
  
  // ===== GERENCIAMENTO DE ESTADO DAS SEÇÕES =====
  
  // Função para mostrar apenas uma seção por vez (estado exclusivo)
  function showOnlySection(targetSectionId) {
    // Lista de todas as seções principais que devem ser mutuamente exclusivas
    const allSections = [
      'welcome-container',
      'analysis-container', 
      'transcription-container',
      'transcription-result-container',
      'action-plan-container',
      'action-plan-result-container',
      'result-container',
      'loading-container',
      'error-container'
    ];
    
    // Esconder todas as seções
    allSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'none';
      }
    });
    
    // Mostrar apenas a seção alvo
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
  }
  
  // ===== FUNÇÕES PARA ANÁLISE DE EMPRESA =====
  
  // Função para analisar empresa
  async function analyzeCompany(cnpj, clientId) {
    try {
      // Mostrar tela de carregamento
      welcomeContainer.style.display = 'none';
      errorContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      loadingContainer.style.display = 'block';
      
      // Resetar barra de progresso
      resetProgress();
      
      // Iniciar atualizações de progresso via SSE
      startProgressUpdates(clientId);
      
      // Fazer requisição para o backend
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cnpj, clientId })
      });
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao analisar o CNPJ');
      }
      
      // Processar resposta
      const data = await response.json();
      currentAnalysisData = data;
      
      // Preencher e mostrar resultados
      displayResults(data);
      
    } catch (error) {
      console.error('Erro:', error);
      showError(error.message || 'Ocorreu um erro ao processar sua solicitação.');
    }
  }
  
  // Função para exibir os resultados
  function displayResults(data) {
    // Extrair informações da resposta
    const analysisText = data.analysis;
    const formattedCnpj = data.cnpj;
    const timestamp = new Date(data.timestamp).toLocaleString('pt-BR');
    
    // Tentar extrair o nome da empresa do texto da análise
    let companyName = "Empresa Analisada";
    const nameMatch = analysisText.match(/razão social:?\s*([^\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      companyName = nameMatch[1].trim();
    } else {
      // Tentar encontrar de outras formas
      const titleMatch = analysisText.match(/# ([^\n]+)/);
      if (titleMatch && titleMatch[1]) {
        companyName = titleMatch[1].trim();
      }
    }
    
    // Preencher cabeçalho dos resultados
    companyNameEl.textContent = companyName;
    resultCnpjEl.textContent = formattedCnpj;
    resultDateEl.textContent = timestamp;
    
    // Configurar o visualizador de PDF
    if (data.pdfUrl && data.id) {
      exportPdfButton.disabled = false;
      exportPdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> Abrir Relatório PDF';
      
      // Criar interface para abrir PDF em nova aba usando rota proxy
      pdfViewer.innerHTML = `
        <div class="pdf-ready">
          <div class="pdf-icon">
            <i class="fas fa-file-pdf"></i>
          </div>
          <h3>Relatório PDF Pronto</h3>
          <p>Seu relatório estratégico foi gerado com sucesso e está pronto para visualização.</p>
          <button class="open-pdf-btn" onclick="window.open('/api/analises/pdf/${data.id}', '_blank')">
            <i class="fas fa-external-link-alt"></i> Abrir Relatório PDF
          </button>
          <div class="pdf-info">
            <small><i class="fas fa-info-circle"></i> O PDF será aberto em uma nova aba do navegador</small>
          </div>
        </div>
      `;
    } else {
      exportPdfButton.disabled = true;
      exportPdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Indisponível';
      pdfViewer.innerHTML = `
        <div class="pdf-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Não foi possível gerar o PDF. Você ainda pode copiar o relatório usando o botão abaixo.</p>
        </div>
      `;
    }
    
    // Esconder carregamento e mostrar resultados
    loadingContainer.style.display = 'none';
    resultContainer.style.display = 'block';
  }
  
  // Função para formatar texto markdown simples para HTML
  function formatMarkdown(text) {
    if (!text) return '';
    
    // Adicionar classe para estilização
    let formatted = `<div class="markdown-content">${text}</div>`;
    
    // Converter títulos (###)
    formatted = formatted.replace(/### ([^\n]+)/g, '<h4>$1</h4>');
    
    // Converter negrito
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Converter itálico
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Converter listas
    formatted = formatted.replace(/- ([^\n]+)/g, '<li>$1</li>');
    formatted = formatted.replace(/(\<li\>[^\n]+\<\/li\>(\n|$))+/g, '<ul>$&</ul>');
    
    // Converter links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Converter parágrafos
    formatted = formatted.replace(/([^\n]+)(\n|$)/g, function(match, p1) {
      // Evitar adicionar tags <p> em conteúdo que já tem tags HTML
      if (p1.trim().startsWith('<') && p1.trim().endsWith('>')) {
        return match;
      }
      return `<p>${p1}</p>\n`;
    });
    
    return formatted;
  }
  
  // Função para exibir mensagem de erro
  function showError(message) {
    errorMessage.textContent = message;
    welcomeContainer.style.display = 'none';
    loadingContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    errorContainer.style.display = 'block';
  }
  
  // Função para resetar a UI
  function resetUI() {
    errorContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    loadingContainer.style.display = 'none';
    clientDetailsPanel.style.display = 'none';
    welcomeContainer.style.display = 'block';
  }
  
  // ===== EVENTOS DA UI PRINCIPAL =====
  
  // Botão de tentar novamente
  tryAgainButton.addEventListener('click', () => {
    resetUI();
  });
  
  // Abrir o PDF da análise em uma nova aba
  exportPdfButton.addEventListener('click', () => {
    if (currentAnalysisData && currentAnalysisData.pdfUrl) {
      window.open(currentAnalysisData.pdfUrl, '_blank');
    } else {
      alert('PDF não disponível. Por favor, tente novamente.');
    }
  });
  
  // Copiar relatório
  copyReportButton.addEventListener('click', () => {
    if (!currentAnalysisData) return;
    
    const companyName = companyNameEl.textContent;
    const cnpj = resultCnpjEl.textContent;
    const date = resultDateEl.textContent;
    
    // Criar texto formatado para cópia
    const reportText = `ANÁLISE EMPRESARIAL - ${companyName}
CNPJ: ${cnpj}
Data da análise: ${date}

${currentAnalysisData.analysis}`;
    
    // Copiar para a área de transferência
    navigator.clipboard.writeText(reportText)
      .then(() => {
        const originalText = copyReportButton.innerHTML;
        copyReportButton.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        
        setTimeout(() => {
          copyReportButton.innerHTML = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar: ', err);
      });
  });
  
  // ===== FUNÇÕES DE GERENCIAMENTO DE CLIENTES =====
  
  // Carregar lista de clientes
  async function loadClients() {
    try {
      const clients = await safeFetch('/api/clientes');
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (clients === null) return;
      
      currentClients = clients;
      renderClientList(clients);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      clientList.innerHTML = `
        <div class="client-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar clientes. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Renderizar lista de clientes
  function renderClientList(clients) {
    if (!clients.length) {
      clientList.innerHTML = `
        <div class="client-list-empty">
          <i class="fas fa-users"></i>
          <p>Nenhum cliente cadastrado</p>
        </div>
      `;
      return;
    }
    
    // Ordenar clientes por nome
    clients.sort((a, b) => a.nome.localeCompare(b.nome));
    
    clientList.innerHTML = clients.map(client => {
      // Aplicar cor personalizada do cliente como background
      const clientColor = client.cor || '#6a5acd'; // cor padrão se não definida
      const backgroundStyle = `background-color: ${hexToRgba(clientColor, 0.1)};`;
      
      return `
        <div class="client-item" data-id="${client._id}" style="${backgroundStyle}">
          <div class="client-item-logo">
            ${client.logo 
              ? `<img src="${client.logo}" alt="${client.nome}">`
              : `<i class="fas fa-building"></i>`
            }
          </div>
          <div class="client-item-info">
            <h4>${client.nome}</h4>
            <p>CNPJ: ${formatCnpj(client.cnpj)}</p>
          </div>
        </div>
      `;
    }).join('');
    
    // Adicionar evento de clique para cada cliente
    document.querySelectorAll('.client-item').forEach(item => {
      item.addEventListener('click', () => {
        const clientId = item.dataset.id;
        loadClientDetails(clientId);
        
        // Marcar cliente como ativo
        document.querySelectorAll('.client-item').forEach(el => {
          el.classList.remove('active');
        });
        item.classList.add('active');
      });
    });
  }
  
  // ===== FUNÇÕES PARA GERENCIAMENTO DE ABAS =====
  
  // 🚀 CORREÇÃO: Funções para loading states das abas
  function showTabLoadingStates() {
    console.log('🔄 [DEBUG] Mostrando loading states nas abas...');
    
    // Loading state para análises
    analysisList.innerHTML = `
      <div class="tab-loading">
        <div class="loading-spinner"></div>
        <p>Carregando análises...</p>
      </div>
    `;
    
    // Loading state para transcrições
    transcriptionList.innerHTML = `
      <div class="tab-loading">
        <div class="loading-spinner"></div>
        <p>Carregando transcrições...</p>
      </div>
    `;
    
    // Loading state para planos de ação
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
    // Os loading states serão substituídos pelos dados reais quando as funções de carregamento terminarem
  }
  
  function showTabErrors() {
    console.log('❌ [DEBUG] Mostrando erros nas abas...');
    
    // Verificar se ainda há loading states e substituir por erros
    if (analysisList.innerHTML.includes('tab-loading')) {
      analysisList.innerHTML = `
        <div class="analysis-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar análises. Tente novamente.</p>
        </div>
      `;
    }
    
    if (transcriptionList.innerHTML.includes('tab-loading')) {
      transcriptionList.innerHTML = `
        <div class="transcription-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar transcrições. Tente novamente.</p>
        </div>
      `;
    }
    
    if (actionPlansList && actionPlansList.innerHTML.includes('tab-loading')) {
      actionPlansList.innerHTML = `
        <div class="action-plans-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar planos de ação. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Configurar abas de cliente (análises/transcrições)
  function setupClientTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remover classe active de todos os botões e conteúdos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        // Mostrar conteúdo correspondente
        const tabName = button.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 🚀 CORREÇÃO: Dados já foram carregados simultaneamente, não precisar recarregar
        console.log(`📋 [DEBUG] Aba ${tabName} ativada - dados já carregados`);
      });
    });
  }
  
  // Carregar detalhes de um cliente
  async function loadClientDetails(clientId) {
    try {
      console.log(`🔄 [DEBUG] Carregando detalhes do cliente: ${clientId}`);
      
      // Mostrar loading states nas abas
      showTabLoadingStates();
      
      // Esconder seções de resultado que podem estar visíveis do cliente anterior
      actionPlanResultContainer.style.display = 'none';
      transcriptionResultContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      loadingContainer.style.display = 'none';
      errorContainer.style.display = 'none';
      
      // Limpar dados de estado anterior
      currentActionPlanData = null;
      currentTranscriptionData = null;
      currentAnalysisData = null;
      
      // Salvar o ID do cliente atual
      currentClientId = clientId;
      
      // Obter dados do cliente
      const response = await fetch(`/api/clientes/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do cliente');
      }
      
      const client = await response.json();
      
      // Preencher os dados no painel lateral
      detailClientName.textContent = client.nome;
      detailClientCnpj.textContent = formatCnpj(client.cnpj);
      
      // Preencher os dados no painel central
      centralClientName.textContent = client.nome;
      centralClientCnpj.textContent = formatCnpj(client.cnpj);
      
      // Atualizar logos com funcionalidade clicável
      updateClientLogos(client.logo);
      
      // Mostrar o painel de detalhes e esconder a tela de boas-vindas
      clientFormContainer.style.display = 'none';
      clientDetailsContainer.style.display = 'block';
      welcomeContainer.style.display = 'none';
      clientDetailsPanel.style.display = 'block';
      resultContainer.style.display = 'none';
      
      // 🚀 CORREÇÃO: Carregar TODOS os dados simultaneamente
      console.log(`📊 [DEBUG] Carregando todos os dados do cliente ${clientId} simultaneamente...`);
      
      try {
        await Promise.all([
          loadClientAnalyses(clientId),
          loadClientTranscriptions(clientId),
          loadClientActionPlans(clientId),
          loadClientMockups(clientId),
          loadClientGallery(clientId)
        ]);
        
        console.log(`✅ [DEBUG] Todos os dados do cliente ${clientId} carregados com sucesso`);
        
        // Esconder loading states
        hideTabLoadingStates();
        
      } catch (error) {
        console.error(`❌ [DEBUG] Erro ao carregar dados do cliente ${clientId}:`, error);
        hideTabLoadingStates();
        
        // Mostrar erro específico nas abas que falharam
        showTabErrors();
      }
      
      // Configurar botões
      editClientBtn.onclick = () => {
        setupClientForm('edit', client);
      };
      
      newAnalysisBtn.onclick = () => {
        showAnalysisForm();
      };
      
      // Configurar botão de nova transcrição
      newTranscriptionBtn.onclick = () => {
        showTranscriptionForm();
      };
      
      // Configurar botão de exclusão
      deleteClientBtn.onclick = () => {
        showDeleteConfirmation(client);
      };
      
    } catch (error) {
      console.error('Erro ao carregar detalhes do cliente:', error);
      alert('Não foi possível carregar os detalhes do cliente. Tente novamente.');
    }
  }
  
  // Carregar histórico de análises de um cliente
  async function loadClientAnalyses(clientId) {
    try {
      const response = await fetch(`/api/analises/cliente/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar análises');
      }
      
      const analyses = await response.json();
      
      if (!analyses.length) {
        analysisList.innerHTML = `
          <div class="analysis-list-empty">
            <i class="fas fa-file-alt"></i>
            <p>Nenhuma análise realizada</p>
          </div>
        `;
        return;
      }
      
      // Ordenar análises por data (mais recente primeiro)
      analyses.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista de análises
      analysisList.innerHTML = analyses.map(analysis => {
        // Determinar status e classe CSS
        let statusClass = 'completed';
        let statusText = 'Concluído';
        
        if (analysis.emProgresso) {
          statusClass = 'in-progress';
          statusText = 'Em progresso';
        } else if (analysis.erro) {
          statusClass = 'error';
          statusText = 'Erro';
        }
        
        return `
          <div class="analysis-item ${statusClass}" data-id="${analysis._id}">
            <div class="analysis-item-content">
              <div class="analysis-date">
                ${new Date(analysis.dataCriacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>
              <div class="analysis-title">
                Análise de Mercado e Estratégia
              </div>
              <div class="analysis-meta">
                <span class="analysis-status ${statusClass}">${statusText}</span>
              </div>
            </div>
          ${currentUser && currentUser.isAdmin ? `
            <div class="analysis-item-actions">
              <button class="delete-analysis-btn" data-id="${analysis._id}" title="Excluir análise">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          ` : ''}
        </div>
      `;
      }).join('');
      
      // Adicionar evento de clique para cada análise
      document.querySelectorAll('.analysis-item').forEach(item => {
        const content = item.querySelector('.analysis-item-content');
        content.addEventListener('click', () => {
          const analysisId = item.dataset.id;
          viewAnalysis(analysisId);
        });
      });
      
      // Adicionar eventos para botões de delete (apenas para admins)
      document.querySelectorAll('.delete-analysis-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Evitar que o clique propague para o item
          const analysisId = btn.dataset.id;
          deleteAnalysis(analysisId);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
      analysisList.innerHTML = `
        <div class="analysis-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar análises. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Deletar análise (somente administradores)
  async function deleteAnalysis(analysisId) {
    // Confirmar exclusão
    if (!confirm('Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/analises/${analysisId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir análise');
      }
      
      // Recarregar lista de análises
      if (currentClientId) {
        loadClientAnalyses(currentClientId);
      }
      
      // Mostrar feedback de sucesso
      console.log('✅ Análise excluída com sucesso');
      
    } catch (error) {
      console.error('Erro ao excluir análise:', error);
      alert('Não foi possível excluir a análise. Tente novamente.');
    }
  }
  
  // Visualizar uma análise específica
  async function viewAnalysis(analysisId) {
    try {
      const response = await fetch(`/api/analises/${analysisId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar análise');
      }
      
      const analysis = await response.json();
      
      // Preencher dados da análise
      companyNameEl.textContent = analysis.cliente ? analysis.cliente.nome : 'Empresa';
      resultCnpjEl.textContent = formatCnpj(analysis.cnpj);
      resultDateEl.textContent = new Date(analysis.dataCriacao).toLocaleString('pt-BR');
      
      // Configurar PDF
      if (analysis.pdfUrl) {
        pdfViewer.innerHTML = `
          <div class="pdf-ready">
            <div class="pdf-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <h3>Relatório PDF Pronto</h3>
            <p>Seu relatório estratégico foi gerado com sucesso e está pronto para visualização.</p>
            <button class="open-pdf-btn" onclick="window.open('/api/analises/pdf/${analysis._id}', '_blank')">
              <i class="fas fa-external-link-alt"></i> Abrir Relatório PDF
            </button>
            <div class="pdf-info">
              <small><i class="fas fa-info-circle"></i> O PDF será aberto em uma nova aba do navegador</small>
            </div>
          </div>
        `;
        
        exportPdfButton.disabled = false;
        exportPdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> Abrir Relatório PDF';
        currentAnalysisData = {
          pdfUrl: `/api/analises/pdf/${analysis._id}`,
          analysis: analysis.conteudo
        };
      } else {
        pdfViewer.innerHTML = `
          <div class="pdf-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>PDF não disponível. Você ainda pode copiar o relatório usando o botão abaixo.</p>
          </div>
        `;
        
        exportPdfButton.disabled = true;
        exportPdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Indisponível';
        currentAnalysisData = {
          analysis: analysis.conteudo
        };
      }
      
      // Mostrar apenas a seção de resultados (estado exclusivo)
      showOnlySection('result-container');
      
      // Scroll automático para a seção de resultados
      scrollToElement('result-container');
      
    } catch (error) {
      console.error('Erro ao visualizar análise:', error);
      alert('Não foi possível carregar a análise. Tente novamente.');
    }
  }
  
  // Mostrar formulário de nova análise
  function showAnalysisForm() {
    // Mostrar apenas o formulário de análise (estado exclusivo)
    showOnlySection('analysis-container');
    
    // Scroll automático para o formulário de análise
    scrollToElement('analysis-container');
  }

  // Criar nova análise
  async function createNewAnalysis(clientId) {
    try {
      // Registrar processo no painel de processos ativos
      const client = currentClients.find(c => c._id === clientId);
      const processId = activeProcessesManager.registerProcess(
        'analise', 
        clientId, 
        `Análise de ${client ? client.nome : 'Cliente'}`
      );
      
      // Mostrar tela de carregamento
      welcomeContainer.style.display = 'none';
      errorContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      loadingContainer.style.display = 'block';
      
      // Inicializar barra de progresso
      resetProgress();
      
      // Armazenar o ID do cliente para uso futuro
      window.currentAnalysisClientId = clientId;
      
      // Enviar solicitação para criar análise
      const response = await fetch(`/api/analises/cliente/${clientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        // Fechar conexão SSE se estiver aberta
        if (window.progressEventSource) {
          window.progressEventSource.close();
          window.progressEventSource = null;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar análise');
      }
      
      // Processar resposta - apenas armazenar o ID da análise
      const analysis = await response.json();
      window.currentAnalysisId = analysis._id;
      
      // Recarregar histórico de análises em segundo plano
      loadClientAnalyses(clientId);
      
      // Iniciar atualizações de progresso via SSE
      // A visualização da análise só acontecerá quando o processo estiver concluído
      startProgressUpdates(clientId);
      
    } catch (error) {
      console.error('Erro:', error);
      showError(error.message || 'Ocorreu um erro ao criar a análise.');
    }
  }
  
  // ===== FUNÇÕES DE PROGRESSO =====
  
  // Função para inicializar a barra de progresso
  function resetProgress() {
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    loadingStatus.textContent = 'Iniciando análise...';
    
    // Resetar todos os indicadores de etapa
    for (const step of Object.values(progressSteps)) {
      const indicator = step.querySelector('.step-indicator');
      indicator.className = 'step-indicator pending';
      step.className = 'progress-step';
    }
  }
  
  // Função para iniciar atualizações de progresso via SSE
  function startProgressUpdates(clientId, type = 'analysis', resourceId = null) {
    // Fechar conexão anterior se existir
    if (window.progressEventSource) {
      window.progressEventSource.close();
    }
    
    // Armazenar informações sobre o processo atual
    window.currentProcessInfo = {
      type: type,
      resourceId: resourceId,
      clientId: clientId,
      startTime: new Date(),
      isChecking: false
    };
    
    // Abrir nova conexão SSE
    const eventSource = new EventSource(`/api/progress/${clientId}`);
    window.progressEventSource = eventSource;
    
    // Manipular eventos de progresso
    eventSource.addEventListener('progress', function(event) {
      const data = JSON.parse(event.data);
      updateProgress(data);
    });
    
    // Manipular eventos de erro
    eventSource.addEventListener('error', function() {
      // Fechar conexão em caso de erro
      eventSource.close();
      window.progressEventSource = null;
    });
    
    // Manipular eventos de conclusão
    eventSource.addEventListener('complete', function(event) {
      // Obter o tipo de operação dos dados ou usar o tipo atual
      const data = event.data ? JSON.parse(event.data) : {};
      const operationType = data.operationType || (window.currentProcessInfo ? window.currentProcessInfo.type : 'analysis');
      
      // Atualizar para 100% e fechar conexão
      updateProgress({
        percentage: 100,
        message: operationType === 'transcription' ? 'Transcrição concluída!' : 'Análise concluída!',
        step: 4,
        stepStatus: 'completed',
        operationType: operationType
      });
      
      // Aguardar um momento para que o usuário veja que o progresso chegou a 100%
      setTimeout(() => {
        if (operationType === 'transcription' && window.currentProcessInfo && window.currentProcessInfo.resourceId) {
          // Buscar a transcrição completa e exibir o resultado
          viewTranscription(window.currentProcessInfo.resourceId);
          
          // Parar verificação periódica se estiver em andamento
          stopPeriodicStatusCheck();
        } else if (window.currentAnalysisId) {
          // Buscar a análise completa e exibir o resultado
          viewAnalysis(window.currentAnalysisId);
        }
        
        // Fechar a conexão SSE
        eventSource.close();
        window.progressEventSource = null;
      }, 2000); // Aguardar 2 segundos antes de mostrar o resultado
    });
    
    // Para transcrições, iniciar verificação periódica como backup
    if (type === 'transcription' && resourceId) {
      // Iniciar após 30 segundos para dar tempo à barra de progresso SSE
      setTimeout(() => {
        startPeriodicStatusCheck(resourceId);
      }, 30000);
    }
  }
  
  // Função para atualizar o progresso na UI
  function updateProgress(data) {
    console.log('🔍 [DEBUG-PROGRESS] Recebendo atualização de progresso:', data);
    console.log('🔍 [DEBUG-PROGRESS] Estado atual do processo:', window.currentProcessInfo);
    
    // Verificar se esta atualização é para o tipo de operação atual
    // Se data.operationType não estiver definido, assume 'analysis' para compatibilidade com versões anteriores
    const operationType = data.operationType || 'analysis';
    
    // Se não corresponder à operação atual e estamos em uma operação específica, ignorar atualização
    if (window.currentProcessInfo && window.currentProcessInfo.type && 
        operationType !== window.currentProcessInfo.type) {
      console.log(`🚫 [DEBUG-PROGRESS] Ignorando atualização de progresso de tipo ${operationType} (operação atual: ${window.currentProcessInfo.type})`);
      return;
    }
    
    console.log(`✅ [DEBUG-PROGRESS] Aplicando atualização de progresso para tipo: ${operationType}`);
    
    // Atualizar barra de progresso
    progressFill.style.width = `${data.percentage}%`;
    progressText.textContent = `${data.percentage}%`;
    
    // Atualizar mensagem de status com contexto específico para transcrições
    if (data.message) {
      loadingStatus.textContent = data.message;
    }
    
    // Adicionar mensagens educativas específicas para transcrições
    if (window.currentProcessInfo && window.currentProcessInfo.type === 'transcription') {
      updateTranscriptionProgressInfo(data.percentage);
    }
    
    // Atualizar etapas
    if (data.step && data.stepStatus) {
      updateStepStatus(data.step, data.stepStatus);
    }
  }
  
  // Função para atualizar informações específicas de progresso de transcrição
  function updateTranscriptionProgressInfo(percentage) {
    let infoElement = document.querySelector('.transcription-progress-info');
    
    // Criar elemento de informação se não existir
    if (!infoElement) {
      infoElement = document.createElement('div');
      infoElement.className = 'transcription-progress-info';
      infoElement.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;
        border-left: 4px solid #007bff;
        font-size: 14px;
        line-height: 1.5;
      `;
      
      // Inserir após a barra de progresso
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) {
        progressContainer.appendChild(infoElement);
      }
    }
    
    // Atualizar conteúdo baseado na porcentagem
    let content = '';
    
    if (percentage < 50) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-info-circle" style="color: #007bff; margin-right: 8px;"></i>
          <strong>Analisando arquivo de áudio...</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          O Whisper está processando e analisando o arquivo. Esta etapa é rápida e prepara o áudio para transcrição.
        </p>
      `;
    } else if (percentage < 90) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-microphone" style="color: #28a745; margin-right: 8px;"></i>
          <strong>Transcrevendo conteúdo...</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          Processamento em andamento. O Whisper está convertendo o áudio em texto com alta precisão.
        </p>
      `;
    } else if (percentage < 100) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-cog fa-spin" style="color: #ffc107; margin-right: 8px;"></i>
          <strong>Processamento final - Esta etapa pode demorar mais</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          <strong>Normal:</strong> Suspeitamos que quando Jerry diz que está em 90%, na verdade ele está relendo tudo desde o início para garantir que cada palavra ficou perfeita. Esta etapa de revisão pode levar a maior parte do tempo total.
        </p>
        <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
          <small style="color: #856404;">
            <i class="fas fa-clock" style="margin-right: 5px;"></i>
            <strong>Dica:</strong> É normal que transcrições de 40 minutos cheguem a 90% em 1 minuto e depois levem mais 39 minutos para finalizar.
          </small>
        </div>
      `;
    } else {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>
          <strong>Transcrição concluída!</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          Processamento finalizado com sucesso. Preparando resultado...
        </p>
      `;
    }
    
    infoElement.innerHTML = content;
  }
  
  // Função para atualizar o status de uma etapa
  function updateStepStatus(stepNumber, status) {
    // Obter referência ao elemento da etapa
    const stepKey = `step${stepNumber}`;
    const step = progressSteps[stepKey];
    
    if (!step) return;
    
    // Atualizar classe do indicador
    const indicator = step.querySelector('.step-indicator');
    indicator.className = `step-indicator ${status}`;
    
    // Atualizar classe da etapa
    step.className = `progress-step ${status}`;
    
    // Atualizar etapas anteriores para 'completed' se a etapa atual estiver ativa ou concluída
    if (status === 'active' || status === 'completed') {
      for (let i = 1; i < stepNumber; i++) {
        const prevStepKey = `step${i}`;
        const prevStep = progressSteps[prevStepKey];
        if (prevStep) {
          const prevIndicator = prevStep.querySelector('.step-indicator');
          prevIndicator.className = 'step-indicator completed';
          prevStep.className = 'progress-step completed';
        }
      }
    }
  }
  
  // Configurar formulário de cliente (novo ou edição)
  function setupClientForm(mode, clientData = null) {
    // Limpar formulário
    clientForm.reset();
    logoPreview.style.display = 'none';
    logoPreview.innerHTML = '';
    
    if (mode === 'new') {
      clientFormTitle.textContent = 'Novo Cliente';
      clientCnpjInput.disabled = false;
      clientForm.dataset.mode = 'new';
      clientForm.dataset.id = '';
      
      // Configurar cor padrão para novo cliente
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        colorInput.value = '#6a5acd';
        setupColorPicker(); // Atualizar preview
      }
    } else if (mode === 'edit') {
      clientFormTitle.textContent = 'Editar Cliente';
      clientNameInput.value = clientData.nome;
      clientCnpjInput.value = formatCnpj(clientData.cnpj);
      clientCnpjInput.disabled = true; // Não permitir editar CNPJ
      
      if (clientData.logo) {
        logoPreview.innerHTML = `<img src="${clientData.logo}" alt="Logo">`;
        logoPreview.style.display = 'block';
      }
      
      // Carregar cor do cliente
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        colorInput.value = clientData.cor || '#6a5acd';
        setupColorPicker(); // Atualizar preview com a cor carregada
      }
      
      clientForm.dataset.mode = 'edit';
      clientForm.dataset.id = clientData._id;
    }
    
    // Mostrar formulário
    clientDetailsContainer.style.display = 'none';
    clientFormContainer.style.display = 'block';
    welcomeContainer.style.display = 'none';
  }
  
  // Salvar cliente (novo ou edição)
  async function saveClient(event) {
    event.preventDefault();
    
    const mode = clientForm.dataset.mode;
    const clientId = clientForm.dataset.id;
    
    // Validar campos
    if (!clientNameInput.value.trim()) {
      alert('O nome da empresa é obrigatório');
      return;
    }
    
    if (mode === 'new' && !clientCnpjInput.value.trim()) {
      alert('O CNPJ é obrigatório');
      return;
    }
    
    try {
      // Preparar dados do cliente
      const formData = new FormData();
      formData.append('nome', clientNameInput.value.trim());
      
      if (mode === 'new') {
        formData.append('cnpj', clientCnpjInput.value.trim());
      }
      
      if (clientLogoInput.files.length > 0) {
        formData.append('logo', clientLogoInput.files[0]);
      }
      
      // Incluir cor personalizada
      const colorInput = document.getElementById('client-color');
      if (colorInput) {
        formData.append('cor', colorInput.value);
      }
      
      // Configurar requisição
      let url, method;
      
      if (mode === 'new') {
        url = '/api/clientes';
        method = 'POST';
      } else {
        url = `/api/clientes/${clientId}`;
        method = 'PUT';
      }
      
      // Enviar requisição
      const response = await fetch(url, {
        method,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Tratamento específico para diferentes tipos de erros
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
          // Erro genérico, usar a mensagem fornecida pelo servidor
          throw new Error(errorData.message || 'Erro ao salvar cliente');
        }
      }
      
      // Processar resposta
      const savedClient = await response.json();
      
      // Recarregar lista de clientes
      await loadClients();
      
      // Mostrar detalhes do cliente salvo
      loadClientDetails(savedClient._id);
      
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      
      // Usar um modal ou uma caixa de diálogo mais amigável em vez de alert
      // Por enquanto, vamos usar alert com formatação melhorada
      alert(`⚠️ ${error.message || 'Não foi possível salvar o cliente. Tente novamente.'}`);
    }
  }
  
  // ===== FUNÇÕES PARA TRANSCRIÇÕES =====
  
  // Mostrar formulário de nova transcrição
  function showTranscriptionForm() {
    // Limpar formulário
    transcriptionForm.reset();
    audioPreview.style.display = 'none';
    audioPreview.innerHTML = '';
    
    // Adicionar aviso sobre tempo de processamento
    const infoBox = document.createElement('div');
    infoBox.className = 'info-box';
    infoBox.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <p><strong>Importante:</strong> A transcrição ocorre em tempo real, o que significa que um arquivo de 10 minutos levará aproximadamente 10 minutos para ser processado. O sistema usa Whisper para oferecer alta qualidade de transcrição.</p>
    `;
    
    // Adicionar a caixa de informação antes do formulário
    const formContainer = document.querySelector('.transcription-form-container');
    if (formContainer && !formContainer.querySelector('.info-box')) {
      formContainer.insertBefore(infoBox, formContainer.firstChild);
    }
    
    // Mostrar apenas o formulário de transcrição (estado exclusivo)
    showOnlySection('transcription-container');
    
    // Scroll automático para o formulário de transcrição
    scrollToElement('transcription-container');
  }
  
  // Mostrar tela de resultado de transcrição
  function showTranscriptionResult() {
    // Esconder outros contêineres
    welcomeContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    errorContainer.style.display = 'none';
    loadingContainer.style.display = 'none';
    transcriptionContainer.style.display = 'none';
    
    // Mostrar resultado de transcrição
    transcriptionResultContainer.style.display = 'block';
  }
  
  // Carregar transcrições do cliente
  async function loadClientTranscriptions(clientId) {
    try {
      console.log(`🔍 [DEBUG] Carregando transcrições para cliente: ${clientId}`);
      
      // Quebrar cache do navegador adicionando timestamp
      const response = await fetch(`/api/transcricoes/cliente/${clientId}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar transcrições');
      }
      
      const transcriptions = await response.json();
      
      console.log(`📋 [DEBUG] Encontradas ${transcriptions.length} transcrições para cliente ${clientId}:`, transcriptions);
      
      // Validar se todas as transcrições pertencem ao cliente correto
      transcriptions.forEach(t => {
        if (t.cliente !== clientId) {
          console.error(`❌ [BUG] Transcrição ${t._id} pertence ao cliente ${t.cliente}, não ${clientId}`);
        }
      });
      
      if (!transcriptions.length) {
        transcriptionList.innerHTML = `
          <div class="transcription-list-empty">
            <i class="fas fa-microphone-slash"></i>
            <p>Nenhuma transcrição realizada</p>
          </div>
        `;
        return;
      }
      
      // Ordenar transcrições por data (mais recente primeiro)
      transcriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Renderizar lista de transcrições
      transcriptionList.innerHTML = transcriptions.map(transcription => {
        // Calcular duração formatada
        const duration = formatDuration(transcription.duracao);
        
        // Determinar status e classe CSS
        let statusClass = 'completed';
        let statusText = 'Concluído';
        
        if (transcription.emProgresso) {
          statusClass = 'in-progress';
          statusText = 'Em progresso';
        } else if (transcription.erro) {
          statusClass = 'error';
          statusText = 'Erro';
        }
        
        return `
          <div class="transcription-item ${statusClass}" data-id="${transcription._id}">
            <div class="transcription-item-content">
              <div class="transcription-date">
                ${new Date(transcription.dataCriacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>
              <div class="transcription-title">
                ${transcription.titulo}
              </div>
              <div class="transcription-meta">
                <span><i class="fas fa-clock"></i> ${duration}</span>
                <span><i class="fas fa-language"></i> ${transcription.idioma}</span>
                <span class="transcription-status ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="transcription-item-actions">
              <button class="delete-transcription-btn" data-id="${transcription._id}" title="Excluir transcrição">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar evento de clique para cada transcrição
      document.querySelectorAll('.transcription-item').forEach(item => {
        const content = item.querySelector('.transcription-item-content');
        content.addEventListener('click', () => {
          const transcriptionId = item.dataset.id;
          viewTranscription(transcriptionId);
        });
      });
      
      // Adicionar eventos para botões de delete
      document.querySelectorAll('.delete-transcription-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Evitar que o clique propague para o item
          const transcriptionId = btn.dataset.id;
          deleteTranscription(transcriptionId);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar transcrições:', error);
      transcriptionList.innerHTML = `
        <div class="transcription-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar transcrições. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Visualizar uma transcrição específica
  async function viewTranscription(transcriptionId) {
    try {
      const response = await fetch(`/api/transcricoes/${transcriptionId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar transcrição');
      }
      
      const transcription = await response.json();
      currentTranscriptionData = transcription;
      
      // Preencher dados da transcrição
      transcriptionTitleDisplay.textContent = transcription.titulo;
      transcriptionDate.textContent = new Date(transcription.dataCriacao).toLocaleString('pt-BR');
      transcriptionDuration.textContent = formatDuration(transcription.duracao);
      
      // Exibir o texto da transcrição
      transcriptionText.textContent = transcription.conteudo;
      
      // Mostrar apenas a seção de resultado da transcrição (estado exclusivo)
      showOnlySection('transcription-result-container');
      
      // Scroll automático para a seção de resultado da transcrição
      scrollToElement('transcription-result-container');
      
    } catch (error) {
      console.error('Erro ao visualizar transcrição:', error);
      alert('Não foi possível carregar a transcrição. Tente novamente.');
    }
  }
  
  // Função para formatar a duração em formato legível
  function formatDuration(seconds) {
    if (!seconds) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
  
  // Enviar formulário de transcrição
  async function submitTranscriptionForm(event) {
    event.preventDefault();
    
    // Validar campos
    if (!transcriptionTitleInput.value.trim()) {
      alert('O título da transcrição é obrigatório');
      return;
    }
    
    if (!transcriptionFileInput.files.length) {
      alert('Por favor, selecione um arquivo de áudio ou vídeo');
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 500MB)
    const fileSize = transcriptionFileInput.files[0].size / (1024 * 1024); // tamanho em MB
    if (fileSize > 500) {
      alert('O arquivo é muito grande. O tamanho máximo permitido é 500MB.');
      return;
    }
    
    try {
      // Estimar duração do áudio baseada no tamanho do arquivo
      const fileSize = transcriptionFileInput.files[0].size / (1024 * 1024); // tamanho em MB
      const estimatedAudioMinutes = Math.max(1, Math.ceil(fileSize / 1)); // ~1MB por minuto
      
      // Registrar processo no painel de processos ativos com metadados
      const client = currentClients.find(c => c._id === currentClientId);
      const processMetadata = {
        duracaoAudioMinutos: estimatedAudioMinutes,
        tamanhoArquivoMB: fileSize
      };
      
      const processId = activeProcessesManager.registerProcess(
        'transcricao', 
        currentClientId, 
        `Transcrição: ${transcriptionTitleInput.value.trim()}`,
        null,
        processMetadata
      );
      
      // Mostrar tela de carregamento
      transcriptionContainer.style.display = 'none';
      welcomeContainer.style.display = 'none';
      errorContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      loadingContainer.style.display = 'block';
      
      // Adicionar classe para modo transcrição (simplifica interface)
      loadingContainer.classList.add('transcription-mode');
      
      // Adaptar tela de carregamento para transcrição
      loadingStatus.textContent = 'Iniciando transcrição...';
      document.querySelector('.loading-text').textContent = 'Processando arquivo de áudio/vídeo...';
      
      // Estimar duração baseada no tamanho do arquivo (aproximadamente 1MB por minuto para áudio de qualidade média)
      const estimatedMinutes = Math.max(1, Math.ceil(fileSize / 1));
      
      // Adicionar aviso sobre tempo de processamento real
      const infoElement = document.createElement('div');
      infoElement.className = 'transcription-time-info';
      infoElement.innerHTML = `
        <i class="fas fa-clock"></i> 
        <strong>Tempo estimado:</strong> A transcrição ocorre aproximadamente em tempo real. 
        Este arquivo de cerca de ${estimatedMinutes} minutos levará aproximadamente ${estimatedMinutes} minutos para ser processado.
      `;
      infoElement.style.margin = '15px 0';
      infoElement.style.padding = '10px';
      infoElement.style.backgroundColor = '#f8f9fa';
      infoElement.style.borderRadius = '5px';
      infoElement.style.fontSize = '14px';
      
      // Adicionar elemento abaixo da barra de progresso
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer && !progressContainer.querySelector('.transcription-time-info')) {
        progressContainer.appendChild(infoElement);
      }
      
      // Adaptação para transcrição
      document.getElementById('step-1').querySelector('.step-text').textContent = 'Preparando arquivo';
      document.getElementById('step-2').querySelector('.step-text').textContent = 'Processando áudio';
      document.getElementById('step-3').querySelector('.step-text').textContent = 'Gerando transcrição';
      document.getElementById('step-4').querySelector('.step-text').textContent = 'Finalizando';
      
      // Resetar barra de progresso
      resetProgress();
      
      // Preparar dados do formulário
      const formData = new FormData();
      formData.append('titulo', transcriptionTitleInput.value.trim());
      formData.append('idioma', transcriptionLanguageSelect.value);
      formData.append('arquivo', transcriptionFileInput.files[0]);
      
      // Enviar requisição para iniciar transcrição
      const response = await fetch(`/api/transcricoes/upload/${currentClientId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        // Tentar extrair o erro da resposta
        let errorMessage = 'Erro ao iniciar transcrição';
        try {
          const errorData = await response.json();
          errorMessage = errorData.erro || 'Erro ao iniciar transcrição';
        } catch (jsonError) {
          // Caso a resposta não seja um JSON válido, tentar obter o texto
          try {
            const errorText = await response.text();
            if (errorText.includes('Tipo de arquivo não suportado')) {
              errorMessage = 'Tipo de arquivo não suportado. Por favor, envie apenas arquivos de áudio ou vídeo.';
            } else if (errorText.length < 200) {
              // Se for um texto curto, exibir diretamente
              errorMessage = errorText;
            }
          } catch (textError) {
            // Fallback para mensagem genérica
            console.error('Erro ao processar resposta:', textError);
          }
        }
        throw new Error(errorMessage);
      }
      
      // Obter ID da transcrição para acompanhar progresso
      const data = await response.json();
      const transcriptionId = data.transcricaoId;
      
      // Iniciar atualizações de progresso
      startProgressUpdates(currentClientId, 'transcription', transcriptionId);
      
      // Atualizar lista de transcrições em segundo plano
      loadClientTranscriptions(currentClientId);
      
    } catch (error) {
      console.error('Erro:', error);
      showError(error.message || 'Ocorreu um erro ao iniciar a transcrição.');
    }
  }
  
  // Função para iniciar atualizações de progresso via SSE (adaptada para transcriptions)
  function startProgressUpdates(clientId, type = 'analysis', resourceId = null) {
    // Fechar conexão anterior se existir
    if (window.progressEventSource) {
      window.progressEventSource.close();
    }
    
    // Armazenar informações sobre o processo atual
    window.currentProcessInfo = {
      type: type,
      resourceId: resourceId,
      clientId: clientId,
      startTime: new Date(),
      isChecking: false
    };
    
    // Abrir nova conexão SSE
    const eventSource = new EventSource(`/api/progress/${clientId}`);
    window.progressEventSource = eventSource;
    
    // Manipular eventos de progresso
    eventSource.addEventListener('progress', function(event) {
      const data = JSON.parse(event.data);
      updateProgress(data);
    });
    
    // Manipular eventos de erro
    eventSource.addEventListener('error', function() {
      // Fechar conexão em caso de erro
      eventSource.close();
      window.progressEventSource = null;
      
      // Iniciar verificação periódica como fallback se for uma transcrição
      if (type === 'transcription' && resourceId) {
        startPeriodicStatusCheck(resourceId);
      }
    });
    
    // Manipular eventos de conclusão
    eventSource.addEventListener('complete', function(event) {
      // Atualizar para 100% e fechar conexão
      updateProgress({
        percentage: 100,
        message: type === 'transcription' ? 'Transcrição concluída!' : 'Análise concluída!',
        step: 4,
        stepStatus: 'completed'
      });
      
      // Aguardar um momento para que o usuário veja que o progresso chegou a 100%
      setTimeout(() => {
        if (type === 'transcription' && resourceId) {
          // Buscar a transcrição completa e exibir o resultado
          viewTranscription(resourceId);
          
          // Parar verificação periódica se estiver em andamento
          stopPeriodicStatusCheck();
        } else if (window.currentAnalysisId) {
          // Buscar a análise completa e exibir o resultado
          viewAnalysis(window.currentAnalysisId);
        }
        
        // Fechar a conexão SSE
        eventSource.close();
        window.progressEventSource = null;
      }, 2000); // Aguardar 2 segundos antes de mostrar o resultado
    });
    
    // Para transcrições, iniciar verificação periódica como backup
    if (type === 'transcription' && resourceId) {
      // Iniciar após 30 segundos para dar tempo à barra de progresso SSE
      setTimeout(() => {
        startPeriodicStatusCheck(resourceId);
      }, 30000);
    }
  }
  
  // Função para verificar periodicamente o status de uma transcrição
  function startPeriodicStatusCheck(transcriptionId) {
    if (!window.currentProcessInfo || window.currentProcessInfo.isChecking) return;
    
    window.currentProcessInfo.isChecking = true;
    
    // Verificar status a cada 30 segundos
    window.statusCheckInterval = setInterval(async () => {
      try {
        // Verificar se a transcrição já foi concluída
        const response = await fetch(`/api/transcricoes/${transcriptionId}`);
        if (!response.ok) {
          console.error('Erro ao verificar status da transcrição');
          return;
        }
        
        const transcription = await response.json();
        
        // Se não está mais em progresso (concluída ou com erro)
        if (!transcription.emProgresso) {
          console.log('Transcrição concluída via verificação periódica:', transcription);
          
          // Limpar intervalo
          stopPeriodicStatusCheck();
          
          // Atualizar UI para mostrar conclusão
          updateProgress({
            percentage: 100,
            message: transcription.erro ? 'Erro na transcrição!' : 'Transcrição concluída!',
            step: 4,
            stepStatus: transcription.erro ? 'error' : 'completed'
          });
          
          // Após 2 segundos, mostrar o resultado
          setTimeout(() => {
            // Fechar conexão SSE se ainda existir
            if (window.progressEventSource) {
              window.progressEventSource.close();
              window.progressEventSource = null;
            }
            
            // Mostrar resultado
            if (!transcription.erro) {
              viewTranscription(transcriptionId);
            } else {
              showError(transcription.mensagemErro || 'Ocorreu um erro durante a transcrição.');
            }
          }, 2000);
          
          // Recarregar lista de transcrições em segundo plano
          if (currentClientId) {
            loadClientTranscriptions(currentClientId);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status da transcrição:', error);
      }
    }, 30000); // Verificar a cada 30 segundos
  }
  
  // Função para parar a verificação periódica
  function stopPeriodicStatusCheck() {
    if (window.statusCheckInterval) {
      clearInterval(window.statusCheckInterval);
      window.statusCheckInterval = null;
    }
    
    if (window.currentProcessInfo) {
      window.currentProcessInfo.isChecking = false;
    }
  }
  
  // Deletar transcrição
  async function deleteTranscription(transcriptionId) {
    // Confirmar exclusão
    if (!confirm('Tem certeza que deseja excluir esta transcrição? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/transcricoes/${transcriptionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Erro ao excluir transcrição');
      }
      
      // Recarregar lista de transcrições
      if (currentClientId) {
        loadClientTranscriptions(currentClientId);
      }
      
      // Mostrar feedback de sucesso
      console.log('✅ Transcrição excluída com sucesso');
      
    } catch (error) {
      console.error('Erro ao excluir transcrição:', error);
      alert('Não foi possível excluir a transcrição. Tente novamente.');
    }
  }
  
  // ===== EVENTOS DO PAINEL DE CLIENTES =====
  
  // Botão para criar novo cliente
  newClientBtn.addEventListener('click', () => {
    setupClientForm('new');
  });
  
  // Botão para cancelar formulário
  cancelClientBtn.addEventListener('click', () => {
    if (currentClientId) {
      // Voltar para os detalhes do cliente atual
      clientFormContainer.style.display = 'none';
      clientDetailsContainer.style.display = 'block';
    } else {
      // Esconder formulário e mostrar tela de boas-vindas
      clientFormContainer.style.display = 'none';
      welcomeContainer.style.display = 'block';
    }
  });
  
  // Submissão do formulário de cliente
  clientForm.addEventListener('submit', saveClient);
  
  // Preview de logo ao selecionar arquivo
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
  
  // Pesquisa de clientes
  clientSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      renderClientList(currentClients);
      return;
    }
    
    const filteredClients = currentClients.filter(client => 
      client.nome.toLowerCase().includes(searchTerm) || 
      client.cnpj.includes(searchTerm)
    );
    
    renderClientList(filteredClients);
  });
  
  // ===== FUNÇÕES PARA EXCLUSÃO DE CLIENTE =====
  
  // Mostrar confirmação de exclusão
  function showDeleteConfirmation(client) {
    // Preencher nome do cliente no modal
    deleteClientName.textContent = client.nome;
    
    // Configurar botão de confirmação
    confirmDeleteBtn.onclick = () => {
      deleteClient(client._id);
    };
    
    // Mostrar modal
    deleteConfirmModal.classList.add('show');
  }
  
  // Excluir cliente
  async function deleteClient(clientId) {
    try {
      // Fazer requisição para excluir cliente
      const response = await fetch(`/api/clientes/${clientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir cliente');
      }
      
      // Fechar modal
      deleteConfirmModal.classList.remove('show');
      
      // Recarregar lista de clientes
      await loadClients();
      
      // Esconder detalhes do cliente e mostrar tela de boas-vindas
      clientDetailsContainer.style.display = 'none';
      clientDetailsPanel.style.display = 'none';
      welcomeContainer.style.display = 'block';
      
      // Limpar ID do cliente atual
      currentClientId = null;
      
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert(error.message || 'Não foi possível excluir o cliente. Tente novamente.');
    }
  }
  
  // Eventos do modal de confirmação
  closeModalBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('show');
  });
  
  cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('show');
  });
  
  // Fechar modal ao clicar fora dele
  window.addEventListener('click', (e) => {
    if (e.target === deleteConfirmModal) {
      deleteConfirmModal.classList.remove('show');
    }
  });
  
  // Formatar CNPJ
  function formatCnpj(cnpj) {
    if (!cnpj) return '';
    
    // Remover caracteres não numéricos
    const numericCnpj = cnpj.replace(/\D/g, '');
    
    // Aplicar máscara XX.XXX.XXX/XXXX-XX
    return numericCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  
  // Converter cor hexadecimal para rgba com transparência
  function hexToRgba(hex, alpha) {
    // Remover # se presente
    hex = hex.replace('#', '');
    
    // Converter para RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // ===== EVENTOS DE ANÁLISE =====
  
  // Cancelar análise
  cancelAnalysisBtn.addEventListener('click', () => {
    analysisContainer.style.display = 'none';
    
    // Voltar para os detalhes do cliente
    if (currentClientId) {
      clientDetailsPanel.style.display = 'block';
    } else {
      welcomeContainer.style.display = 'block';
    }
  });
  
  // Iniciar análise
  startAnalysisBtn.addEventListener('click', () => {
    if (currentClientId) {
      analysisContainer.style.display = 'none';
      createNewAnalysis(currentClientId);
    }
  });

  // ===== EVENTOS DE TRANSCRIÇÃO =====
  
  // Submeter formulário de transcrição
  transcriptionForm.addEventListener('submit', submitTranscriptionForm);
  
  // Cancelar transcrição
  cancelTranscriptionBtn.addEventListener('click', () => {
    transcriptionContainer.style.display = 'none';
    
    // Voltar para os detalhes do cliente
    if (currentClientId) {
      clientDetailsPanel.style.display = 'block';
    } else {
      welcomeContainer.style.display = 'block';
    }
  });
  
  // Voltar do resultado da transcrição para detalhes do cliente
  backToClientBtn.addEventListener('click', () => {
    transcriptionResultContainer.style.display = 'none';
    clientDetailsPanel.style.display = 'block';
  });
  
  // Copiar transcrição
  copyTranscriptionBtn.addEventListener('click', () => {
    if (!currentTranscriptionData) return;
    
    // Obter texto da transcrição
    const transcriptionContent = currentTranscriptionData.conteudo;
    
    // Copiar para a área de transferência
    navigator.clipboard.writeText(transcriptionContent)
      .then(() => {
        const originalText = copyTranscriptionBtn.innerHTML;
        copyTranscriptionBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        
        setTimeout(() => {
          copyTranscriptionBtn.innerHTML = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar: ', err);
      });
  });
  
  // Exportar transcrição como TXT
  exportTxtBtn.addEventListener('click', () => {
    if (!currentTranscriptionData) return;
    
    // Obter texto da transcrição
    const transcriptionContent = currentTranscriptionData.conteudo;
    const transcriptionTitle = currentTranscriptionData.titulo || 'Transcrição';
    
    // Criar blob e link para download
    const blob = new Blob([transcriptionContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcriptionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Limpeza
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
  
  // Preview de arquivo de áudio/vídeo
  transcriptionFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Verificar se é um arquivo de áudio ou vídeo
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        // Criar preview do arquivo
        let previewHTML = '';
        
        if (file.type.startsWith('audio/')) {
          previewHTML = `
            <audio controls>
              <source src="${URL.createObjectURL(file)}" type="${file.type}">
              Seu navegador não suporta o elemento de áudio.
            </audio>
            <p>${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
          `;
        } else {
          previewHTML = `
            <video controls width="100%" height="150">
              <source src="${URL.createObjectURL(file)}" type="${file.type}">
              Seu navegador não suporta o elemento de vídeo.
            </video>
            <p>${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
          `;
        }
        
        audioPreview.innerHTML = previewHTML;
        audioPreview.style.display = 'block';
      }
    } else {
      audioPreview.style.display = 'none';
    }
  });
  
  // ===== FUNCIONALIDADE DE UPLOAD DE LOGO VIA CLIQUE =====
  
  // Elementos para upload de logo
  const centralLogoInput = document.getElementById('central-logo-input');
  const detailLogoInput = document.getElementById('detail-logo-input');
  
  // Configurar seletor de cores
  function setupColorPicker() {
    const colorInput = document.getElementById('client-color');
    const colorSample = document.getElementById('color-sample');
    const colorValue = document.getElementById('color-value');
    
    if (colorInput && colorSample && colorValue) {
      // Função para atualizar preview
      function updateColorPreview(color) {
        colorSample.style.backgroundColor = color;
        colorValue.textContent = color.toUpperCase();
      }
      
      // Atualizar preview quando a cor mudar (input para tempo real)
      colorInput.addEventListener('input', (e) => {
        updateColorPreview(e.target.value);
      });
      
      // Atualizar preview quando a cor mudar (change para compatibilidade)
      colorInput.addEventListener('change', (e) => {
        updateColorPreview(e.target.value);
      });
      
      // Inicializar com cor atual
      updateColorPreview(colorInput.value);
    }
  }
  
  // Configurar logos clicáveis
  function setupClickableLogos() {
    // Logo do painel central
    const centralLogo = document.getElementById('central-client-logo');
    const detailLogo = document.getElementById('detail-client-logo');
    
    // Tornar logos clicáveis
    centralLogo.classList.add('clickable');
    detailLogo.classList.add('clickable');
    
    // Adicionar hints de upload
    centralLogo.innerHTML += '<div class="logo-upload-hint">Clique para alterar logo</div>';
    detailLogo.innerHTML += '<div class="logo-upload-hint">Clique para alterar logo</div>';
    
    // Eventos de clique nos logos
    centralLogo.addEventListener('click', () => {
      if (currentClientId) {
        centralLogoInput.click();
      }
    });
    
    detailLogo.addEventListener('click', () => {
      if (currentClientId) {
        detailLogoInput.click();
      }
    });
    
    // Eventos de mudança nos inputs de arquivo
    centralLogoInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadClientLogo(e.target.files[0]);
      }
    });
    
    detailLogoInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadClientLogo(e.target.files[0]);
      }
    });
  }
  
  // Função para fazer upload do logo do cliente
  async function uploadClientLogo(file) {
    if (!currentClientId) {
      alert('Nenhum cliente selecionado');
      return;
    }
    
    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    
    try {
      // Mostrar feedback visual
      const centralLogo = document.getElementById('central-client-logo');
      const detailLogo = document.getElementById('detail-client-logo');
      
      // Adicionar classe de carregamento
      centralLogo.style.opacity = '0.5';
      detailLogo.style.opacity = '0.5';
      
      // Preparar dados do formulário
      const formData = new FormData();
      formData.append('logo', file);
      
      // Enviar requisição
      const response = await fetch(`/api/clientes/${currentClientId}`, {
        method: 'PUT',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar logo');
      }
      
      // Processar resposta
      const updatedClient = await response.json();
      
      // Atualizar logos na interface
      updateClientLogos(updatedClient.logo);
      
      // Recarregar lista de clientes para refletir mudanças
      await loadClients();
      
      // Feedback de sucesso
      console.log('✅ Logo atualizado com sucesso');
      
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      alert(`Não foi possível atualizar o logo: ${error.message}`);
    } finally {
      // Restaurar opacidade
      const centralLogo = document.getElementById('central-client-logo');
      const detailLogo = document.getElementById('detail-client-logo');
      centralLogo.style.opacity = '1';
      detailLogo.style.opacity = '1';
      
      // Limpar inputs
      centralLogoInput.value = '';
      detailLogoInput.value = '';
    }
  }
  
  // Função para atualizar logos na interface
  function updateClientLogos(logoUrl) {
    const centralLogo = document.getElementById('central-client-logo');
    const detailLogo = document.getElementById('detail-client-logo');
    
    if (logoUrl) {
      // Atualizar logo central
      centralLogo.innerHTML = `
        <img src="${logoUrl}" alt="Logo da empresa">
        <div class="logo-upload-hint">Clique para alterar logo</div>
      `;
      
      // Atualizar logo lateral
      detailLogo.innerHTML = `
        <img src="${logoUrl}" alt="Logo da empresa">
        <div class="logo-upload-hint">Clique para alterar logo</div>
      `;
    } else {
      // Mostrar ícone padrão
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
  
  // Inicialização
  function init() {
    // Carregar clientes
    loadClients();
    
    // Configurar abas
    setupClientTabs();
    
    // Configurar logos clicáveis
    setupClickableLogos();
    
    // Mostrar tela de boas-vindas
    welcomeContainer.style.display = 'block';
  }
  
  // ===== FUNÇÃO DE VERIFICAÇÃO DE AUTENTICAÇÃO =====
  
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

  // ===== FUNÇÕES PARA PLANOS DE AÇÃO =====
  
  // Elementos específicos para planos de ação
  const newActionPlanBtn = document.getElementById('new-action-plan-btn');
  const cancelActionPlanBtn = document.getElementById('cancel-action-plan-btn');
  const startActionPlanBtn = document.getElementById('start-action-plan-btn');
  const actionPlanForm = document.getElementById('action-plan-form');
  const actionPlanTitleInput = document.getElementById('action-plan-title');
  const availableTranscriptions = document.getElementById('available-transcriptions');
  const availableAnalyses = document.getElementById('available-analyses');
  const selectedDocumentsList = document.getElementById('selected-documents-list');
  const actionPlansList = document.getElementById('action-plans-list');
  const actionPlanTitleDisplay = document.getElementById('action-plan-title-display');
  const actionPlanDate = document.getElementById('action-plan-date');
  const actionPlanDocumentsCount = document.getElementById('action-plan-documents-count');
  const actionPlanText = document.getElementById('action-plan-text');
  const exportActionPlanPdfBtn = document.getElementById('export-action-plan-pdf');
  const copyActionPlanBtn = document.getElementById('copy-action-plan');
  const backToClientFromPlanBtn = document.getElementById('back-to-client-from-plan');
  
  // Estado dos documentos selecionados
  let selectedDocuments = [];
  let currentActionPlanData = null;
  
  // Mostrar formulário de novo plano de ação
  function showActionPlanForm() {
    // Limpar formulário
    actionPlanForm.reset();
    selectedDocuments = [];
    updateSelectedDocumentsList();
    
    // Carregar documentos disponíveis
    loadAvailableDocuments();
    
    // Mostrar apenas o formulário de plano de ação (estado exclusivo)
    showOnlySection('action-plan-container');
    
    // Scroll automático para o formulário
    scrollToElement('action-plan-container');
  }
  
  // Carregar documentos disponíveis (transcrições e análises)
  async function loadAvailableDocuments() {
    if (!currentClientId) return;
    
    try {
      // Carregar transcrições usando safeFetch
      const transcriptions = await safeFetch(`/api/transcricoes/cliente/${currentClientId}`);
      if (transcriptions !== null) {
        renderAvailableTranscriptions(transcriptions);
      }
      
      // Carregar análises usando safeFetch
      const analyses = await safeFetch(`/api/analises/cliente/${currentClientId}`);
      if (analyses !== null) {
        renderAvailableAnalyses(analyses);
      }
      
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    }
  }
  
  // Renderizar transcrições disponíveis
  function renderAvailableTranscriptions(transcriptions) {
    if (!transcriptions.length) {
      availableTranscriptions.innerHTML = `
        <div class="no-documents">
          <i class="fas fa-info-circle"></i>
          <p>Nenhuma transcrição disponível</p>
        </div>
      `;
      return;
    }
    
    // Filtrar apenas transcrições concluídas
    const completedTranscriptions = transcriptions.filter(t => !t.emProgresso && !t.erro);
    
    if (!completedTranscriptions.length) {
      availableTranscriptions.innerHTML = `
        <div class="no-documents">
          <i class="fas fa-info-circle"></i>
          <p>Nenhuma transcrição concluída disponível</p>
        </div>
      `;
      return;
    }
    
    availableTranscriptions.innerHTML = completedTranscriptions.map(transcription => `
      <div class="document-item" data-id="${transcription._id}" data-type="transcription">
        <div class="document-item-content">
          <div class="document-item-title">${transcription.titulo}</div>
          <div class="document-item-meta">
            <span>${new Date(transcription.dataCriacao).toLocaleDateString('pt-BR')}</span>
            <span>${formatDuration(transcription.duracao)}</span>
          </div>
        </div>
        <div class="document-item-checkbox"></div>
      </div>
    `).join('');
    
    // Adicionar eventos de clique
    availableTranscriptions.querySelectorAll('.document-item').forEach(item => {
      item.addEventListener('click', () => toggleDocumentSelection(item));
    });
  }
  
  // Renderizar análises disponíveis
  function renderAvailableAnalyses(analyses) {
    if (!analyses.length) {
      availableAnalyses.innerHTML = `
        <div class="no-documents">
          <i class="fas fa-info-circle"></i>
          <p>Nenhuma análise disponível</p>
        </div>
      `;
      return;
    }
    
    availableAnalyses.innerHTML = analyses.map(analysis => `
      <div class="document-item" data-id="${analysis._id}" data-type="analysis">
        <div class="document-item-content">
          <div class="document-item-title">Análise de Mercado e Estratégia</div>
          <div class="document-item-meta">
            <span>${new Date(analysis.dataCriacao).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="document-item-checkbox"></div>
      </div>
    `).join('');
    
    // Adicionar eventos de clique
    availableAnalyses.querySelectorAll('.document-item').forEach(item => {
      item.addEventListener('click', () => toggleDocumentSelection(item));
    });
  }
  
  // Alternar seleção de documento
  function toggleDocumentSelection(item) {
    const id = item.dataset.id;
    const type = item.dataset.type;
    const title = item.querySelector('.document-item-title').textContent;
    
    // Verificar se já está selecionado
    const existingIndex = selectedDocuments.findIndex(doc => doc.id === id);
    
    if (existingIndex >= 0) {
      // Remover da seleção
      selectedDocuments.splice(existingIndex, 1);
      item.classList.remove('selected');
    } else {
      // Adicionar à seleção
      selectedDocuments.push({ id, type, title });
      item.classList.add('selected');
    }
    
    // Atualizar lista de documentos selecionados
    updateSelectedDocumentsList();
    
    // Atualizar estado do botão de envio
    updateSubmitButtonState();
  }
  
  // Atualizar lista de documentos selecionados
  function updateSelectedDocumentsList() {
    if (!selectedDocuments.length) {
      selectedDocumentsList.innerHTML = `
        <div class="no-selection">
          <i class="fas fa-hand-pointer"></i>
          <p>Selecione pelo menos um documento acima</p>
        </div>
      `;
      return;
    }
    
    selectedDocumentsList.innerHTML = selectedDocuments.map(doc => `
      <div class="selected-item">
        <div class="selected-item-content">
          <div class="selected-item-title">${doc.title}</div>
          <div class="selected-item-type">${doc.type === 'transcription' ? 'Transcrição' : 'Análise'}</div>
        </div>
        <button class="remove-selected-btn" data-id="${doc.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
    
    // Adicionar eventos para remover documentos
    selectedDocumentsList.querySelectorAll('.remove-selected-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        removeDocumentFromSelection(id);
      });
    });
  }
  
  // Remover documento da seleção
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
    updateSubmitButtonState();
  }
  
  // Atualizar estado do botão de envio
  function updateSubmitButtonState() {
    const hasTitle = actionPlanTitleInput.value.trim().length > 0;
    const hasDocuments = selectedDocuments.length > 0;
    
    startActionPlanBtn.disabled = !(hasTitle && hasDocuments);
  }
  
  // Carregar planos de ação do cliente
  async function loadClientActionPlans(clientId) {
    try {
      const actionPlans = await safeFetch(`/api/planos-acao/${clientId}`);
      
      // Se safeFetch retornou null (redirecionamento), não continuar
      if (actionPlans === null) return;
      
      if (!actionPlans.length) {
        actionPlansList.innerHTML = `
          <div class="action-plans-list-empty">
            <i class="fas fa-tasks"></i>
            <p>Nenhum plano de ação criado</p>
          </div>
        `;
        return;
      }
      
      // Ordenar por data (mais recente primeiro)
      actionPlans.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista
      actionPlansList.innerHTML = actionPlans.map(plan => {
        let statusClass = 'completed';
        let statusText = 'Concluído';
        
        if (plan.emProgresso) {
          statusClass = 'in-progress';
          statusText = 'Em progresso';
        } else if (plan.erro) {
          statusClass = 'error';
          statusText = 'Erro';
        }
        
        // Calcular total de documentos de forma segura
        const documentosBase = plan.documentosBase || { transcricoes: [], analises: [] };
        const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
        
        return `
          <div class="action-plan-item ${statusClass}" data-id="${plan._id}">
            <div class="action-plan-item-content">
              <div class="action-plan-date">
                ${new Date(plan.dataCriacao).toLocaleDateString('pt-BR')}
              </div>
              <div class="action-plan-title">${plan.titulo}</div>
              <div class="action-plan-meta">
                <span><i class="fas fa-file-alt"></i> ${totalDocumentos} documento(s)</span>
                <span class="action-plan-status ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="action-plan-item-actions">
              <button class="delete-action-plan-btn" data-id="${plan._id}" title="Excluir plano de ação">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar eventos de clique
      actionPlansList.querySelectorAll('.action-plan-item').forEach(item => {
        const content = item.querySelector('.action-plan-item-content');
        content.addEventListener('click', () => {
          const planId = item.dataset.id;
          viewActionPlan(planId);
        });
      });
      
      // Adicionar eventos para botões de delete
      actionPlansList.querySelectorAll('.delete-action-plan-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const planId = btn.dataset.id;
          deleteActionPlan(planId);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar planos de ação:', error);
      actionPlansList.innerHTML = `
        <div class="action-plans-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar planos de ação. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Visualizar plano de ação
  async function viewActionPlan(planId) {
    try {
      const response = await fetch(`/api/planos-acao/plano/${planId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar plano de ação');
      }
      
      const plan = await response.json();
      currentActionPlanData = plan;
      
      // Preencher dados do plano
      actionPlanTitleDisplay.textContent = plan.titulo;
      actionPlanDate.textContent = new Date(plan.dataCriacao).toLocaleString('pt-BR');
      
      // Calcular total de documentos de forma segura
      const documentosBase = plan.documentosBase || { transcricoes: [], analises: [] };
      const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
      actionPlanDocumentsCount.textContent = `${totalDocumentos} documento(s)`;
      
      // Exibir conteúdo do plano
      actionPlanText.innerHTML = `<div class="markdown-content">${formatMarkdownForActionPlan(plan.conteudo)}</div>`;
      
      // Configurar botões baseado na disponibilidade do PDF
      if (plan.pdfUrl) {
        exportActionPlanPdfBtn.disabled = false;
        exportActionPlanPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Abrir Relatório PDF';
        
        // Criar preview do PDF similar às análises
        const pdfPreview = document.createElement('div');
        pdfPreview.className = 'pdf-preview-section';
        pdfPreview.innerHTML = `
          <div class="pdf-ready">
            <div class="pdf-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <h3>Relatório PDF Pronto</h3>
            <p>Seu plano de ação estratégico foi gerado com sucesso e está pronto para visualização.</p>
            <button class="open-pdf-btn" onclick="window.open('/api/planos-acao/pdf/${plan._id}', '_blank')">
              <i class="fas fa-external-link-alt"></i> Abrir Relatório PDF
            </button>
            <div class="pdf-info">
              <small><i class="fas fa-info-circle"></i> O PDF será aberto em uma nova aba do navegador</small>
            </div>
          </div>
        `;
        
        // Inserir preview após o conteúdo do plano
        actionPlanText.parentNode.insertBefore(pdfPreview, actionPlanText.nextSibling);
      } else {
        exportActionPlanPdfBtn.disabled = true;
        exportActionPlanPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Indisponível';
        
        // Remover preview anterior se existir
        const existingPreview = document.querySelector('.pdf-preview-section');
        if (existingPreview) {
          existingPreview.remove();
        }
      }
      
      // Mostrar apenas a seção de resultado do plano de ação
      showOnlySection('action-plan-result-container');
      
      // Scroll automático
      scrollToElement('action-plan-result-container');
      
    } catch (error) {
      console.error('Erro ao visualizar plano de ação:', error);
      alert('Não foi possível carregar o plano de ação. Tente novamente.');
    }
  }
  
  // Formatar markdown específico para planos de ação
  function formatMarkdownForActionPlan(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Converter títulos
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    
    // Converter negrito e itálico
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Converter listas
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    // Agrupar listas
    formatted = formatted.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    
    // Converter tabelas simples
    const tableRegex = /\|(.+)\|\n\|[-\s|]+\|\n((\|.+\|\n?)+)/g;
    formatted = formatted.replace(tableRegex, (match, header, separator, rows) => {
      const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell);
      const rowsArray = rows.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      let table = '<table><thead><tr>';
      headerCells.forEach(cell => {
        table += `<th>${cell}</th>`;
      });
      table += '</tr></thead><tbody>';
      
      rowsArray.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
          table += `<td>${cell}</td>`;
        });
        table += '</tr>';
      });
      
      table += '</tbody></table>';
      return table;
    });
    
    // Converter parágrafos
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = `<p>${formatted}</p>`;
    
    // Limpar tags vazias
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>(<h[1-6]>)/g, '$1');
    formatted = formatted.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<ul>)/g, '$1');
    formatted = formatted.replace(/(<\/ul>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<table>)/g, '$1');
    formatted = formatted.replace(/(<\/table>)<\/p>/g, '$1');
    
    return formatted;
  }
  
  // Deletar plano de ação
  async function deleteActionPlan(planId) {
    if (!confirm('Tem certeza que deseja excluir este plano de ação? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/planos-acao/plano/${planId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir plano de ação');
      }
      
      // Recarregar lista
      if (currentClientId) {
        loadClientActionPlans(currentClientId);
      }
      
      console.log('✅ Plano de ação excluído com sucesso');
      
    } catch (error) {
      console.error('Erro ao excluir plano de ação:', error);
      alert('Não foi possível excluir o plano de ação. Tente novamente.');
    }
  }
  
  // Submeter formulário de plano de ação
  async function submitActionPlanForm(event) {
    event.preventDefault();
    
    if (!actionPlanTitleInput.value.trim()) {
      alert('O título do plano de ação é obrigatório');
      return;
    }
    
    if (!selectedDocuments.length) {
      alert('Selecione pelo menos um documento');
      return;
    }
    
    try {
      // Registrar processo no painel de processos ativos
      const client = currentClients.find(c => c._id === currentClientId);
      const processId = activeProcessesManager.registerProcess(
        'plano-acao', 
        currentClientId, 
        `Plano de Ação: ${actionPlanTitleInput.value.trim()}`
      );
      
      // Mostrar tela de carregamento IMEDIATAMENTE
      showOnlySection('loading-container');
      
      // Adaptar interface para plano de ação
      document.querySelector('.loading-text').textContent = 'Gerando plano de ação estratégico...';
      loadingStatus.textContent = 'Preparando análise dos documentos selecionados...';
      
      // Resetar e configurar progresso específico para planos de ação
      resetProgress();
      setupActionPlanProgressSteps();
      
      // Iniciar simulação de progresso imediatamente
      startActionPlanProgressSimulation();
      
      // Preparar dados - separar por tipo conforme esperado pelo backend
      const transcricaoIds = selectedDocuments
        .filter(doc => doc.type === 'transcription')
        .map(doc => doc.id);
      
      const analiseIds = selectedDocuments
        .filter(doc => doc.type === 'analysis')
        .map(doc => doc.id);
      
      const requestData = {
        titulo: actionPlanTitleInput.value.trim(),
        transcricaoIds,
        analiseIds
      };
      
      // Debug: verificar dados sendo enviados
      console.log('🔍 [DEBUG-PLANO-ACAO] Dados enviados:', requestData);
      
      // Enviar requisição
      const response = await fetch(`/api/planos-acao/${currentClientId}/gerar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar plano de ação');
      }
      
      const plan = await response.json();
      
      // Armazenar ID do plano para monitoramento
      window.currentActionPlanId = plan.planoId;
      
      // Iniciar monitoramento do progresso real
      startActionPlanMonitoring(plan.planoId);
      
    } catch (error) {
      console.error('Erro ao criar plano de ação:', error);
      showError(error.message || 'Ocorreu um erro ao criar o plano de ação.');
    }
  }
  
  // Configurar etapas específicas para planos de ação
  function setupActionPlanProgressSteps() {
    document.getElementById('step-1').querySelector('.step-text').textContent = 'Análise de Documentos';
    document.getElementById('step-2').querySelector('.step-text').textContent = 'Processamento IA';
    document.getElementById('step-3').querySelector('.step-text').textContent = 'Geração de Estratégias';
    document.getElementById('step-4').querySelector('.step-text').textContent = 'Finalização';
  }
  
  // Iniciar simulação de progresso para planos de ação
  function startActionPlanProgressSimulation() {
    // Adicionar informações específicas sobre o processo
    const infoElement = document.createElement('div');
    infoElement.className = 'action-plan-progress-info';
    infoElement.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      border-left: 4px solid #28a745;
      font-size: 14px;
      line-height: 1.5;
    `;
    
    infoElement.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <i class="fas fa-brain" style="color: #28a745; margin-right: 8px;"></i>
        <strong>Processamento Inteligente em Andamento</strong>
      </div>
      <p style="margin: 0; color: #6c757d;">
        Nossa IA está analisando os documentos selecionados para criar um plano de ação estratégico personalizado. 
        Este processo pode levar alguns minutos para garantir a máxima qualidade e relevância.
      </p>
      <div style="margin-top: 10px; padding: 8px; background: #d1ecf1; border-radius: 4px; border: 1px solid #bee5eb;">
        <small style="color: #0c5460;">
          <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
          <strong>Tempo estimado:</strong> 2-5 minutos dependendo da quantidade de conteúdo a ser analisado.
        </small>
      </div>
    `;
    
    // Inserir após a barra de progresso
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer && !progressContainer.querySelector('.action-plan-progress-info')) {
      progressContainer.appendChild(infoElement);
    }
    
    // Simular progresso inicial mais lento e realista
    const progressSteps = [
      { percentage: 15, message: 'Carregando documentos selecionados...', step: 1, stepStatus: 'active', delay: 1000 },
      { percentage: 35, message: 'Analisando conteúdo com IA...', step: 2, stepStatus: 'active', delay: 2000 },
      { percentage: 60, message: 'Gerando estratégias personalizadas...', step: 3, stepStatus: 'active', delay: 3000 },
      { percentage: 85, message: 'Finalizando plano de ação...', step: 4, stepStatus: 'active', delay: 2000 }
    ];
    
    let currentStep = 0;
    
    function executeNextStep() {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        updateProgress(step);
        currentStep++;
        
        setTimeout(executeNextStep, step.delay);
      }
      // Não completar automaticamente - aguardar resposta real do servidor
    }
    
    // Iniciar após pequeno delay para dar sensação de início
    setTimeout(executeNextStep, 500);
  }
  
  // Monitorar progresso real do plano de ação
  function startActionPlanMonitoring(planId) {
    // Verificar status a cada 5 segundos
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/planos-acao/plano/${planId}`);
        if (!response.ok) {
          console.error('Erro ao verificar status do plano de ação');
          return;
        }
        
        const plan = await response.json();
        
        // Se não está mais em progresso
        if (!plan.emProgresso) {
          clearInterval(checkInterval);
          
          if (plan.erro) {
            // Mostrar erro
            showError(plan.mensagemErro || 'Erro ao gerar plano de ação');
          } else {
            // Completar progresso e mostrar resultado
            updateProgress({
              percentage: 100,
              message: 'Plano de ação concluído com sucesso!',
              step: 4,
              stepStatus: 'completed'
            });
            
            // Aguardar 2 segundos antes de mostrar resultado
            setTimeout(() => {
              // Recarregar lista de planos de ação
              loadClientActionPlans(currentClientId);
              
              // 🚀 CORREÇÃO: Usar showOnlySection para garantir transição correta
              // Mostrar o plano criado automaticamente
              viewActionPlan(planId);
            }, 2000);
          }
        }
        
      } catch (error) {
        console.error('Erro ao monitorar plano de ação:', error);
      }
    }, 5000); // Verificar a cada 5 segundos
    
    // Timeout de segurança (10 minutos)
    setTimeout(() => {
      clearInterval(checkInterval);
      if (document.getElementById('loading-container').style.display !== 'none') {
        showError('Timeout: O plano de ação está demorando mais que o esperado. Verifique a lista de planos de ação em alguns minutos.');
      }
    }, 600000); // 10 minutos
  }
  
  // Simular progresso para plano de ação
  function simulateActionPlanProgress() {
    const steps = [
      { percentage: 25, message: 'Analisando documentos...', step: 1, stepStatus: 'active' },
      { percentage: 50, message: 'Processando conteúdo...', step: 2, stepStatus: 'active' },
      { percentage: 75, message: 'Gerando estratégias...', step: 3, stepStatus: 'active' },
      { percentage: 100, message: 'Plano de ação concluído!', step: 4, stepStatus: 'completed' }
    ];
    
    // Adaptar etapas para plano de ação
    document.getElementById('step-1').querySelector('.step-text').textContent = 'Análise de Documentos';
    document.getElementById('step-2').querySelector('.step-text').textContent = 'Processamento de Conteúdo';
    document.getElementById('step-3').querySelector('.step-text').textContent = 'Geração de Estratégias';
    document.getElementById('step-4').querySelector('.step-text').textContent = 'Finalização';
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        updateProgress(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 750);
  }
  
  // ===== EVENTOS PARA PLANOS DE AÇÃO =====
  
  // Configurar eventos quando a aba de planos de ação for carregada
  function setupActionPlanEvents() {
    // Botão de novo plano de ação
    if (newActionPlanBtn) {
      newActionPlanBtn.addEventListener('click', showActionPlanForm);
    }
    
    // Cancelar plano de ação
    if (cancelActionPlanBtn) {
      cancelActionPlanBtn.addEventListener('click', () => {
        actionPlanContainer.style.display = 'none';
        
        if (currentClientId) {
          clientDetailsPanel.style.display = 'block';
        } else {
          welcomeContainer.style.display = 'block';
        }
      });
    }
    
    // Submeter formulário
    if (actionPlanForm) {
      actionPlanForm.addEventListener('submit', submitActionPlanForm);
    }
    
    // Monitorar mudanças no título
    if (actionPlanTitleInput) {
      actionPlanTitleInput.addEventListener('input', updateSubmitButtonState);
    }
    
    // Voltar do resultado para detalhes do cliente
    if (backToClientFromPlanBtn) {
      backToClientFromPlanBtn.addEventListener('click', () => {
        actionPlanResultContainer.style.display = 'none';
        clientDetailsPanel.style.display = 'block';
      });
    }
    
    // Copiar plano de ação
    if (copyActionPlanBtn) {
      copyActionPlanBtn.addEventListener('click', () => {
        if (!currentActionPlanData) return;
        
        // Calcular total de documentos de forma segura
        const documentosBase = currentActionPlanData.documentosBase || { transcricoes: [], analises: [] };
        const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
        
        // Criar lista detalhada dos documentos utilizados
        let documentosInfo = '';
        if (documentosBase.transcricoes?.length > 0) {
          documentosInfo += `\nTranscrições utilizadas: ${documentosBase.transcricoes.length}`;
        }
        if (documentosBase.analises?.length > 0) {
          documentosInfo += `\nAnálises utilizadas: ${documentosBase.analises.length}`;
        }
        
        const planContent = `PLANO DE AÇÃO ESTRATÉGICO
${currentActionPlanData.titulo}

Criado em: ${new Date(currentActionPlanData.dataCriacao).toLocaleString('pt-BR')}
Total de documentos base: ${totalDocumentos}${documentosInfo}

${'-'.repeat(50)}

${currentActionPlanData.conteudo}`;
        
        navigator.clipboard.writeText(planContent)
          .then(() => {
            const originalText = copyActionPlanBtn.innerHTML;
            copyActionPlanBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            
            setTimeout(() => {
              copyActionPlanBtn.innerHTML = originalText;
            }, 2000);
          })
          .catch(err => {
            console.error('Erro ao copiar: ', err);
          });
      });
    }
    
    // Exportar PDF do plano de ação
    if (exportActionPlanPdfBtn) {
      exportActionPlanPdfBtn.addEventListener('click', () => {
        if (!currentActionPlanData) return;
        
        // Verificar se o PDF está disponível
        if (currentActionPlanData.pdfUrl) {
          // Abrir PDF em nova aba usando a rota proxy
          window.open(`/api/planos-acao/pdf/${currentActionPlanData._id}`, '_blank');
        } else {
          alert('PDF não disponível para este plano de ação. Por favor, tente novamente ou use o botão "Copiar Plano".');
        }
      });
    }
  }
  
  // Modificar a função setupClientTabs para incluir planos de ação
  function setupClientTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remover classe active de todos os botões e conteúdos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        // Mostrar conteúdo correspondente
        const tabName = button.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Carregar dados específicos da aba
        if (currentClientId) {
          if (tabName === 'transcriptions') {
            loadClientTranscriptions(currentClientId);
          } else if (tabName === 'action-plans') {
            loadClientActionPlans(currentClientId);
          }
        }
      });
    });
  }
  
  // Modificar a função init para incluir eventos de planos de ação
  function init() {
    // Inicializar gerenciador de processos ativos
    activeProcessesManager = new ActiveProcessesManager();
    
    // Carregar clientes
    loadClients();
    
    // Configurar abas
    setupClientTabs();
    
    // Configurar logos clicáveis
    setupClickableLogos();
    
    // Configurar seletor de cores
    setupColorPicker();
    
    // Configurar eventos de planos de ação
    setupActionPlanEvents();
    
    // Mostrar tela de boas-vindas
    welcomeContainer.style.display = 'block';
  }

  // ===== FUNÇÕES PARA GALERIA DE IMAGENS =====
  
  // Elementos específicos para galeria
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryModal = document.getElementById('gallery-modal');
  const galleryModalImage = document.getElementById('gallery-modal-image');
  const galleryModalTitle = document.getElementById('gallery-modal-title');
  const galleryModalType = document.getElementById('gallery-modal-type');
  const galleryModalPrompt = document.getElementById('gallery-modal-prompt');
  const galleryModalDate = document.getElementById('gallery-modal-date');
  const galleryModalSeed = document.getElementById('gallery-modal-seed');
  const downloadGalleryImageBtn = document.getElementById('download-gallery-image');
  const closeGalleryModalBtn = document.getElementById('close-gallery-modal');
  
  // Estado da galeria
  let currentGalleryImages = [];
  let currentGalleryFilter = 'all';
  
  // Carregar galeria do cliente
  async function loadClientGallery(clientId) {
    try {
      console.log(`🖼️ [GALERIA] Carregando galeria para cliente: ${clientId}`);
      
      const response = await fetch(`/api/mockups/galeria/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar galeria');
      }
      
      const data = await response.json();
      console.log(`🖼️ [GALERIA] Dados recebidos:`, data);
      
      currentGalleryImages = data.imagens || [];
      
      if (!currentGalleryImages.length) {
        galleryGrid.innerHTML = `
          <div class="gallery-empty">
            <i class="fas fa-images"></i>
            <p>Nenhuma imagem salva</p>
            <small>As imagens dos mockups que você salvar aparecerão aqui organizadas por tipo</small>
          </div>
        `;
        return;
      }
      
      // Renderizar galeria
      renderGallery(currentGalleryImages);
      
      // Configurar filtros
      setupGalleryFilters();
      
      console.log(`✅ [GALERIA] ${currentGalleryImages.length} imagens carregadas com sucesso`);
      
    } catch (error) {
      console.error('❌ [GALERIA] Erro ao carregar galeria:', error);
      galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar galeria. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Renderizar galeria de imagens
  function renderGallery(images) {
    if (!images.length) {
      galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <i class="fas fa-images"></i>
          <p>Nenhuma imagem encontrada</p>
          <small>Tente alterar o filtro ou criar novos mockups</small>
        </div>
      `;
      return;
    }
    
    galleryGrid.innerHTML = images.map(image => {
      const typeIcon = getGalleryTypeIcon(image.tipo);
      const formattedDate = new Date(image.dataSalvamento).toLocaleDateString('pt-BR');
      
      return `
        <div class="gallery-item" data-image-id="${image.id}">
          <div class="gallery-item-image">
            <img src="${image.url}" alt="${image.titulo}" loading="lazy">
            <div class="gallery-item-overlay">
              <button class="gallery-view-btn" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="gallery-download-btn" title="Download">
                <i class="fas fa-download"></i>
              </button>
              <button class="gallery-delete-btn" title="Excluir imagem">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="gallery-item-info">
            <div class="gallery-item-type">
              <i class="${typeIcon}"></i>
              ${getTypeLabel(image.tipo)}
            </div>
            <div class="gallery-item-title">${image.titulo}</div>
            <div class="gallery-item-date">${formattedDate}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Adicionar eventos de clique
    setupGalleryEvents();
  }
  
  // Configurar eventos da galeria
  function setupGalleryEvents() {
    // Eventos de visualização
    galleryGrid.querySelectorAll('.gallery-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const galleryItem = e.target.closest('.gallery-item');
        const imageId = galleryItem.dataset.imageId;
        viewGalleryImage(imageId);
      });
    });
    
    // Eventos de download direto
    galleryGrid.querySelectorAll('.gallery-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const galleryItem = e.target.closest('.gallery-item');
        const imageId = galleryItem.dataset.imageId;
        downloadGalleryImage(imageId);
      });
    });
    
    // Eventos de delete
    galleryGrid.querySelectorAll('.gallery-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const galleryItem = e.target.closest('.gallery-item');
        const imageId = galleryItem.dataset.imageId;
        deleteGalleryImage(imageId);
      });
    });
    
    // Clique na imagem para visualizar
    galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const imageId = item.dataset.imageId;
        viewGalleryImage(imageId);
      });
    });
  }
  
  // Configurar filtros da galeria
  function setupGalleryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remover classe active de todos os botões
        filterButtons.forEach(b => b.classList.remove('active'));
        
        // Adicionar classe active ao botão clicado
        btn.classList.add('active');
        
        // Aplicar filtro
        const filter = btn.dataset.filter;
        applyGalleryFilter(filter);
      });
    });
  }
  
  // Aplicar filtro na galeria
  function applyGalleryFilter(filter) {
    currentGalleryFilter = filter;
    
    let filteredImages = currentGalleryImages;
    
    if (filter !== 'all') {
      filteredImages = currentGalleryImages.filter(image => image.tipo === filter);
    }
    
    renderGallery(filteredImages);
  }
  
  // Visualizar imagem da galeria
  function viewGalleryImage(imageId) {
    const image = currentGalleryImages.find(img => img.id === imageId);
    if (!image) return;
    
    // Preencher modal
    galleryModalImage.src = image.url;
    galleryModalTitle.textContent = image.titulo;
    galleryModalType.textContent = getTypeLabel(image.tipo);
    galleryModalPrompt.textContent = image.prompt || 'Prompt não disponível';
    galleryModalDate.textContent = new Date(image.dataSalvamento).toLocaleString('pt-BR');
    galleryModalSeed.textContent = image.seed || 'N/A';
    
    // Configurar botão de download
    downloadGalleryImageBtn.onclick = () => downloadGalleryImage(imageId);
    
    // Mostrar modal
    galleryModal.classList.add('show');
  }
  
  // Download de imagem da galeria
  function downloadGalleryImage(imageId) {
    const image = currentGalleryImages.find(img => img.id === imageId);
    if (!image) return;
    
    // Criar link temporário para download
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `${image.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${image.seed}.webp`;
    link.target = '_blank';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Deletar imagem da galeria
  async function deleteGalleryImage(imageId) {
    const image = currentGalleryImages.find(img => img.id === imageId);
    if (!image) return;
    
    // Confirmar exclusão
    if (!confirm(`Tem certeza que deseja excluir esta imagem?\n\n"${image.titulo}"\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      console.log(`🗑️ [GALERIA-DELETE] Deletando imagem: ${imageId}`);
      
      const response = await fetch(`/api/mockups/galeria/imagem/${imageId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar imagem');
      }
      
      const result = await response.json();
      console.log(`✅ [GALERIA-DELETE] Imagem deletada com sucesso:`, result);
      
      // Recarregar galeria
      if (currentClientId) {
        await loadClientGallery(currentClientId);
      }
      
      // Mostrar feedback de sucesso
      console.log(`✅ Imagem deletada com sucesso. Restam ${result.data.imagensRestantes} imagens`);
      
      // Fechar modal se estiver aberto
      if (galleryModal.classList.contains('show')) {
        galleryModal.classList.remove('show');
      }
      
    } catch (error) {
      console.error('❌ [GALERIA-DELETE] Erro ao deletar imagem:', error);
      alert(`Não foi possível deletar a imagem: ${error.message}`);
    }
  }
  
  // Obter ícone do tipo para galeria
  function getGalleryTypeIcon(tipo) {
    const icons = {
      'logo': 'fas fa-tag',
      'post-social': 'fas fa-mobile-alt',
      'banner': 'fas fa-rectangle-ad',
      'landing-page': 'fas fa-globe',
      'material-apresentacao': 'fas fa-presentation',
      'ilustracao-conceitual': 'fas fa-paint-brush',
      'mockup-produto': 'fas fa-box'
    };
    
    return icons[tipo] || 'fas fa-image';
  }
  
  // Configurar eventos do modal da galeria
  function setupGalleryModalEvents() {
    // Fechar modal
    if (closeGalleryModalBtn) {
      closeGalleryModalBtn.addEventListener('click', () => {
        galleryModal.classList.remove('show');
      });
    }
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
      if (e.target === galleryModal) {
        galleryModal.classList.remove('show');
      }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && galleryModal.classList.contains('show')) {
        galleryModal.classList.remove('show');
      }
    });
  }

  // ===== FUNÇÕES PARA MOCKUPS COM IA =====
  
  // Elementos específicos para mockups
  const newMockupBtn = document.getElementById('new-mockup-btn');
  const mockupModal = document.getElementById('mockup-modal');
  const mockupVariationsModal = document.getElementById('mockup-variations-modal');
  const mockupForm = document.getElementById('mockup-form');
  const cancelMockupBtn = document.getElementById('cancel-mockup-btn');
  const generateMockupBtn = document.getElementById('generate-mockup-btn');
  const mockupsList = document.getElementById('mockups-list');
  const toggleAdvancedBtn = document.getElementById('toggle-advanced');
  const advancedContent = document.getElementById('advanced-content');
  const variationsGrid = document.getElementById('variations-grid');
  const usedPrompt = document.getElementById('used-prompt');
  const regenerateMockupBtn = document.getElementById('regenerate-mockup-btn');
  
  // Controles de range
  const cfgRange = document.getElementById('mockup-cfg');
  const cfgValue = document.getElementById('cfg-value');
  const stepsRange = document.getElementById('mockup-steps');
  const stepsValue = document.getElementById('steps-value');
  const qualityRange = document.getElementById('mockup-quality');
  const qualityValue = document.getElementById('quality-value');
  
  // Estado dos mockups
  let currentMockupData = null;
  let currentVariations = [];
  let selectedVariations = new Set();
  let selectedVariation = null;
  
  // Mostrar modal de criação de mockup
  function showMockupModal() {
    // Limpar formulário
    mockupForm.reset();
    selectedVariation = null;
    
    // Resetar configurações avançadas
    if (advancedContent) {
      advancedContent.classList.remove('show');
      toggleAdvancedBtn.classList.remove('active');
    }
    
    // Resetar valores dos ranges
    if (cfgRange && cfgValue) {
      cfgRange.value = 3.5;
      cfgValue.textContent = '3.5';
    }
    if (stepsRange && stepsValue) {
      stepsRange.value = 28;
      stepsValue.textContent = '28';
    }
    if (qualityRange && qualityValue) {
      qualityRange.value = 90;
      qualityValue.textContent = '90';
    }
    
    // Mostrar modal
    mockupModal.classList.add('show');
  }
  
  // Fechar modal de mockup
  function closeMockupModal() {
    mockupModal.classList.remove('show');
  }
  
  // Fechar modal de variações
  function closeVariationsModal() {
    mockupVariationsModal.classList.remove('show');
  }
  
  // Configurar controles de range
  function setupRangeControls() {
    if (cfgRange && cfgValue) {
      cfgRange.addEventListener('input', (e) => {
        cfgValue.textContent = e.target.value;
      });
    }
    
    if (stepsRange && stepsValue) {
      stepsRange.addEventListener('input', (e) => {
        stepsValue.textContent = e.target.value;
      });
    }
    
    if (qualityRange && qualityValue) {
      qualityRange.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
      });
    }
  }
  
  // Configurar configurações avançadas
  function setupAdvancedSettings() {
    if (toggleAdvancedBtn && advancedContent) {
      toggleAdvancedBtn.addEventListener('click', () => {
        const isActive = toggleAdvancedBtn.classList.contains('active');
        
        if (isActive) {
          toggleAdvancedBtn.classList.remove('active');
          advancedContent.classList.remove('show');
        } else {
          toggleAdvancedBtn.classList.add('active');
          advancedContent.classList.add('show');
        }
      });
    }
  }
  
  // Gerar sugestões de prompt baseadas na configuração
  function generatePromptSuggestions() {
    const tipoArte = document.getElementById('mockup-type')?.value;
    const estilo = document.getElementById('mockup-style')?.value;
    const cores = document.getElementById('mockup-colors')?.value;
    
    if (!tipoArte) return;
    
    const suggestions = {
      'logo': [
        'Logo minimalista e moderno',
        'Logo com tipografia elegante',
        'Logo com símbolo icônico',
        'Logo corporativo profissional'
      ],
      'post-social': [
        'Post atrativo para Instagram',
        'Design para stories dinâmico',
        'Post promocional criativo',
        'Conteúdo visual engajante'
      ],
      'banner': [
        'Banner promocional impactante',
        'Header para website moderno',
        'Banner publicitário criativo',
        'Design para campanha digital'
      ]
    };
    
    const baseSuggestions = suggestions[tipoArte] || ['Design criativo e profissional'];
    const randomSuggestion = baseSuggestions[Math.floor(Math.random() * baseSuggestions.length)];
    
    // Atualizar dica de sugestão
    const promptSuggestions = document.getElementById('prompt-suggestions');
    if (promptSuggestions) {
      promptSuggestions.innerHTML = `
        <small>💡 Sugestão: ${randomSuggestion}</small>
      `;
    }
  }
  
  // Submeter formulário de mockup
  async function submitMockupForm(event) {
    event.preventDefault();
    
    // Validar campos obrigatórios
    const titulo = document.getElementById('mockup-title')?.value?.trim();
    const tipoArte = document.getElementById('mockup-type')?.value;
    const aspectRatio = document.getElementById('mockup-aspect-ratio')?.value;
    const estilo = document.getElementById('mockup-style')?.value;
    const prompt = document.getElementById('mockup-prompt')?.value?.trim();
    
    if (!titulo) {
      alert('O título do mockup é obrigatório');
      return;
    }
    
    if (!tipoArte) {
      alert('Selecione o tipo de arte');
      return;
    }
    
    if (!aspectRatio) {
      alert('Selecione a proporção');
      return;
    }
    
    if (!estilo) {
      alert('Selecione o estilo visual');
      return;
    }
    
    if (!prompt) {
      alert('A descrição detalhada é obrigatória');
      return;
    }
    
    try {
      // Registrar processo no painel de processos ativos
      const client = currentClients.find(c => c._id === currentClientId);
      const processId = activeProcessesManager.registerProcess(
        'mockup', 
        currentClientId, 
        `Mockup: ${titulo}`
      );
      
      // Fechar modal
      closeMockupModal();
      
      // Mostrar tela de carregamento
      showOnlySection('loading-container');
      
      // Adaptar interface para mockup
      document.querySelector('.loading-text').textContent = 'Gerando mockups com IA...';
      loadingStatus.textContent = 'Preparando geração de 4 variações...';
      
      // Resetar progresso
      resetProgress();
      setupMockupProgressSteps();
      
      // Coletar dados do formulário
      const configuracao = {
        tipoArte,
        aspectRatio,
        estilo: estilo, // CORREÇÃO: era estiloVisual, agora é estilo
        paletaCores: document.getElementById('mockup-colors')?.value || '',
        elementosVisuais: document.getElementById('mockup-elements')?.value || '',
        setor: document.getElementById('mockup-sector')?.value || '',
        publicoAlvo: document.getElementById('mockup-audience')?.value || '',
        mood: document.getElementById('mockup-mood')?.value || '',
        estiloRenderizacao: document.getElementById('mockup-render-style')?.value || ''
      };
      
      const configuracaoTecnica = {
        cfg: parseFloat(cfgRange?.value || 3.5),
        steps: parseInt(stepsRange?.value || 28),
        outputFormat: document.getElementById('mockup-format')?.value || 'webp',
        outputQuality: parseInt(qualityRange?.value || 90)
      };
      
      const requestData = {
        clienteId: currentClientId,
        titulo,
        configuracao,
        prompt,
        configuracaoTecnica
      };
      
      // Iniciar simulação de progresso
      startMockupProgressSimulation();
      
      // Enviar requisição
      const response = await fetch('/api/mockups/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao gerar mockup');
      }
      
      const result = await response.json();
      
      // Verificar se é resposta assíncrona (status 202)
      if (response.status === 202) {
        // Processo iniciado em background
        console.log('✅ Mockup iniciado em background:', result.message);
        
        // Atualizar progresso para mostrar que foi aceito
        updateProgress({
          percentage: 10,
          message: 'Mockup aceito para processamento...',
          step: 1,
          stepStatus: 'active'
        });
        
        // Iniciar monitoramento via polling (verificar lista de mockups periodicamente)
        startMockupPolling();
        
      } else {
        // Resposta síncrona (compatibilidade com versão anterior)
        currentMockupData = result.data;
        startMockupMonitoring(result.data.mockupId);
      }
      
    } catch (error) {
      console.error('Erro ao gerar mockup:', error);
      showError(error.message || 'Ocorreu um erro ao gerar o mockup.');
    }
  }
  
  // Configurar etapas específicas para mockups
  function setupMockupProgressSteps() {
    document.getElementById('step-1').querySelector('.step-text').textContent = 'Processando Prompt';
    document.getElementById('step-2').querySelector('.step-text').textContent = 'Gerando Variações';
    document.getElementById('step-3').querySelector('.step-text').textContent = 'Renderizando Imagens';
    document.getElementById('step-4').querySelector('.step-text').textContent = 'Finalizando';
  }
  
  // Simular progresso para mockups
  function startMockupProgressSimulation() {
    // Adicionar informações específicas sobre o processo
    const infoElement = document.createElement('div');
    infoElement.className = 'mockup-progress-info';
    infoElement.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      border-left: 4px solid #6a5acd;
      font-size: 14px;
      line-height: 1.5;
    `;
    
    infoElement.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <i class="fas fa-palette" style="color: #6a5acd; margin-right: 8px;"></i>
        <strong>Geração de Mockups com IA</strong>
      </div>
      <p style="margin: 0; color: #6c757d;">
        Estamos criando 4 variações únicas do seu mockup usando inteligência artificial avançada. 
        Cada variação terá características visuais distintas para você escolher a melhor.
      </p>
      <div style="margin-top: 10px; padding: 8px; background: #e7e3ff; border-radius: 4px; border: 1px solid #d1c7ff; display: none;" class="mockup-cost-info">
        <small style="color: #4c3d99;">
          <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
          <strong>Custo:</strong> $0.14 total (4 variações × $0.035 cada)
        </small>
      </div>
    `;
    
    // Inserir após a barra de progresso
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer && !progressContainer.querySelector('.mockup-progress-info')) {
      progressContainer.appendChild(infoElement);
    }
    
    // Simular progresso realista
    const progressSteps = [
      { percentage: 20, message: 'Analisando prompt e configurações...', step: 1, stepStatus: 'active', delay: 1000 },
      { percentage: 45, message: 'Gerando primeira variação...', step: 2, stepStatus: 'active', delay: 3000 },
      { percentage: 65, message: 'Criando variações adicionais...', step: 2, stepStatus: 'active', delay: 4000 },
      { percentage: 85, message: 'Renderizando imagens finais...', step: 3, stepStatus: 'active', delay: 3000 },
      { percentage: 95, message: 'Preparando resultado...', step: 4, stepStatus: 'active', delay: 2000 }
    ];
    
    let currentStep = 0;
    
    function executeNextStep() {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        updateProgress(step);
        currentStep++;
        
        setTimeout(executeNextStep, step.delay);
      }
    }
    
    // Iniciar após pequeno delay
    setTimeout(executeNextStep, 500);
  }
  
  // Monitorar progresso real do mockup
  function startMockupMonitoring(mockupId) {
    // Verificar status a cada 3 segundos
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/mockups/${mockupId}`);
        if (!response.ok) {
          console.error('Erro ao verificar status do mockup');
          return;
        }
        
        const mockup = await response.json();
        
        // Se não está mais gerando
        if (mockup.status !== 'gerando') {
          clearInterval(checkInterval);
          
          if (mockup.status === 'erro') {
            // Mostrar erro
            showError(mockup.mensagemErro || 'Erro ao gerar mockup');
          } else if (mockup.status === 'concluido') {
            // Completar progresso e mostrar variações
            updateProgress({
              percentage: 100,
              message: 'Mockup gerado com sucesso!',
              step: 4,
              stepStatus: 'completed'
            });
            
            // Aguardar 2 segundos antes de mostrar variações
            setTimeout(() => {
              showMockupVariations(mockup);
            }, 2000);
          }
        }
        
      } catch (error) {
        console.error('Erro ao monitorar mockup:', error);
      }
    }, 3000);
    
    // Timeout de segurança (5 minutos)
    setTimeout(() => {
      clearInterval(checkInterval);
      if (document.getElementById('loading-container').style.display !== 'none') {
        showError('Timeout: O mockup está demorando mais que o esperado. Verifique a lista de mockups em alguns minutos.');
      }
    }, 300000);
  }
  
  // Mostrar variações do mockup
  function showMockupVariations(mockup) {
    currentMockupData = mockup;
    
    // Preencher prompt usado
    if (usedPrompt) {
      usedPrompt.textContent = mockup.promptUsado || mockup.prompt;
    }
    
    // Renderizar grid de variações
    if (variationsGrid && mockup.variacoes) {
      variationsGrid.innerHTML = mockup.variacoes.map((variacao, index) => `
        <div class="variation-item" data-url="${variacao.url}" data-seed="${variacao.seed}">
          <img src="${variacao.url}" alt="Variação ${index + 1}" class="variation-image">
          <div class="variation-info">
            <div class="variation-seed">Seed: ${variacao.seed}</div>
            <button class="variation-select-btn">Escolher Esta</button>
          </div>
        </div>
      `).join('');
      
      // Adicionar eventos de clique
      variationsGrid.querySelectorAll('.variation-item').forEach(item => {
        item.addEventListener('click', () => selectVariation(item));
      });
    }
    
    // Esconder loading e mostrar modal de variações
    loadingContainer.style.display = 'none';
    mockupVariationsModal.classList.add('show');
  }
  
  // 🚀 NOVA FUNÇÃO: Mostrar variações para seleção de mockup já concluído
  async function showMockupVariationsForSelection(mockupId) {
    try {
      console.log('🔍 [MOCKUP-SELECTION] ===== INICIANDO SELEÇÃO DE VARIAÇÕES =====');
      console.log('🔍 [MOCKUP-SELECTION] Mockup ID:', mockupId);
      
      // 🚀 CORREÇÃO: Cache busting para evitar dados em cache
      const cacheBuster = Date.now();
      const url = `/api/mockups/${mockupId}?t=${cacheBuster}`;
      
      console.log('🔍 [MOCKUP-SELECTION] URL com cache busting:', url);
      
      // Buscar dados do mockup
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ [MOCKUP-SELECTION] Resposta não OK:', response.status, response.statusText);
        throw new Error('Erro ao carregar mockup');
      }
      
      const responseData = await response.json();
      
      // 🚀 CORREÇÃO CRÍTICA: Extrair dados do wrapper da API se presente
      const mockup = responseData.data || responseData;
      
      console.log('🔍 [MOCKUP-SELECTION] ===== DADOS DO MOCKUP RECEBIDOS =====');
      console.log('🔍 [MOCKUP-SELECTION] Resposta completa da API:', responseData);
      console.log('🔍 [MOCKUP-SELECTION] Mockup extraído:', mockup);
      console.log('🔍 [MOCKUP-SELECTION] Status:', mockup.status);
      console.log('🔍 [MOCKUP-SELECTION] imagemUrl:', mockup.imagemUrl || 'VAZIO');
      console.log('🔍 [MOCKUP-SELECTION] metadados:', mockup.metadados);
      console.log('🔍 [MOCKUP-SELECTION] metadados.variacoesTemporarias:', mockup.metadados?.variacoesTemporarias);
      console.log('🔍 [MOCKUP-SELECTION] Quantidade de variações:', mockup.metadados?.variacoesTemporarias?.length || 0);
      
      // 🚀 CORREÇÃO: Verificação mais robusta com múltiplos caminhos
      let variacoes = null;
      let origemVariacoes = '';
      
      // Tentar múltiplos caminhos para encontrar as variações
      if (mockup.metadados?.variacoesTemporarias?.length > 0) {
        variacoes = mockup.metadados.variacoesTemporarias;
        origemVariacoes = 'metadados.variacoesTemporarias';
      } else if (mockup.variacoes?.length > 0) {
        variacoes = mockup.variacoes.map(v => v.url || v);
        origemVariacoes = 'mockup.variacoes';
      } else if (mockup.variacoesTemporarias?.length > 0) {
        variacoes = mockup.variacoesTemporarias;
        origemVariacoes = 'mockup.variacoesTemporarias';
      }
      
      console.log('🔍 [MOCKUP-SELECTION] ===== ANÁLISE DE VARIAÇÕES =====');
      console.log('🔍 [MOCKUP-SELECTION] Variações encontradas:', variacoes);
      console.log('🔍 [MOCKUP-SELECTION] Origem das variações:', origemVariacoes);
      console.log('🔍 [MOCKUP-SELECTION] Quantidade final:', variacoes?.length || 0);
      
      if (!variacoes || variacoes.length === 0) {
        console.error('❌ [MOCKUP-SELECTION] NENHUMA VARIAÇÃO ENCONTRADA!');
        console.error('❌ [MOCKUP-SELECTION] Estrutura completa do mockup:', JSON.stringify(mockup, null, 2));
        
        alert('Este mockup não possui variações disponíveis para seleção. Verifique se o mockup foi gerado corretamente.');
        return;
      }
      
      console.log('✅ [MOCKUP-SELECTION] Variações válidas encontradas:', variacoes.length);
      
      // Configurar dados para o modal
      currentMockupData = {
        mockupId: mockup._id,
        titulo: mockup.titulo,
        prompt: mockup.prompt
      };
      
      console.log('🔍 [MOCKUP-SELECTION] Dados configurados para modal:', currentMockupData);
      
      // Preencher prompt usado
      if (usedPrompt) {
        usedPrompt.textContent = mockup.prompt || 'Prompt não disponível';
        console.log('🔍 [MOCKUP-SELECTION] Prompt preenchido:', mockup.prompt);
      }
      
      // 🚀 CORREÇÃO: Renderizar grid com validação de URLs
      if (variationsGrid) {
        console.log('🔍 [MOCKUP-SELECTION] ===== RENDERIZANDO GRID DE VARIAÇÕES =====');
        
        const gridHTML = variacoes.map((url, index) => {
          console.log(`🔍 [MOCKUP-SELECTION] Variação ${index + 1}: ${url}`);
          
          // Validar se a URL é válida
          if (!url || typeof url !== 'string') {
            console.warn(`⚠️ [MOCKUP-SELECTION] URL inválida na variação ${index + 1}:`, url);
            return '';
          }
          
          return `
            <div class="variation-item" data-url="${url}" data-seed="${index + 1}">
              <img src="${url}" alt="Variação ${index + 1}" class="variation-image" 
                   onerror="console.error('Erro ao carregar imagem:', this.src)">
              <div class="variation-info">
                <div class="variation-seed">Variação ${index + 1}</div>
                <button class="variation-select-btn">Escolher Esta</button>
              </div>
            </div>
          `;
        }).filter(html => html !== '').join('');
        
        console.log('🔍 [MOCKUP-SELECTION] HTML do grid gerado:', gridHTML);
        
        variationsGrid.innerHTML = gridHTML;
        
        // Adicionar eventos de clique
        const variationItems = variationsGrid.querySelectorAll('.variation-item');
        console.log('🔍 [MOCKUP-SELECTION] Itens de variação encontrados:', variationItems.length);
        
        variationItems.forEach((item, index) => {
          console.log(`🔍 [MOCKUP-SELECTION] Configurando evento para item ${index + 1}`);
          item.addEventListener('click', () => {
            console.log(`🔍 [MOCKUP-SELECTION] Variação ${index + 1} clicada`);
            selectVariation(item);
          });
        });
      }
      
      console.log('✅ [MOCKUP-SELECTION] Modal configurado, mostrando...');
      
      // Mostrar modal de variações
      mockupVariationsModal.classList.add('show');
      
      console.log('✅ [MOCKUP-SELECTION] ===== SELEÇÃO DE VARIAÇÕES INICIADA COM SUCESSO =====');
      
    } catch (error) {
      console.error('❌ [MOCKUP-SELECTION] Erro ao carregar variações do mockup:', error);
      console.error('❌ [MOCKUP-SELECTION] Stack trace:', error.stack);
      alert('Não foi possível carregar as variações do mockup. Tente novamente.');
    }
  }
  
  // Selecionar variação (agora suporta seleção múltipla)
  function selectVariation(item) {
    const url = item.dataset.url;
    const seed = item.dataset.seed;
    
    // Verificar se já está selecionada
    if (selectedVariations.has(url)) {
      // Remover da seleção
      selectedVariations.delete(url);
      item.classList.remove('selected');
    } else {
      // Adicionar à seleção
      selectedVariations.add(url);
      item.classList.add('selected');
    }
    
    // Atualizar contador e botão
    updateSelectionCounter();
    updateSaveButton();
  }
  
  // Atualizar contador de seleções
  function updateSelectionCounter() {
    const counter = document.getElementById('selection-count');
    if (counter) {
      const total = variationsGrid.querySelectorAll('.variation-item').length;
      counter.textContent = `${selectedVariations.size} de ${total} variações selecionadas`;
    }
  }
  
  // Atualizar estado do botão salvar
  function updateSaveButton() {
    const saveBtn = document.getElementById('save-selected-btn');
    if (saveBtn) {
      saveBtn.disabled = selectedVariations.size === 0;
    }
  }
  
  // Salvar variações selecionadas
  async function saveSelectedVariations() {
    console.log('🔍 [SAVE-VARIATIONS] ===== INICIANDO SALVAMENTO =====');
    console.log('🔍 [SAVE-VARIATIONS] Variações selecionadas:', selectedVariations.size);
    console.log('🔍 [SAVE-VARIATIONS] currentMockupData:', currentMockupData);
    
    if (selectedVariations.size === 0) {
      console.log('❌ [SAVE-VARIATIONS] Nenhuma variação selecionada');
      alert('Por favor, selecione pelo menos uma variação antes de salvar.');
      return;
    }
    
    if (!currentMockupData) {
      console.log('❌ [SAVE-VARIATIONS] currentMockupData não encontrado');
      alert('Erro: dados do mockup não encontrados. Tente novamente.');
      return;
    }
    
    try {
      console.log('🔍 [SAVE-VARIATIONS] Preparando dados para envio...');
      
      // Preparar dados das variações selecionadas
      const variacoesSelecionadas = Array.from(selectedVariations).map((url, index) => {
        console.log(`🔍 [SAVE-VARIATIONS] Variação ${index + 1}: ${url}`);
        return {
          url: url,
          seed: index + 1 // Usar índice como seed temporário
        };
      });
      
      console.log('🔍 [SAVE-VARIATIONS] Dados preparados:', variacoesSelecionadas);
      console.log('🔍 [SAVE-VARIATIONS] Mockup ID:', currentMockupData.mockupId);
      
      // Mostrar feedback visual
      const saveBtn = document.getElementById('save-selected-btn');
      if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled = true;
      }
      
      const response = await fetch(`/api/mockups/${currentMockupData.mockupId}/salvar-multiplas-variacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variacoesSelecionadas
        })
      });
      
      console.log('🔍 [SAVE-VARIATIONS] Resposta do servidor:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [SAVE-VARIATIONS] Erro na resposta:', errorData);
        throw new Error(errorData.message || 'Erro ao salvar variações');
      }
      
      const result = await response.json();
      console.log('✅ [SAVE-VARIATIONS] Resultado:', result);
      
      // Fechar modal de variações
      closeVariationsModal();
      
      // Limpar seleções
      selectedVariations.clear();
      
      // Recarregar lista de mockups
      if (currentClientId) {
        loadClientMockups(currentClientId);
      }
      
      // Voltar para detalhes do cliente
      showOnlySection('client-details-panel');
      
      // Mostrar feedback de sucesso
      console.log(`✅ [SAVE-VARIATIONS] ${result.totalSalvas} variações salvas com sucesso`);
      
      // Mostrar notificação de sucesso (opcional)
      if (result.totalSalvas > 0) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4CAF50;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
        `;
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${result.totalSalvas} variação(ões) salva(s) com sucesso!`;
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ [SAVE-VARIATIONS] Erro ao salvar variações:', error);
      alert('Não foi possível salvar as variações escolhidas. Tente novamente.');
      
      // Restaurar botão
      const saveBtn = document.getElementById('save-selected-btn');
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Selecionadas';
        saveBtn.disabled = selectedVariations.size === 0;
      }
    }
  }
  
  // Salvar variação escolhida
  async function saveSelectedVariation() {
    if (!selectedVariation || !currentMockupData) return;
    
    try {
      const response = await fetch(`/api/mockups/${currentMockupData.mockupId}/salvar-variacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urlEscolhida: selectedVariation.url,
          seedEscolhida: selectedVariation.seed
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar variação');
      }
      
      const result = await response.json();
      
      // Fechar modal de variações
      closeVariationsModal();
      
      // Recarregar lista de mockups
      if (currentClientId) {
        loadClientMockups(currentClientId);
      }
      
      // Voltar para detalhes do cliente
      showOnlySection('client-details-panel');
      
      // Mostrar feedback de sucesso
      console.log('✅ Variação salva com sucesso');
      
    } catch (error) {
      console.error('Erro ao salvar variação:', error);
      alert('Não foi possível salvar a variação escolhida. Tente novamente.');
    }
  }
  
  // Carregar mockups do cliente
  async function loadClientMockups(clientId) {
    try {
      const response = await fetch(`/api/mockups/cliente/${clientId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar mockups');
      }
      
      const result = await response.json();
      const mockups = result.data.mockups;
      
      if (!mockups.length) {
        mockupsList.innerHTML = `
          <div class="mockups-list-empty">
            <i class="fas fa-image"></i>
            <p>Nenhum mockup criado</p>
            <small>Crie mockups profissionais usando IA para logos, posts sociais, banners e muito mais</small>
          </div>
        `;
        return;
      }
      
      // Ordenar por data (mais recente primeiro)
      mockups.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      // Renderizar lista
      mockupsList.innerHTML = mockups.map(mockup => {
        let statusClass = 'completed';
        let statusText = 'Concluído';
        
        if (mockup.status === 'gerando') {
          statusClass = 'generating';
          statusText = 'Gerando';
        } else if (mockup.status === 'erro') {
          statusClass = 'error';
          statusText = 'Erro';
        }
        
        // 🚀 CORREÇÃO: Verificar imagemUrl em vez de imagemFinal
        // Se imagemUrl estiver vazio mas há variações temporárias, mostrar botão para escolher
        const hasVariations = mockup.metadados?.variacoesTemporarias?.length > 0;
        const needsSelection = mockup.status === 'concluido' && !mockup.imagemUrl && hasVariations;
        
        let previewContent = '';
        let actionButton = '';
        
        if (mockup.imagemUrl) {
          // Mockup finalizado com imagem escolhida
          previewContent = `<img src="${mockup.imagemUrl}" alt="${mockup.titulo}">`;
        } else if (needsSelection) {
          // Mockup concluído mas precisa escolher variação
          previewContent = `
            <div class="mockup-preview-placeholder">
              <i class="fas fa-images"></i>
              <span>Escolher Variação</span>
            </div>
          `;
          actionButton = `
            <button class="choose-variation-btn" data-id="${mockup._id}" title="Escolher variação">
              <i class="fas fa-hand-pointer"></i> Escolher
            </button>
          `;
          statusText = 'Aguardando Escolha';
          statusClass = 'awaiting-choice';
        } else {
          // Mockup em progresso ou erro
          previewContent = `<i class="fas fa-palette"></i>`;
        }
        
        return `
          <div class="mockup-item ${statusClass}" data-id="${mockup._id}">
            <div class="mockup-item-preview">
              ${previewContent}
            </div>
            <div class="mockup-item-content">
              <div class="mockup-item-header">
                <div class="mockup-item-title">${mockup.titulo}</div>
                <div class="mockup-item-type">${getTypeLabel(mockup.configuracao?.tipoArte || 'mockup')}</div>
              </div>
              <div class="mockup-item-meta">
                <span><i class="fas fa-calendar"></i> ${new Date(mockup.dataCriacao).toLocaleDateString('pt-BR')}</span>
                <span><i class="fas fa-expand-arrows-alt"></i> ${mockup.configuracao?.aspectRatio || 'N/A'}</span>
                <span class="mockup-status ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="mockup-item-actions">
              ${actionButton}
              <button class="regenerate-mockup-btn" data-id="${mockup._id}" title="Regenerar usando as mesmas configurações">
                <i class="fas fa-redo"></i> Regenerar
              </button>
              <button class="delete-mockup-btn" data-id="${mockup._id}" title="Excluir mockup">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // Adicionar eventos de clique
      mockupsList.querySelectorAll('.mockup-item').forEach(item => {
        const content = item.querySelector('.mockup-item-content');
        content.addEventListener('click', () => {
          const mockupId = item.dataset.id;
          viewMockup(mockupId);
        });
      });
      
      // Adicionar eventos para botões de escolher variação
      mockupsList.querySelectorAll('.choose-variation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mockupId = btn.dataset.id;
          showMockupVariationsForSelection(mockupId);
        });
      });
      
      // Adicionar eventos para botões de regenerar
      mockupsList.querySelectorAll('.regenerate-mockup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mockupId = btn.dataset.id;
          regenerateFromList(mockupId);
        });
      });
      
      // Adicionar eventos para botões de delete
      mockupsList.querySelectorAll('.delete-mockup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mockupId = btn.dataset.id;
          deleteMockup(mockupId);
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar mockups:', error);
      mockupsList.innerHTML = `
        <div class="mockups-list-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar mockups. Tente novamente.</p>
        </div>
      `;
    }
  }
  
  // Obter label do tipo de arte
  function getTypeLabel(tipoArte) {
    const labels = {
      'logo': 'Logo',
      'post-social': 'Post',
      'banner': 'Banner',
      'landing-page': 'Landing',
      'material-apresentacao': 'Apresentação',
      'ilustracao-conceitual': 'Ilustração',
      'mockup-produto': 'Produto'
    };
    
    return labels[tipoArte] || tipoArte;
  }
  
  // Visualizar mockup
  function viewMockup(mockupId) {
    // Por enquanto, apenas log - pode ser expandido para mostrar detalhes
    console.log('Visualizando mockup:', mockupId);
  }
  
  // Deletar mockup
  async function deleteMockup(mockupId) {
    if (!confirm('Tem certeza que deseja excluir este mockup? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/mockups/${mockupId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir mockup');
      }
      
      // Recarregar lista
      if (currentClientId) {
        loadClientMockups(currentClientId);
      }
      
      console.log('✅ Mockup excluído com sucesso');
      
    } catch (error) {
      console.error('Erro ao excluir mockup:', error);
      alert('Não foi possível excluir o mockup. Tente novamente.');
    }
  }
  
  // Regenerar mockup (do modal de variações)
  async function regenerateMockup() {
    if (!currentMockupData) return;
    
    try {
      // Buscar configurações completas do mockup
      const response = await fetch(`/api/mockups/${currentMockupData.mockupId}/configuracoes`);
      if (!response.ok) {
        throw new Error('Erro ao buscar configurações do mockup');
      }
      
      const data = await response.json();
      const configuracoes = data.data;
      
      // Fechar modal de variações
      closeVariationsModal();
      
      // Pré-preencher formulário com as configurações
      preencherFormularioComMockup(configuracoes);
      
      // Mostrar modal de criação
      showMockupModal();
      
    } catch (error) {
      console.error('Erro ao regenerar mockup:', error);
      alert('Não foi possível carregar as configurações do mockup. Tente novamente.');
    }
  }
  
  // Regenerar mockup da lista
  async function regenerateFromList(mockupId) {
    try {
      console.log('🔄 [REGENERAR] Iniciando regeneração do mockup:', mockupId);
      
      // Buscar configurações completas do mockup
      const response = await fetch(`/api/mockups/${mockupId}/configuracoes`);
      if (!response.ok) {
        throw new Error('Erro ao buscar configurações do mockup');
      }
      
      const data = await response.json();
      const configuracoes = data.data;
      
      console.log('✅ [REGENERAR] Configurações carregadas:', configuracoes);
      
      // Pré-preencher formulário com as configurações
      preencherFormularioComMockup(configuracoes);
      
      // Mostrar modal de criação
      showMockupModal();
      
    } catch (error) {
      console.error('❌ [REGENERAR] Erro ao regenerar mockup:', error);
      alert('Não foi possível carregar as configurações do mockup. Tente novamente.');
    }
  }
  
  // Pré-preencher formulário com dados do mockup
  function preencherFormularioComMockup(configuracoes) {
    console.log('📝 [PREENCHER] ===== INICIANDO PREENCHIMENTO =====');
    console.log('📝 [PREENCHER] Configurações recebidas:', configuracoes);
    
    // 🚀 CORREÇÃO: Validar se configurações existem
    if (!configuracoes) {
      console.error('❌ [PREENCHER] Configurações não fornecidas');
      return;
    }
    
    // Preencher campos básicos
    const tituloInput = document.getElementById('mockup-title');
    if (tituloInput && configuracoes.titulo) {
      tituloInput.value = configuracoes.titulo;
      console.log('✅ [PREENCHER] Título preenchido:', configuracoes.titulo);
    } else {
      console.log('⚠️ [PREENCHER] Título não preenchido - Input:', !!tituloInput, 'Valor:', configuracoes.titulo);
    }
    
    const promptInput = document.getElementById('mockup-prompt');
    if (promptInput && configuracoes.prompt) {
      promptInput.value = configuracoes.prompt;
      console.log('✅ [PREENCHER] Prompt preenchido:', configuracoes.prompt.substring(0, 50) + '...');
    } else {
      console.log('⚠️ [PREENCHER] Prompt não preenchido - Input:', !!promptInput, 'Valor:', !!configuracoes.prompt);
    }
    
    // 🚀 CORREÇÃO: Preencher configurações com validação detalhada
    if (configuracoes.configuracao) {
      const config = configuracoes.configuracao;
      console.log('📝 [PREENCHER] Processando configurações:', config);
      
      // Tipo de arte
      const tipoSelect = document.getElementById('mockup-type');
      if (tipoSelect && config.tipoArte) {
        tipoSelect.value = config.tipoArte;
        console.log('✅ [PREENCHER] Tipo de arte preenchido:', config.tipoArte);
      } else {
        console.log('⚠️ [PREENCHER] Tipo de arte não preenchido - Select:', !!tipoSelect, 'Valor:', config.tipoArte);
      }
      
      // Proporção
      const aspectRatioSelect = document.getElementById('mockup-aspect-ratio');
      if (aspectRatioSelect && config.aspectRatio) {
        aspectRatioSelect.value = config.aspectRatio;
        console.log('✅ [PREENCHER] Aspect ratio preenchido:', config.aspectRatio);
      } else {
        console.log('⚠️ [PREENCHER] Aspect ratio não preenchido - Select:', !!aspectRatioSelect, 'Valor:', config.aspectRatio);
      }
      
      // 🚀 CORREÇÃO CRÍTICA: Estilo visual (era 'estilo', agora verificar ambos)
      const estiloSelect = document.getElementById('mockup-style');
      if (estiloSelect && (config.estilo || config.estiloVisual)) {
        const estiloValue = config.estilo || config.estiloVisual;
        estiloSelect.value = estiloValue;
        console.log('✅ [PREENCHER] Estilo visual preenchido:', estiloValue);
      } else {
        console.log('⚠️ [PREENCHER] Estilo visual não preenchido - Select:', !!estiloSelect, 'Estilo:', config.estilo, 'EstiloVisual:', config.estiloVisual);
      }
      
      // Paleta de cores
      const coresSelect = document.getElementById('mockup-colors');
      if (coresSelect && config.paletaCores) {
        coresSelect.value = config.paletaCores;
        console.log('✅ [PREENCHER] Paleta de cores preenchida:', config.paletaCores);
      } else {
        console.log('⚠️ [PREENCHER] Paleta de cores não preenchida - Select:', !!coresSelect, 'Valor:', config.paletaCores);
      }
      
      // Elementos visuais
      const elementosSelect = document.getElementById('mockup-elements');
      if (elementosSelect && config.elementosVisuais) {
        elementosSelect.value = config.elementosVisuais;
        console.log('✅ [PREENCHER] Elementos visuais preenchidos:', config.elementosVisuais);
      } else {
        console.log('⚠️ [PREENCHER] Elementos visuais não preenchidos - Select:', !!elementosSelect, 'Valor:', config.elementosVisuais);
      }
      
      // Setor
      const setorSelect = document.getElementById('mockup-sector');
      if (setorSelect && config.setor) {
        setorSelect.value = config.setor;
        console.log('✅ [PREENCHER] Setor preenchido:', config.setor);
      } else {
        console.log('⚠️ [PREENCHER] Setor não preenchido - Select:', !!setorSelect, 'Valor:', config.setor);
      }
      
      // Público-alvo
      const audienciaSelect = document.getElementById('mockup-audience');
      if (audienciaSelect && config.publicoAlvo) {
        audienciaSelect.value = config.publicoAlvo;
        console.log('✅ [PREENCHER] Público-alvo preenchido:', config.publicoAlvo);
      } else {
        console.log('⚠️ [PREENCHER] Público-alvo não preenchido - Select:', !!audienciaSelect, 'Valor:', config.publicoAlvo);
      }
      
      // Mood
      const moodSelect = document.getElementById('mockup-mood');
      if (moodSelect && config.mood) {
        moodSelect.value = config.mood;
        console.log('✅ [PREENCHER] Mood preenchido:', config.mood);
      } else {
        console.log('⚠️ [PREENCHER] Mood não preenchido - Select:', !!moodSelect, 'Valor:', config.mood);
      }
      
      // Estilo de renderização
      const renderSelect = document.getElementById('mockup-render-style');
      if (renderSelect && config.estiloRenderizacao) {
        renderSelect.value = config.estiloRenderizacao;
        console.log('✅ [PREENCHER] Estilo de renderização preenchido:', config.estiloRenderizacao);
      } else {
        console.log('⚠️ [PREENCHER] Estilo de renderização não preenchido - Select:', !!renderSelect, 'Valor:', config.estiloRenderizacao);
      }
    } else {
      console.log('⚠️ [PREENCHER] Nenhuma configuração encontrada');
    }
    
    // 🚀 CORREÇÃO: Preencher configurações técnicas com validação
    if (configuracoes.configuracaoTecnica) {
      const configTec = configuracoes.configuracaoTecnica;
      console.log('📝 [PREENCHER] Processando configurações técnicas:', configTec);
      
      // CFG
      if (cfgRange && cfgValue && configTec.cfg) {
        cfgRange.value = configTec.cfg;
        cfgValue.textContent = configTec.cfg;
        console.log('✅ [PREENCHER] CFG preenchido:', configTec.cfg);
      } else {
        console.log('⚠️ [PREENCHER] CFG não preenchido - Range:', !!cfgRange, 'Value:', !!cfgValue, 'Valor:', configTec.cfg);
      }
      
      // Steps
      if (stepsRange && stepsValue && configTec.steps) {
        stepsRange.value = configTec.steps;
        stepsValue.textContent = configTec.steps;
        console.log('✅ [PREENCHER] Steps preenchido:', configTec.steps);
      } else {
        console.log('⚠️ [PREENCHER] Steps não preenchido - Range:', !!stepsRange, 'Value:', !!stepsValue, 'Valor:', configTec.steps);
      }
      
      // Formato
      const formatoSelect = document.getElementById('mockup-format');
      if (formatoSelect && configTec.outputFormat) {
        formatoSelect.value = configTec.outputFormat;
        console.log('✅ [PREENCHER] Formato preenchido:', configTec.outputFormat);
      } else {
        console.log('⚠️ [PREENCHER] Formato não preenchido - Select:', !!formatoSelect, 'Valor:', configTec.outputFormat);
      }
      
      // Qualidade
      if (qualityRange && qualityValue && configTec.outputQuality) {
        qualityRange.value = configTec.outputQuality;
        qualityValue.textContent = configTec.outputQuality;
        console.log('✅ [PREENCHER] Qualidade preenchida:', configTec.outputQuality);
      } else {
        console.log('⚠️ [PREENCHER] Qualidade não preenchida - Range:', !!qualityRange, 'Value:', !!qualityValue, 'Valor:', configTec.outputQuality);
      }
      
      // Se há configurações técnicas, mostrar seção avançada
      if (toggleAdvancedBtn && advancedContent) {
        toggleAdvancedBtn.classList.add('active');
        advancedContent.classList.add('show');
        console.log('✅ [PREENCHER] Seção avançada expandida');
      }
    } else {
      console.log('⚠️ [PREENCHER] Nenhuma configuração técnica encontrada');
    }
    
    // 🚀 CORREÇÃO: Gerar sugestões de prompt baseadas no tipo
    if (configuracoes.configuracao?.tipoArte) {
      generatePromptSuggestions();
      console.log('✅ [PREENCHER] Sugestões de prompt geradas');
    }
    
    console.log('✅ [PREENCHER] ===== PREENCHIMENTO CONCLUÍDO =====');
  }
  
  // Iniciar polling para verificar mockups concluídos
  function startMockupPolling() {
    console.log('🔍 [MOCKUP-POLLING] ===== INICIANDO POLLING DE MOCKUPS =====');
    console.log('🔍 [MOCKUP-POLLING] Cliente ID:', currentClientId);
    
    let pollCount = 0;
    let lastMockupCount = 0;
    
    // Verificar a cada 15 segundos (menos agressivo)
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        console.log(`🔍 [MOCKUP-POLLING] ===== VERIFICAÇÃO #${pollCount} =====`);
        
        if (!currentClientId) {
          console.log('❌ [MOCKUP-POLLING] Cliente ID não encontrado, parando polling');
          clearInterval(pollInterval);
          return;
        }
        
        console.log('🔍 [MOCKUP-POLLING] Buscando mockups do cliente:', currentClientId);
        
        // Buscar mockups do cliente
        const response = await fetch(`/api/mockups/cliente/${currentClientId}?t=${Date.now()}`);
        if (!response.ok) {
          console.log('❌ [MOCKUP-POLLING] Resposta não OK:', response.status);
          return;
        }
        
        const result = await response.json();
        const mockups = result.data.mockups;
        
        console.log('🔍 [MOCKUP-POLLING] Mockups encontrados:', mockups.length);
        
        // Verificar se há novos mockups desde a última verificação
        if (mockups.length > lastMockupCount) {
          console.log('🔍 [MOCKUP-POLLING] Novos mockups detectados! Anterior:', lastMockupCount, 'Atual:', mockups.length);
          lastMockupCount = mockups.length;
        }
        
        // Verificar se há mockups recém-concluídos (últimos 5 minutos)
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        console.log('🔍 [MOCKUP-POLLING] Analisando critérios de detecção...');
        console.log('🔍 [MOCKUP-POLLING] Tempo atual:', new Date(now).toISOString());
        console.log('🔍 [MOCKUP-POLLING] Janela de detecção (5min atrás):', new Date(fiveMinutesAgo).toISOString());
        
        const recentCompletedMockups = mockups.filter((mockup, index) => {
          const createdTime = new Date(mockup.dataCriacao).getTime();
          const timeSinceCreation = (now - createdTime) / 1000; // em segundos
          
          console.log(`🔍 [MOCKUP-${index}] ===== ANÁLISE MOCKUP ${mockup._id} =====`);
          console.log(`🔍 [MOCKUP-${index}] Título: ${mockup.titulo}`);
          console.log(`🔍 [MOCKUP-${index}] Status: ${mockup.status}`);
          console.log(`🔍 [MOCKUP-${index}] Criado em: ${mockup.dataCriacao}`);
          console.log(`🔍 [MOCKUP-${index}] Tempo desde criação: ${timeSinceCreation}s (${Math.floor(timeSinceCreation/60)}min)`);
          console.log(`🔍 [MOCKUP-${index}] imagemUrl: ${mockup.imagemUrl || 'VAZIO'}`);
          console.log(`🔍 [MOCKUP-${index}] metadados:`, mockup.metadados);
          
          // Critérios mais específicos
          const isRecent = createdTime > fiveMinutesAgo;
          const isCompleted = mockup.status === 'concluido';
          const hasVariations = mockup.metadados?.variacoesTemporarias?.length > 0;
          const needsSelection = !mockup.imagemUrl; // Ainda não tem imagem final escolhida
          
          console.log(`🔍 [MOCKUP-${index}] Critérios detalhados:`, {
            isRecent: isRecent,
            isCompleted: isCompleted,
            hasVariations: hasVariations,
            needsSelection: needsSelection,
            variacoesCount: mockup.metadados?.variacoesTemporarias?.length || 0
          });
          
          const shouldDetect = isRecent && isCompleted && hasVariations && needsSelection;
          
          console.log(`🔍 [MOCKUP-${index}] DEVE DETECTAR: ${shouldDetect}`);
          
          return shouldDetect;
        });
        
        console.log('🔍 [MOCKUP-POLLING] Mockups prontos para seleção encontrados:', recentCompletedMockups.length);
        
        if (recentCompletedMockups.length > 0) {
          console.log('✅ [MOCKUP-POLLING] MOCKUP PRONTO PARA SELEÇÃO DETECTADO!');
          console.log('✅ [MOCKUP-POLLING] Mockup detectado:', recentCompletedMockups[0]);
          console.log('✅ [MOCKUP-POLLING] Parando polling...');
          
          // Parar polling
          clearInterval(pollInterval);
          
          // Completar progresso
          updateProgress({
            percentage: 100,
            message: 'Mockup gerado! Aguarde enquanto carregamos as variações...',
            step: 4,
            stepStatus: 'completed'
          });
          
          // Aguardar 3 segundos e recarregar lista
          setTimeout(() => {
            console.log('✅ [MOCKUP-POLLING] Recarregando lista e voltando para cliente...');
            
            // Recarregar lista de mockups
            loadClientMockups(currentClientId);
            
            // Voltar para detalhes do cliente
            showOnlySection('client-details-panel');
            
            // Mostrar notificação de sucesso
            console.log('✅ [MOCKUP-POLLING] Mockup concluído via polling - pronto para seleção');
            
            // Scroll para a aba de mockups
            const mockupsTab = document.querySelector('[data-tab="mockups"]');
            if (mockupsTab) {
              mockupsTab.click();
            }
          }, 3000);
        } else {
          console.log('⏳ [MOCKUP-POLLING] Nenhum mockup pronto para seleção detectado, continuando polling...');
          
          // Mostrar progresso de polling se ainda estiver na tela de loading
          if (document.getElementById('loading-container').style.display !== 'none') {
            const progressMessage = `Verificando progresso... (${pollCount}ª verificação)`;
            updateProgress({
              percentage: Math.min(95, 70 + (pollCount * 5)), // Aumentar gradualmente até 95%
              message: progressMessage,
              step: 4,
              stepStatus: 'active'
            });
          }
        }
        
      } catch (error) {
        console.error('❌ [MOCKUP-POLLING] Erro no polling:', error);
      }
    }, 15000); // Verificar a cada 15 segundos (menos agressivo)
    
    // Timeout de segurança (8 minutos)
    setTimeout(() => {
      console.log('⏰ [MOCKUP-POLLING] TIMEOUT DE 8 MINUTOS ATINGIDO');
      clearInterval(pollInterval);
      if (document.getElementById('loading-container').style.display !== 'none') {
        showError('O mockup está demorando mais que o esperado. Verifique a aba "Mockups" em alguns minutos para ver se foi concluído.');
      }
    }, 480000); // 8 minutos
  }
  
  // ===== EVENTOS PARA MOCKUPS =====
  
  function setupMockupEvents() {
    // Botão de novo mockup
    if (newMockupBtn) {
      newMockupBtn.addEventListener('click', showMockupModal);
    }
    
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.remove('show');
          // Limpar seleções ao fechar modal de variações
          if (modal.id === 'mockup-variations-modal') {
            selectedVariations.clear();
            updateSelectionCounter();
            updateSaveButton();
          }
        }
      });
    });
    
    // Cancelar mockup
    if (cancelMockupBtn) {
      cancelMockupBtn.addEventListener('click', closeMockupModal);
    }
    
    // Submeter formulário
    if (mockupForm) {
      mockupForm.addEventListener('submit', submitMockupForm);
    }
    
    // Regenerar mockup
    if (regenerateMockupBtn) {
      regenerateMockupBtn.addEventListener('click', regenerateMockup);
    }
    
    // 🚀 CORREÇÃO: Configurar botão de salvar variações selecionadas
    const saveSelectedBtn = document.getElementById('save-selected-btn');
    if (saveSelectedBtn) {
      saveSelectedBtn.addEventListener('click', saveSelectedVariations);
    }
    
    // Configurar controles de range
    setupRangeControls();
    
    // Configurar configurações avançadas
    setupAdvancedSettings();
    
    // Gerar sugestões quando tipo mudar
    const tipoSelect = document.getElementById('mockup-type');
    if (tipoSelect) {
      tipoSelect.addEventListener('change', generatePromptSuggestions);
    }
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
      if (e.target === mockupModal) {
        closeMockupModal();
      }
      if (e.target === mockupVariationsModal) {
        closeVariationsModal();
        // Limpar seleções ao fechar modal
        selectedVariations.clear();
        updateSelectionCounter();
        updateSaveButton();
      }
    });
  }
  
  // Modificar a função loadClientDetails para incluir mockups
  const originalLoadClientDetails = loadClientDetails;
  loadClientDetails = async function(clientId) {
    await originalLoadClientDetails(clientId);
    
    // Carregar mockups também
    loadClientMockups(clientId);
  };
  
  // Modificar a função init para incluir eventos de mockups
  function init() {
    // Inicializar gerenciador de processos ativos
    activeProcessesManager = new ActiveProcessesManager();
    
    // Carregar clientes
    loadClients();
    
    // Configurar abas
    setupClientTabs();
    
    // Configurar logos clicáveis
    setupClickableLogos();
    
    // Configurar seletor de cores
    setupColorPicker();
    
    // Configurar eventos de planos de ação
    setupActionPlanEvents();
    
    // Configurar eventos de mockups
    setupMockupEvents();
    
  // Configurar eventos da galeria
  setupGalleryModalEvents();
  
  // Configurar botão de refresh da galeria
  setupGalleryRefreshButton();
    
    // Mostrar tela de boas-vindas
    welcomeContainer.style.display = 'block';
  }

  // ===== FUNÇÃO PARA CONFIGURAR BOTÃO DE REFRESH DA GALERIA =====
  
  function setupGalleryRefreshButton() {
    const refreshBtn = document.getElementById('refresh-gallery-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        if (!currentClientId) return;
        
        // Mostrar estado de loading
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
        
        try {
          // Recarregar galeria
          await loadClientGallery(currentClientId);
          
          // Feedback de sucesso
          refreshBtn.innerHTML = '<i class="fas fa-check"></i> Atualizado!';
          
          setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
          }, 1500);
          
        } catch (error) {
          console.error('Erro ao atualizar galeria:', error);
          
          // Feedback de erro
          refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro';
          
          setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
          }, 2000);
        }
      });
    }
  }

  // Carregar clientes ao iniciar e mostrar tela de boas-vindas
  init();
});
