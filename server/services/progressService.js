/**
 * Serviço de gerenciamento de progresso
 * 
 * Este módulo centraliza todas as funcionalidades relacionadas
 * ao monitoramento de progresso em tempo real usando Server-Sent Events (SSE).
 * 
 * Pode ser usado por qualquer parte da aplicação que precise enviar
 * atualizações de progresso para o cliente.
 */

/**
 * Mapa para armazenar as conexões SSE por clientId
 * Usado para enviar atualizações de progresso em tempo real
 */
const sseConnections = new Map();

/**
 * Mapa para armazenar processos ativos por userId
 * Estrutura: userId -> Map(processId -> processData)
 */
const activeProcesses = new Map();

/**
 * Timeout para processos órfãos (10 minutos)
 */
const PROCESS_TIMEOUT = 10 * 60 * 1000; // 10 minutos em millisegundos

/**
 * Verificar e limpar processos órfãos a cada 2 minutos
 */
setInterval(() => {
  checkOrphanedProcesses();
}, 2 * 60 * 1000); // 2 minutos

/**
 * Função para verificar processos órfãos
 */
function checkOrphanedProcesses() {
  const now = new Date();
  
  for (const [userId, userProcesses] of activeProcesses.entries()) {
    for (const [processId, process] of userProcesses.entries()) {
      // Verificar se o processo está em progresso há mais de 10 minutos
      if (process.status === 'em-progresso') {
        const processAge = now - new Date(process.criadoEm);
        
        if (processAge > PROCESS_TIMEOUT) {
          console.log(`⚠️ [TIMEOUT] Processo órfão detectado: ${processId} (${processAge/1000}s)`);
          
          // Marcar como erro por timeout
          errorActiveProcess(userId, processId, 'Timeout: Processo demorou mais que o esperado');
        }
      }
    }
  }
}

/**
 * Função para enviar eventos SSE formatados corretamente
 * @param {Object} res - Objeto de resposta do Express
 * @param {String} event - Nome do evento
 * @param {Object} data - Dados a serem enviados
 */
function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Registra uma nova conexão SSE
 * @param {String} clientId - ID do cliente
 * @param {Object} res - Objeto de resposta do Express
 * @param {String} type - Tipo de conexão ('progress' ou 'processes')
 * @returns {Function} Função para manter a conexão ativa (keepAlive)
 */
function registerConnection(clientId, res, type = 'progress') {
  // Configurar cabeçalhos para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Enviar evento inicial baseado no tipo
  if (type === 'progress') {
    sendSSEEvent(res, 'progress', {
      percentage: 0,
      message: 'Iniciando análise...',
      step: 1,
      stepStatus: 'active'
    });
  } else if (type === 'processes') {
    // Enviar processos ativos existentes
    const userProcesses = activeProcesses.get(clientId);
    const processes = userProcesses ? Array.from(userProcesses.values()) : [];
    
    sendSSEEvent(res, 'processes-list', {
      processes: processes,
      totalProcesses: processes.length
    });
  }
  
  // Função para manter a conexão ativa
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);
  
  // Armazenar a conexão para uso posterior com identificação do tipo
  const connectionKey = type === 'processes' ? `${clientId}_processes` : clientId;
  sseConnections.set(connectionKey, res);
  
  return keepAlive;
}

/**
 * Remove uma conexão SSE
 * @param {String} clientId - ID do cliente
 * @param {Function} keepAlive - Função de keepAlive para limpar
 */
function removeConnection(clientId, keepAlive) {
  clearInterval(keepAlive);
  sseConnections.delete(clientId);
}

/**
 * Função para enviar uma atualização de progresso para um cliente específico
 * @param {String} clientId - ID do cliente
 * @param {Object} data - Dados do progresso (percentage, message, step, stepStatus)
 * @param {String} operationType - Tipo de operação ('analysis' ou 'transcription')
 * @param {String} method - Método usado ('replicate', 'smart-whisper', 'openai', etc.)
 */
function sendProgressUpdate(clientId, data, operationType = 'analysis', method = null) {
  const connection = sseConnections.get(clientId);
  if (connection) {
    // Adicionar o tipo de operação e método aos dados para o frontend poder diferenciar
    const progressData = {
      ...data,
      operationType,
      method
    };
    
    // Adaptar mensagem baseada no método para transcrições
    if (operationType === 'transcription' && method) {
      if (method === 'replicate') {
        // Para Replicate, adaptar mensagens para indicar velocidade
        if (data.message && data.message.includes('Processando')) {
          progressData.message = data.message.replace('Processando', 'Processando com GPU (rápido)');
        }
      } else if (method === 'smart-whisper') {
        // Para smart-whisper, indicar que é CPU-based
        if (data.message && data.message.includes('Processando')) {
          progressData.message = data.message.replace('Processando', 'Processando com CPU');
        }
      }
    }
    
    sendSSEEvent(connection, 'progress', progressData);
  }
}

