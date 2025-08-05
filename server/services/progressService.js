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
 * Mapa para armazenar processos ativos globalmente
 * Estrutura: processId -> processData (com informações do usuário que iniciou)
 */
const globalProcesses = new Map();

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
  
  for (const [processId, process] of globalProcesses.entries()) {
    // Verificar se o processo está em progresso há mais de 10 minutos
    if (process.status === 'em-progresso') {
      const processAge = now - new Date(process.criadoEm);
      
      if (processAge > PROCESS_TIMEOUT) {
        console.log(`⚠️ [TIMEOUT] Processo órfão detectado: ${processId} (${processAge/1000}s)`);
        
        // Marcar como erro por timeout
        errorGlobalProcess(processId, 'Timeout: Processo demorou mais que o esperado');
      }
    }
  }
}

/**
 * Função para verificar se uma conexão SSE ainda está ativa
 * @param {Object} res - Objeto de resposta do Express
 * @returns {Boolean} True se a conexão estiver ativa
 */
function isConnectionActive(res) {
  return res && !res.destroyed && res.writable && !res.finished;
}

/**
 * Função para enviar eventos SSE formatados corretamente
 * @param {Object} res - Objeto de resposta do Express
 * @param {String} event - Nome do evento
 * @param {Object} data - Dados a serem enviados
 * @returns {Boolean} True se o evento foi enviado com sucesso
 */
function sendSSEEvent(res, event, data) {
  try {
    if (!isConnectionActive(res)) {
      console.log(`⚠️ [SSE-SEND] Conexão não está ativa para evento: ${event}`);
      return false;
    }
    
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch (error) {
    console.error(`❌ [SSE-SEND] Erro ao enviar evento ${event}:`, error);
    return false;
  }
}

/**
 * Registra uma nova conexão SSE
 * @param {String} clientId - ID do cliente
 * @param {Object} res - Objeto de resposta do Express
 * @param {String} type - Tipo de conexão ('progress' ou 'processes')
 * @returns {Function} Função para manter a conexão ativa (keepAlive)
 */
function registerConnection(clientId, res, type = 'progress') {
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] ===== INICIANDO REGISTRO DE CONEXÃO SSE =====`);
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] clientId: ${clientId}`);
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] type: ${type}`);
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] res object:`, res ? 'presente' : 'ausente');
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Estado atual do Map:`, {
    totalConexoes: sseConnections.size,
    chaves: Array.from(sseConnections.keys())
  });
  
  // Configurar cabeçalhos para SSE
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Configurando headers SSE...`);
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Headers SSE configurados com sucesso`);
  } catch (error) {
    console.error(`❌ [DEBUG-REGISTER-CONNECTION] Erro ao configurar headers:`, error);
    return null;
  }
  
  // Enviar evento inicial baseado no tipo
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Enviando evento inicial para tipo: ${type}`);
  try {
    if (type === 'progress') {
      sendSSEEvent(res, 'progress', {
        percentage: 0,
        message: 'Iniciando análise...',
        step: 1,
        stepStatus: 'active'
      });
    } else if (type === 'processes') {
      // LIMPEZA: Remover processos concluídos há mais de 1 minuto antes de enviar lista
      console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Limpando processos antigos do Map global antes de enviar lista...`);
      const now = new Date();
      const processesToRemove = [];
      
      for (const [processId, process] of globalProcesses.entries()) {
        if (process.status === 'concluido' && process.concluidoEm) {
          const timeSinceCompletion = now - new Date(process.concluidoEm);
          const minutesSinceCompletion = timeSinceCompletion / (1000 * 60);
          
          if (minutesSinceCompletion > 1) {
            console.log(`🗑️ [DEBUG-REGISTER-CONNECTION] Removendo processo concluído há ${minutesSinceCompletion.toFixed(1)} minutos: ${processId}`);
            processesToRemove.push(processId);
          }
        }
      }
      
      // Remover processos antigos do Map global
      processesToRemove.forEach(processId => {
        globalProcesses.delete(processId);
      });
      
      // Enviar TODOS os processos ativos existentes (após limpeza)
      const processes = Array.from(globalProcesses.values());
      
      console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Enviando ${processes.length} processos ativos globais existentes (após limpeza)`);
      sendSSEEvent(res, 'processes-list', {
        processes: processes,
        totalProcesses: processes.length
      });
    }
    console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Evento inicial enviado com sucesso`);
  } catch (error) {
    console.error(`❌ [DEBUG-REGISTER-CONNECTION] Erro ao enviar evento inicial:`, error);
  }
  
  // Função para manter a conexão ativa (keepAlive mais frequente)
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Criando keepAlive interval...`);
  const keepAlive = setInterval(() => {
    try {
      if (isConnectionActive(res)) {
        res.write(': keepalive\n\n');
      } else {
        console.log(`⚠️ [DEBUG-REGISTER-CONNECTION] Conexão inativa detectada no keepAlive - limpando interval`);
        clearInterval(keepAlive);
        
        // Remover conexão morta do Map
        const connectionKey = type === 'processes' ? `${clientId}_processes` : clientId;
        sseConnections.delete(connectionKey);
      }
    } catch (error) {
      console.error(`❌ [DEBUG-REGISTER-CONNECTION] Erro no keepAlive:`, error);
      clearInterval(keepAlive);
      
      // Remover conexão com erro do Map
      const connectionKey = type === 'processes' ? `${clientId}_processes` : clientId;
      sseConnections.delete(connectionKey);
    }
  }, 15000); // Reduzido de 30s para 15s para manter conexão mais ativa
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] keepAlive criado:`, keepAlive ? 'sucesso' : 'falha');
  
  // Armazenar a conexão para uso posterior com identificação do tipo
  const connectionKey = type === 'processes' ? `${clientId}_processes` : clientId;
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Chave da conexão: ${connectionKey}`);
  
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Adicionando conexão ao Map...`);
  sseConnections.set(connectionKey, res);
  
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] ===== CONEXÃO REGISTRADA COM SUCESSO =====`);
  console.log(`🔍 [DEBUG-REGISTER-CONNECTION] Estado final do Map:`, {
    totalConexoes: sseConnections.size,
    chaves: Array.from(sseConnections.keys()),
    conexaoAdicionada: sseConnections.has(connectionKey)
  });
  
  return keepAlive;
}

