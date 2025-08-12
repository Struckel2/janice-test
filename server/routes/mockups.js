const express = require('express');
const router = express.Router();
const mockupService = require('../services/mockupService');
const { isAuthenticated } = require('../middleware/auth');
const Mockup = require('../models/Mockup');
const { getImageCacheService } = require('../services/imageCacheService');

/**
 * Rotas para sistema de mockups com IA
 */

// Middleware de autenticação para todas as rotas
router.use(isAuthenticated);

/**
 * POST /api/mockups/gerar
 * Gera 4 variações de mockup (otimizado para performance)
 */
router.post('/gerar', async (req, res) => {
  try {
    console.log('🎨 [MOCKUP-ROUTE] ===== NOVA REQUISIÇÃO DE GERAÇÃO =====');
    console.log('🎨 [MOCKUP-ROUTE] Body completo recebido:', JSON.stringify(req.body, null, 2));
    console.log('🎨 [MOCKUP-ROUTE] Headers da requisição:', req.headers);
    console.log('🎨 [MOCKUP-ROUTE] Usuário autenticado:', req.user ? req.user._id : 'NENHUM');
    
    const {
      clienteId,
      titulo,
      configuracao,
      prompt,
      configuracaoTecnica = {}
    } = req.body;

    console.log('🎨 [MOCKUP-ROUTE] Dados extraídos:');
    console.log('🎨 [MOCKUP-ROUTE] - clienteId:', clienteId);
    console.log('🎨 [MOCKUP-ROUTE] - titulo:', titulo);
    console.log('🎨 [MOCKUP-ROUTE] - configuracao:', configuracao);
    console.log('🎨 [MOCKUP-ROUTE] - prompt:', prompt);
    console.log('🎨 [MOCKUP-ROUTE] - configuracaoTecnica:', configuracaoTecnica);

    // Validações básicas
    console.log('🎨 [MOCKUP-ROUTE] ===== INICIANDO VALIDAÇÕES =====');
    
    if (!clienteId) {
      console.log('❌ [MOCKUP-ROUTE] Erro: Cliente é obrigatório');
      return res.status(400).json({
        success: false,
        message: 'Cliente é obrigatório'
      });
    }

    if (!titulo || titulo.trim().length === 0) {
      console.log('❌ [MOCKUP-ROUTE] Erro: Título é obrigatório');
      return res.status(400).json({
        success: false,
        message: 'Título é obrigatório'
      });
    }

    if (!prompt || prompt.trim().length === 0) {
      console.log('❌ [MOCKUP-ROUTE] Erro: Descrição/prompt é obrigatória');
      return res.status(400).json({
        success: false,
        message: 'Descrição/prompt é obrigatória'
      });
    }

    console.log('✅ [MOCKUP-ROUTE] Validações básicas passaram');

    // Verificar se configuracao existe e é um objeto
    if (!configuracao || typeof configuracao !== 'object') {
      console.log('❌ [MOCKUP-ROUTE] Erro: Configuração inválida ou ausente');
      return res.status(400).json({
        success: false,
        message: 'Configuração é obrigatória e deve ser um objeto válido'
      });
    }

    console.log('🎨 [MOCKUP-ROUTE] Configuração recebida:', configuracao);

    // Limpar campos vazios da configuração
    const configuracaoLimpa = {};
    Object.keys(configuracao).forEach(key => {
      if (configuracao[key] && configuracao[key].trim() !== '') {
        configuracaoLimpa[key] = configuracao[key].trim();
      }
    });

    console.log('🎨 [MOCKUP-ROUTE] Configuração após limpeza:', configuracaoLimpa);

    // Validar configuração
    console.log('🎨 [MOCKUP-ROUTE] Validando configuração...');
    const errosConfig = mockupService.validarConfiguracao(configuracaoLimpa);
    console.log('🎨 [MOCKUP-ROUTE] Erros de configuração encontrados:', errosConfig);
    
    if (errosConfig.length > 0) {
      console.log('❌ [MOCKUP-ROUTE] Configuração inválida:', errosConfig);
      return res.status(400).json({
        success: false,
        message: 'Configuração inválida',
        erros: errosConfig
      });
    }

    console.log('✅ [MOCKUP-ROUTE] Configuração válida');

    // Preparar dados do mockup
    const mockupData = {
      cliente: clienteId,
      criadoPor: req.user._id,
      titulo: titulo.trim(),
      configuracao: configuracaoLimpa,
      prompt: prompt.trim(),
      configuracaoTecnica: {
        cfg: configuracaoTecnica.cfg || 3.5,
        steps: configuracaoTecnica.steps || 28,
        outputFormat: configuracaoTecnica.outputFormat || 'webp',
        outputQuality: configuracaoTecnica.outputQuality || 90,
        seed: configuracaoTecnica.seed
      }
    };

    console.log('🎨 Iniciando geração de mockup para cliente:', clienteId);

    // Preparar informações do usuário para o sistema de progresso
    const userInfo = {
      nome: req.user.nome || req.user.email || 'Usuário',
      email: req.user.email || ''
    };

    // Iniciar geração assíncrona (não aguardar conclusão)
    mockupService.gerarMockup(mockupData, userInfo)
      .then(resultado => {
        console.log('✅ Mockup gerado com sucesso:', resultado.mockupId);
      })
      .catch(error => {
        console.error('❌ Erro na geração assíncrona:', error);
      });

    // Retornar imediatamente com status de processamento
    res.status(202).json({
      success: true,
      message: 'Mockup iniciado com sucesso. Processando em background...',
      data: {
        status: 'processing',
        message: 'Gerando 4 variações de mockup. Isso pode levar até 2 minutos.',
        estimatedTime: '60-120 segundos'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar mockup:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/mockups/:id/salvar-variacao
 * Salva a variação escolhida no Cloudinary
 */
router.post('/:id/salvar-variacao', async (req, res) => {
  try {
    const { id } = req.params;
    const { urlEscolhida, seedEscolhida } = req.body;

    if (!urlEscolhida) {
      return res.status(400).json({
        success: false,
        message: 'URL da variação escolhida é obrigatória'
      });
    }

    if (!seedEscolhida) {
      return res.status(400).json({
        success: false,
        message: 'Seed da variação escolhida é obrigatória'
      });
    }

    console.log('💾 Salvando variação escolhida para mockup:', id);

    const resultado = await mockupService.salvarVariacaoEscolhida(
      id, 
      urlEscolhida, 
      seedEscolhida
    );

    res.json({
      success: true,
      message: 'Variação salva com sucesso',
      data: {
        mockup: resultado.mockup,
        imagemUrl: resultado.cloudinaryUrl
      }
    });

  } catch (error) {
    console.error('❌ Erro ao salvar variação:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar variação escolhida',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/mockups/:id/salvar-multiplas-variacoes
 * Salva múltiplas variações escolhidas no Cloudinary
 */
router.post('/:id/salvar-multiplas-variacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const { variacoesSelecionadas } = req.body;

    if (!variacoesSelecionadas || !Array.isArray(variacoesSelecionadas) || variacoesSelecionadas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos uma variação deve ser selecionada'
      });
    }

    // Validar estrutura das variações
    for (let i = 0; i < variacoesSelecionadas.length; i++) {
      const variacao = variacoesSelecionadas[i];
      if (!variacao.url || !variacao.seed) {
        return res.status(400).json({
          success: false,
          message: `Variação ${i + 1} está incompleta (URL e seed são obrigatórios)`
        });
      }
    }

    console.log('💾 Salvando múltiplas variações para mockup:', id);
    console.log('💾 Quantidade de variações:', variacoesSelecionadas.length);

    const resultado = await mockupService.salvarMultiplasVariacoes(
      id, 
      variacoesSelecionadas
    );

    res.json({
      success: true,
      message: `${resultado.totalSalvas} variações salvas com sucesso`,
      data: {
        mockup: resultado.mockup,
        imagensSalvas: resultado.imagensSalvas,
        totalSalvas: resultado.totalSalvas
      }
    });

  } catch (error) {
    console.error('❌ Erro ao salvar múltiplas variações:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar variações escolhidas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mockups/cliente/:clienteId
 * Lista mockups de um cliente
 */
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { status, limite = 20, pagina = 1 } = req.query;

    console.log('📋 [MOCKUP-LIST] ===== LISTANDO MOCKUPS DO CLIENTE =====');
    console.log('📋 [MOCKUP-LIST] Cliente ID:', clienteId);
    console.log('📋 [MOCKUP-LIST] Filtros:', { status, limite, pagina });

    let mockups = await mockupService.listarPorCliente(clienteId);
    
    console.log('📋 [MOCKUP-LIST] Mockups encontrados no banco:', mockups.length);
    console.log('📋 [MOCKUP-LIST] Detalhes dos mockups:', mockups.map(m => ({
      id: m._id,
      titulo: m.titulo,
      status: m.status,
      dataCriacao: m.dataCriacao,
      imagemUrl: m.imagemUrl,
      metadados: m.metadados
    })));

    // Filtrar por status se especificado
    if (status) {
      const mockupsAntes = mockups.length;
      mockups = mockups.filter(m => m.status === status);
      console.log('📋 [MOCKUP-LIST] Filtrados por status:', status, 'de', mockupsAntes, 'para', mockups.length);
    }

    // Paginação simples
    const inicio = (pagina - 1) * limite;
    const fim = inicio + parseInt(limite);
    const mockupsPaginados = mockups.slice(inicio, fim);
    
    console.log('📋 [MOCKUP-LIST] Paginação:', { inicio, fim, total: mockups.length, pagina: parseInt(pagina) });
    console.log('📋 [MOCKUP-LIST] Mockups paginados:', mockupsPaginados.length);

    const response = {
      success: true,
      data: {
        mockups: mockupsPaginados,
        total: mockups.length,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(mockups.length / limite)
      }
    };
    
    console.log('📋 [MOCKUP-LIST] Resposta final:', response);

    res.json(response);

  } catch (error) {
    console.error('❌ Erro ao listar mockups:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao listar mockups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mockups/:id
 * Busca mockup por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Buscando mockup:', id);

    const mockup = await mockupService.buscarPorId(id);

    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    res.json({
      success: true,
      data: mockup
    });

  } catch (error) {
    console.error('❌ Erro ao buscar mockup:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mockup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mockups/:id/configuracoes
 * Busca configurações completas de um mockup para regeneração
 */
router.get('/:id/configuracoes', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔧 [REGENERAR] Buscando configurações do mockup:', id);

    const mockup = await mockupService.buscarPorId(id);

    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    // Verificar se o usuário tem permissão (criador ou admin)
    if (mockup.criadoPor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para acessar as configurações deste mockup'
      });
    }

    // Retornar apenas as configurações necessárias para regeneração
    const configuracoes = {
      titulo: mockup.titulo + ' - Cópia',
      configuracao: mockup.configuracao,
      prompt: mockup.prompt,
      configuracaoTecnica: mockup.configuracaoTecnica
    };

    console.log('✅ [REGENERAR] Configurações encontradas:', configuracoes);

    res.json({
      success: true,
      data: configuracoes
    });

  } catch (error) {
    console.error('❌ [REGENERAR] Erro ao buscar configurações:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configurações do mockup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/mockups/:id
 * Deleta mockup
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deletando mockup:', id);

    // Verificar se o mockup existe e se o usuário tem permissão
    const mockup = await mockupService.buscarPorId(id);
    
    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    // Verificar se o usuário é o criador ou admin
    if (mockup.criadoPor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para deletar este mockup'
      });
    }

    await mockupService.deletarMockup(id);

    res.json({
      success: true,
      message: 'Mockup deletado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao deletar mockup:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar mockup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mockups/sugestoes/prompt
 * Gera sugestões de prompt baseadas na configuração
 */
router.post('/sugestoes/prompt', async (req, res) => {
  try {
    const { configuracao } = req.body;

    if (!configuracao || !configuracao.tipoArte) {
      return res.status(400).json({
        success: false,
        message: 'Configuração com tipo de arte é obrigatória'
      });
    }

    const sugestoes = mockupService.gerarSugestoesPrompt(configuracao);

    res.json({
      success: true,
      data: {
        sugestoes,
        tipoArte: configuracao.tipoArte
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar sugestões:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar sugestões de prompt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/mockups/estatisticas/resumo
 * Estatísticas gerais de mockups
 */
router.get('/estatisticas/resumo', async (req, res) => {
  try {
    // Buscar estatísticas básicas
    const [
      totalMockups,
      mockupsConcluidos,
      mockupsGerando,
      mockupsErro,
      mockupsRecentes
    ] = await Promise.all([
      Mockup.countDocuments(),
      Mockup.countDocuments({ status: 'concluido' }),
      Mockup.countDocuments({ status: 'gerando' }),
      Mockup.countDocuments({ status: 'erro' }),
      Mockup.getRecentes(5)
    ]);

    // Calcular custo total estimado
    const custoTotal = totalMockups * 0.035 * 2; // 2 variações por mockup (otimizado)

    res.json({
      success: true,
      data: {
        resumo: {
          total: totalMockups,
          concluidos: mockupsConcluidos,
          gerando: mockupsGerando,
          erros: mockupsErro,
          custoTotal: custoTotal.toFixed(2)
        },
        recentes: mockupsRecentes
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para deletar imagem específica da galeria
router.delete('/galeria/imagem/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        
        console.log(`🗑️ [GALERIA-DELETE] Deletando imagem: ${imageId}`);
        
        // Extrair mockupId e seed do imageId (formato: mockupId_seed)
        const [mockupId, seed] = imageId.split('_');
        
        if (!mockupId || !seed) {
            return res.status(400).json({
                success: false,
                message: 'ID da imagem inválido'
            });
        }
        
        console.log(`🗑️ [GALERIA-DELETE] Mockup ID: ${mockupId}, Seed: ${seed}`);
        
        // Buscar o mockup
        const mockup = await Mockup.findById(mockupId);
        if (!mockup) {
            return res.status(404).json({
                success: false,
                message: 'Mockup não encontrado'
            });
        }
        
        // Verificar se o usuário tem permissão (criador ou admin)
        if (mockup.criadoPor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Sem permissão para deletar esta imagem'
            });
        }
        
        // Verificar se existem imagens salvas
        if (!mockup.metadados || !mockup.metadados.imagensSalvas || mockup.metadados.imagensSalvas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma imagem encontrada para deletar'
            });
        }
        
        // Encontrar a imagem específica
        const imagemIndex = mockup.metadados.imagensSalvas.findIndex(img => img.seed.toString() === seed);
        
        if (imagemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Imagem não encontrada'
            });
        }
        
        const imagemParaDeletar = mockup.metadados.imagensSalvas[imagemIndex];
        console.log(`🗑️ [GALERIA-DELETE] Imagem encontrada:`, imagemParaDeletar);
        
        // Deletar do Cloudinary se tiver publicId
        if (imagemParaDeletar.publicId) {
            try {
                const { cloudinary } = require('../config/cloudinary');
                await cloudinary.uploader.destroy(imagemParaDeletar.publicId);
                console.log(`🗑️ [GALERIA-DELETE] Imagem removida do Cloudinary: ${imagemParaDeletar.publicId}`);
            } catch (cloudinaryError) {
                console.error(`❌ [GALERIA-DELETE] Erro ao remover do Cloudinary:`, cloudinaryError);
                // Continuar mesmo se falhar no Cloudinary
            }
        }
        
        // Remover do array de imagens salvas
        mockup.metadados.imagensSalvas.splice(imagemIndex, 1);
        
        // Se era a imagem principal e ainda há outras imagens, atualizar a principal
        if (mockup.imagemUrl === imagemParaDeletar.url && mockup.metadados.imagensSalvas.length > 0) {
            mockup.imagemUrl = mockup.metadados.imagensSalvas[0].url;
            console.log(`🗑️ [GALERIA-DELETE] Imagem principal atualizada para: ${mockup.imagemUrl}`);
        } else if (mockup.metadados.imagensSalvas.length === 0) {
            // Se não há mais imagens salvas, limpar a URL principal
            mockup.imagemUrl = '';
            console.log(`🗑️ [GALERIA-DELETE] Todas as imagens removidas, limpando URL principal`);
        }
        
        // Salvar as alterações
        await mockup.save();
        
        console.log(`✅ [GALERIA-DELETE] Imagem deletada com sucesso. Restam ${mockup.metadados.imagensSalvas.length} imagens`);
        
        res.json({
            success: true,
            message: 'Imagem deletada com sucesso',
            data: {
                imagensRestantes: mockup.metadados.imagensSalvas.length,
                imagemPrincipal: mockup.imagemUrl
            }
        });
        
    } catch (error) {
        console.error('❌ [GALERIA-DELETE] Erro ao deletar imagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao deletar imagem',
            error: error.message
        });
    }
});

// Endpoint para galeria de imagens do cliente
router.get('/galeria/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const { tipo } = req.query; // Filtro opcional por tipo

        console.log(`🖼️ [GALERIA] Carregando galeria para cliente: ${clienteId}`);
        
        // Buscar todos os mockups do cliente que têm imagens salvas
        let query = { 
            cliente: clienteId,
            'metadados.imagensSalvas': { $exists: true, $ne: [] }
        };

        const mockups = await Mockup.find(query)
            .populate('cliente', 'nome cnpj')
            .sort({ criadoEm: -1 });

        console.log(`🖼️ [GALERIA] Encontrados ${mockups.length} mockups com imagens salvas`);

        // Processar e organizar as imagens
        let imagensGaleria = [];

        mockups.forEach(mockup => {
            if (mockup.metadados && mockup.metadados.imagensSalvas) {
                mockup.metadados.imagensSalvas.forEach(imagem => {
                    // Filtrar por tipo se especificado
                    if (tipo && tipo !== 'all' && mockup.tipo !== tipo) {
                        return;
                    }

                    imagensGaleria.push({
                        id: `${mockup._id}_${imagem.seed}`,
                        mockupId: mockup._id,
                        url: imagem.url,
                        seed: imagem.seed,
                        publicId: imagem.publicId,
                        dataSalvamento: imagem.dataSalvamento,
                        // Dados do mockup
                        titulo: mockup.titulo,
                        tipo: mockup.tipo,
                        prompt: mockup.prompt,
                        criadoEm: mockup.criadoEm,
                        // Dados do cliente
                        cliente: {
                            id: mockup.cliente._id,
                            nome: mockup.cliente.nome,
                            cnpj: mockup.cliente.cnpj
                        }
                    });
                });
            }
        });

        // Ordenar por data de salvamento (mais recentes primeiro)
        imagensGaleria.sort((a, b) => new Date(b.dataSalvamento) - new Date(a.dataSalvamento));

        console.log(`🖼️ [GALERIA] Retornando ${imagensGaleria.length} imagens para a galeria`);

        res.json({
            success: true,
            imagens: imagensGaleria,
            total: imagensGaleria.length,
            filtro: tipo || 'all'
        });

    } catch (error) {
        console.error('❌ [GALERIA] Erro ao carregar galeria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao carregar galeria',
            error: error.message
        });
    }
});

// Rota para cachear preventivamente uma imagem no Cloudinary
router.post('/galeria/cachear-preventivo', async (req, res) => {
  try {
    const { imagemUrl, imagemId } = req.body;
    
    console.log('🔄 [CACHE-PREVENTIVO] ===== INICIANDO CACHE PREVENTIVO =====');
    console.log('🔄 [CACHE-PREVENTIVO] URL original:', imagemUrl?.substring(0, 100) + '...');
    console.log('🔄 [CACHE-PREVENTIVO] ID da imagem:', imagemId);
    
    // Validações básicas
    if (!imagemUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem é obrigatória'
      });
    }
    
    // Verificar se é uma URL do Replicate
    const isReplicateUrl = imagemUrl.includes('replicate.delivery') || 
                          imagemUrl.includes('replicate.com');
    
    if (!isReplicateUrl) {
      console.log('✅ [CACHE-PREVENTIVO] URL não é do Replicate, não precisa de cache');
      return res.json({
        success: true,
        message: 'URL não requer cache',
        urlCacheada: imagemUrl,
        cacheado: false
      });
    }
    
    console.log('🔄 [CACHE-PREVENTIVO] URL do Replicate detectada, iniciando cache...');
    
    try {
      // Baixar imagem do Replicate
      const axios = require('axios');
      const response = await axios.get(imagemUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log('✅ [CACHE-PREVENTIVO] Imagem baixada com sucesso');
      console.log('📊 [CACHE-PREVENTIVO] Tamanho:', response.data.length, 'bytes');
      
      // Converter para base64
      const base64Image = Buffer.from(response.data).toString('base64');
      const dataUri = `data:${response.headers['content-type'] || 'image/png'};base64,${base64Image}`;
      
      // Upload para Cloudinary
      const { cloudinary } = require('../config/cloudinary');
      
      console.log('☁️ [CACHE-PREVENTIVO] Fazendo upload para Cloudinary...');
      
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'janice/cache',
        public_id: `cached_${imagemId}_${Date.now()}`,
        resource_type: 'image',
        format: 'png',
        transformation: [
          { quality: 'auto:best' },
          { fetch_format: 'auto' }
        ]
      });
      
      console.log('✅ [CACHE-PREVENTIVO] Upload para Cloudinary concluído');
      console.log('☁️ [CACHE-PREVENTIVO] URL Cloudinary:', uploadResult.secure_url);
      console.log('☁️ [CACHE-PREVENTIVO] Public ID:', uploadResult.public_id);
      
      // Salvar referência no banco se necessário
      if (imagemId) {
        const [mockupId, seed] = imagemId.split('_');
        if (mockupId) {
          const Mockup = require('../models/Mockup');
          const mockup = await Mockup.findById(mockupId);
          
          if (mockup && mockup.metadados) {
            if (!mockup.metadados.urlsCache) {
              mockup.metadados.urlsCache = {};
            }
            
            // Salvar URL cacheada
            mockup.metadados.urlsCache[imagemId] = {
              urlOriginal: imagemUrl,
              urlCloudinary: uploadResult.secure_url,
              publicId: uploadResult.public_id,
              dataCriacao: new Date()
            };
            
            await mockup.save();
            console.log('💾 [CACHE-PREVENTIVO] Referência salva no banco de dados');
          }
        }
      }
      
      res.json({
        success: true,
        message: 'Imagem cacheada com sucesso no Cloudinary',
        urlCacheada: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        cacheado: true
      });
      
    } catch (downloadError) {
      console.error('❌ [CACHE-PREVENTIVO] Erro ao baixar/cachear imagem:', downloadError.message);
      
      // Se falhar, retornar URL original
      res.json({
        success: false,
        message: 'Não foi possível cachear, usando URL original',
        urlCacheada: imagemUrl,
        cacheado: false,
        erro: downloadError.message
      });
    }
    
  } catch (error) {
    console.error('❌ [CACHE-PREVENTIVO] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar cache preventivo',
      error: error.message
    });
  }
});

// Rota para editar imagem da galeria
router.post('/galeria/editar', async (req, res) => {
  try {
    const {
      imagemId,
      imagemUrl,
      categorias,
      instrucoes,
      promptOtimizado,
      metadados
    } = req.body;

    console.log('🎨 [IMAGE-EDITOR] ===== INICIANDO EDIÇÃO DE IMAGEM =====');
    console.log('🎨 [IMAGE-EDITOR] Timestamp:', new Date().toISOString());
    console.log('🎨 [IMAGE-EDITOR] ===== DADOS RECEBIDOS DO FRONTEND =====');
    console.log('🎨 [IMAGE-EDITOR] imagemId:', imagemId);
    console.log('🎨 [IMAGE-EDITOR] imagemUrl completa:', imagemUrl);
    console.log('🎨 [IMAGE-EDITOR] imagemUrl length:', imagemUrl?.length || 0);
    console.log('🎨 [IMAGE-EDITOR] imagemUrl válida?', imagemUrl?.startsWith('http'));
    console.log('🎨 [IMAGE-EDITOR] categorias:', JSON.stringify(categorias, null, 2));
    console.log('🎨 [IMAGE-EDITOR] categorias count:', categorias?.length || 0);
    console.log('🎨 [IMAGE-EDITOR] instrucoes RAW:', `"${instrucoes}"`);
    console.log('🎨 [IMAGE-EDITOR] instrucoes length:', instrucoes?.length || 0);
    console.log('🎨 [IMAGE-EDITOR] instrucoes trimmed:', `"${instrucoes?.trim()}"`);
    console.log('🎨 [IMAGE-EDITOR] promptOtimizado RAW:', `"${promptOtimizado}"`);
    console.log('🎨 [IMAGE-EDITOR] promptOtimizado length:', promptOtimizado?.length || 0);
    console.log('🎨 [IMAGE-EDITOR] metadados:', JSON.stringify(metadados, null, 2));
    console.log('🎨 [IMAGE-EDITOR] ===== FIM DADOS RECEBIDOS =====');

    // Validações básicas
    if (!imagemId) {
      return res.status(400).json({
        success: false,
        message: 'ID da imagem é obrigatório'
      });
    }

    if (!imagemUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem original é obrigatória'
      });
    }

    // 🚀 CORREÇÃO CRÍTICA: Suporte para estilo artístico automático
    console.log('🎨 [STYLE-CHECK] ===== VERIFICANDO TIPO DE EDIÇÃO =====');
    console.log('🎨 [STYLE-CHECK] Tipo:', req.body.tipo);
    console.log('🎨 [STYLE-CHECK] Estilo artístico:', req.body.estiloArtistico);
    
    let promptEdicao = '';
    
    // ✅ PRIORIDADE 1: ESTILO ARTÍSTICO AUTOMÁTICO
    if (req.body.tipo === 'estilo-artistico' && req.body.estiloArtistico) {
      console.log('🎨 [ARTISTIC-STYLE] Modo estilo artístico detectado');
      
      // Mapeamento de estilos para prompts técnicos otimizados
      const stylePrompts = {
        'oil-painting': 'oil painting style, rich textures, classical art technique, painterly brushstrokes',
        'watercolor': 'watercolor painting style, soft flowing colors, artistic brush strokes, translucent effects',
        'sketch': 'pencil sketch style, hand-drawn lines, artistic shading, graphite texture',
        'cartoon': 'cartoon illustration style, vibrant colors, simplified forms, clean vector lines',
        'anime': 'anime art style, clean lines, cel-shaded colors, manga aesthetic',
        'vintage': 'vintage photography style, retro colors, aged effect, nostalgic atmosphere',
        'pop-art': 'pop art style, bold colors, high contrast, graphic design, Andy Warhol inspired',
        'abstract': 'abstract art style, artistic interpretation, creative transformation',
        'minimalist': 'minimalist design style, clean lines, simple forms, reduced color palette'
      };
      
      const estilo = req.body.estiloArtistico.nome;
      const intensidade = req.body.estiloArtistico.intensidade || 50;
      
      console.log('🎨 [ARTISTIC-STYLE] Estilo:', estilo);
      console.log('🎨 [ARTISTIC-STYLE] Intensidade:', intensidade);
      
      // Construir prompt base
      promptEdicao = stylePrompts[estilo] || 'artistic style transformation';
      
      // Aplicar intensidade
      if (intensidade > 80) {
        promptEdicao += ', strong artistic effect, dramatic transformation';
      } else if (intensidade > 60) {
        promptEdicao += ', moderate artistic effect, balanced transformation';
      } else if (intensidade > 40) {
        promptEdicao += ', subtle artistic effect, gentle transformation';
      } else {
        promptEdicao += ', very subtle artistic effect, light transformation';
      }
      
      // Preservação estrutural crítica
      promptEdicao += ', CRITICAL: maintain exactly the same composition, layout, and overall structure. Keep all elements in the same positions. Preserve the original design integrity while applying artistic style.';
      
      console.log('✅ [ARTISTIC-STYLE] Prompt gerado automaticamente:', promptEdicao);
      
    } 
    // ✅ PRIORIDADE 2: EDIÇÃO MANUAL COM VALIDAÇÃO
    else {
      console.log('🎨 [MANUAL-EDIT] Modo edição manual detectado');
      
      // Validação para edição manual
      if ((!categorias || categorias.length === 0) && (!instrucoes || instrucoes.trim() === '') && (!promptOtimizado || promptOtimizado.trim() === '')) {
        return res.status(400).json({
          success: false,
          message: 'Para edição manual: forneça instruções específicas, selecione categorias ou um prompt otimizado'
        });
      }

      // ✅ PRIORIDADE 2A: USAR PROMPT OTIMIZADO COMPLETO DO FRONTEND
      if (promptOtimizado && promptOtimizado.trim() !== '') {
        promptEdicao = promptOtimizado.trim();
        console.log('✅ [MANUAL-EDIT] Usando prompt otimizado do frontend');
        console.log('✅ [MANUAL-EDIT] Comprimento:', promptEdicao.length);
        console.log('✅ [MANUAL-EDIT] Preview:', promptEdicao.substring(0, 100) + '...');
      } 
      // ✅ PRIORIDADE 2B: Fallback para instruções simples
      else if (instrucoes && instrucoes.trim() !== '') {
        promptEdicao = instrucoes.trim();
        console.log('⚠️ [MANUAL-EDIT] Fallback para instruções simples');
        console.log('⚠️ [MANUAL-EDIT] Comprimento:', promptEdicao.length);
      } 
      // ✅ PRIORIDADE 2C: Fallback para categorias
      else if (categorias && categorias.length > 0) {
        let modificacoes = [];
        categorias.forEach(categoria => {
          categoria.modificacoes.forEach(mod => modificacoes.push(mod));
        });
        promptEdicao = modificacoes.join(', ') + '. Keep the same shape, design and composition';
        console.log('⚠️ [MANUAL-EDIT] Fallback para categorias');
      } 
      // ✅ PRIORIDADE 2D: Fallback padrão
      else {
        promptEdicao = 'Make subtle improvements while keeping the same shape, design and composition';
        console.log('⚠️ [MANUAL-EDIT] Usando fallback padrão');
      }
    }

    console.log('✅ [PROMPT-CRITICAL] Prompt final:', promptEdicao);
    console.log('✅ [PROMPT-CRITICAL] Comprimento final:', promptEdicao.length);
    console.log('🎨 [PROMPT-CRITICAL] ===== FIM CORREÇÃO CRÍTICA =====');

    // ✅ VALIDAÇÃO INTELIGENTE COM PRIORIDADE PARA CACHE
    console.log('✅ [IMAGE-CHECK] ===== VALIDAÇÃO INTELIGENTE DE URL =====');
    console.log('✅ [IMAGE-CHECK] URL original:', imagemUrl.substring(0, 50) + '...');
    console.log('✅ [IMAGE-CHECK] Image ID:', imagemId);
    
    let imagemUrlFinal = imagemUrl;
    let usandoCache = false;
    
    // 🚀 PRIORIDADE 1: Verificar se já temos URL cacheada no banco
    if (imagemId) {
      const [mockupId] = imagemId.split('_');
      if (mockupId) {
        console.log('🔍 [IMAGE-CHECK] Verificando cache existente para mockup:', mockupId);
        
        const Mockup = require('../models/Mockup');
        const mockup = await Mockup.findById(mockupId);
        
        if (mockup?.metadados?.urlsCache?.[imagemId]) {
          const cacheInfo = mockup.metadados.urlsCache[imagemId];
          console.log('✅ [IMAGE-CHECK] URL cacheada encontrada no banco!');
          console.log('✅ [IMAGE-CHECK] URL Cloudinary:', cacheInfo.urlCloudinary);
          console.log('✅ [IMAGE-CHECK] Data do cache:', cacheInfo.dataCriacao);
          
          imagemUrlFinal = cacheInfo.urlCloudinary;
          usandoCache = true;
        } else {
          console.log('⚠️ [IMAGE-CHECK] Nenhum cache encontrado no banco para:', imagemId);
        }
      }
    }
    
    // 🚀 PRIORIDADE 2: Se não tem cache, verificar se é URL do Replicate
    if (!usandoCache) {
      const isReplicateUrl = imagemUrl.includes('replicate.delivery') || 
                            imagemUrl.includes('replicate.com');
      
      if (isReplicateUrl) {
        console.log('🔄 [IMAGE-CHECK] URL do Replicate detectada, verificando acessibilidade...');
        
        try {
          // Fazer verificação rápida com timeout curto
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(imagemUrlFinal, { 
            method: 'HEAD',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.error('❌ [IMAGE-CHECK] URL do Replicate expirada (404)');
            
            // Tentar fazer cache emergencial
            console.log('🚨 [IMAGE-CHECK] Tentando cache emergencial...');
            
            return res.status(400).json({
              success: false,
              message: 'A imagem selecionada expirou. Por favor, atualize a galeria e tente novamente.',
              error: 'IMAGE_URL_EXPIRED',
              suggestion: 'As URLs do Replicate expiram em 24 horas. Recomendamos salvar as imagens na galeria logo após a geração.'
            });
          } else {
            console.log('✅ [IMAGE-CHECK] URL do Replicate ainda acessível');
          }
          
        } catch (error) {
          console.error('❌ [IMAGE-CHECK] Erro ao verificar URL do Replicate:', error.message);
          
          // Se foi timeout ou erro de rede, assumir que expirou
          if (error.name === 'AbortError') {
            console.log('⏱️ [IMAGE-CHECK] Timeout na verificação - assumindo URL expirada');
          }
          
          return res.status(400).json({
            success: false,
            message: 'Não foi possível verificar a imagem. Ela pode ter expirado.',
            error: 'IMAGE_URL_CHECK_FAILED',
            suggestion: 'Tente atualizar a página ou selecionar outra imagem.'
          });
        }
      } else {
        // Para URLs não-Replicate (Cloudinary, etc), assumir que estão OK
        console.log('✅ [IMAGE-CHECK] URL não-Replicate, assumindo válida:', imagemUrlFinal.substring(0, 50));
      }
    } else {
      console.log('✅ [IMAGE-CHECK] Usando URL cacheada, pulando validação');
    }
    
    console.log('✅ [IMAGE-CHECK] ===== VALIDAÇÃO CONCLUÍDA =====');
    console.log('✅ [IMAGE-CHECK] URL final:', imagemUrlFinal.substring(0, 50) + '...');
    console.log('✅ [IMAGE-CHECK] Usando cache?', usandoCache);

    // Integração real com Replicate usando Flux 1.1 Pro para edição
    const Replicate = require('replicate');
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('🔄 [IMAGE-EDITOR] Iniciando edição com Flux Kontext Pro...');
    console.log('🔄 [IMAGE-EDITOR] Modelo: black-forest-labs/flux-kontext-pro');
    console.log('🔄 [IMAGE-EDITOR] Prompt:', promptEdicao);
    console.log('🔄 [IMAGE-EDITOR] Imagem URL:', imagemUrl.substring(0, 100) + '...');
    
    // 🔍 LOGS DETALHADOS PRÉ-CHAMADA
    console.log('🔍 [DEBUG-REPLICATE] ===== PRÉ-CHAMADA REPLICATE =====');
    console.log('🔍 [DEBUG-REPLICATE] Modelo exato:', "black-forest-labs/flux-kontext-pro");
    
    // 🔧 CORREÇÃO DEFINITIVA: Usar apenas parâmetros suportados pelo Flux Kontext Pro
    const inputObject = {
      prompt: promptEdicao,
      input_image: imagemUrlFinal, // 🚀 CRÍTICO: Usar URL FINAL (cacheada se disponível)
      aspect_ratio: "match_input_image", // 🔧 NOVO: Manter proporções originais
      output_format: "png",
      safety_tolerance: 2, // 🔧 CORRIGIDO: Máximo permitido para input images
      prompt_upsampling: false, // 🔧 CRÍTICO: Desabilitar para manter controle total do prompt
      seed: Math.floor(Math.random() * 1000000) // 🔧 NOVO: Seed aleatória para variação
    };
    
    console.log('🔧 [REPLICATE-INPUT] ===== INPUT PARA REPLICATE =====');
    console.log('🔧 [REPLICATE-INPUT] Prompt:', promptEdicao.substring(0, 100) + '...');
    console.log('🔧 [REPLICATE-INPUT] Prompt length:', promptEdicao.length);
    console.log('🔧 [REPLICATE-INPUT] Image URL:', imagemUrl.substring(0, 50) + '...');
    console.log('🔧 [REPLICATE-INPUT] Prompt strength:', inputObject.prompt_strength);
    console.log('🔧 [REPLICATE-INPUT] ===== FIM INPUT =====');
    
    const startTime = Date.now();
    
    try {
      // MIGRAÇÃO PARA PADRÃO ASSÍNCRONO - Usar predictions.create() + wait()
      console.log('🔄 [IMAGE-EDITOR] Criando prediction assíncrona...');
      
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-kontext-pro",
        input: inputObject
      });

      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;

      console.log('✅ [IMAGE-EDITOR] Prediction criada:', prediction.id);
      console.log('⏳ [IMAGE-EDITOR] Aguardando conclusão...');
      
      // Aguardar conclusão da prediction
      const result = await replicate.wait(prediction);

      console.log('✅ [IMAGE-EDITOR] Status final:', result.status);
      console.log('✅ [IMAGE-EDITOR] Tempo total:', tempoProcessamento + 'ms');
      
      // Verificar se houve erro na prediction
      if (result.status === 'failed') {
        throw new Error(`Prediction falhou: ${result.error || 'Erro desconhecido'}`);
      }
      
      if (result.status === 'canceled') {
        throw new Error('Prediction foi cancelada');
      }
      
      console.log('✅ [IMAGE-EDITOR] Edição concluída em', tempoProcessamento + 'ms');
      console.log('✅ [IMAGE-EDITOR] Status:', result.status);

      // 🔍 LOGS INVESTIGATIVOS DETALHADOS
      console.log('🔍 [DEBUG-OUTPUT] ===== ANÁLISE DETALHADA DO OUTPUT =====');
      console.log('🔍 [DEBUG-OUTPUT] Tipo exato:', typeof result.output);
      console.log('🔍 [DEBUG-OUTPUT] É string?', typeof result.output === 'string');
      console.log('🔍 [DEBUG-OUTPUT] É array?', Array.isArray(result.output));
      console.log('🔍 [DEBUG-OUTPUT] É null?', result.output === null);
      console.log('🔍 [DEBUG-OUTPUT] É undefined?', result.output === undefined);
      console.log('🔍 [DEBUG-OUTPUT] Length (se aplicável):', result.output?.length);
      console.log('🔍 [DEBUG-OUTPUT] Constructor:', result.output?.constructor?.name);
      console.log('🔍 [DEBUG-OUTPUT] Valor RAW:', result.output);
      console.log('🔍 [DEBUG-OUTPUT] JSON stringify:', JSON.stringify(result.output));

      // CONTEXTO DO MODELO
      console.log('🔍 [DEBUG-MODEL] ===== CONTEXTO DO MODELO =====');
      console.log('🔍 [DEBUG-MODEL] Modelo usado:', result.model);
      console.log('🔍 [DEBUG-MODEL] Versão:', result.version);
      console.log('🔍 [DEBUG-MODEL] Input original:', result.input);
      console.log('🔍 [DEBUG-MODEL] Metrics:', result.metrics);

      // 🔍 LOGS DETALHADOS PROCESSAMENTO
      console.log('🔍 [DEBUG-PROCESSING] ===== PROCESSAMENTO FLEXÍVEL (STRING OU ARRAY) =====');
      console.log('🔍 [DEBUG-PROCESSING] Entrando no processamento...');
      
      // VALIDAÇÃO FLEXÍVEL - Aceita string OU array
      let imagemEditadaUrl;
      
      if (typeof result.output === 'string') {
        console.log('🔍 [DEBUG-PROCESSING] Output é STRING direta');
        console.log('🔍 [DEBUG-PROCESSING] Valor da string:', result.output);
        imagemEditadaUrl = result.output;
      } else if (Array.isArray(result.output) && result.output.length > 0) {
        console.log('🔍 [DEBUG-PROCESSING] Output é ARRAY, extraindo primeiro item');
        console.log('🔍 [DEBUG-PROCESSING] Tamanho do array:', result.output.length);
        console.log('🔍 [DEBUG-PROCESSING] Primeiro item:', result.output[0]);
        imagemEditadaUrl = result.output[0];
      } else {
        console.log('🔍 [DEBUG-PROCESSING] ERRO: Output não é string nem array válido');
        console.log('🔍 [DEBUG-PROCESSING] Tipo recebido:', typeof result.output);
        console.log('🔍 [DEBUG-PROCESSING] É array?', Array.isArray(result.output));
        console.log('🔍 [DEBUG-PROCESSING] Array length:', Array.isArray(result.output) ? result.output.length : 'N/A');
        console.log('🔍 [DEBUG-PROCESSING] Output completo:', result.output);
        throw new Error('Output inválido da prediction - não é string nem array válido: ' + JSON.stringify(result.output));
      }
      
      console.log('🔍 [DEBUG-PROCESSING] URL extraída:', imagemEditadaUrl);
      console.log('🔍 [DEBUG-PROCESSING] Tipo da URL extraída:', typeof imagemEditadaUrl);
      
      // Validar URL final
      if (!imagemEditadaUrl || typeof imagemEditadaUrl !== 'string') {
        console.log('🔍 [DEBUG-PROCESSING] ERRO: URL extraída não é string válida');
        console.log('🔍 [DEBUG-PROCESSING] Valor extraído:', imagemEditadaUrl);
        console.log('🔍 [DEBUG-PROCESSING] Tipo do valor:', typeof imagemEditadaUrl);
        throw new Error('URL inválida extraída: ' + imagemEditadaUrl);
      }
      
      if (!imagemEditadaUrl.startsWith('http')) {
        console.log('🔍 [DEBUG-PROCESSING] ERRO: URL não começa com http');
        console.log('🔍 [DEBUG-PROCESSING] URL recebida:', imagemEditadaUrl);
        throw new Error('URL malformada: ' + imagemEditadaUrl);
      }

      console.log('🔍 [DEBUG-PROCESSING] ===== VALIDAÇÃO FINAL =====');
      console.log('🔍 [DEBUG-PROCESSING] URL final extraída:', imagemEditadaUrl);
      console.log('🔍 [DEBUG-PROCESSING] URL é válida?', imagemEditadaUrl.startsWith('http'));
      console.log('🔍 [DEBUG-PROCESSING] Comprimento da URL:', imagemEditadaUrl.length);
      console.log('✅ [IMAGE-EDITOR] URL extraída da imagem editada:', imagemEditadaUrl);

      res.json({
        success: true,
        message: 'Imagem editada com sucesso',
        imagemEditada: imagemEditadaUrl,
        promptUsado: promptEdicao,
        tempoProcessamento: tempoProcessamento
      });

    } catch (replicateError) {
      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;
      
      console.error('❌ [IMAGE-EDITOR] Erro do Replicate:', replicateError);
      console.error('❌ [IMAGE-EDITOR] Detalhes do erro:', {
        message: replicateError.message,
        stack: replicateError.stack,
        tempoProcessamento: tempoProcessamento
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao processar edição da imagem',
        error: replicateError.message,
        tempoProcessamento: tempoProcessamento
      });
    }

  } catch (error) {
    console.error('❌ [IMAGE-EDITOR] Erro ao editar imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao editar imagem',
      error: error.message
    });
  }
});

// Rota para salvar imagem editada na galeria
router.post('/galeria/salvar-edicao', async (req, res) => {
  try {
    const {
      imagemOriginalId,
      imagemEditadaUrl,
      titulo,
      tipo,
      prompt
    } = req.body;

    console.log('💾 [SAVE-EDIT] ===== SALVANDO IMAGEM EDITADA =====');
    console.log('💾 [SAVE-EDIT] Dados recebidos:', {
      imagemOriginalId,
      imagemEditadaUrl: imagemEditadaUrl ? imagemEditadaUrl.substring(0, 50) + '...' : 'VAZIO',
      titulo,
      tipo,
      prompt: prompt ? prompt.substring(0, 50) + '...' : 'VAZIO'
    });

    // Validações básicas
    if (!imagemOriginalId) {
      return res.status(400).json({
        success: false,
        message: 'ID da imagem original é obrigatório'
      });
    }

    if (!imagemEditadaUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem editada é obrigatória'
      });
    }

    if (!titulo) {
      return res.status(400).json({
        success: false,
        message: 'Título é obrigatório'
      });
    }

    // Extrair mockupId e seed do imagemOriginalId
    const [mockupId, seedOriginal] = imagemOriginalId.split('_');
    
    if (!mockupId || !seedOriginal) {
      return res.status(400).json({
        success: false,
        message: 'ID da imagem original inválido'
      });
    }

    // Buscar o mockup original
    const mockupOriginal = await Mockup.findById(mockupId);
    if (!mockupOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Mockup original não encontrado'
      });
    }

    // Verificar permissões
    if (mockupOriginal.criadoPor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para editar este mockup'
      });
    }

    // Criar nova entrada de imagem editada
    const novaImagemEditada = {
      url: imagemEditadaUrl,
      seed: Date.now(), // ✅ NUMBER - Schema exige Number
      publicId: `edit_${Date.now()}`, // ✅ STRING - Schema exige String obrigatório
      dataSalvamento: new Date()
    };

    // Adicionar à lista de imagens salvas
    if (!mockupOriginal.metadados) {
      mockupOriginal.metadados = {};
    }
    if (!mockupOriginal.metadados.imagensSalvas) {
      mockupOriginal.metadados.imagensSalvas = [];
    }

    mockupOriginal.metadados.imagensSalvas.push(novaImagemEditada);

    // Salvar alterações
    await mockupOriginal.save();

    console.log('✅ [SAVE-EDIT] Imagem editada salva com sucesso');

    res.json({
      success: true,
      message: 'Imagem editada salva na galeria com sucesso',
      data: {
        mockupId: mockupOriginal._id,
        imagemSalva: novaImagemEditada,
        totalImagens: mockupOriginal.metadados.imagensSalvas.length
      }
    });

  } catch (error) {
    console.error('❌ [SAVE-EDIT] Erro ao salvar imagem editada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao salvar imagem editada',
      error: error.message
    });
  }
});

