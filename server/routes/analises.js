const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Analise = require('../models/Analise');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const { validateCNPJ } = require('../utils/validators');
const { analyzeCNPJ } = require('../services/cnpjAnalyzer');
const progressService = require('../services/progressService'); // Usar o novo serviço de progresso
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');
const { deletePDF, getPublicIdFromUrl } = require('../config/cloudinary');

// Cache para o usuário sistema
let usuarioSistemaId = null;

/**
 * Função para obter ou criar usuário sistema
 * @returns {String} ID do usuário sistema
 */
async function getUsuarioSistema() {
  if (usuarioSistemaId) {
    return usuarioSistemaId;
  }
  
  try {
    // Tentar encontrar usuário sistema existente
    let usuarioSistema = await Usuario.findOne({ 
      email: 'sistema@janice.app' 
    });
    
    if (!usuarioSistema) {
      console.log('🔧 [SISTEMA] Criando usuário sistema...');
      
      // Criar usuário sistema
      usuarioSistema = new Usuario({
        googleId: 'sistema-janice-' + Date.now(),
        email: 'sistema@janice.app',
        nome: 'Sistema Janice',
        role: 'admin',
        ativo: true,
        foto: null
      });
      
      await usuarioSistema.save();
      console.log('✅ [SISTEMA] Usuário sistema criado com sucesso');
    }
    
    usuarioSistemaId = usuarioSistema._id;
    return usuarioSistemaId;
    
  } catch (error) {
    console.error('❌ [SISTEMA] Erro ao obter usuário sistema:', error);
    throw new Error('Erro ao configurar usuário sistema');
  }
}

/**
 * Middleware para validar ObjectId
 */
function validateObjectId(req, res, next) {
  // Pegar qualquer parâmetro que termine com 'Id' ou seja 'id'
  const { id, clienteId } = req.params;
  const idToValidate = id || clienteId;
  
  if (!idToValidate) {
    return res.status(400).json({ 
      error: 'ID não fornecido',
      message: 'Um ID válido é obrigatório'
    });
  }
  
  if (!mongoose.Types.ObjectId.isValid(idToValidate)) {
    return res.status(400).json({ 
      error: 'ID inválido',
      message: `O ID '${idToValidate}' não é um ObjectId válido do MongoDB`
    });
  }
  
  next();
}

/**
 * Rotas para gerenciamento de análises
 */

// Listar todas as análises com paginação
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const analises = await Analise.find()
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .populate('cliente', 'nome cnpj');
    
    const total = await Analise.countDocuments();
    
    res.json({
      data: analises,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar análises:', error);
    res.status(500).json({ 
      error: 'Erro ao listar análises',
      message: error.message
    });
  }
});

// Obter análise por ID
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const analise = await Analise.findById(req.params.id)
      .populate('cliente', 'nome cnpj logo');
    
    if (!analise) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    
    res.json(analise);
  } catch (error) {
    console.error('Erro ao buscar análise:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar análise',
      message: error.message
    });
  }
});

// Listar análises por cliente
router.get('/cliente/:clienteId', validateObjectId, async (req, res) => {
  try {
    const analises = await Analise.find({ cliente: req.params.clienteId })
      .sort({ dataCriacao: -1 });
    
    res.json(analises);
  } catch (error) {
    console.error('Erro ao listar análises do cliente:', error);
    res.status(500).json({ 
      error: 'Erro ao listar análises do cliente',
      message: error.message
    });
  }
});

// Criar nova análise para um cliente
router.post('/cliente/:clienteId', validateObjectId, async (req, res) => {
  try {
    const clienteId = req.params.clienteId;
    const userId = req.user ? req.user._id : null;
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Obter o CNPJ do cliente
    const cnpj = cliente.cnpj;
    
    // Nota: A análise real do CNPJ será feita em um processo assíncrono
    // para permitir atualizações de progresso enquanto isso acontece
    
    // Iniciar processo de análise
    realizarAnaliseComProgresso(clienteId, cnpj, res, userId);
  } catch (error) {
    console.error('Erro ao criar análise:', error);
    res.status(500).json({ 
      error: 'Erro ao criar análise',
      message: error.message
    });
  }
});

