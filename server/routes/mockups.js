const express = require('express');
const router = express.Router();
const mockupService = require('../services/mockupService');
const { isAuthenticated } = require('../middleware/auth');

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

    // Iniciar geração assíncrona (não aguardar conclusão)
    mockupService.gerarMockup(mockupData)
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
    const Mockup = require('../models/Mockup');

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

module.exports = router;