/**
 * ===== NOVA SEÇÃO: ESTILO ARTÍSTICO =====
 * Aplica estilos artísticos às imagens da galeria
 * Reutiliza toda a lógica de análise e otimização existente
 */

// Funções auxiliares para análise de estilo artístico
function analyzeStyleInstructions(estilo, intensidade, preservacao) {
  console.log('🎨 [STYLE-ANALYSIS] Analisando instruções de estilo:', { estilo, intensidade, preservacao });
  
  const analysis = {
    isDestructive: false,
    compatibilityScore: 100,
    warnings: [],
    recommendations: []
  };

  // Verificar compatibilidade do estilo
  const destructiveStyles = ['aquarela', 'sketch', 'cartoon'];
  if (destructiveStyles.includes(estilo) && intensidade > 70) {
    analysis.isDestructive = true;
    analysis.warnings.push('Estilo com alta intensidade pode alterar significativamente a imagem');
  }

  // Verificar preservação
  if (preservacao.includes('texto') && ['aquarela', 'sketch'].includes(estilo)) {
    analysis.compatibilityScore -= 20;
    analysis.warnings.push('Texto pode ficar borrado com este estilo');
    analysis.recommendations.push('Considere usar intensidade menor para preservar texto');
  }

  if (preservacao.includes('logos') && estilo === 'cartoon') {
    analysis.compatibilityScore -= 10;
    analysis.warnings.push('Logos podem perder características corporativas');
  }

  return analysis;
}

