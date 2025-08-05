const express = require('express');
const router = express.Router();
const { analyzeCNPJ } = require('../services/cnpjAnalyzer');
const { validateCNPJ } = require('../utils/validators');
const progressService = require('../services/progressService');

/**
 * Rotas para análise de CNPJ e outras APIs do sistema
 */

// Rota para analisar um CNPJ
router.post('/analyze', async (req, res) => {
  try {
    const { cnpj, clientId } = req.body;
    
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ não fornecido' });
    }
    
    // Validar CNPJ
    if (!validateCNPJ(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido. Formato correto: XX.XXX.XXX/XXXX-XX ou apenas números.' });
    }
    
    // Realizar análise com suporte a atualizações de progresso em tempo real
    const result = await analyzeCNPJ(cnpj, clientId);
    
    res.json(result);
  } catch (error) {
    console.error('Erro na análise de CNPJ:', error);
    res.status(500).json({ 
      error: 'Erro na análise de CNPJ',
      message: error.message
    });
  }
});

// Verificar status do servidor
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

/**
 * Server-Sent Events (SSE) para atualizações de progresso
 * Esta rota estabelece uma conexão persistente com o cliente
 * e envia atualizações em tempo real sobre o progresso da análise
 */
router.get('/progress/:clientId', (req, res) => {
  const clientId = req.params.clientId;
  
  // Registrar a conexão usando o serviço de progresso
  const keepAlive = progressService.registerConnection(clientId, res);
  
  // Limpar quando a conexão for fechada
  req.on('close', () => {
    progressService.removeConnection(clientId, keepAlive);
  });
  
  // Iniciar progresso (o restante será atualizado pelo processo real)
  progressService.initProgress(clientId);
});

module.exports = router;
