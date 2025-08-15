
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PlanoAcao = require('../models/PlanoAcao');
const Cliente = require('../models/Cliente');
const Transcricao = require('../models/Transcricao');
const Analise = require('../models/Analise');
const Usuario = require('../models/Usuario');
const { generateActionPlan } = require('../services/planoAcaoService');
const { deletePDF, getPublicIdFromUrl } = require('../config/cloudinary');
const progressService = require('../services/progressService');
const { v4: uuidv4 } = require('uuid');

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
  const { id, clienteId, planoId } = req.params;
  const idToValidate = id || clienteId || planoId;
  
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
 * Rotas para gerenciamento de planos de ação
 */

// Middleware de debug
router.use((req, res, next) => {
  console.log(`📋 [PLANOS-ACAO-ROUTE] ${req.method} ${req.path}`);
  console.log(`📋 [PLANOS-ACAO-HEADERS] Accept: ${req.headers.accept}`);
  console.log(`📋 [PLANOS-ACAO-AUTH] Autenticado: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);
  next();
});

/**
 * GET /api/planos-acao/teste-pdf/:id
 * Endpoint de teste para verificar se o PDF de um plano de ação é acessível
 */
router.get('/teste-pdf/:id', validateObjectId, async (req, res) => {
  try {
    console.log(`🔍 [PLANO-ACAO-TESTE] Verificando PDF para plano de ação ID: ${req.params.id}`);
    
    // Buscar o plano de ação no banco de dados
    const plano = await PlanoAcao.findById(req.params.id);
    
    if (!plano) {
      console.log('❌ [PLANO-ACAO-TESTE] Plano de ação não encontrado');
      return res.status(404).json({ error: 'Plano de ação não encontrado' });
    }
    
    console.log(`✅ [PLANO-ACAO-TESTE] Plano encontrado: ${plano._id}`);
    console.log(`📊 [PLANO-ACAO-TESTE] Título: ${plano.titulo}`);
    console.log(`📊 [PLANO-ACAO-TESTE] Data de criação: ${plano.dataCriacao}`);
    
    if (!plano.pdfUrl) {
      console.log('❌ [PLANO-ACAO-TESTE] PDF não disponível para este plano de ação');
      return res.status(404).json({ error: 'PDF não disponível para este plano de ação' });
    }
    
    console.log(`🔍 [PLANO-ACAO-TESTE] URL do PDF: ${plano.pdfUrl}`);
    
    // Verificar se a URL é válida
    if (!plano.pdfUrl.startsWith('http')) {
      console.error(`❌ [PLANO-ACAO-TESTE] URL do PDF inválida: ${plano.pdfUrl}`);
      return res.status(400).json({ error: 'URL do PDF inválida' });
    }
    
    // Verificar se a URL é acessível
    try {
      console.log(`🔄 [PLANO-ACAO-TESTE] Verificando acesso à URL: ${plano.pdfUrl}`);
      const response = await fetch(plano.pdfUrl, { method: 'HEAD' });
      
      console.log(`📊 [PLANO-ACAO-TESTE] Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`📊 [PLANO-ACAO-TESTE] Headers da resposta:`, response.headers);
      
      const result = {
        url: plano.pdfUrl,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        folder: plano.pdfUrl.includes('/janice/analises/') ? 'janice/analises' : 
                plano.pdfUrl.includes('/janice/planos-acao/') ? 'janice/planos-acao' : 'desconhecida'
      };
      
      return res.json(result);
      
    } catch (error) {
      console.error(`❌ [PLANO-ACAO-TESTE] Erro ao verificar acesso à URL: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao verificar acesso à URL do PDF',
        message: error.message,
        url: plano.pdfUrl
      });
    }
    
  } catch (error) {
    console.error('❌ [PLANO-ACAO-TESTE] Erro ao testar PDF:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao testar PDF',
      message: error.message
    });
  }
});

/**
 * GET /api/planos-acao/:clienteId
 * Busca todos os planos de ação de um cliente
 */
router.get('/:clienteId', validateObjectId, async (req, res) => {
  try {
    console.log(`📋 [PLANOS-ACAO-GET] Iniciando busca para cliente: ${req.params.clienteId}`);
    const { clienteId } = req.params;
    
    // Verificar se o cliente existe
    console.log(`📋 [PLANOS-ACAO-GET] Verificando se cliente existe...`);
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      console.log(`❌ [PLANOS-ACAO-GET] Cliente não encontrado: ${clienteId}`);
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    console.log(`✅ [PLANOS-ACAO-GET] Cliente encontrado: ${cliente.nome}`);
    
    // Buscar planos de ação do cliente
    console.log(`📋 [PLANOS-ACAO-GET] Buscando planos de ação...`);
    const planosAcao = await PlanoAcao.getPorCliente(clienteId);
    
    console.log(`✅ [PLANOS-ACAO-GET] Encontrados ${planosAcao.length} planos de ação`);
    res.json(planosAcao);
  } catch (error) {
    console.error('❌ [PLANOS-ACAO-GET] Erro ao buscar planos de ação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/planos-acao/:clienteId/documentos
 * Busca documentos disponíveis (transcrições e análises) para um cliente
 */
router.get('/:clienteId/documentos', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Buscar transcrições do cliente
    const transcricoes = await Transcricao.find({ 
      cliente: clienteId,
      erro: false,
      emProgresso: false
    }).select('_id titulo dataCriacao duracao').sort({ dataCriacao: -1 });
    
    // Buscar análises do cliente
    const analises = await Analise.find({ 
      cliente: clienteId,
      erro: false,
      emProgresso: false
    }).select('_id cnpj dataCriacao').sort({ dataCriacao: -1 });
    
    res.json({
      transcricoes,
      analises
    });
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/planos-acao/:clienteId/gerar
 * Gera um novo plano de ação baseado nos documentos selecionados
 */
router.post('/:clienteId/gerar', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { titulo, transcricaoIds = [], analiseIds = [] } = req.body;
    
    // Validações
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    
    if (transcricaoIds.length === 0 && analiseIds.length === 0) {
      return res.status(400).json({ 
        error: 'É necessário selecionar pelo menos uma transcrição ou análise' 
      });
    }
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Verificar se já existe um plano em progresso para este cliente
    const planoEmProgresso = await PlanoAcao.findOne({
      cliente: clienteId,
      emProgresso: true
    });
    
    if (planoEmProgresso) {
      return res.status(409).json({ 
        error: 'Já existe um plano de ação sendo gerado para este cliente' 
      });
    }
    
    // Obter usuário sistema para o campo criadoPor
    const usuarioSistemaId = await getUsuarioSistema();
    console.log(`👤 [PLANOS-ACAO] Usando usuário sistema: ${usuarioSistemaId}`);
    
    // Criar registro inicial do plano de ação com conteúdo temporário
    const totalDocumentos = transcricaoIds.length + analiseIds.length;
    const conteudoTemporario = `🔄 Gerando plano de ação estratégico...

Este plano está sendo criado com base nos documentos selecionados. O processo pode levar alguns minutos.

⏳ Status: Em processamento
📊 Documentos analisados: ${transcricaoIds.length} transcrição(ões), ${analiseIds.length} análise(s)
📋 Total de documentos: ${totalDocumentos}

Por favor, aguarde a conclusão do processamento. O conteúdo será atualizado automaticamente quando estiver pronto.`;

    const novoPlano = new PlanoAcao({
      cliente: clienteId,
      criadoPor: usuarioSistemaId,
      titulo: titulo.trim(),
      documentosBase: {
        transcricoes: transcricaoIds,
        analises: analiseIds
      },
      conteudo: conteudoTemporario,
      emProgresso: true,
      erro: false
    });
    
    await novoPlano.save();
    
    // Iniciar geração do plano de ação em background
    generateActionPlan(transcricaoIds, analiseIds, clienteId, titulo.trim())
      .then(async (resultado) => {
        // Atualizar o plano com o resultado
        novoPlano.conteudo = resultado.conteudo;
        novoPlano.pdfUrl = resultado.pdfUrl;
        novoPlano.dataExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
        novoPlano.emProgresso = false;
        novoPlano.erro = false;
        novoPlano.mensagemErro = null;
        
        await novoPlano.save();
        
        // Encontrar o processo correto no Map global que corresponde a este plano
        const allProcesses = progressService.getAllGlobalProcesses();
        const matchingProcess = allProcesses.find(p => 
          p.tipo === 'plano-acao' && 
          p.titulo === `Plano de Ação: ${titulo.trim()}` &&
          p.status === 'em-progresso'
        );
        
        if (matchingProcess) {
          console.log(`🔍 [PLANO-ACAO] Processo encontrado para finalização: ${matchingProcess.id}`);
          
          // Marcar processo como concluído usando o ID correto do processo
          progressService.completeActiveProcess(matchingProcess.id, {
            progresso: 100,
            resultado: 'Plano de ação gerado com sucesso',
            resourceId: novoPlano._id
          });
        } else {
          console.log(`⚠️ [PLANO-ACAO] Processo não encontrado no Map global para plano: ${novoPlano._id}`);
          console.log(`🔍 [PLANO-ACAO] Processos disponíveis:`, allProcesses.map(p => ({
            id: p.id,
            tipo: p.tipo,
            titulo: p.titulo,
            status: p.status
          })));
        }
        
        console.log(`Plano de ação ${novoPlano._id} gerado com sucesso`);
      })
      .catch(async (error) => {
        // Marcar como erro
        novoPlano.emProgresso = false;
        novoPlano.erro = true;
        novoPlano.mensagemErro = error.message;
        
        await novoPlano.save();
        
        // Encontrar o processo correto no Map global que corresponde a este plano
        const allProcesses = progressService.getAllGlobalProcesses();
        const matchingProcess = allProcesses.find(p => 
          p.tipo === 'plano-acao' && 
          p.titulo === `Plano de Ação: ${titulo.trim()}` &&
          p.status === 'em-progresso'
        );
        
        if (matchingProcess) {
          console.log(`🔍 [PLANO-ACAO] Processo encontrado para marcar erro: ${matchingProcess.id}`);
          
          // Marcar processo como erro usando o ID correto do processo
          progressService.errorActiveProcess(matchingProcess.id, error.message);
        } else {
          console.log(`⚠️ [PLANO-ACAO] Processo não encontrado no Map global para marcar erro do plano: ${novoPlano._id}`);
        }
        
        console.error(`Erro na geração do plano de ação ${novoPlano._id}:`, error);
      });
    
    res.json({
      message: 'Geração do plano de ação iniciada',
      planoId: novoPlano._id,
      emProgresso: true
    });
    
  } catch (error) {
    console.error('Erro ao iniciar geração do plano de ação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/planos-acao/plano/:planoId
 * Busca um plano de ação específico
 */
router.get('/plano/:planoId', validateObjectId, async (req, res) => {
  try {
    const { planoId } = req.params;
    
    const plano = await PlanoAcao.findById(planoId)
      .populate('cliente', 'nome cnpj')
      .populate('documentosBase.transcricoes', 'titulo dataCriacao')
      .populate('documentosBase.analises', 'cnpj dataCriacao');
    
    if (!plano) {
      return res.status(404).json({ error: 'Plano de ação não encontrado' });
    }
    
    res.json(plano);
  } catch (error) {
    console.error('Erro ao buscar plano de ação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/planos-acao/plano/:planoId
 * Exclui um plano de ação
 */
router.delete('/plano/:planoId', validateObjectId, async (req, res) => {
  try {
    const { planoId } = req.params;
    
    // Buscar plano antes de excluir para obter informações do PDF
    const plano = await PlanoAcao.findById(planoId);
    if (!plano) {
      return res.status(404).json({ error: 'Plano de ação não encontrado' });
    }
    
    // Não permitir exclusão se estiver em progresso
    if (plano.emProgresso) {
      return res.status(409).json({ 
        error: 'Não é possível excluir um plano de ação em progresso' 
      });
    }
    
    // Excluir PDF do Cloudinary se existir
    if (plano.pdfUrl && plano.pdfUrl.includes('cloudinary.com')) {
      const publicId = getPublicIdFromUrl(plano.pdfUrl);
      if (publicId) {
        try {
          await deletePDF(publicId);
          console.log(`PDF do plano de ação excluído do Cloudinary: ${publicId}`);
        } catch (deleteError) {
          console.error('Erro ao excluir PDF do Cloudinary:', deleteError);
          // Continuar com a exclusão do plano mesmo se falhar a exclusão do PDF
        }
      }
    }
    
    // Excluir o plano do banco de dados
    await PlanoAcao.findByIdAndDelete(planoId);
    
    res.json({ message: 'Plano de ação excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir plano de ação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/planos-acao/:clienteId/status
 * Verifica o status de geração de planos de ação para um cliente
 */
router.get('/:clienteId/status', validateObjectId, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    const planoEmProgresso = await PlanoAcao.findOne({
      cliente: clienteId,
      emProgresso: true
    });
    
    if (planoEmProgresso) {
      res.json({
        emProgresso: true,
        planoId: planoEmProgresso._id,
        titulo: planoEmProgresso.titulo
      });
    } else {
      res.json({
        emProgresso: false
      });
    }
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/planos-acao/pdf/:id
 * Servir PDF via proxy com headers corretos para visualização
 */
router.get('/pdf/:id', validateObjectId, async (req, res) => {
  try {
    console.log(`🔍 [PLANO-ACAO-PDF] Solicitação de PDF para plano de ação ID: ${req.params.id}`);
    
    // Buscar o plano de ação no banco de dados
    const plano = await PlanoAcao.findById(req.params.id);
    
    if (!plano) {
      console.log('❌ [PLANO-ACAO-PDF] Plano de ação não encontrado');
      return res.status(404).json({ error: 'Plano de ação não encontrado' });
    }
    
    console.log(`✅ [PLANO-ACAO-PDF] Plano encontrado: ${plano._id}`);
    console.log(`📊 [PLANO-ACAO-PDF] Título: ${plano.titulo}`);
    console.log(`📊 [PLANO-ACAO-PDF] Data de criação: ${plano.dataCriacao}`);
    
    if (!plano.pdfUrl) {
      console.log('❌ [PLANO-ACAO-PDF] PDF não disponível para este plano de ação');
      return res.status(404).json({ error: 'PDF não disponível para este plano de ação' });
    }
    
    console.log(`🔍 [PLANO-ACAO-PDF] URL do PDF: ${plano.pdfUrl}`);
    
    // Verificar se a URL é válida
    if (!plano.pdfUrl.startsWith('http')) {
      console.error(`❌ [PLANO-ACAO-PDF] URL do PDF inválida: ${plano.pdfUrl}`);
      return res.status(400).json({ error: 'URL do PDF inválida' });
    }
    
    console.log(`🔄 [PLANO-ACAO-PDF] Buscando PDF do Cloudinary: ${plano.pdfUrl}`);
    
    // Buscar o PDF do Cloudinary
    const response = await fetch(plano.pdfUrl);
    
    console.log(`📊 [PLANO-ACAO-PDF] Status da resposta: ${response.status} ${response.statusText}`);
    console.log(`📊 [PLANO-ACAO-PDF] Headers da resposta:`, response.headers);
    
    if (!response.ok) {
      console.error(`❌ [PLANO-ACAO-PDF] Erro ao buscar PDF do Cloudinary: ${response.status} ${response.statusText}`);
      
      // Tentar obter mais detalhes do erro
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error(`❌ [PLANO-ACAO-PDF] Corpo da resposta de erro: ${errorBody}`);
      } catch (textError) {
        console.error(`❌ [PLANO-ACAO-PDF] Não foi possível ler o corpo da resposta: ${textError.message}`);
      }
      
      return res.status(502).json({ 
        error: 'Erro ao carregar PDF do servidor de arquivos',
        details: `Status: ${response.status}, Mensagem: ${response.statusText}`,
        body: errorBody
      });
    }
    
    // Verificar o tipo de conteúdo
    const contentType = response.headers.get('content-type');
    console.log(`📊 [PLANO-ACAO-PDF] Tipo de conteúdo: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/pdf')) {
      console.warn(`⚠️ [PLANO-ACAO-PDF] Tipo de conteúdo inesperado: ${contentType}`);
    }
    
    // Obter o buffer do PDF
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ [PLANO-ACAO-PDF] PDF carregado com sucesso (${pdfBuffer.length} bytes)`);
    
    // Configurar headers para visualização inline do PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="plano_acao.pdf"',
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      'Accept-Ranges': 'bytes'
    });
    
    // Enviar o PDF
    res.send(pdfBuffer);
    console.log('✅ [PLANO-ACAO-PDF] PDF enviado com sucesso');
    
  } catch (error) {
    console.error('❌ [PLANO-ACAO-PDF] Erro ao servir PDF:', error);
    console.error('❌ [PLANO-ACAO-PDF] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao carregar PDF',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