function detectArtisticContext(imagemUrl, tipo) {
  console.log('🎨 [ARTISTIC-CONTEXT] Detectando contexto artístico:', { imagemUrl: imagemUrl.substring(0, 50), tipo });
  
  const context = {
    imageType: 'unknown',
    hasText: false,
    hasLogo: false,
    complexity: 'medium',
    recommendedStyles: []
  };

  // Detectar tipo baseado no tipo do mockup
  if (tipo === 'logo') {
    context.imageType = 'logo';
    context.hasLogo = true;
    context.recommendedStyles = ['vetorial', 'minimalista', 'corporativo'];
  } else if (tipo === 'post-social') {
    context.imageType = 'social';
    context.hasText = true;
    context.recommendedStyles = ['pop-art', 'cartoon', 'vintage'];
  } else if (tipo === 'banner') {
    context.imageType = 'banner';
    context.hasText = true;
    context.recommendedStyles = ['moderno', 'corporativo', 'pop-art'];
  } else {
    context.recommendedStyles = ['aquarela', 'oleo', 'sketch'];
  }

  return context;
}

function generateArtisticPrompt(estilo, intensidade, preservacao, contexto, imagemUrl) {
  console.log('🎨 [ARTISTIC-PROMPT] Gerando prompt artístico:', { estilo, intensidade, preservacao, contexto });
  
  // Mapeamento de estilos para prompts técnicos
  const stylePrompts = {
    'aquarela': 'watercolor painting style, soft flowing colors, artistic brush strokes',
    'oleo': 'oil painting style, rich textures, classical art technique',
    'sketch': 'pencil sketch style, hand-drawn lines, artistic shading',
    'cartoon': 'cartoon illustration style, vibrant colors, simplified forms',
    'anime': 'anime art style, clean lines, cel-shaded colors',
    'vintage': 'vintage photography style, retro colors, aged effect',
    'vetorial': 'vector art style, clean geometric shapes, flat colors',
    'pop-art': 'pop art style, bold colors, high contrast, graphic design'
  };

  let prompt = stylePrompts[estilo] || 'artistic style transformation';

  // Ajustar intensidade
  if (intensidade > 80) {
    prompt += ', strong artistic effect, dramatic transformation';
  } else if (intensidade > 50) {
    prompt += ', moderate artistic effect, balanced transformation';
  } else {
    prompt += ', subtle artistic effect, gentle transformation';
  }

  // Adicionar preservação
  if (preservacao.includes('texto')) {
    prompt += ', preserve all text clearly readable';
  }
  if (preservacao.includes('logos')) {
    prompt += ', maintain logo integrity and recognition';
  }
  if (preservacao.includes('faces')) {
    prompt += ', preserve facial features and expressions';
  }

  // Adicionar instruções de preservação estrutural
  prompt += ', keep the same composition, layout and overall structure';

  // Adicionar contexto específico
  if (contexto.imageType === 'logo') {
    prompt += ', maintain professional corporate appearance';
  } else if (contexto.imageType === 'social') {
    prompt += ', optimize for social media engagement';
  }

  console.log('🎨 [ARTISTIC-PROMPT] Prompt gerado:', prompt);
  return prompt;
}