/**
 * Função para realizar a análise com atualizações de progresso
 * Esta função é assíncrona e não bloqueia a resposta HTTP
 */
async function realizarAnaliseComProgresso(clienteId, cnpj, res, userId) {
  try {
    // Obter usuário sistema para o campo criadoPor se userId não estiver disponível
    const criadoPorId = userId || await getUsuarioSistema();
    console.log(`👤 [ANALISES] Usando usuário: ${criadoPorId}`);
    
    // Já respondemos ao cliente com uma resposta "vazia" para que o frontend
    // possa começar a exibir a tela de progresso
    const analiseTemp = new Analise({
      cliente: clienteId,
      cnpj,
      conteudo: 'Análise em andamento...',
      emProgresso: true,
      criadoPor: criadoPorId
    });
    
    await analiseTemp.save();
    
    // Enviamos a análise temporária como resposta imediata
    res.status(201).json(analiseTemp);
    
    // A partir daqui, o código continua executando, mas o cliente já recebeu a resposta
    // Assim, podemos usar o sistema SSE para enviar atualizações de progresso
    
    try {
      // Em uma implementação real, enviaríamos atualizações de progresso 
      // enquanto cada etapa da análise é executada
      // Aqui, usaremos a simulação que já implementamos
      
      // Executar a análise real (esta função pode demorar)
      // Passamos o clienteId para permitir atualizações de progresso em tempo real
      const result = await analyzeCNPJ(cnpj, clienteId);
      
      // Calcular data de expiração (30 dias a partir de hoje)
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(process.env.PDF_EXPIRY_DAYS || 30));
      
      // Atualizar a análise com os resultados reais
      analiseTemp.conteudo = result.analysis;
      analiseTemp.pdfUrl = result.pdfUrl;
      analiseTemp.dataExpiracao = dataExpiracao;
      analiseTemp.emProgresso = false;
      
      await analiseTemp.save();
      
      console.log(`Análise finalizada com sucesso. PDF disponível em: ${result.pdfUrl}`);
      
      // Encontrar o processo correto no Map global que corresponde a esta análise
      const allProcesses = progressService.getAllGlobalProcesses();
      const matchingProcess = allProcesses.find(p => 
        p.tipo === 'analise' && 
        p.cliente && p.cliente._id === clienteId &&
        p.status === 'em-progresso'
      );
      
      if (matchingProcess) {
        console.log(`🔍 [ANALISE] Processo encontrado para finalização: ${matchingProcess.id}`);
        
          // Marcar processo como concluído usando o ID correto do processo
          progressService.completeActiveProcess(matchingProcess.id, {
          progresso: 100,
          resultado: 'Análise CNPJ concluída com sucesso',
          resourceId: analiseTemp._id
        });
      } else {
        console.log(`⚠️ [ANALISE] Processo não encontrado no Map global para análise: ${analiseTemp._id}`);
        console.log(`🔍 [ANALISE] Processos disponíveis:`, allProcesses.map(p => ({
          id: p.id,
          tipo: p.tipo,
          clienteId: p.cliente ? p.cliente._id : 'N/A',
          status: p.status
        })));
      }
      
      // Enviar evento de conclusão via SSE
      // Isso informará ao frontend que a análise está pronta e o PDF está disponível
      progressService.sendCompletionEvent(clienteId, {
        percentage: 100,
        message: 'Análise concluída com sucesso!',
        step: 4,
        stepStatus: 'completed',
        pdfUrl: result.pdfUrl
      });
      
    } catch (error) {
      console.error('Erro durante a análise:', error);
      
      // Atualizar o registro para indicar o erro
      analiseTemp.conteudo = `Erro na análise: ${error.message}`;
      analiseTemp.erro = true;
      analiseTemp.emProgresso = false;
      await analiseTemp.save();
      
      // Encontrar o processo correto no Map global para marcar erro
      const allProcesses = progressService.getAllGlobalProcesses();
      const matchingProcess = allProcesses.find(p => 
        p.tipo === 'analise' && 
        p.cliente && p.cliente._id === clienteId &&
        p.status === 'em-progresso'
      );
      
      if (matchingProcess) {
        console.log(`🔍 [ANALISE] Processo encontrado para marcar erro: ${matchingProcess.id}`);
        progressService.errorActiveProcess(matchingProcess.id, error.message);
      } else {
        console.log(`⚠️ [ANALISE] Processo não encontrado no Map global para marcar erro da análise: ${analiseTemp._id}`);
      }
      
      // Enviar uma atualização final pelo SSE indicando erro
      progressService.sendProgressUpdate(clienteId, {
        percentage: 100,
        message: `Erro: ${error.message}`,
        step: 4,
        stepStatus: 'error'
      });
    }
    
  } catch (error) {
    console.error('Erro na atualização da análise:', error);
    // Não podemos enviar resposta HTTP, pois já respondemos acima
  }
}

