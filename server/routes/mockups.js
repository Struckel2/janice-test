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
    console.log('🎨 [IMAGE-EDITOR] Dados recebidos:', {
      imagemId,
      imagemUrl: imagemUrl ? imagemUrl.substring(0, 50) + '...' : 'VAZIO',
      categorias: categorias?.length || 0,
      instrucoes: instrucoes ? instrucoes.substring(0, 50) + '...' : 'VAZIO',
      metadados
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

    if ((!categorias || categorias.length === 0) && (!instrucoes || instrucoes.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos uma categoria de edição ou instruções personalizadas devem ser fornecidas'
      });
    }

    // Construir prompt de edição baseado nas categorias e instruções
    let promptEdicao = '';

    // Processar categorias selecionadas
    if (categorias && categorias.length > 0) {
      const modificacoes = [];
      categorias.forEach(categoria => {
        categoria.modificacoes.forEach(mod => {
          modificacoes.push(mod);
        });
      });
      promptEdicao = modificacoes.join(', ');
    }

    // Adicionar instruções personalizadas
    if (instrucoes && instrucoes.trim() !== '') {
      if (promptEdicao) {
        promptEdicao += ', ' + instrucoes.trim();
      } else {
        promptEdicao = instrucoes.trim();
      }
    }

    // Garantir que o prompt seja conciso e direto
    promptEdicao = promptEdicao.replace(/\n/g, ' ').trim();

    console.log('🎨 [IMAGE-EDITOR] Prompt de edição otimizado:', promptEdicao);

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
    console.log('🔍 [DEBUG-REPLICATE] Input completo:', JSON.stringify({
      prompt: promptEdicao,
      image: imagemUrl,
      prompt_strength: 0.8,
      output_format: "webp",
      output_quality: 90,
      safety_tolerance: 2
    }, null, 2));
    console.log('🔍 [DEBUG-REPLICATE] Timestamp início:', new Date().toISOString());
    console.log('🔍 [DEBUG-REPLICATE] Replicate instance:', replicate ? 'PRESENTE' : 'AUSENTE');
    console.log('🔍 [DEBUG-REPLICATE] API Token presente:', process.env.REPLICATE_API_TOKEN ? 'SIM' : 'NÃO');
    
    const startTime = Date.now();
    
    try {
      // Usar Flux Kontext Pro com a imagem como referência
      const prediction = await replicate.run(
        "black-forest-labs/flux-kontext-pro",
        {
          input: {
            prompt: promptEdicao,
            image: imagemUrl,
            prompt_strength: 0.8, // Força do prompt (0.1-1.0)
            output_format: "webp",
            output_quality: 90,
            safety_tolerance: 2
          }
        }
      );

      const endTime = Date.now();
      const tempoProcessamento = endTime - startTime;

      // 🔍 LOGS DETALHADOS PÓS-CHAMADA
      console.log('🔍 [DEBUG-REPLICATE] ===== PÓS-CHAMADA REPLICATE =====');
      console.log('🔍 [DEBUG-REPLICATE] Timestamp fim:', new Date().toISOString());
      console.log('🔍 [DEBUG-REPLICATE] Tempo de processamento:', tempoProcessamento + 'ms');
      console.log('🔍 [DEBUG-REPLICATE] Tipo da resposta:', typeof prediction);
      console.log('🔍 [DEBUG-REPLICATE] É array?', Array.isArray(prediction));
      console.log('🔍 [DEBUG-REPLICATE] É string?', typeof prediction === 'string');
      console.log('🔍 [DEBUG-REPLICATE] É ReadableStream?', prediction && prediction.constructor && prediction.constructor.name === 'ReadableStream');
      console.log('🔍 [DEBUG-REPLICATE] É objeto?', typeof prediction === 'object' && prediction !== null);
      console.log('🔍 [DEBUG-REPLICATE] Resposta RAW (primeiros 500 chars):', 
        JSON.stringify(prediction).substring(0, 500));
      console.log('🔍 [DEBUG-REPLICATE] Resposta COMPLETA:', prediction);
      
      // 🔍 VERIFICAÇÃO DE ERRO SILENCIOSO
      console.log('🔍 [DEBUG-ERROR] ===== VERIFICAÇÃO DE ERROS =====');
      console.log('🔍 [DEBUG-ERROR] Prediction tem propriedade error?', prediction?.error);
      console.log('🔍 [DEBUG-ERROR] Prediction tem propriedade status?', prediction?.status);
      console.log('🔍 [DEBUG-ERROR] Prediction tem propriedade message?', prediction?.message);
      console.log('🔍 [DEBUG-ERROR] Todas as propriedades:', prediction && typeof prediction === 'object' ? Object.keys(prediction) : 'N/A');
      
      console.log('✅ [IMAGE-EDITOR] Edição concluída em', tempoProcessamento + 'ms');
      console.log('✅ [IMAGE-EDITOR] Tipo da resposta:', typeof prediction);
      console.log('✅ [IMAGE-EDITOR] Resposta completa:', prediction);

      // 🔍 LOGS DETALHADOS PROCESSAMENTO
      console.log('🔍 [DEBUG-PROCESSING] ===== PROCESSANDO RESPOSTA =====');
      console.log('🔍 [DEBUG-PROCESSING] Entrando no processamento...');
      
      // Processar a resposta do Replicate
      let imagemEditadaUrl;
      
      if (typeof prediction === 'string') {
        console.log('🔍 [DEBUG-PROCESSING] Resposta é STRING');
        console.log('🔍 [DEBUG-PROCESSING] Valor da string:', prediction);
        imagemEditadaUrl = prediction;
      } else if (Array.isArray(prediction) && prediction.length > 0) {
        console.log('🔍 [DEBUG-PROCESSING] Resposta é ARRAY');
        console.log('🔍 [DEBUG-PROCESSING] Tamanho do array:', prediction.length);
        console.log('🔍 [DEBUG-PROCESSING] Primeiro item:', prediction[0]);
        imagemEditadaUrl = prediction[0];
      } else if (prediction && prediction.url) {
        console.log('🔍 [DEBUG-PROCESSING] Resposta é OBJETO com URL');
        console.log('🔍 [DEBUG-PROCESSING] URL encontrada:', prediction.url);
        imagemEditadaUrl = prediction.url;
      } else {
        console.log('🔍 [DEBUG-PROCESSING] FORMATO INESPERADO!');
        console.log('🔍 [DEBUG-PROCESSING] Tipo:', typeof prediction);
        console.log('🔍 [DEBUG-PROCESSING] É array?', Array.isArray(prediction));
        console.log('🔍 [DEBUG-PROCESSING] Tem propriedade url?', prediction && prediction.url);
        console.log('🔍 [DEBUG-PROCESSING] Valor completo:', prediction);
        throw new Error('Formato de resposta inesperado do Replicate: ' + JSON.stringify(prediction));
      }

      console.log('🔍 [DEBUG-PROCESSING] URL final extraída:', imagemEditadaUrl);
      console.log('🔍 [DEBUG-PROCESSING] Tipo da URL extraída:', typeof imagemEditadaUrl);
      console.log('🔍 [DEBUG-PROCESSING] URL é válida?', imagemEditadaUrl && imagemEditadaUrl.startsWith('http'));
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
      seed: `edit_${Date.now()}`, // Seed único para edição
      dataSalvamento: new Date(),
      publicId: null // Será preenchido se salvar no Cloudinary
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