/**
 * Função para enviar evento de conclusão para um cliente específico
 * @param {String} clientId - ID do cliente
 * @param {Object} data - Dados da conclusão
 * @param {String} operationType - Tipo de operação ('analysis' ou 'transcription')
 */
function sendCompletionEvent(clientId, data, operationType = 'analysis') {
  const connection = sseConnections.get(clientId);
  if (connection) {
    // Adicionar o tipo de operação aos dados para o frontend poder diferenciar
    const completionData = {
      ...data,
      operationType
    };
    sendSSEEvent(connection, 'complete', completionData);
  }
}

/**
 * Função para iniciar o processo de análise com um evento inicial
 * @param {String} clientId - ID do cliente
 * @param {String} operationType - Tipo de operação ('analysis' ou 'transcription')
 */
function initProgress(clientId, operationType = 'analysis') {
  const connection = sseConnections.get(clientId);
  if (!connection) return;

  // Enviar apenas o evento inicial, o resto será atualizado pelo processo real
  const message = operationType === 'transcription' 
    ? 'Iniciando transcrição...' 
    : 'Iniciando análise...';

  sendProgressUpdate(clientId, {
    percentage: 0,
    message,
    step: 1,
    stepStatus: 'active'
  }, operationType);
}

/**
 * Calcula estimativa de tempo baseada no tipo de processo
 * @param {String} tipo - Tipo do processo ('transcricao', 'analise', 'plano-acao')
 * @param {Object} metadata - Metadados adicionais (tamanho do arquivo, etc.)
 * @returns {Number} Tempo estimado em minutos
 */
function calculateTimeEstimate(tipo, metadata = {}) {
  switch (tipo) {
    case 'transcricao':
      // Para transcrições: aproximadamente tempo real do áudio
      if (metadata.duracao) {
        return Math.ceil(metadata.duracao / 60); // converter segundos para minutos
      } else if (metadata.tamanhoArquivo) {
        // Estimativa baseada no tamanho: ~1MB por minuto de áudio
        return Math.max(1, Math.ceil(metadata.tamanhoArquivo / (1024 * 1024)));
      }
      return 5; // fallback: 5 minutos
      
    case 'analise':
      return 3; // Análises geralmente levam 2-3 minutos
      
    case 'plano-acao':
      // Planos de ação dependem da quantidade de documentos
      const numDocumentos = (metadata.numTranscricoes || 0) + (metadata.numAnalises || 0);
      return Math.max(2, Math.ceil(numDocumentos * 1.5)); // 1.5 min por documento
      
    default:
      return 5; // fallback padrão
  }
}

/**
 * Registra um novo processo ativo
 * @param {String} userId - ID do usuário
 * @param {Object} processData - Dados do processo
 */
function registerActiveProcess(userId, processData) {
  if (!activeProcesses.has(userId)) {
    activeProcesses.set(userId, new Map());
  }
  
  // Calcular estimativa de tempo
  const tempoEstimado = calculateTimeEstimate(processData.tipo, processData.metadata || {});
  
  const userProcesses = activeProcesses.get(userId);
  const processWithEstimate = {
    ...processData,
    criadoEm: new Date(),
    status: 'em-progresso',
    tempoEstimadoMinutos: tempoEstimado,
    progresso: 0
  };
  
  userProcesses.set(processData.id, processWithEstimate);
  
  // Enviar atualização para o painel se houver conexão SSE de processos
  const processConnection = sseConnections.get(`${userId}_processes`);
  if (processConnection) {
    sendSSEEvent(processConnection, 'process-registered', {
      process: processWithEstimate,
      totalProcesses: userProcesses.size
    });
  }
  
  console.log(`📊 [PROCESSO-REGISTRADO] ${processData.tipo} - Estimativa: ${tempoEstimado}min - ID: ${processData.id}`);
}

/**
 * Atualiza um processo ativo
 * @param {String} userId - ID do usuário
 * @param {String} processId - ID do processo
 * @param {Object} progressData - Dados de progresso
 */
function updateActiveProcess(userId, processId, progressData) {
  const userProcesses = activeProcesses.get(userId);
  if (userProcesses && userProcesses.has(processId)) {
    const process = userProcesses.get(processId);
    const updatedProcess = {
      ...process,
      ...progressData,
      ultimaAtualizacao: new Date()
    };
    
    userProcesses.set(processId, updatedProcess);
    
    // Enviar atualização para o painel de processos se houver conexão SSE
    const processConnection = sseConnections.get(`${userId}_processes`);
    if (processConnection) {
      sendSSEEvent(processConnection, 'process-update', {
        processId,
        progresso: progressData.progresso || process.progresso || 0,
        mensagem: progressData.mensagem || progressData.message || process.mensagem,
        process: updatedProcess
      });
    }
    
    console.log(`🔄 [PROCESSO-ATUALIZADO] ${processId} - Progresso: ${progressData.progresso || 0}%`);
  }
}