// Excluir análise (somente administradores)
router.delete('/:id', validateObjectId, requireAdmin, async (req, res) => {
  try {
    // Buscar análise antes de excluir para obter informações do PDF
    const analise = await Analise.findById(req.params.id);
    
    if (!analise) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    
    // Excluir PDF do Cloudinary se existir
    if (analise.pdfUrl && analise.pdfUrl.includes('cloudinary.com')) {
      const publicId = getPublicIdFromUrl(analise.pdfUrl);
      if (publicId) {
        try {
          await deletePDF(publicId);
          console.log(`PDF da análise excluído do Cloudinary: ${publicId}`);
        } catch (deleteError) {
          console.error('Erro ao excluir PDF do Cloudinary:', deleteError);
          // Continuar com a exclusão da análise mesmo se falhar a exclusão do PDF
        }
      }
    }
    
    // Excluir a análise do banco de dados
    await Analise.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Análise excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir análise:', error);
    res.status(500).json({ 
      error: 'Erro ao excluir análise',
      message: error.message
    });
  }
});

// Obter a análise mais recente para um CNPJ
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, '');
    
    // Validar CNPJ
    if (!validateCNPJ(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido' });
    }
    
    const analise = await Analise.getMaisRecentePorCNPJ(cnpj);
    
    if (!analise) {
      return res.status(404).json({ error: 'Nenhuma análise encontrada para este CNPJ' });
    }
    
    res.json(analise);
  } catch (error) {
    console.error('Erro ao buscar análise por CNPJ:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar análise por CNPJ',
      message: error.message
    });
  }
});

