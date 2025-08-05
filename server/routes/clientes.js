const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Cliente = require('../models/Cliente');
const Analise = require('../models/Analise');
const { validateCNPJ } = require('../utils/validators');
const { uploadImage, deleteImage, deletePDF, getPublicIdFromUrl } = require('../config/cloudinary');

// Configuração do multer para upload de logos
// Usando memoryStorage para armazenar em buffer antes de enviar para o Cloudinary
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  }
});

/**
 * Rotas para gerenciamento de clientes (CRUD)
 */

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ nome: 1 });
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ 
      error: 'Erro ao listar clientes',
      message: error.message
    });
  }
});

// Obter cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar cliente',
      message: error.message
    });
  }
});

// Criar novo cliente
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    console.log('[DEBUG] POST /clientes - Corpo da requisição:', req.body);
    console.log('[DEBUG] POST /clientes - Headers:', req.headers['content-type']);
    console.log('[DEBUG] POST /clientes - Arquivo:', req.file ? 'Recebido' : 'Não recebido');
    
    const { nome, cnpj } = req.body;
    
    // Upload do logo para o Cloudinary se existir
    let logoUrl = null;
    if (req.file) {
      try {
        const result = await uploadImage(req.file.buffer, {
          folder: 'janice/logos',
          public_id: `logo-${Date.now()}`
        });
        logoUrl = result.secure_url;
        console.log('[DEBUG] POST /clientes - Logo enviado para Cloudinary:', logoUrl);
      } catch (uploadError) {
        console.error('Erro ao enviar logo para Cloudinary:', uploadError);
        // Continuar sem logo se houver erro no upload
      }
    }
    
    console.log('[DEBUG] POST /clientes - Dados extraídos:', { 
      nome, 
      cnpj, 
      logoUrl: logoUrl ? 'Existe' : 'Não existe' 
    });
    
    // Validar CNPJ
    console.log('[DEBUG] POST /clientes - Antes da validação do CNPJ:', cnpj);
    if (!validateCNPJ(cnpj)) {
      console.log('[DEBUG] POST /clientes - CNPJ inválido:', cnpj);
      return res.status(400).json({ 
        error: 'CNPJ inválido', 
        message: `O CNPJ informado (${cnpj}) é inválido. Verifique se os dígitos estão corretos.`,
        code: 'INVALID_CNPJ',
        cnpj: cnpj
      });
    }
    console.log('[DEBUG] POST /clientes - CNPJ validado com sucesso');
    
    // Verificar se já existe cliente com este CNPJ
    const cnpjNumerico = cnpj.replace(/\D/g, '');
    console.log('[DEBUG] POST /clientes - CNPJ numérico para busca:', cnpjNumerico);
    
    const clienteExistente = await Cliente.findOne({ cnpj: cnpjNumerico });
    if (clienteExistente) {
      console.log('[DEBUG] POST /clientes - Cliente já existe:', clienteExistente);
      return res.status(400).json({ 
        error: 'Cliente já existente', 
        message: `Já existe um cliente "${clienteExistente.nome}" cadastrado com o CNPJ ${cnpj}.`,
        code: 'DUPLICATE_CNPJ',
        cnpj: cnpj,
        clienteExistente: {
          id: clienteExistente._id,
          nome: clienteExistente.nome
        }
      });
    }
    console.log('[DEBUG] POST /clientes - Verificação de duplicidade passou');
    
    // Criar novo cliente
    console.log('[DEBUG] POST /clientes - Criando novo cliente');
    const novoCliente = new Cliente({
      nome,
      cnpj: cnpj.replace(/\D/g, ''), // Armazena apenas os números
      logo: logoUrl
    });
    
    console.log('[DEBUG] POST /clientes - Modelo criado, salvando no banco de dados');
    await novoCliente.save();
    console.log('[DEBUG] POST /clientes - Cliente salvo com sucesso:', novoCliente);
    res.status(201).json(novoCliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    console.error('Stack trace completo:', error.stack);
    console.error('Detalhes da requisição que causou o erro:', {
      body: req.body,
      headers: req.headers['content-type'],
    });
    
    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao criar cliente';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Dados inválidos para cadastro de cliente';
      errorCode = 'VALIDATION_ERROR';
      
      // Extrair detalhes de validação do Mongoose
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({
        error: errorMessage,
        message: 'Por favor, verifique se todos os campos foram preenchidos corretamente.',
        code: errorCode,
        details: validationErrors
      });
    }
    
    if (error.message.includes('size limit')) {
      return res.status(400).json({
        error: 'Arquivo muito grande',
        message: 'A imagem do logo excede o tamanho máximo permitido (5MB).',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
      code: errorCode,
      technicalDetails: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Atualizar cliente
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    console.log('[DEBUG] PUT /clientes/:id - Corpo da requisição:', req.body);
    console.log('[DEBUG] PUT /clientes/:id - Arquivo:', req.file ? 'Recebido' : 'Não recebido');
    
    const { nome } = req.body;
    
    // Buscar cliente atual para obter o logo antigo se necessário excluir
    const clienteAtual = await Cliente.findById(req.params.id);
    if (!clienteAtual) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Upload do novo logo para Cloudinary se enviado
    let logoUrl;
    if (req.file) {
      try {
        // Fazer upload da nova imagem
        const result = await uploadImage(req.file.buffer, {
          folder: 'janice/logos',
          public_id: `logo-${Date.now()}-${req.params.id}`
        });
        logoUrl = result.secure_url;
        
        // Tentar excluir logo antigo do Cloudinary se existir e for do Cloudinary
        if (clienteAtual.logo && clienteAtual.logo.includes('cloudinary.com')) {
          const publicId = getPublicIdFromUrl(clienteAtual.logo);
          if (publicId) {
            try {
              await deleteImage(publicId);
              console.log(`Logo antigo excluído: ${publicId}`);
            } catch (deleteError) {
              console.error('Erro ao excluir logo antigo:', deleteError);
              // Continuar mesmo se falhar a exclusão
            }
          }
        }
      } catch (uploadError) {
        console.error('Erro ao fazer upload do logo:', uploadError);
        // Continuar sem atualizar o logo em caso de erro
      }
    }
    
    // Não permitimos atualizar o CNPJ - seria um novo cliente
    // Preparar objeto de atualização
    const atualizacao = { 
      nome,
      dataUltimaAtualizacao: Date.now()
    };
    
    // Só incluir logo na atualização se um novo arquivo foi enviado e processado
    if (logoUrl) {
      atualizacao.logo = logoUrl;
    }
    
    console.log('[DEBUG] PUT /clientes/:id - Dados para atualização:', atualizacao);
    
    const clienteAtualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      atualizacao,
      { new: true, runValidators: true }
    );
    
    if (!clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(clienteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar cliente',
      message: error.message
    });
  }
});

