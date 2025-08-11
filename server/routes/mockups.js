const express = require('express');
const router = express.Router();
const mockupService = require('../services/mockupService');
const { isAuthenticated } = require('../middleware/auth');
const Mockup = require('../models/Mockup');

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

// Rota para editar imagem da galeria
router.post('/galeria/editar', async (req, res) => {
  try {
    const {
      imagemId,
      imagemUrl,
      categorias,
      instrucoes,
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

    if ((!categorias || categorias.length === 0) && (!instrucoes || instrucoes.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos uma categoria de edição ou instruções personalizadas devem ser fornecidas'
      });
    }

    // 🚀 CORREÇÃO CRÍTICA: Preservar prompt inteligente do frontend
    console.log('🎨 [PROMPT-BUILD] ===== PRESERVANDO PROMPT INTELIGENTE DO FRONTEND =====');
    let promptEdicao = '';

    // 🎯 USAR PROMPT COMPLETO DO FRONTEND SEM MODIFICAÇÕES
    console.log('🎨 [PROMPT-BUILD] Verificando instruções do frontend...');
    console.log('🎨 [PROMPT-BUILD] instrucoes existe?', !!instrucoes);
    console.log('🎨 [PROMPT-BUILD] instrucoes.trim() !== ""?', instrucoes && instrucoes.trim() !== '');
    
    if (instrucoes && instrucoes.trim() !== '') {
      console.log('🎨 [PROMPT-BUILD] ✅ USANDO PROMPT INTELIGENTE COMPLETO DO FRONTEND');
      // 🔥 CORREÇÃO: Usar o prompt EXATAMENTE como veio do frontend
      promptEdicao = instrucoes.trim();
      console.log('🎨 [PROMPT-BUILD] Prompt inteligente preservado:', `"${promptEdicao}"`);
      console.log('🎨 [PROMPT-BUILD] Comprimento do prompt:', promptEdicao.length);
      
      // ❌ REMOVIDO: Lógica que truncava o prompt
      // Não vamos mais verificar palavras de preservação nem modificar o prompt
      console.log('🎨 [PROMPT-BUILD] ✅ Prompt mantido INTEGRALMENTE sem modificações');
    }

    // 🏷️ CATEGORIAS COMO FALLBACK (apenas se não há instruções)
    console.log('🎨 [PROMPT-BUILD] Verificando categorias como fallback...');
    const semInstrucoes = !instrucoes || instrucoes.trim() === '';
    const temCategorias = categorias && categorias.length > 0;
    console.log('🎨 [PROMPT-BUILD] Sem instruções?', semInstrucoes);
    console.log('🎨 [PROMPT-BUILD] Tem categorias?', temCategorias);
    
    if (semInstrucoes && temCategorias) {
      console.log('🎨 [PROMPT-BUILD] Usando categorias como fallback');
      let modificacoes = [];
      categorias.forEach((categoria, index) => {
        console.log(`🎨 [PROMPT-BUILD] Categoria ${index}:`, categoria);
        categoria.modificacoes.forEach((mod, modIndex) => {
          console.log(`🎨 [PROMPT-BUILD] - Modificação ${modIndex}:`, mod);
          modificacoes.push(mod);
        });
      });
      console.log('🎨 [PROMPT-BUILD] Modificações coletadas:', modificacoes);
      promptEdicao = modificacoes.join(', ') + '. Keep the same shape, design and composition';
      console.log('🎨 [PROMPT-BUILD] Prompt de categorias:', `"${promptEdicao}"`);
    }

    // Fallback final se não há instruções nem categorias
    console.log('🎨 [PROMPT-BUILD] Verificando fallback final...');
    const promptVazio = !promptEdicao || promptEdicao.trim() === '';
    console.log('🎨 [PROMPT-BUILD] Prompt está vazio?', promptVazio);
    
    if (promptVazio) {
      console.log('🎨 [PROMPT-BUILD] Usando fallback padrão');
      promptEdicao = 'Make subtle improvements while keeping the same shape, design and composition';
      console.log('🎨 [PROMPT-BUILD] Prompt fallback:', `"${promptEdicao}"`);
    }

    console.log('🎨 [PROMPT-BUILD] ===== PROMPT FINAL PRESERVADO =====');
    console.log('🎨 [PROMPT-BUILD] Prompt final:', `"${promptEdicao}"`);
    console.log('🎨 [PROMPT-BUILD] Comprimento:', promptEdicao.length);
    console.log('🎨 [PROMPT-BUILD] ✅ PROMPT INTELIGENTE PRESERVADO INTEGRALMENTE');
    console.log('🎨 [PROMPT-BUILD] ===== FIM PRESERVAÇÃO PROMPT =====');

    // 🔍 CHECKPOINT ANTES DA VALIDAÇÃO
    console.log('🔍 [CHECKPOINT-1] ===== ANTES DA VALIDAÇÃO DE ACESSIBILIDADE =====');
    console.log('🔍 [CHECKPOINT-1] Timestamp:', new Date().toISOString());
    console.log('🔍 [CHECKPOINT-1] fetch disponível globalmente?', typeof fetch !== 'undefined');
    console.log('🔍 [CHECKPOINT-1] globalThis.fetch disponível?', typeof globalThis.fetch !== 'undefined');
    console.log('🔍 [CHECKPOINT-1] Tipo do fetch:', typeof fetch);
    console.log('🔍 [CHECKPOINT-1] URL a ser testada:', imagemUrl);
    console.log('🔍 [CHECKPOINT-1] URL é string?', typeof imagemUrl === 'string');
    console.log('🔍 [CHECKPOINT-1] URL começa com http?', imagemUrl?.startsWith('http'));

    // 🔍 VALIDAÇÃO DE ACESSIBILIDADE DA IMAGEM ORIGINAL
    console.log('🔍 [IMAGE-VALIDATION] ===== VALIDANDO ACESSIBILIDADE DA IMAGEM =====');
    console.log('🔍 [IMAGE-VALIDATION] URL a ser testada:', imagemUrl);
    console.log('🔍 [IMAGE-VALIDATION] Timestamp validação:', new Date().toISOString());
    
    // Análise básica da URL
    console.log('🔍 [URL-ANALYSIS] ===== ANÁLISE BÁSICA DA URL =====');
    console.log('🔍 [URL-ANALYSIS] URL completa:', imagemUrl);
    console.log('🔍 [URL-ANALYSIS] Comprimento da URL:', imagemUrl.length);
    console.log('🔍 [URL-ANALYSIS] Protocolo HTTPS?', imagemUrl.startsWith('https://'));
    console.log('🔍 [URL-ANALYSIS] É URL do Cloudinary?', imagemUrl.includes('res.cloudinary.com'));
    console.log('🔍 [URL-ANALYSIS] Tem parâmetros de upload?', imagemUrl.includes('/upload/'));
    console.log('🔍 [URL-ANALYSIS] Formato da imagem:', imagemUrl.split('.').pop());
    console.log('🔍 [URL-ANALYSIS] É URL pública?', !imagemUrl.includes('private') && !imagemUrl.includes('authenticated'));
    
    // Teste de acessibilidade com HEAD request
    console.log('🔍 [HEAD-REQUEST] ===== TESTANDO ACESSIBILIDADE COM HEAD =====');
    console.log('🔍 [CHECKPOINT-2] Antes do teste HEAD - fetch disponível?', typeof fetch !== 'undefined');
    
    try {
      console.log('🔍 [HEAD-REQUEST] Iniciando requisição HEAD...');
      const headStartTime = Date.now();
      
      // Verificar se fetch está disponível antes de usar
      if (typeof fetch === 'undefined') {
        throw new Error('fetch não está disponível - polyfill falhou');
      }
      
      const headResponse = await fetch(imagemUrl, { 
        method: 'HEAD',
        timeout: 10000 // 10 segundos timeout
      });
      const headEndTime = Date.now();
      const headDuration = headEndTime - headStartTime;
      
      console.log('🔍 [HEAD-REQUEST] Requisição HEAD concluída com sucesso');
      console.log('🔍 [HEAD-REQUEST] Status da requisição:', headResponse.status);
      console.log('🔍 [HEAD-REQUEST] Status OK?', headResponse.ok);
      console.log('🔍 [HEAD-REQUEST] Tempo de resposta:', headDuration + 'ms');
      console.log('🔍 [HEAD-REQUEST] Content-Type:', headResponse.headers.get('content-type'));
      console.log('🔍 [HEAD-REQUEST] Content-Length:', headResponse.headers.get('content-length'));
      console.log('🔍 [HEAD-REQUEST] Cache-Control:', headResponse.headers.get('cache-control'));
      console.log('🔍 [HEAD-REQUEST] ETag:', headResponse.headers.get('etag'));
      console.log('🔍 [HEAD-REQUEST] Last-Modified:', headResponse.headers.get('last-modified'));
      
      // Verificar se é uma imagem válida
      const contentType = headResponse.headers.get('content-type');
      const isValidImage = contentType && contentType.startsWith('image/');
      console.log('🔍 [HEAD-REQUEST] É imagem válida?', isValidImage);
      console.log('🔍 [HEAD-REQUEST] Tipo de imagem:', contentType);
      
      if (!headResponse.ok) {
        console.log('❌ [HEAD-REQUEST] ERRO: Imagem não acessível - Status:', headResponse.status);
        console.log('❌ [HEAD-REQUEST] Status Text:', headResponse.statusText);
      }
      
      if (!isValidImage) {
        console.log('❌ [HEAD-REQUEST] ERRO: Content-Type não é de imagem:', contentType);
      }
      
    } catch (headError) {
      console.log('❌ [HEAD-REQUEST] ERRO na requisição HEAD:', headError.message);
      console.log('❌ [HEAD-REQUEST] Tipo do erro:', headError.name);
      console.log('❌ [HEAD-REQUEST] Código do erro:', headError.code);
      console.log('❌ [HEAD-REQUEST] fetch disponível no catch?', typeof fetch !== 'undefined');
      console.log('❌ [HEAD-REQUEST] globalThis.fetch disponível?', typeof globalThis.fetch !== 'undefined');
      console.log('❌ [HEAD-REQUEST] Stack do erro:', headError.stack);
      console.log('❌ [HEAD-REQUEST] CONTINUANDO EXECUÇÃO APESAR DO ERRO...');
    }
    
    // Teste de download parcial
    console.log('🔍 [DOWNLOAD-TEST] ===== TESTANDO DOWNLOAD PARCIAL =====');
    try {
      const downloadStartTime = Date.now();
      const downloadResponse = await fetch(imagemUrl, { 
        method: 'GET',
        headers: { 
          'Range': 'bytes=0-1023' // Baixar apenas 1KB para teste
        },
        timeout: 15000 // 15 segundos timeout
      });
      const downloadEndTime = Date.now();
      const downloadDuration = downloadEndTime - downloadStartTime;
      
      console.log('🔍 [DOWNLOAD-TEST] Status do download:', downloadResponse.status);
      console.log('🔍 [DOWNLOAD-TEST] Status OK?', downloadResponse.ok);
      console.log('🔍 [DOWNLOAD-TEST] Tempo de download:', downloadDuration + 'ms');
      console.log('🔍 [DOWNLOAD-TEST] Accept-Ranges:', downloadResponse.headers.get('accept-ranges'));
      console.log('🔍 [DOWNLOAD-TEST] Content-Range:', downloadResponse.headers.get('content-range'));
      console.log('🔍 [DOWNLOAD-TEST] Content-Length:', downloadResponse.headers.get('content-length'));
      
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.arrayBuffer();
        console.log('🔍 [DOWNLOAD-TEST] Bytes baixados:', buffer.byteLength);
        console.log('🔍 [DOWNLOAD-TEST] Download bem-sucedido!');
        
        // Verificar assinatura de arquivo de imagem
        const uint8Array = new Uint8Array(buffer);
        const firstBytes = Array.from(uint8Array.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('🔍 [DOWNLOAD-TEST] Primeiros bytes (hex):', firstBytes);
        
        // Detectar tipo de arquivo pelos magic numbers
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
          console.log('🔍 [DOWNLOAD-TEST] Formato detectado: JPEG');
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
          console.log('🔍 [DOWNLOAD-TEST] Formato detectado: PNG');
        } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
          console.log('🔍 [DOWNLOAD-TEST] Formato detectado: GIF');
        } else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
          console.log('🔍 [DOWNLOAD-TEST] Formato detectado: WEBP');
        } else {
          console.log('🔍 [DOWNLOAD-TEST] Formato não reconhecido ou corrompido');
        }
        
      } else {
        console.log('❌ [DOWNLOAD-TEST] ERRO no download - Status:', downloadResponse.status);
        console.log('❌ [DOWNLOAD-TEST] Status Text:', downloadResponse.statusText);
      }
      
    } catch (downloadError) {
      console.log('❌ [DOWNLOAD-TEST] ERRO no download:', downloadError.message);
      console.log('❌ [DOWNLOAD-TEST] Tipo do erro:', downloadError.name);
      console.log('❌ [DOWNLOAD-TEST] Stack do erro:', downloadError.stack);
    }
    
    // Verificação de CORS e acesso externo
    console.log('🔍 [CORS-CHECK] ===== VERIFICANDO ACESSO EXTERNO =====');
    console.log('🔍 [CORS-CHECK] Domínio da URL:', new URL(imagemUrl).hostname);
    console.log('🔍 [CORS-CHECK] Protocolo:', new URL(imagemUrl).protocol);
    console.log('🔍 [CORS-CHECK] Porta:', new URL(imagemUrl).port || 'padrão');
    console.log('🔍 [CORS-CHECK] Path:', new URL(imagemUrl).pathname);
    console.log('🔍 [CORS-CHECK] Query params:', new URL(imagemUrl).search);
    
    // Teste de acessibilidade externa (simulando acesso do Replicate)
    console.log('🔍 [EXTERNAL-ACCESS] ===== SIMULANDO ACESSO EXTERNO =====');
    try {
      const externalStartTime = Date.now();
      const externalResponse = await fetch(imagemUrl, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Replicate-Image-Processor/1.0',
          'Accept': 'image/*',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        timeout: 20000 // 20 segundos timeout
      });
      const externalEndTime = Date.now();
      const externalDuration = externalEndTime - externalStartTime;
      
      console.log('🔍 [EXTERNAL-ACCESS] Status:', externalResponse.status);
      console.log('🔍 [EXTERNAL-ACCESS] Status OK?', externalResponse.ok);
      console.log('🔍 [EXTERNAL-ACCESS] Tempo total:', externalDuration + 'ms');
      console.log('🔍 [EXTERNAL-ACCESS] Content-Length:', externalResponse.headers.get('content-length'));
      console.log('🔍 [EXTERNAL-ACCESS] Acessível externamente?', externalResponse.ok);
      
      if (externalResponse.ok) {
        console.log('✅ [EXTERNAL-ACCESS] Imagem ACESSÍVEL para serviços externos como Replicate');
      } else {
        console.log('❌ [EXTERNAL-ACCESS] Imagem NÃO ACESSÍVEL para serviços externos');
        console.log('❌ [EXTERNAL-ACCESS] Isso pode explicar por que o Flux não usa a imagem original!');
      }
      
    } catch (externalError) {
      console.log('❌ [EXTERNAL-ACCESS] ERRO no acesso externo:', externalError.message);
      console.log('❌ [EXTERNAL-ACCESS] Isso indica que o Replicate provavelmente não consegue acessar a imagem!');
      console.log('❌ [EXTERNAL-ACCESS] Tipo do erro:', externalError.name);
    }
    
    console.log('🔍 [IMAGE-VALIDATION] ===== FIM DA VALIDAÇÃO =====');

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
    
    // Preparar input object para logs detalhados
    const inputObject = {
      prompt: promptEdicao,
      image: imagemUrl,
      prompt_strength: 0.5, // 🔧 REDUZIDO: Menos agressivo para preservar forma original
      output_format: "png",
      output_quality: 90,
      safety_tolerance: 2
    };
    
    console.log('🔍 [DEBUG-REPLICATE] ===== INPUT DETALHADO =====');
    console.log('🔍 [DEBUG-REPLICATE] prompt:', `"${inputObject.prompt}"`);
    console.log('🔍 [DEBUG-REPLICATE] prompt length:', inputObject.prompt.length);
    console.log('🔍 [DEBUG-REPLICATE] image URL:', inputObject.image);
    console.log('🔍 [DEBUG-REPLICATE] image URL length:', inputObject.image.length);
    console.log('🔍 [DEBUG-REPLICATE] image URL válida?', inputObject.image.startsWith('http'));
    console.log('🔍 [DEBUG-REPLICATE] prompt_strength:', inputObject.prompt_strength);
    console.log('🔍 [DEBUG-REPLICATE] output_format:', inputObject.output_format);
    console.log('🔍 [DEBUG-REPLICATE] output_quality:', inputObject.output_quality);
    console.log('🔍 [DEBUG-REPLICATE] safety_tolerance:', inputObject.safety_tolerance);
    console.log('🔍 [DEBUG-REPLICATE] Input completo JSON:', JSON.stringify(inputObject, null, 2));
    console.log('🔍 [DEBUG-REPLICATE] ===== FIM INPUT DETALHADO =====');
    
    console.log('🔍 [DEBUG-REPLICATE] Timestamp início:', new Date().toISOString());
    console.log('🔍 [DEBUG-REPLICATE] Replicate instance:', replicate ? 'PRESENTE' : 'AUSENTE');
    console.log('🔍 [DEBUG-REPLICATE] API Token presente:', process.env.REPLICATE_API_TOKEN ? 'SIM' : 'NÃO');
    console.log('🔍 [DEBUG-REPLICATE] API Token length:', process.env.REPLICATE_API_TOKEN?.length || 0);
    
    const startTime = Date.now();
    
    try {
      // MIGRAÇÃO PARA PADRÃO ASSÍNCRONO - Usar predictions.create() + wait()
      console.log('🔄 [IMAGE-EDITOR] Criando prediction assíncrona...');
      
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-kontext-pro",
        input: inputObject
      });

      const createTime = Date.now();
      const tempoCreate = createTime - startTime;

      // 🔍 LOGS DETALHADOS PÓS-CREATE
      console.log('🔍 [DEBUG-REPLICATE] ===== PÓS-CREATE PREDICTION =====');
      console.log('🔍 [DEBUG-REPLICATE] Timestamp create:', new Date().toISOString());
      console.log('🔍 [DEBUG-REPLICATE] Tempo para create:', tempoCreate + 'ms');
      console.log('🔍 [DEBUG-REPLICATE] Prediction ID:', prediction.id);
      console.log('🔍 [DEBUG-REPLICATE] Status inicial:', prediction.status);
      console.log('🔍 [DEBUG-REPLICATE] Prediction completa:', prediction);
      
      console.log('⏳ [IMAGE-EDITOR] Aguardando conclusão da prediction...');
      
      // Aguardar conclusão da prediction
      const result = await replicate.wait(prediction);

      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;
      const tempoWait = endTime - createTime;

      // 🔍 LOGS DETALHADOS PÓS-WAIT
      console.log('🔍 [DEBUG-REPLICATE] ===== PÓS-WAIT PREDICTION =====');
      console.log('🔍 [DEBUG-REPLICATE] Timestamp fim:', new Date().toISOString());
      console.log('🔍 [DEBUG-REPLICATE] Tempo total:', tempoProcessamento + 'ms');
      console.log('🔍 [DEBUG-REPLICATE] Tempo wait:', tempoWait + 'ms');
      console.log('🔍 [DEBUG-REPLICATE] Status final:', result.status);
      console.log('🔍 [DEBUG-REPLICATE] Tipo do output:', typeof result.output);
      console.log('🔍 [DEBUG-REPLICATE] É array?', Array.isArray(result.output));
      console.log('🔍 [DEBUG-REPLICATE] Tamanho do output:', Array.isArray(result.output) ? result.output.length : 'N/A');
      console.log('🔍 [DEBUG-REPLICATE] Output completo:', result.output);
      console.log('🔍 [DEBUG-REPLICATE] Result completo:', result);
      
      // 🔍 VERIFICAÇÃO DE ERRO SILENCIOSO
      console.log('🔍 [DEBUG-ERROR] ===== VERIFICAÇÃO DE ERROS =====');
      console.log('🔍 [DEBUG-ERROR] Status:', result.status);
      console.log('🔍 [DEBUG-ERROR] Error:', result.error);
      console.log('🔍 [DEBUG-ERROR] Output válido?', result.output && Array.isArray(result.output) && result.output.length > 0);
      
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

module.exports = router;
