const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const progressService = require('../services/progressService');

/**
 * GET /api/processos/ativos
 * Retorna todos os processos ativos do usuário logado
 */
router.get('/ativos', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const activeProcesses = progressService.getActiveProcesses(userId);
    
    console.log(`🔍 [DEBUG-ATIVOS] ===== GET /api/processos/ativos =====`);
    console.log(`🔍 [DEBUG-ATIVOS] User ID: ${userId}`);
    console.log(`🔍 [DEBUG-ATIVOS] Processos encontrados: ${activeProcesses.length}`);
    console.log(`🔍 [DEBUG-ATIVOS] Processos:`, activeProcesses.map(p => ({
      id: p.id,
      tipo: p.tipo,
      status: p.status,
      progresso: p.progresso
    })));
    
    // CORREÇÃO: Retornar array direto em vez de objeto
    // Isso resolve o erro "processes.forEach is not a function"
    res.json(activeProcesses);
    
  } catch (error) {
    console.error('❌ [DEBUG-ATIVOS] Erro ao buscar processos ativos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/processos/:processId
 * Remove um processo ativo (quando usuário clica para ver resultado)
 */
router.delete('/:processId', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { processId } = req.params;
    
    progressService.removeActiveProcess(userId, processId);
    
    res.json({
      success: true,
      message: 'Processo removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover processo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/processos/ativos
 * Registra um novo processo ativo
 */
router.post('/ativos', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const processData = req.body;
    
    console.log(`📝 [PROCESSOS-POST] ===== REGISTRANDO NOVO PROCESSO =====`);
    console.log(`📝 [PROCESSOS-POST] User ID: ${userId}`);
    console.log(`📝 [PROCESSOS-POST] Process ID: ${processData.id}`);
    console.log(`📝 [PROCESSOS-POST] Tipo: ${processData.tipo}`);
    console.log(`📝 [PROCESSOS-POST] Título: ${processData.titulo}`);
    
    // Validar dados obrigatórios
    if (!processData.id || !processData.tipo || !processData.titulo) {
      console.error(`❌ [PROCESSOS-POST] Dados obrigatórios faltando:`, {
        id: !!processData.id,
        tipo: !!processData.tipo,
        titulo: !!processData.titulo
      });
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios faltando: id, tipo e titulo são necessários'
      });
    }
    
    // Registrar processo no progressService
    console.log(`📝 [PROCESSOS-POST] Chamando progressService.registerActiveProcess...`);
    progressService.registerActiveProcess(userId, processData);
    console.log(`📝 [PROCESSOS-POST] Processo registrado com sucesso no progressService`);
    
    res.json({
      success: true,
      message: 'Processo registrado com sucesso',
      processId: processData.id
    });
    
  } catch (error) {
    console.error('❌ [PROCESSOS-POST] Erro ao registrar processo:', error);
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