// Excluir cliente
router.delete('/:id', async (req, res) => {
  try {
    // Buscar cliente para obter informações antes de excluir
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    console.log(`Iniciando exclusão do cliente: ${cliente.nome} (ID: ${req.params.id})`);
    
    // Buscar todas as análises do cliente para excluir PDFs do Cloudinary
    const analises = await Analise.find({ cliente: req.params.id });
    console.log(`Encontradas ${analises.length} análises para exclusão`);
    
    // Excluir PDFs das análises do Cloudinary
    for (const analise of analises) {
      if (analise.pdfUrl && analise.pdfUrl.includes('cloudinary.com')) {
        const publicId = getPublicIdFromUrl(analise.pdfUrl);
        if (publicId) {
          try {
            await deletePDF(publicId);
            console.log(`PDF da análise excluído do Cloudinary: ${publicId}`);
          } catch (deleteError) {
            console.error('Erro ao excluir PDF da análise:', deleteError);
            // Continuar mesmo se falhar a exclusão de algum PDF
          }
        }
      }
    }
    
    // Excluir todas as análises do cliente do banco de dados
    const analisesDeletadas = await Analise.deleteMany({ cliente: req.params.id });
    console.log(`${analisesDeletadas.deletedCount} análises excluídas do banco de dados`);
    
    // Excluir logo do Cloudinary se existir
    if (cliente.logo && cliente.logo.includes('cloudinary.com')) {
      const publicId = getPublicIdFromUrl(cliente.logo);
      if (publicId) {
        try {
          await deleteImage(publicId);
          console.log(`Logo excluído: ${publicId}`);
        } catch (deleteError) {
          console.error('Erro ao excluir logo:', deleteError);
          // Continuar com a exclusão do cliente mesmo se falhar a exclusão do logo
        }
      }
    }
    
    // Excluir o cliente do banco de dados
    await Cliente.findByIdAndDelete(req.params.id);
    
    console.log(`Cliente ${cliente.nome} excluído com sucesso, incluindo ${analises.length} análises e respectivos PDFs`);
    
    res.json({ 
      message: 'Cliente excluído com sucesso',
      detalhes: {
        analisesExcluidas: analises.length,
        pdfsExcluidos: analises.filter(a => a.pdfUrl && a.pdfUrl.includes('cloudinary.com')).length
      }
    });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ 
      error: 'Erro ao excluir cliente',
      message: error.message
    });
  }
});

module.exports = router;