/**
 * Marca um processo como concluído
 * @param {String} userId - ID do usuário
 * @param {String} processId - ID do processo
 * @param {Object} resultData - Dados do resultado
 */
function completeActiveProcess(userId, processId, resultData = {}) {
  const userProcesses = activeProcesses.get(userId);
  if (userProcesses && userProcesses.has(processId)) {
    const process = userProcesses.get(processId);
    const completedProcess = {
      ...process,
      status: 'concluido',
      progresso: 100,
      concluidoEm: new Date(),
      mensagem: 'Processo concluído!',
      ...resultData
    };
    
    userProcesses.set(processId, completedProcess);
    
    // Enviar atualização para o painel de processos se houver conexão SSE
    const processConnection = sseConnections.get(`${userId}_processes`);
    if (processConnection) {
      sendSSEEvent(processConnection, 'process-complete', {
        processId,
        resourceId: resultData.resourceId,
        process: completedProcess
      });
      
      // Agendar remoção automática do processo após 10 segundos
      setTimeout(() => {
        if (userProcesses.has(processId)) {
          userProcesses.delete(processId);
          
          // Se não há mais processos, remover o usuário do mapa
          if (userProcesses.size === 0) {
            activeProcesses.delete(userId);
          }
          
          // Enviar evento de remoção automática
          const currentConnection = sseConnections.get(`${userId}_processes`);
          if (currentConnection) {
            sendSSEEvent(currentConnection, 'process-auto-removed', {
              processId,
              totalProcesses: userProcesses.size
            });
          }
          
          console.log(`🗑️ [PROCESSO-AUTO-REMOVIDO] ${processId} - Removido automaticamente após conclusão`);
        }
      }, 10000); // 10 segundos
    }
    
    console.log(`✅ [PROCESSO-CONCLUÍDO] ${processId} - Tipo: ${process.tipo}`);
  }
}

/**
 * Remove um processo ativo (quando usuário clica para ver resultado)
 * @param {String} userId - ID do usuário
 * @param {String} processId - ID do processo
 */
function removeActiveProcess(userId, processId) {
  const userProcesses = activeProcesses.get(userId);
  if (userProcesses && userProcesses.has(processId)) {
    userProcesses.delete(processId);
    
    // Se não há mais processos, remover o usuário do mapa
    if (userProcesses.size === 0) {
      activeProcesses.delete(userId);
    }
    
    // Enviar atualização para o painel se houver conexão SSE
    const connection = sseConnections.get(userId);
    if (connection) {
      sendSSEEvent(connection, 'process-removed', {
        processId,
        totalProcesses: userProcesses.size
      });
    }
  }
}

/**
 * Obtém todos os processos ativos de um usuário
 * @param {String} userId - ID do usuário
 * @returns {Array} Array de processos ativos
 */
function getActiveProcesses(userId) {
  const userProcesses = activeProcesses.get(userId);
  if (!userProcesses) return [];
  
  return Array.from(userProcesses.values());
}

/**
 * Marca um processo como erro
 * @param {String} userId - ID do usuário
 * @param {String} processId - ID do processo
 * @param {String} errorMessage - Mensagem de erro
 */
function errorActiveProcess(userId, processId, errorMessage) {
  const userProcesses = activeProcesses.get(userId);
  if (userProcesses && userProcesses.has(processId)) {
    const process = userProcesses.get(processId);
    const errorProcess = {
      ...process,
      status: 'erro',
      erro: true,
      mensagem: errorMessage,
      mensagemErro: errorMessage,
      erroEm: new Date()
    };
    
    userProcesses.set(processId, errorProcess);
    
    // Enviar atualização para o painel de processos se houver conexão SSE
    const processConnection = sseConnections.get(`${userId}_processes`);
    if (processConnection) {
      sendSSEEvent(processConnection, 'process-error', {
        processId,
        erro: errorMessage,
        process: errorProcess
      });
    }
    
    console.log(`❌ [PROCESSO-ERRO] ${processId} - Erro: ${errorMessage}`);
  }
}

module.exports = {
  registerConnection,
  removeConnection,
  sendProgressUpdate,
  sendCompletionEvent,
  initProgress,
  registerActiveProcess,
  updateActiveProcess,
  completeActiveProcess,
  removeActiveProcess,
  getActiveProcesses,
  errorActiveProcess
};
