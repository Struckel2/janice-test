const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Transcricao = require('../models/Transcricao');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const transcricaoService = require('../services/transcricaoService');
const replicateTranscricaoService = require('../services/replicateTranscricaoService');
const progressService = require('../services/progressService');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

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
// Função auxiliar para validar ObjectId
const validarObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.clienteId) && 
      !mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }
  next();
};

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    
    // Criar diretório temporário se não existir
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Usar timestamp + nome original para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Filtro para tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
  // Aceitar qualquer tipo de áudio ou vídeo
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Envie apenas arquivos de áudio ou vídeo.'), false);
  }
};

// Configuração do Multer com limite de tamanho (500MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

/**
 * @route   GET /api/transcricoes/cliente/:clienteId
 * @desc    Obter todas as transcrições de um cliente
 * @access  Public
 */
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
  if (!mongoose.isValidObjectId(clienteId)) {
      return res.status(400).json({ erro: 'ID de cliente inválido' });
    }
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }
    
    // Buscar transcrições do cliente ordenadas por data (mais recentes primeiro)
    const transcricoes = await Transcricao.find({ cliente: clienteId })
      .sort({ createdAt: -1 })
      .select('-conteudo'); // Não enviar o conteúdo completo na listagem
    
    res.json(transcricoes);
  } catch (error) {
    console.error('Erro ao buscar transcrições:', error);
    res.status(500).json({ erro: 'Erro ao buscar transcrições' });
  }
});

/**
 * @route   GET /api/transcricoes/:id
 * @desc    Obter detalhes de uma transcrição específica
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
  if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de transcrição inválido' });
    }
    
    const transcricao = await Transcricao.findById(id).populate('cliente', 'nome cnpj');
    
    if (!transcricao) {
      return res.status(404).json({ erro: 'Transcrição não encontrada' });
    }
    
    res.json(transcricao);
  } catch (error) {
    console.error('Erro ao buscar detalhes da transcrição:', error);
    res.status(500).json({ erro: 'Erro ao buscar detalhes da transcrição' });
  }
});

/**
 * @route   POST /api/transcricoes/upload/:clienteId
 * @desc    Fazer upload e processar um arquivo para transcrição
 * @access  Public
 */