// Rota principal para aplicar estilo artístico
router.post('/galeria/estilo-artistico', async (req, res) => {
  try {
    const {
      imagemId,
      imagemUrl,
      estilo,
      intensidade = 50,
      preservacao = [],
      configuracaoAvancada = {}
    } = req.body;

    console.log('🎨 [ARTISTIC-STYLE] ===== INICIANDO APLICAÇÃO DE ESTILO ARTÍSTICO =====');
    console.log('🎨 [ARTISTIC-STYLE] Timestamp:', new Date().toISOString());
    console.log('🎨 [ARTISTIC-STYLE] Dados recebidos:', {
      imagemId,
      imagemUrl: imagemUrl ? imagemUrl.substring(0, 50) + '...' : 'VAZIO',
      estilo,
      intensidade,
      preservacao,
      configuracaoAvancada
    });

    // Validações básicas
    if (!imagemId) {
      return res.status(400).json({
        success: false,
        message: 'ID da imagem é obrigatório'
      });
    }

    if (!imagemUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem original é obrigatória'
      });
    }

    if (!estilo) {
      return res.status(400).json({
        success: false,
        message: 'Estilo artístico é obrigatório'
      });
    }

    // Validar estilo suportado
    const estilosSuportados = ['aquarela', 'oleo', 'sketch', 'cartoon', 'anime', 'vintage', 'vetorial', 'pop-art'];
    if (!estilosSuportados.includes(estilo)) {
      return res.status(400).json({
        success: false,
        message: 'Estilo artístico não suportado',
        estilosSuportados
      });
    }

    // Extrair informações da imagem
    const [mockupId, seed] = imagemId.split('_');
    if (!mockupId || !seed) {
      return res.status(400).json({
        success: false,
        message: 'ID da imagem inválido'
      });
    }

    // Buscar mockup para obter contexto
    const mockup = await Mockup.findById(mockupId);
    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    // Verificar permissões
    if (mockup.criadoPor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para editar esta imagem'
      });
    }

    // ===== REUTILIZAR LÓGICA DE ANÁLISE EXISTENTE =====
    
    // 1. Analisar instruções de estilo
    const styleAnalysis = analyzeStyleInstructions(estilo, intensidade, preservacao);
    console.log('🎨 [ARTISTIC-STYLE] Análise de estilo:', styleAnalysis);

    // 2. Detectar contexto artístico
    const artisticContext = detectArtisticContext(imagemUrl, mockup.tipo);
    console.log('🎨 [ARTISTIC-STYLE] Contexto artístico:', artisticContext);

    // 3. Gerar prompt otimizado
    const promptOtimizado = generateArtisticPrompt(estilo, intensidade, preservacao, artisticContext, imagemUrl);
    console.log('🎨 [ARTISTIC-STYLE] Prompt otimizado:', promptOtimizado);

    // 4. Validar compatibilidade
    if (styleAnalysis.compatibilityScore < 50) {
      return res.status(400).json({
        success: false,
        message: 'Estilo não compatível com esta imagem',
        warnings: styleAnalysis.warnings,
        recommendations: styleAnalysis.recommendations
      });
    }

    // ===== APLICAR ESTILO COM REPLICATE =====
    
    const Replicate = require('replicate');
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('🎨 [ARTISTIC-STYLE] Iniciando aplicação de estilo com Flux Kontext Pro...');
    
    // Configurar parâmetros baseados na intensidade
    const promptStrength = Math.min(0.3 + (intensidade / 100) * 0.4, 0.7); // 0.3 a 0.7
    
    const inputObject = {
      prompt: promptOtimizado,
      input_image: imagemUrl,
      aspect_ratio: "match_input_image",
      output_format: configuracaoAvancada.outputFormat || "png",
      safety_tolerance: 2,
      prompt_upsampling: false,
      seed: configuracaoAvancada.seed || Math.floor(Math.random() * 1000000)
    };

    console.log('🎨 [ARTISTIC-STYLE] Parâmetros Replicate:', {
      prompt: promptOtimizado.substring(0, 100) + '...',
      promptStrength,
      outputFormat: inputObject.output_format
    });

    const startTime = Date.now();

    try {
      // Criar prediction assíncrona
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-kontext-pro",
        input: inputObject
      });

      console.log('🎨 [ARTISTIC-STYLE] Prediction criada:', prediction.id);
      
      // Aguardar conclusão
      const result = await replicate.wait(prediction);
      
      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;

      console.log('🎨 [ARTISTIC-STYLE] Status final:', result.status);
      console.log('🎨 [ARTISTIC-STYLE] Tempo total:', tempoProcessamento + 'ms');

      if (result.status === 'failed') {
        throw new Error(`Prediction falhou: ${result.error || 'Erro desconhecido'}`);
      }

      if (result.status === 'canceled') {
        throw new Error('Prediction foi cancelada');
      }

      // Extrair URL da imagem com estilo aplicado
      let imagemComEstiloUrl;
      
      if (typeof result.output === 'string') {
        imagemComEstiloUrl = result.output;
      } else if (Array.isArray(result.output) && result.output.length > 0) {
        imagemComEstiloUrl = result.output[0];
      } else {
        throw new Error('Output inválido da prediction');
      }

      if (!imagemComEstiloUrl || !imagemComEstiloUrl.startsWith('http')) {
        throw new Error('URL inválida gerada');
      }

      console.log('✅ [ARTISTIC-STYLE] Estilo aplicado com sucesso:', imagemComEstiloUrl);

      res.json({
        success: true,
        message: `Estilo ${estilo} aplicado com sucesso`,
        data: {
          imagemComEstilo: imagemComEstiloUrl,
          estilo,
          intensidade,
          preservacao,
          promptUsado: promptOtimizado,
          tempoProcessamento,
          analysis: styleAnalysis,
          context: artisticContext
        }
      });

    } catch (replicateError) {
      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;
      
      console.error('❌ [ARTISTIC-STYLE] Erro do Replicate:', replicateError);

      res.status(500).json({
        success: false,
        message: 'Erro ao aplicar estilo artístico',
        error: replicateError.message,
        tempoProcessamento
      });
    }

  } catch (error) {
    console.error('❌ [ARTISTIC-STYLE] Erro ao aplicar estilo artístico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao aplicar estilo artístico',
      error: error.message
    });
  }
});

