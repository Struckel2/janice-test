// ===== MÓDULO DE GERENCIAMENTO DE PROCESSOS ATIVOS =====
window.AppModules = window.AppModules || {};

window.AppModules.ActiveProcesses = (function() {
  'use strict';
  
  // ===== CLASSE GERENCIADORA DE PROCESSOS ATIVOS =====
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
        
        // 🚀 CORREÇÃO: Para mockups, remover imediatamente após conclusão
        if (process.tipo === 'mockup') {
          console.log('🔍 [DEBUG-FRONTEND] Mockup concluído - removendo processo após 3 segundos');
          setTimeout(() => {
            this.removeProcess(data.processId);
          }, 3000); // Remover após 3 segundos para dar tempo de ver a conclusão
        }
      } else {
        console.log('⚠️ [DEBUG-FRONTEND] Processo não encontrado no Map local');
      }
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
      