/**
 * Remove uma conexão SSE
 * @param {String} connectionKey - Chave da conexão (pode ser clientId ou clientId_processes)
 * @param {Function} keepAlive - Função de keepAlive para limpar
 */
function removeConnection(connectionKey, keepAlive) {
  console.log(`🔍 [DEBUG-REMOVE-CONNECTION] Removendo conexão SSE:`, {
    connectionKey,
    existeNoMap: sseConnections.has(connectionKey),
    totalConexoes: sseConnections.size
  });
  
  clearInterval(keepAlive);
  const removed = sseConnections.delete(connectionKey);
  
  console.log(`🔍 [DEBUG-REMOVE-CONNECTION] Conexão removida:`, {
    connectionKey,
    removidaComSucesso: removed,
    totalConexoesRestantes: sseConnections.size
  });
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
 * Registra um novo processo ativo globalmente
 * @param {String} userId - ID do usuário que iniciou o processo
 * @param {Object} processData - Dados do processo
 * @param {Object} userInfo - Informações do usuário (nome, email)
 */
function registerActiveProcess(userId, processData, userInfo = {}) {
  console.log(`🔍 [DEBUG-REGISTER] Iniciando registro de processo global:`, {
    userId,
    processId: processData.id,
    tipo: processData.tipo,
    titulo: processData.titulo,
    userInfo
  });
  
  // Calcular estimativa de tempo
  const tempoEstimado = calculateTimeEstimate(processData.tipo, processData.metadata || {});
  
  const processWithEstimate = {
    ...processData,
    criadoEm: new Date(),
    status: 'em-progresso',
    tempoEstimadoMinutos: tempoEstimado,
    progresso: 0,
    initiatedBy: userId,
    userName: userInfo.nome || 'Usuário',
    userEmail: userInfo.email || ''
  };
  
  globalProcesses.set(processData.id, processWithEstimate);
  console.log(`🔍 [DEBUG-REGISTER] Processo adicionado ao Map global. Total processos: ${globalProcesses.size}`);
  
  // Enviar atualização para TODAS as conexões SSE de processos
  for (const [connectionKey, connection] of sseConnections.entries()) {
    if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
      console.log(`🔍 [DEBUG-REGISTER] Enviando evento process-registered via SSE para ${connectionKey}`);
      sendSSEEvent(connection, 'process-registered', {
        process: processWithEstimate,
        totalProcesses: globalProcesses.size
      });
    }
  }
  
  console.log(`📊 [PROCESSO-REGISTRADO-GLOBAL] ${processData.tipo} - Estimativa: ${tempoEstimado}min - ID: ${processData.id} - Por: ${userInfo.nome || userId}`);
}

