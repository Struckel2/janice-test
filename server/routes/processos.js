const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const progressService = require('../services/progressService');

/**
 * GET /api/processos/ativos
 * Retorna todos os processos ativos globalmente (visíveis para todos os usuários)
 */
router.get('/ativos', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const allGlobalProcesses = progressService.getAllGlobalProcesses();
    
    console.log(`🔍 [DEBUG-ATIVOS-GLOBAL] ===== GET /api/processos/ativos =====`);
    console.log(`🔍 [DEBUG-ATIVOS-GLOBAL] User ID: ${userId}`);
    console.log(`🔍 [DEBUG-ATIVOS-GLOBAL] Processos globais encontrados: ${allGlobalProcesses.length}`);
    console.log(`🔍 [DEBUG-ATIVOS-GLOBAL] Processos:`, allGlobalProcesses.map(p => ({
      id: p.id,
      tipo: p.tipo,
      status: p.status,
      progresso: p.progresso,
      initiatedBy: p.initiatedBy,
      userName: p.userName
    })));
    
    // Retornar TODOS os processos globais (visíveis para todos os usuários)
    res.json(allGlobalProcesses);
    
  } catch (error) {
    console.error('❌ [DEBUG-ATIVOS-GLOBAL] Erro ao buscar processos ativos globais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/processos/:processId
 * Remove um processo ativo global (quando usuário clica para ver resultado)
 */
router.delete('/:processId', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { processId } = req.params;
    
    console.log(`🗑️ [DELETE-PROCESSO-GLOBAL] User: ${userId}, ProcessId: ${processId}`);
    
    // Usar a nova função global para remover processo
    progressService.removeActiveProcess(processId);
    
    res.json({
      success: true,
      message: 'Processo removido com sucesso'
    });
  } catch (error) {
    console.error('❌ [DELETE-PROCESSO-GLOBAL] Erro ao remover processo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/processos/ativos
 * Registra um novo processo ativo globalmente
 */
router.post('/ativos', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const processData = req.body;
    
    console.log(`📝 [PROCESSOS-POST-GLOBAL] ===== REGISTRANDO NOVO PROCESSO GLOBAL =====`);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] User ID: ${userId}`);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] User Name: ${req.user.nome}`);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] Process ID: ${processData.id}`);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] Tipo: ${processData.tipo}`);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] Título: ${processData.titulo}`);
    
    // Validar dados obrigatórios
    if (!processData.id || !processData.tipo || !processData.titulo) {
      console.error(`❌ [PROCESSOS-POST-GLOBAL] Dados obrigatórios faltando:`, {
        id: !!processData.id,
        tipo: !!processData.tipo,
        titulo: !!processData.titulo
      });
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios faltando: id, tipo e titulo são necessários'
      });
    }
    
    // Preparar informações do usuário
    const userInfo = {
      nome: req.user.nome || 'Usuário',
      email: req.user.email || ''
    };
    
    // Registrar processo no progressService com informações do usuário
    console.log(`📝 [PROCESSOS-POST-GLOBAL] Chamando progressService.registerActiveProcess...`);
    progressService.registerActiveProcess(userId, processData, userInfo);
    console.log(`📝 [PROCESSOS-POST-GLOBAL] Processo registrado com sucesso no progressService`);
    
    res.json({
      success: true,
      message: 'Processo registrado com sucesso',
      processId: processData.id
    });
    
  } catch (error) {
    console.error('❌ [PROCESSOS-POST-GLOBAL] Erro ao registrar processo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/processos/sse
 * Endpoint para Server-Sent Events do painel de processos
 */
router.get('/sse', requireAuth, (req, res) => {
  const userId = req.user._id.toString();
  
  console.log(`🔌 [SSE-PROCESSOS] ===== NOVA CONEXÃO SSE INICIADA =====`);
  console.log(`🔌 [SSE-PROCESSOS] Usuário: ${userId}`);
  console.log(`🔌 [SSE-PROCESSOS] IP: ${req.ip}`);
  console.log(`🔌 [SSE-PROCESSOS] User-Agent: ${req.get('User-Agent')}`);
  console.log(`🔌 [SSE-PROCESSOS] Headers Accept: ${req.get('Accept')}`);
  
  // Registrar conexão SSE específica para processos
  console.log(`🔌 [SSE-PROCESSOS] Chamando progressService.registerConnection...`);
  const keepAlive = progressService.registerConnection(userId, res, 'processes');
  console.log(`🔌 [SSE-PROCESSOS] registerConnection retornou:`, keepAlive ? 'keepAlive function' : 'undefined');
  
  // Verificar se a conexão foi realmente registrada
  const connectionKey = `${userId}_processes`;
  console.log(`🔌 [SSE-PROCESSOS] Verificando se conexão ${connectionKey} foi registrada...`);
  
  // Cleanup quando conexão for fechada
  req.on('close', () => {
    console.log(`🔌 [SSE-PROCESSOS] ===== CONEXÃO SSE FECHADA =====`);
    console.log(`🔌 [SSE-PROCESSOS] Usuário: ${userId}`);
    console.log(`🔌 [SSE-PROCESSOS] Removendo conexão ${connectionKey}...`);
    progressService.removeConnection(connectionKey, keepAlive);
  });
  
  req.on('error', (error) => {
    console.error(`❌ [SSE-PROCESSOS] ===== ERRO NA CONEXÃO SSE =====`);
    console.error(`❌ [SSE-PROCESSOS] Usuário: ${userId}`);
    console.error(`❌ [SSE-PROCESSOS] Erro:`, error);
    progressService.removeConnection(connectionKey, keepAlive);
  });
});

module.exports = router;
