// Garantir que fetch esteja disponível
require('../config/fetch-polyfill');

const Replicate = require('replicate');
const { cloudinary } = require('../config/cloudinary');
const Mockup = require('../models/Mockup');
const progressService = require('./progressService');

/**
 * Serviço para geração de mockups usando Flux 1.1 Pro
 */
class MockupService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Flux 1.1 Pro - Melhor qualidade e handling de texto
    this.modelVersion = "black-forest-labs/flux-1.1-pro";
    
    // Configurações padrão otimizadas para Flux
    this.defaultConfig = {
      output_format: 'webp',
      output_quality: 90,
      safety_tolerance: 2 // Controle de segurança (1-5, sendo 5 mais permissivo)
    };
  }

  /**
   * Gera 4 variações de mockup (otimizado para performance)
   */
  async gerarMockup(mockupData, userInfo = {}) {
    let mockup = null;
    let processId = null;
    
    try {
      console.log('🎨 [MOCKUP-SERVICE] ===== INICIANDO GERAÇÃO DE MOCKUP =====');
      console.log('🔒 [MODELO-VERIFICACAO] Usando modelo:', this.modelVersion);
      console.log('🔒 [CONFIG-VERIFICACAO] Configurações padrão:', JSON.stringify(this.defaultConfig, null, 2));
      console.log('🎨 [MOCKUP-SERVICE] Título:', mockupData.titulo);
      console.log('🎨 [MOCKUP-SERVICE] Cliente:', mockupData.cliente);
      console.log('🎨 [MOCKUP-SERVICE] Configuração completa:', JSON.stringify(mockupData.configuracao, null, 2));
      console.log('🎨 [MOCKUP-SERVICE] Configuração técnica:', JSON.stringify(mockupData.configuracaoTecnica, null, 2));
      console.log('🎨 [MOCKUP-SERVICE] Prompt original:', mockupData.prompt);
      console.log('🎨 [MOCKUP-SERVICE] Informações do usuário:', userInfo);
      
      // Validar dados essenciais antes de criar no banco
      if (!mockupData.titulo || !mockupData.cliente || !mockupData.configuracao || !mockupData.prompt) {
        throw new Error('Dados obrigatórios ausentes para criação do mockup');
      }
      
      // Criar registro no banco com status 'gerando'
      mockup = new Mockup({
        ...mockupData,
        status: 'gerando',
        imagemUrl: '' // Será preenchido após escolha
      });
      
      console.log('🎨 [MOCKUP-SERVICE] Dados do mockup antes de salvar:', {
        titulo: mockup.titulo,
        cliente: mockup.cliente,
        status: mockup.status,
        configuracao: mockup.configuracao,
        prompt: mockup.prompt
      });
      
      await mockup.save();
      console.log('🎨 [MOCKUP-SERVICE] ✅ Mockup criado no banco com sucesso!');
      console.log('🎨 [MOCKUP-SERVICE] ID do mockup:', mockup._id);
      console.log('🎨 [MOCKUP-SERVICE] Status inicial:', mockup.status);
      
      // 🚀 REGISTRAR PROCESSO NO SISTEMA DE PROGRESSO
      processId = mockup._id.toString();
      const processData = {
        id: processId,
        tipo: 'mockup',
        titulo: `Mockup: ${mockupData.titulo}`,
        metadata: {
          tipoArte: mockupData.configuracao.tipoArte,
          aspectRatio: mockupData.configuracao.aspectRatio
        }
      };
      
      progressService.registerActiveProcess(
        mockupData.criadoPor,
        processData,
        userInfo
      );
      
      console.log('📊 [MOCKUP-SERVICE] Processo registrado no sistema de progresso:', processId);
      
      // Gerar prompt otimizado
      const promptOtimizado = mockup.gerarPromptOtimizado();
      console.log('📝 Prompt gerado:', promptOtimizado);
      
      // Configurar parâmetros da API para Flux 1.1 Pro
      const apiParams = {
        prompt: promptOtimizado,
        aspect_ratio: mockup.configuracao.aspectRatio,
        output_format: mockup.configuracaoTecnica.outputFormat || this.defaultConfig.output_format,
        output_quality: mockup.configuracaoTecnica.outputQuality || this.defaultConfig.output_quality,
        safety_tolerance: mockup.configuracaoTecnica.safetyTolerance || this.defaultConfig.safety_tolerance
      };
      
      // Gerar 4 variações com seeds diferentes (otimizado para evitar timeout)
      const variacoes = [];
      const seeds = this._gerarSeeds(4);
      
      console.log('🔄 [MOCKUP-SERVICE] Gerando 4 variações (otimizado para performance)...');
      console.log('🔄 [MOCKUP-SERVICE] Seeds geradas:', seeds);
      console.log('🔄 [MOCKUP-SERVICE] Parâmetros da API:', apiParams);
      
      for (let i = 0; i < 4; i++) {
        const params = {
          ...apiParams,
          seed: seeds[i]
        };
        
        console.log(`⏳ [MOCKUP-SERVICE] ===== GERANDO VARIAÇÃO ${i + 1}/4 =====`);
        console.log(`⏳ [MOCKUP-SERVICE] Seed: ${seeds[i]}`);
        console.log(`🔒 [API-PARAMS] Parâmetros enviados para Replicate:`, JSON.stringify(params, null, 2));
        
        // 🚀 ATUALIZAR PROGRESSO
        const progresso = Math.round((i / 4) * 100);
        progressService.updateActiveProcess(processId, {
          progresso: progresso,
          mensagem: `Gerando variação ${i + 1} de 4...`
        });
        
        const startTime = Date.now();
        console.log(`🔒 [REPLICATE-CALL] Iniciando chamada para modelo: ${this.modelVersion}`);
        console.log(`🔒 [REPLICATE-CALL] Input completo:`, JSON.stringify({ input: params }, null, 2));
        
        const prediction = await this.replicate.run(this.modelVersion, { input: params });
        
        const endTime = Date.now();
        const tempoProcessamento = endTime - startTime;
        
        console.log(`🔒 [REPLICATE-RESPONSE] Resposta completa do Replicate:`, JSON.stringify(prediction, null, 2));
        console.log(`🔒 [TIMING] Tempo real de processamento: ${tempoProcessamento}ms (${(tempoProcessamento/1000).toFixed(2)}s)`);
        console.log(`✅ [MOCKUP-SERVICE] Variação ${i + 1} concluída em ${tempoProcessamento}ms`);
        console.log(`✅ [MOCKUP-SERVICE] URL gerada: ${prediction}`);
        
        // Verificar se a resposta é suspeita (muito rápida)
        if (tempoProcessamento < 5000) { // Menos de 5 segundos
          console.log(`⚠️ [TIMING-ALERT] TEMPO SUSPEITO! Processamento muito rápido: ${tempoProcessamento}ms`);
          console.log(`⚠️ [TIMING-ALERT] Pode indicar cache ou modelo incorreto!`);
        }
        
        // Armazenar URL temporária
        variacoes.push({
          url: prediction, // Flux 1.1 Pro retorna URL diretamente
          seed: seeds[i],
          tempoProcessamento
        });
        
        // 🚀 ATUALIZAR PROGRESSO APÓS CADA VARIAÇÃO
        const progressoAtualizado = Math.round(((i + 1) / 4) * 100);
        progressService.updateActiveProcess(processId, {
          progresso: progressoAtualizado,
          mensagem: `Variação ${i + 1} de 4 concluída`
        });
      }
      
      // Atualizar mockup com URLs temporárias
      const tempoTotal = variacoes.reduce((acc, v) => acc + v.tempoProcessamento, 0);
      
      mockup.metadados = {
        variacoesTemporarias: variacoes.map(v => v.url),
        tempoProcessamento: tempoTotal,
        custo: 0.055 * 4 // $0.055 por imagem Flux 1.1 Pro (4 variações)
      };
      
      // 🚀 CORREÇÃO: Atualizar status para 'concluido'
      mockup.status = 'concluido';
      
      console.log('🎨 [MOCKUP-SERVICE] ===== ATUALIZANDO MOCKUP NO BANCO =====');
      console.log('🎨 [MOCKUP-SERVICE] Metadados:', mockup.metadados);
      console.log('🎨 [MOCKUP-SERVICE] Tempo total de processamento:', tempoTotal + 'ms');
      console.log('🎨 [MOCKUP-SERVICE] URLs das variações:', variacoes.map(v => v.url));
      console.log('🎨 [MOCKUP-SERVICE] Status atualizado para:', mockup.status);
      
      await mockup.save();
      
      // 🚀 FINALIZAR PROCESSO NO SISTEMA DE PROGRESSO
      progressService.completeActiveProcess(processId, {
        resourceId: mockup._id
      });
      
      console.log('🎉 [MOCKUP-SERVICE] ===== TODAS AS VARIAÇÕES GERADAS COM SUCESSO =====');
      console.log('🎉 [MOCKUP-SERVICE] Mockup ID:', mockup._id);
      console.log('🎉 [MOCKUP-SERVICE] Status final:', mockup.status);
      console.log('🎉 [MOCKUP-SERVICE] Total de variações:', variacoes.length);
      console.log('📊 [MOCKUP-SERVICE] Processo finalizado no sistema de progresso:', processId);
      
      const resultado = {
        mockupId: mockup._id,
        variacoes: variacoes,
        promptUsado: promptOtimizado
      };
      
      console.log('🎉 [MOCKUP-SERVICE] Resultado final:', resultado);
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Erro na geração de mockup:', error);
      
      // Atualizar status para erro se o mockup foi criado
      if (mockup && mockup._id) {
        mockup.status = 'erro';
        mockup.mensagemErro = error.message;
        await mockup.save();
      }
      
      // 🚀 MARCAR PROCESSO COMO ERRO NO SISTEMA DE PROGRESSO
      if (processId) {
        progressService.errorActiveProcess(processId, error.message);
        console.log('📊 [MOCKUP-SERVICE] Processo marcado como erro no sistema de progresso:', processId);
      }
      
      throw error;
    }
  }

  /**
   * Salva múltiplas variações escolhidas no Cloudinary
   */
  async salvarMultiplasVariacoes(mockupId, variacoesSelecionadas) {
    try {
      console.log('💾 Salvando múltiplas variações no Cloudinary...');
      console.log('💾 Variações selecionadas:', variacoesSelecionadas.length);
      
      const mockup = await Mockup.findById(mockupId);
      if (!mockup) {
        throw new Error('Mockup não encontrado');
      }
      
      const imagensSalvas = [];
      
      // Processar cada variação selecionada
      for (let i = 0; i < variacoesSelecionadas.length; i++) {
        const variacao = variacoesSelecionadas[i];
        console.log(`💾 Processando variação ${i + 1}/${variacoesSelecionadas.length}...`);
        
        // Download da imagem temporária
        const response = await fetch(variacao.url);
        if (!response.ok) {
          throw new Error(`Erro ao baixar imagem ${i + 1}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        
        // Upload para Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'mockups',
              public_id: `mockup_${mockupId}_var${i + 1}_${Date.now()}`,
              resource_type: 'image',
              format: mockup.configuracaoTecnica.outputFormat || 'webp',
              quality: mockup.configuracaoTecnica.outputQuality || 90
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          uploadStream.end(imageBuffer);
        });
        
        imagensSalvas.push({
          url: uploadResult.secure_url,
          seed: variacao.seed,
          publicId: uploadResult.public_id,
          dataSalvamento: new Date()
        });
        
        console.log(`✅ Variação ${i + 1} salva: ${uploadResult.secure_url}`);
      }
      
      // Atualizar mockup com múltiplas URLs
      mockup.imagemUrl = imagensSalvas[0].url; // Primeira imagem como principal
      mockup.status = 'concluido';
      
      // Adicionar array de imagens salvas aos metadados
      mockup.metadados.imagensSalvas = imagensSalvas;
      
      // Limpar URLs temporárias
      mockup.metadados.variacoesTemporarias = [];
      
      await mockup.save();
      
      console.log('✅ Múltiplas variações salvas com sucesso no Cloudinary');
      console.log('✅ Total de imagens salvas:', imagensSalvas.length);
      
      return {
        mockup: mockup,
        imagensSalvas: imagensSalvas,
        totalSalvas: imagensSalvas.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao salvar múltiplas variações:', error);
      throw error;
    }
  }

  /**
   * Salva a variação escolhida no Cloudinary (método legado - mantido para compatibilidade)
   */
  async salvarVariacaoEscolhida(mockupId, urlEscolhida, seedEscolhida) {
    try {
      console.log('💾 Salvando variação escolhida no Cloudinary...');
      
      const mockup = await Mockup.findById(mockupId);
      if (!mockup) {
        throw new Error('Mockup não encontrado');
      }
      
      // Download da imagem temporária
      const response = await fetch(urlEscolhida);
      if (!response.ok) {
        throw new Error(`Erro ao baixar imagem: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      // Upload para Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'mockups',
            public_id: `mockup_${mockupId}_${Date.now()}`,
            resource_type: 'image',
            format: mockup.configuracaoTecnica.outputFormat || 'webp',
            quality: mockup.configuracaoTecnica.outputQuality || 90
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(imageBuffer);
      });
      
      // Atualizar mockup com URL final
      mockup.imagemUrl = uploadResult.secure_url;
      mockup.status = 'concluido';
      mockup.configuracaoTecnica.seed = seedEscolhida;
      
      // Limpar URLs temporárias (não precisamos mais)
      mockup.metadados.variacoesTemporarias = [];
      
      await mockup.save();
      
      console.log('✅ Mockup salvo com sucesso no Cloudinary');
      
      return {
        mockup: mockup,
        cloudinaryUrl: uploadResult.secure_url
      };
      
    } catch (error) {
      console.error('❌ Erro ao salvar variação:', error);
      throw error;
    }
  }

  /**
   * Lista mockups por cliente
   */
  async listarPorCliente(clienteId) {
    try {
      return await Mockup.getPorCliente(clienteId);
    } catch (error) {
      console.error('❌ Erro ao listar mockups:', error);
      throw error;
    }
  }

  /**
   * Busca mockup por ID
   */
  async buscarPorId(mockupId) {
    try {
      return await Mockup.findById(mockupId)
        .populate('cliente', 'nome')
        .populate('criadoPor', 'nome email');
    } catch (error) {
      console.error('❌ Erro ao buscar mockup:', error);
      throw error;
    }
  }

  /**
   * Deleta mockup (preservando imagens da galeria)
   */
  async deletarMockup(mockupId) {
    try {
      console.log('🗑️ [MOCKUP-DELETE] ===== INICIANDO EXCLUSÃO DE MOCKUP =====');
      console.log('🗑️ [MOCKUP-DELETE] Mockup ID:', mockupId);
      
      const mockup = await Mockup.findById(mockupId);
      if (!mockup) {
        throw new Error('Mockup não encontrado');
      }
      
      console.log('🗑️ [MOCKUP-DELETE] Mockup encontrado:', {
        titulo: mockup.titulo,
        status: mockup.status,
        imagemUrl: mockup.imagemUrl ? 'presente' : 'ausente',
        imagensSalvas: mockup.metadados?.imagensSalvas?.length || 0
      });
      
      // 🚀 CORREÇÃO: Deletar APENAS a imagem principal, preservar galeria
      if (mockup.imagemUrl) {
        const publicId = this._extrairPublicIdCloudinary(mockup.imagemUrl);
        if (publicId) {
          console.log('🗑️ [MOCKUP-DELETE] Removendo imagem principal do Cloudinary:', publicId);
          await cloudinary.uploader.destroy(publicId);
          console.log('✅ [MOCKUP-DELETE] Imagem principal removida do Cloudinary');
        } else {
          console.log('⚠️ [MOCKUP-DELETE] Não foi possível extrair public_id da imagem principal');
        }
      } else {
        console.log('ℹ️ [MOCKUP-DELETE] Mockup não possui imagem principal para deletar');
      }
      
      // 🚀 PRESERVAR IMAGENS DA GALERIA
      const imagensSalvas = mockup.metadados?.imagensSalvas || [];
      if (imagensSalvas.length > 0) {
        console.log(`🖼️ [MOCKUP-DELETE] PRESERVANDO ${imagensSalvas.length} imagens da galeria`);
        console.log('🖼️ [MOCKUP-DELETE] Imagens preservadas:', imagensSalvas.map(img => ({
          url: img.url,
          seed: img.seed,
          dataSalvamento: img.dataSalvamento
        })));
        
        // As imagens da galeria NÃO são deletadas do Cloudinary
        // Elas permanecem disponíveis na galeria do cliente
        console.log('✅ [MOCKUP-DELETE] Imagens da galeria preservadas com sucesso');
      } else {
        console.log('ℹ️ [MOCKUP-DELETE] Nenhuma imagem da galeria para preservar');
      }
      
      // Deletar apenas o registro do mockup do banco de dados
      await Mockup.findByIdAndDelete(mockupId);
      console.log('✅ [MOCKUP-DELETE] Registro do mockup removido do banco de dados');
      
      console.log('🎉 [MOCKUP-DELETE] ===== EXCLUSÃO CONCLUÍDA COM SUCESSO =====');
      console.log('🎉 [MOCKUP-DELETE] Resumo:');
      console.log('🎉 [MOCKUP-DELETE] - Mockup deletado: ✅');
      console.log('🎉 [MOCKUP-DELETE] - Imagem principal removida: ✅');
      console.log(`🎉 [MOCKUP-DELETE] - Imagens da galeria preservadas: ${imagensSalvas.length}`);
      
      return {
        success: true,
        imagensGaleriaPreservadas: imagensSalvas.length,
        message: `Mockup deletado com sucesso. ${imagensSalvas.length} imagens preservadas na galeria.`
      };
      
    } catch (error) {
      console.error('❌ [MOCKUP-DELETE] Erro ao deletar mockup:', error);
      throw error;
    }
  }

  /**
   * Gera seeds aleatórias para variações
   */
  _gerarSeeds(quantidade) {
    const seeds = [];
    for (let i = 0; i < quantidade; i++) {
      seeds.push(Math.floor(Math.random() * 1000000));
    }
    return seeds;
  }

  /**
   * Extrai public_id do Cloudinary de uma URL
   */
  _extrairPublicIdCloudinary(url) {
    try {
      const regex = /\/v\d+\/(.+)\./;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Erro ao extrair public_id:', error);
      return null;
    }
  }

  /**
   * Valida configurações de mockup
   */
  validarConfiguracao(config) {
    const erros = [];
    
    if (!config.tipoArte) {
      erros.push('Tipo de arte é obrigatório');
    }
    
    if (!config.aspectRatio) {
      erros.push('Proporção da imagem é obrigatória');
    }
    
    if (!config.estilo) {
      erros.push('Estilo visual é obrigatório');
    }
    
    if (config.cfg && (config.cfg < 0 || config.cfg > 20)) {
      erros.push('CFG deve estar entre 0 e 20');
    }
    
    if (config.steps && (config.steps < 1 || config.steps > 28)) {
      erros.push('Steps deve estar entre 1 e 28');
    }
    
    return erros;
  }

  /**
   * Gera sugestões de prompt baseadas na configuração
   */
  gerarSugestoesPrompt(configuracao) {
    const sugestoes = [];
    
    switch (configuracao.tipoArte) {
      case 'logo':
        sugestoes.push(
          'minimalist logo for a tech startup, geometric shapes, blue and white',
          'elegant monogram logo, intertwined letters, gold on black background',
          'modern brand symbol, abstract icon, vibrant colors'
        );
        break;
        
      case 'post-social':
        sugestoes.push(
          'Instagram post layout, product photography, clean background',
          'motivational quote design, typography focus, gradient background',
          'lifestyle flat lay, coffee and laptop, warm lighting'
        );
        break;
        
      case 'banner':
        sugestoes.push(
          'web banner for sale promotion, bold typography, call-to-action button',
          'hero section design, modern layout, professional imagery',
          'advertising banner, product showcase, dynamic composition'
        );
        break;
        
      default:
        sugestoes.push(
          'professional design, clean composition, modern aesthetic',
          'creative layout, balanced elements, engaging visual',
          'high-quality mockup, commercial grade, polished finish'
        );
    }
    
    return sugestoes;
  }
}

module.exports = new MockupService();