/**
 * Atualiza um processo ativo global
 * @param {String} processId - ID do processo
 * @param {Object} progressData - Dados de progresso
 */
function updateGlobalProcess(processId, progressData) {
  if (globalProcesses.has(processId)) {
    const process = globalProcesses.get(processId);
    const updatedProcess = {
      ...process,
      ...progressData,
      ultimaAtualizacao: new Date()
    };
    
    globalProcesses.set(processId, updatedProcess);
    
    // Enviar atualização para TODAS as conexões SSE de processos
    for (const [connectionKey, connection] of sseConnections.entries()) {
      if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
        sendSSEEvent(connection, 'process-update', {
          processId,
          progresso: progressData.progresso || process.progresso || 0,
          mensagem: progressData.mensagem || progressData.message || process.mensagem,
          process: updatedProcess
        });
      }
    }
    
    console.log(`🔄 [PROCESSO-ATUALIZADO-GLOBAL] ${processId} - Progresso: ${progressData.progresso || 0}%`);
  }
}

/**
 * Marca um processo como concluído globalmente
 * @param {String} processId - ID do processo
 * @param {Object} resultData - Dados do resultado
 */
function completeGlobalProcess(processId, resultData = {}) {
  console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Iniciando conclusão de processo global:`, {
    processId,
    resourceId: resultData.resourceId,
    resultData
  });
  
  if (globalProcesses.has(processId)) {
    console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Processo encontrado no Map global: ${processId}`);
    
    const process = globalProcesses.get(processId);
    const completedProcess = {
      ...process,
      status: 'concluido',
      progresso: 100,
      concluidoEm: new Date(),
      mensagem: 'Processo concluído!',
      ...resultData
    };
    
    globalProcesses.set(processId, completedProcess);
    console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Processo marcado como concluído no Map global`);
    
    // Enviar atualização para TODAS as conexões SSE de processos
    for (const [connectionKey, connection] of sseConnections.entries()) {
      if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
        console.log(`✅ [DEBUG-COMPLETE-GLOBAL] Enviando notificação para ${connectionKey}`);
        
        const eventSent = sendSSEEvent(connection, 'process-complete', {
          processId,
          resourceId: resultData.resourceId,
          process: completedProcess
        });
        
        if (eventSent) {
          console.log(`✅ [DEBUG-COMPLETE-GLOBAL] Evento process-complete enviado para ${connectionKey}`);
        } else {
          console.log(`❌ [DEBUG-COMPLETE-GLOBAL] Falha ao enviar evento para ${connectionKey}`);
        }
      }
    }
    
    // Agendar remoção automática do processo após 10 segundos
    setTimeout(() => {
      if (globalProcesses.has(processId)) {
        globalProcesses.delete(processId);
        console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Processo ${processId} removido do Map global após timeout`);
        
        // Enviar evento de remoção automática para todas as conexões ativas
        for (const [connectionKey, connection] of sseConnections.entries()) {
          if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
            console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Enviando evento process-auto-removed para ${connectionKey}`);
            sendSSEEvent(connection, 'process-auto-removed', {
              processId,
              totalProcesses: globalProcesses.size
            });
          }
        }
        
        console.log(`🗑️ [PROCESSO-AUTO-REMOVIDO-GLOBAL] ${processId} - Removido automaticamente após conclusão`);
      } else {
        console.log(`⚠️ [DEBUG-COMPLETE-GLOBAL] Processo ${processId} já foi removido do Map global`);
      }
    }, 10000); // 10 segundos
    
    console.log(`✅ [PROCESSO-CONCLUÍDO-GLOBAL] ${processId} - Tipo: ${process.tipo}`);
  } else {
    console.log(`❌ [DEBUG-COMPLETE-GLOBAL] Processo ${processId} NÃO encontrado no Map global`);
    console.log(`🔍 [DEBUG-COMPLETE-GLOBAL] Processos disponíveis:`, Array.from(globalProcesses.keys()));
  }
}

/**
 * Remove um processo ativo global (quando usuário clica para ver resultado)
 * @param {String} processId - ID do processo
 */
function removeGlobalProcess(processId) {
  if (globalProcesses.has(processId)) {
    globalProcesses.delete(processId);
    
    // Enviar atualização para TODAS as conexões SSE de processos
    for (const [connectionKey, connection] of sseConnections.entries()) {
      if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
        sendSSEEvent(connection, 'process-removed', {
          processId,
          totalProcesses: globalProcesses.size
        });
      }
    }
  }
}

/**
 * Obtém todos os processos ativos globalmente
 * @returns {Array} Array de processos ativos
 */
function getAllGlobalProcesses() {
  return Array.from(globalProcesses.values());
}

/**
 * Obtém todos os processos ativos de um usuário específico
 * @param {String} userId - ID do usuário
 * @returns {Array} Array de processos ativos do usuário
 */
function getActiveProcesses(userId) {
  const userProcesses = [];
  for (const process of globalProcesses.values()) {
    if (process.initiatedBy === userId) {
      userProcesses.push(process);
    }
  }
  return userProcesses;
}

/**
 * Marca um processo como erro globalmente
 * @param {String} processId - ID do processo
 * @param {String} errorMessage - Mensagem de erro
 */
function errorGlobalProcess(processId, errorMessage) {
  if (globalProcesses.has(processId)) {
    const process = globalProcesses.get(processId);
    const errorProcess = {
      ...process,
      status: 'erro',
      erro: true,
      mensagem: errorMessage,
      mensagemErro: errorMessage,
      erroEm: new Date()
    };
    
    globalProcesses.set(processId, errorProcess);
    
    // Enviar atualização para TODAS as conexões SSE de processos
    for (const [connectionKey, connection] of sseConnections.entries()) {
      if (connectionKey.endsWith('_processes') && isConnectionActive(connection)) {
        sendSSEEvent(connection, 'process-error', {
          processId,
          erro: errorMessage,
          process: errorProcess
        });
      }
    }
    
    console.log(`❌ [PROCESSO-ERRO-GLOBAL] ${processId} - Erro: ${errorMessage}`);
  }
}

module.exports = {
  registerConnection,
  removeConnection,
  sendProgressUpdate,
  sendCompletionEvent,
  initProgress,
  registerActiveProcess,
  updateActiveProcess: updateGlobalProcess,
  completeActiveProcess: completeGlobalProcess,
  removeActiveProcess: removeGlobalProcess,
  getActiveProcesses,
  getAllGlobalProcesses,
  errorActiveProcess: errorGlobalProcess
};