// Rota para obter recomendações de estilo baseadas na imagem
router.post('/galeria/recomendacoes-estilo', async (req, res) => {
  try {
    const { imagemId, imagemUrl } = req.body;

    if (!imagemId || !imagemUrl) {
      return res.status(400).json({
        success: false,
        message: 'ID e URL da imagem são obrigatórios'
      });
    }

    // Extrair informações da imagem
    const [mockupId] = imagemId.split('_');
    const mockup = await Mockup.findById(mockupId);
    
    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    // Detectar contexto e gerar recomendações
    const context = detectArtisticContext(imagemUrl, mockup.tipo);
    
    const recomendacoes = {
      recomendados: context.recommendedStyles,
      compatibilidade: {
        'aquarela': context.imageType === 'logo' ? 30 : 85,
        'oleo': context.imageType === 'logo' ? 40 : 90,
        'sketch': context.imageType === 'social' ? 80 : 70,
        'cartoon': context.imageType === 'social' ? 95 : 60,
        'anime': context.imageType === 'social' ? 90 : 50,
        'vintage': context.imageType === 'banner' ? 85 : 75,
        'vetorial': context.imageType === 'logo' ? 95 : 70,
        'pop-art': context.imageType === 'social' ? 95 : 80
      },
      avisos: []
    };

    if (context.hasText) {
      recomendacoes.avisos.push('Imagem contém texto - considere preservar legibilidade');
    }

    if (context.hasLogo) {
      recomendacoes.avisos.push('Imagem contém logo - mantenha identidade visual');
    }

    res.json({
      success: true,
      data: {
        contexto: context,
        recomendacoes,
        tipoImagem: mockup.tipo
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar recomendações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar recomendações de estilo',
      error: error.message
    });
  }
});

// Rota para salvar imagem com estilo artístico na galeria
router.post('/galeria/salvar-estilo-artistico', async (req, res) => {
  try {
    const {
      imagemOriginalId,
      imagemComEstiloUrl,
      estilo,
      intensidade,
      preservacao
    } = req.body;

    console.log('💾 [SAVE-ARTISTIC] ===== SALVANDO IMAGEM COM ESTILO ARTÍSTICO =====');

    // Validações básicas
    if (!imagemOriginalId || !imagemComEstiloUrl || !estilo) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios: imagemOriginalId, imagemComEstiloUrl, estilo'
      });
    }

    // Extrair mockupId
    const [mockupId] = imagemOriginalId.split('_');
    const mockup = await Mockup.findById(mockupId);
    
    if (!mockup) {
      return res.status(404).json({
        success: false,
        message: 'Mockup não encontrado'
      });
    }

    // Verificar permissões
    if (mockup.criadoPor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para salvar neste mockup'
      });
    }

    // Criar nova entrada com estilo artístico
    const novaImagemComEstilo = {
      url: imagemComEstiloUrl,
      seed: Date.now(),
      publicId: `artistic_${estilo}_${Date.now()}`,
      dataSalvamento: new Date(),
      metadadosEstilo: {
        estilo,
        intensidade,
        preservacao,
        tipoEdicao: 'estilo-artistico'
      }
    };

    // Adicionar à galeria
    if (!mockup.metadados) {
      mockup.metadados = {};
    }
    if (!mockup.metadados.imagensSalvas) {
      mockup.metadados.imagensSalvas = [];
    }

    mockup.metadados.imagensSalvas.push(novaImagemComEstilo);
    await mockup.save();

    console.log('✅ [SAVE-ARTISTIC] Imagem com estilo artístico salva com sucesso');

    res.json({
      success: true,
      message: `Imagem com estilo ${estilo} salva na galeria`,
      data: {
        mockupId: mockup._id,
        imagemSalva: novaImagemComEstilo,
        totalImagens: mockup.metadados.imagensSalvas.length
      }
    });

  } catch (error) {
    console.error('❌ [SAVE-ARTISTIC] Erro ao salvar imagem com estilo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar imagem com estilo artístico',
      error: error.message
    });
  }
});

module.exports = router;
