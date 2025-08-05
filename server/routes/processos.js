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
    
    res.json({
      success: true,
      processes: activeProcesses,
      total: activeProcesses.length
    });
  } catch (error) {
    console.error('Erro ao buscar processos ativos:', error);
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
 * GET /api/processos/sse
 * Endpoint para Server-Sent Events do painel de processos
 */
router.get('/sse', requireAuth, (req, res) => {
  const userId = req.user._id.toString();
  
  console.log(`🔌 [SSE-PROCESSOS] Nova conexão SSE para painel de processos - Usuário: ${userId}`);
  
  // Registrar conexão SSE específica para processos
  const keepAlive = progressService.registerConnection(userId, res, 'processes');
  
  // Cleanup quando conexão for fechada
  req.on('close', () => {
    console.log(`🔌 [SSE-PROCESSOS] Conexão SSE fechada - Usuário: ${userId}`);
    progressService.removeConnection(`${userId}_processes`, keepAlive);
  });
  
  req.on('error', (error) => {
    console.error(`❌ [SSE-PROCESSOS] Erro na conexão SSE - Usuário: ${userId}`, error);
    progressService.removeConnection(`${userId}_processes`, keepAlive);
  });
});

module.exports = router;