// Servir PDF via proxy com headers corretos para visualização
router.get('/pdf/:id', validateObjectId, async (req, res) => {
  try {
    console.log(`🔍 [ANALISE-PDF] Solicitação de PDF para análise ID: ${req.params.id}`);
    
    // Buscar a análise no banco de dados
    const analise = await Analise.findById(req.params.id);
    
    if (!analise) {
      console.log('❌ [ANALISE-PDF] Análise não encontrada');
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    
    console.log(`✅ [ANALISE-PDF] Análise encontrada: ${analise._id}`);
    console.log(`📊 [ANALISE-PDF] CNPJ: ${analise.cnpj}`);
    console.log(`📊 [ANALISE-PDF] Data de criação: ${analise.dataCriacao}`);
    
    if (!analise.pdfUrl) {
      console.log('❌ [ANALISE-PDF] PDF não disponível para esta análise');
      return res.status(404).json({ error: 'PDF não disponível para esta análise' });
    }
    
    console.log(`🔍 [ANALISE-PDF] URL do PDF: ${analise.pdfUrl}`);
    
    // Verificar se a URL é válida
    if (!analise.pdfUrl.startsWith('http')) {
      console.error(`❌ [ANALISE-PDF] URL do PDF inválida: ${analise.pdfUrl}`);
      return res.status(400).json({ error: 'URL do PDF inválida' });
    }
    
    console.log(`🔄 [ANALISE-PDF] Buscando PDF do Cloudinary: ${analise.pdfUrl}`);
    
    // Buscar o PDF do Cloudinary
    const response = await fetch(analise.pdfUrl);
    
    console.log(`📊 [ANALISE-PDF] Status da resposta: ${response.status} ${response.statusText}`);
    console.log(`📊 [ANALISE-PDF] Headers da resposta:`, response.headers);
    
    if (!response.ok) {
      console.error(`❌ [ANALISE-PDF] Erro ao buscar PDF do Cloudinary: ${response.status} ${response.statusText}`);
      
      // Tentar obter mais detalhes do erro
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error(`❌ [ANALISE-PDF] Corpo da resposta de erro: ${errorBody}`);
      } catch (textError) {
        console.error(`❌ [ANALISE-PDF] Não foi possível ler o corpo da resposta: ${textError.message}`);
      }
      
      return res.status(502).json({ 
        error: 'Erro ao carregar PDF do servidor de arquivos',
        details: `Status: ${response.status}, Mensagem: ${response.statusText}`,
        body: errorBody
      });
    }
    
    // Verificar o tipo de conteúdo
    const contentType = response.headers.get('content-type');
    console.log(`📊 [ANALISE-PDF] Tipo de conteúdo: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/pdf')) {
      console.warn(`⚠️ [ANALISE-PDF] Tipo de conteúdo inesperado: ${contentType}`);
    }
    
    // Obter o buffer do PDF
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ [ANALISE-PDF] PDF carregado com sucesso (${pdfBuffer.length} bytes)`);
    
    // Configurar headers para visualização inline do PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="analise.pdf"',
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      'Accept-Ranges': 'bytes'
    });
    
    // Enviar o PDF
    res.send(pdfBuffer);
    console.log('✅ [ANALISE-PDF] PDF enviado com sucesso');
    
  } catch (error) {
    console.error('❌ [ANALISE-PDF] Erro ao servir PDF:', error);
    console.error('❌ [ANALISE-PDF] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao carregar PDF',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/analises/teste-pdf/:id
 * Endpoint de teste para verificar se o PDF de uma análise é acessível
 */
router.get('/teste-pdf/:id', validateObjectId, async (req, res) => {
  try {
    console.log(`🔍 [ANALISE-TESTE] Verificando PDF para análise ID: ${req.params.id}`);
    
    // Buscar a análise no banco de dados
    const analise = await Analise.findById(req.params.id);
    
    if (!analise) {
      console.log('❌ [ANALISE-TESTE] Análise não encontrada');
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    
    console.log(`✅ [ANALISE-TESTE] Análise encontrada: ${analise._id}`);
    console.log(`📊 [ANALISE-TESTE] CNPJ: ${analise.cnpj}`);
    console.log(`📊 [ANALISE-TESTE] Data de criação: ${analise.dataCriacao}`);
    
    if (!analise.pdfUrl) {
      console.log('❌ [ANALISE-TESTE] PDF não disponível para esta análise');
      return res.status(404).json({ error: 'PDF não disponível para esta análise' });
    }
    
    console.log(`🔍 [ANALISE-TESTE] URL do PDF: ${analise.pdfUrl}`);
    
    // Verificar se a URL é válida
    if (!analise.pdfUrl.startsWith('http')) {
      console.error(`❌ [ANALISE-TESTE] URL do PDF inválida: ${analise.pdfUrl}`);
      return res.status(400).json({ error: 'URL do PDF inválida' });
    }
    
    // Verificar se a URL é acessível
    try {
      console.log(`🔄 [ANALISE-TESTE] Verificando acesso à URL: ${analise.pdfUrl}`);
      const response = await fetch(analise.pdfUrl, { method: 'HEAD' });
      
      console.log(`📊 [ANALISE-TESTE] Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`📊 [ANALISE-TESTE] Headers da resposta:`, response.headers);
      
      const result = {
        url: analise.pdfUrl,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        folder: analise.pdfUrl.includes('/janice/analises/') ? 'janice/analises' : 
                analise.pdfUrl.includes('/janice/planos-acao/') ? 'janice/planos-acao' : 'desconhecida'
      };
      
      return res.json(result);
      
    } catch (error) {
      console.error(`❌ [ANALISE-TESTE] Erro ao verificar acesso à URL: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao verificar acesso à URL do PDF',
        message: error.message,
        url: analise.pdfUrl
      });
    }
    
  } catch (error) {
    console.error('❌ [ANALISE-TESTE] Erro ao testar PDF:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao testar PDF',
      message: error.message
    });
  }
});

module.exports = router;