router.post('/upload/:clienteId', upload.single('arquivo'), async (req, res) => {
  let filePath = null;
  
  try {
    const { clienteId } = req.params;
    const { titulo, idioma = 'pt' } = req.body;
    
    console.log(`🚀 [TRANSCRICAO-UPLOAD] Iniciando upload para cliente: ${clienteId}`);
    console.log(`📝 [TRANSCRICAO-UPLOAD] Título: "${titulo}"`);
    console.log(`🌍 [TRANSCRICAO-UPLOAD] Idioma: ${idioma}`);
    
    // Validação detalhada do arquivo
    if (!req.file) {
      console.error('❌ [TRANSCRICAO-UPLOAD] Nenhum arquivo foi enviado');
      return res.status(400).json({ 
        erro: 'Nenhum arquivo foi enviado. Por favor, selecione um arquivo de áudio ou vídeo.' 
      });
    }
    
    console.log(`📁 [TRANSCRICAO-UPLOAD] Arquivo recebido: ${req.file.originalname}`);
    console.log(`📊 [TRANSCRICAO-UPLOAD] Tamanho: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`🎭 [TRANSCRICAO-UPLOAD] Tipo MIME: ${req.file.mimetype}`);
    
    filePath = req.file.path;
    
    // Validação do tamanho do arquivo
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (req.file.size > maxSize) {
      console.error(`❌ [TRANSCRICAO-UPLOAD] Arquivo muito grande: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
      return res.status(400).json({ 
        erro: `Arquivo muito grande (${(req.file.size / (1024 * 1024)).toFixed(2)} MB). Tamanho máximo permitido: 500 MB.` 
      });
    }
    
    // Validação do tipo de arquivo
    if (!req.file.mimetype.startsWith('audio/') && !req.file.mimetype.startsWith('video/')) {
      console.error(`❌ [TRANSCRICAO-UPLOAD] Tipo de arquivo não suportado: ${req.file.mimetype}`);
      return res.status(400).json({ 
        erro: `Tipo de arquivo não suportado (${req.file.mimetype}). Envie apenas arquivos de áudio ou vídeo.` 
      });
    }
    
    // Validação do ID do cliente
    if (!mongoose.isValidObjectId(clienteId)) {
      console.error(`❌ [TRANSCRICAO-UPLOAD] ID de cliente inválido: ${clienteId}`);
      return res.status(400).json({ erro: 'ID de cliente inválido' });
    }
    
    // Verificar se o cliente existe
    console.log(`🔍 [TRANSCRICAO-UPLOAD] Verificando se cliente existe: ${clienteId}`);
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      console.error(`❌ [TRANSCRICAO-UPLOAD] Cliente não encontrado: ${clienteId}`);
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }
    
    console.log(`✅ [TRANSCRICAO-UPLOAD] Cliente encontrado: ${cliente.nome}`);
    
    // Validação do título
    if (!titulo || titulo.trim().length === 0) {
      console.error('❌ [TRANSCRICAO-UPLOAD] Título da transcrição não fornecido');
      return res.status(400).json({ erro: 'O título da transcrição é obrigatório' });
    }
    
    if (titulo.trim().length > 200) {
      console.error(`❌ [TRANSCRICAO-UPLOAD] Título muito longo: ${titulo.length} caracteres`);
      return res.status(400).json({ erro: 'O título deve ter no máximo 200 caracteres' });
    }
    
    console.log(`💾 [TRANSCRICAO-UPLOAD] Criando registro de transcrição no banco...`);
    
    // Obter usuário sistema para o campo criadoPor
    const usuarioSistemaId = await getUsuarioSistema();
    console.log(`👤 [TRANSCRICAO-UPLOAD] Usando usuário sistema: ${usuarioSistemaId}`);
    
    // Criar registro inicial de transcrição
    const transcricao = new Transcricao({
      cliente: clienteId,
      criadoPor: usuarioSistemaId,
      titulo: titulo.trim(),
      conteudo: 'Processando...',
      nomeArquivoOriginal: req.file.originalname,
      idioma,
      emProgresso: true
    });
    
    await transcricao.save();
    
    console.log(`✅ [TRANSCRICAO-UPLOAD] Transcrição criada com ID: ${transcricao._id}`);
    console.log(`🚀 [TRANSCRICAO-UPLOAD] Iniciando processamento assíncrono...`);
    
    // Iniciar processamento assíncrono
    processTranscricaoAsync(filePath, transcricao._id, clienteId, idioma);
    
    // Retornar ID da transcrição para que o cliente possa acompanhar o progresso
    res.status(202).json({
      mensagem: 'Arquivo recebido, transcrição iniciada',
      transcricaoId: transcricao._id,
      detalhes: {
        arquivo: req.file.originalname,
        tamanho: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        tipo: req.file.mimetype,
        titulo: titulo.trim(),
        idioma
      }
    });
    
    console.log(`🎉 [TRANSCRICAO-UPLOAD] Upload concluído com sucesso para transcrição ${transcricao._id}`);
    
  } catch (error) {
    console.error('💥 [TRANSCRICAO-UPLOAD] Erro crítico no upload:', error);
    console.error('📍 [TRANSCRICAO-UPLOAD] Stack trace:', error.stack);
    
    // Limpar arquivo se ocorrer um erro
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ [TRANSCRICAO-UPLOAD] Arquivo temporário removido: ${filePath}`);
      } catch (err) {
        console.error('❌ [TRANSCRICAO-UPLOAD] Erro ao remover arquivo temporário:', err);
      }
    }
    
    // Retornar erro específico baseado no tipo
    let errorMessage = 'Erro interno do servidor ao processar arquivo para transcrição';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Dados inválidos: ' + Object.values(error.errors).map(e => e.message).join(', ');
      statusCode = 400;
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = 'Erro de banco de dados. Tente novamente em alguns instantes.';
      statusCode = 503;
    } else if (error.message.includes('ENOSPC')) {
      errorMessage = 'Espaço insuficiente no servidor. Tente novamente mais tarde.';
      statusCode = 507;
    } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
      errorMessage = 'Servidor temporariamente sobrecarregado. Tente novamente em alguns minutos.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      erro: errorMessage,
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Processa a transcrição de forma assíncrona
 * @param {String} filePath - Caminho do arquivo
 * @param {String} transcricaoId - ID da transcrição
 * @param {String} clienteId - ID do cliente
 * @param {String} idioma - Código do idioma
 */
async function processTranscricaoAsync(filePath, transcricaoId, clienteId, idioma) {
  try {
    console.log(`=== INICIANDO TRANSCRIÇÃO ${transcricaoId} ===`);
    console.log(`Arquivo: ${filePath}`);
    console.log(`Cliente: ${clienteId}`);
    console.log(`Idioma: ${idioma}`);
    
    // Verificar se REPLICATE_API_TOKEN está configurado
    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn('REPLICATE_API_TOKEN não configurado, usando smart-whisper como fallback');
      
      // Encontrar o processo correto no Map global
      const allProcesses = progressService.getAllGlobalProcesses();
      const matchingProcess = allProcesses.find(p => 
        p.tipo === 'transcricao' && 
        p.cliente && p.cliente._id === clienteId &&
        p.status === 'em-progresso'
      );
      
      if (matchingProcess) {
        // Atualizar processo para smart-whisper
        progressService.updateGlobalProcess(matchingProcess.id, {
          progresso: 10,
          mensagem: 'Usando smart-whisper como fallback'
        });
      }
      
      // Fallback para smart-whisper
      const resultado = await transcricaoService.transcribeFile(filePath, clienteId, {
        language: idioma,
        model: 'medium'
      });
      
      await Transcricao.findByIdAndUpdate(transcricaoId, {
        conteudo: resultado.text,
        duracao: resultado.duration,
        emProgresso: false,
        provider: 'smart-whisper'
      });
      
      if (matchingProcess) {
        // Marcar processo como concluído
        progressService.completeGlobalProcess(matchingProcess.id, {
          progresso: 100,
          resultado: 'Transcrição concluída com smart-whisper',
          resourceId: transcricaoId
        });
      }
      
      console.log(`Transcrição ${transcricaoId} concluída com smart-whisper (fallback)`);
      return;
    }
    
    // Usar Replicate como método principal
    console.log('Usando Replicate para transcrição...');
    
    // Encontrar o processo correto no Map global
    const allProcesses = progressService.getAllGlobalProcesses();
    const matchingProcess = allProcesses.find(p => 
      p.tipo === 'transcricao' && 
      p.cliente && p.cliente._id === clienteId &&
      p.status === 'em-progresso'
    );
    
    if (matchingProcess) {
      // Atualizar progresso para Replicate
      progressService.updateGlobalProcess(matchingProcess.id, {
        progresso: 15,
        mensagem: 'Usando Replicate para transcrição'
      });
    }
    
    const resultado = await replicateTranscricaoService.transcribeFile(filePath, clienteId, {
      language: idioma === 'pt' ? 'portuguese' : idioma,
      modelSize: 'medium',
      wordTimestamps: true,
      temperature: 0
    });
    
    // Atualizar registro com o resultado
    await Transcricao.findByIdAndUpdate(transcricaoId, {
      conteudo: resultado.text,
      duracao: resultado.duration,
      emProgresso: false,
      provider: resultado.provider,
      modelUsed: resultado.modelUsed,
      processingTime: resultado.processingTime
    });
    
    if (matchingProcess) {
      // Marcar processo como concluído
      progressService.completeGlobalProcess(matchingProcess.id, {
        progresso: 100,
        resultado: 'Transcrição concluída com Replicate',
        resourceId: transcricaoId
      });
    }
    
    console.log(`Transcrição ${transcricaoId} concluída com sucesso via Replicate`);
    console.log(`Tempo de processamento: ${resultado.processingTime}s`);
    console.log(`Modelo usado: ${resultado.modelUsed}`);
    
  } catch (error) {
    console.error(`Erro ao processar transcrição ${transcricaoId}:`, error);
    
    // Se Replicate falhar, tentar smart-whisper como fallback
    if (error.message.includes('Replicate') && process.env.REPLICATE_API_TOKEN) {
      console.log('Tentando fallback para smart-whisper...');
      
      try {
        const resultado = await transcricaoService.transcribeFile(filePath, clienteId, {
          language: idioma,
          model: 'medium'
        });
        
        await Transcricao.findByIdAndUpdate(transcricaoId, {
          conteudo: resultado.text,
          duracao: resultado.duration,
          emProgresso: false,
          provider: 'smart-whisper-fallback',
          mensagemErro: `Replicate falhou, usado smart-whisper: ${error.message}`
        });
        
        console.log(`Transcrição ${transcricaoId} concluída com smart-whisper (fallback após erro Replicate)`);
        return;
        
      } catch (fallbackError) {
        console.error(`Fallback também falhou para transcrição ${transcricaoId}:`, fallbackError);
        
        await Transcricao.findByIdAndUpdate(transcricaoId, {
          emProgresso: false,
          erro: true,
          mensagemErro: `Replicate e smart-whisper falharam. Replicate: ${error.message}. Smart-whisper: ${fallbackError.message}`
        });
        return;
      }
    }
    
    // Atualizar registro com o erro
    await Transcricao.findByIdAndUpdate(transcricaoId, {
      emProgresso: false,
      erro: true,
      mensagemErro: error.message
    });
  } finally {
    // Remover arquivo temporário
    try {
      if (process.env.REPLICATE_API_TOKEN) {
        replicateTranscricaoService.removeFile(filePath);
      } else {
        transcricaoService.removeFile(filePath);
      }
    } catch (removeError) {
      console.error(`Erro ao remover arquivo ${filePath}:`, removeError);
    }
  }
}

/**
 * @route   DELETE /api/transcricoes/:id
 * @desc    Excluir uma transcrição
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de transcrição inválido' });
    }
    
    const transcricao = await Transcricao.findById(id);
    
    if (!transcricao) {
      return res.status(404).json({ erro: 'Transcrição não encontrada' });
    }
    
    await Transcricao.findByIdAndDelete(id);
    
    res.json({ mensagem: 'Transcrição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir transcrição:', error);
    res.status(500).json({ erro: 'Erro ao excluir transcrição' });
  }
});

/**
 * @route   GET /api/transcricoes/status/:id
 * @desc    Verificar o status de uma transcrição (para polling)
 * @access  Public
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de transcrição inválido' });
    }
    
    // Buscar apenas os campos necessários para verificação de status
    const transcricao = await Transcricao.findById(id)
      .select('emProgresso erro mensagemErro duracao dataCriacao');
    
    if (!transcricao) {
      return res.status(404).json({ erro: 'Transcrição não encontrada' });
    }
    
    res.json({
      id: transcricao._id,
      emProgresso: transcricao.emProgresso,
      erro: transcricao.erro,
      mensagemErro: transcricao.mensagemErro,
      duracao: transcricao.duracao,
      dataCriacao: transcricao.dataCriacao,
      // Adicionar uma estimativa de tempo restante baseada na duração e no tempo decorrido
      estimativaTempoRestante: transcricao.emProgresso ? calcularTempoRestante(transcricao) : 0
    });
  } catch (error) {
    console.error('Erro ao verificar status da transcrição:', error);
    res.status(500).json({ erro: 'Erro ao verificar status da transcrição' });
  }
});

/**
 * Calcula uma estimativa de tempo restante para conclusão da transcrição
 * @param {Object} transcricao - Objeto da transcrição
 * @returns {Number} - Tempo estimado restante em segundos
 */
function calcularTempoRestante(transcricao) {
  if (!transcricao.emProgresso) return 0;
  
  const agora = new Date();
  const iniciado = new Date(transcricao.dataCriacao);
  const tempoDecorrido = (agora - iniciado) / 1000; // em segundos
  
  // Estimar duração baseada no tamanho (se disponível) ou usar um valor padrão
  let duracaoEstimada = transcricao.duracao || 0;
  
  // Ajustar para estimativa mínima de 5 minutos
  if (duracaoEstimada < 300) duracaoEstimada = 300;
  
  // Adicionar buffer de 5 minutos
  duracaoEstimada += 300;
  
  // Calcular tempo restante
  const tempoRestante = Math.max(0, duracaoEstimada - tempoDecorrido);
  
  return Math.round(tempoRestante);
}

module.exports = router;
