// Garantir que fetch esteja disponível
require('../config/fetch-polyfill');

const Replicate = require('replicate');
const { cloudinary } = require('../config/cloudinary');
const Mockup = require('../models/Mockup');

/**
 * Serviço para geração de mockups usando Stable Diffusion 3
 */
class MockupService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // Versão específica do SD3 para estabilidade
    this.modelVersion = "stability-ai/stable-diffusion-3:8ed5310807da2e35da9f2ec47ad31540279196d721332519f6560de9efe93348";
    
    // Configurações padrão otimizadas
    this.defaultConfig = {
      cfg: 3.5,
      steps: 28,
      output_format: 'webp',
      output_quality: 90
    };
  }

  /**
   * Gera 4 variações de mockup (otimizado para performance)
   */
  async gerarMockup(mockupData) {
    let mockup = null;
    
    try {
      console.log('🎨 [MOCKUP-SERVICE] ===== INICIANDO GERAÇÃO DE MOCKUP =====');
      console.log('🎨 [MOCKUP-SERVICE] Título:', mockupData.titulo);
      console.log('🎨 [MOCKUP-SERVICE] Cliente:', mockupData.cliente);
      console.log('🎨 [MOCKUP-SERVICE] Configuração completa:', JSON.stringify(mockupData.configuracao, null, 2));
      console.log('🎨 [MOCKUP-SERVICE] Configuração técnica:', JSON.stringify(mockupData.configuracaoTecnica, null, 2));
      console.log('🎨 [MOCKUP-SERVICE] Prompt original:', mockupData.prompt);
      
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
      
      // Gerar prompt otimizado
      const promptOtimizado = mockup.gerarPromptOtimizado();
      console.log('📝 Prompt gerado:', promptOtimizado);
      
      // Configurar parâmetros da API
      const apiParams = {
        prompt: promptOtimizado,
        aspect_ratio: mockup.configuracao.aspectRatio,
        cfg: mockup.configuracaoTecnica.cfg || this.defaultConfig.cfg,
        steps: mockup.configuracaoTecnica.steps || this.defaultConfig.steps,
        output_format: mockup.configuracaoTecnica.outputFormat || this.defaultConfig.output_format,
        output_quality: mockup.configuracaoTecnica.outputQuality || this.defaultConfig.output_quality
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
        console.log(`⏳ [MOCKUP-SERVICE] Parâmetros completos:`, params);
        
        const startTime = Date.now();
        console.log(`⏳ [MOCKUP-SERVICE] Iniciando chamada para Replicate...`);
        
        const prediction = await this.replicate.run(this.modelVersion, { input: params });
        
        const endTime = Date.now();
        const tempoProcessamento = endTime - startTime;
        
        console.log(`✅ [MOCKUP-SERVICE] Variação ${i + 1} concluída em ${tempoProcessamento}ms`);
        console.log(`✅ [MOCKUP-SERVICE] Resposta do Replicate:`, prediction);
        console.log(`✅ [MOCKUP-SERVICE] URL gerada: ${prediction[0]}`);
        
        // Armazenar URL temporária
        variacoes.push({
          url: prediction[0], // SD3 retorna array com uma URL
          seed: seeds[i],
          tempoProcessamento
        });
      }
      
      // Atualizar mockup com URLs temporárias
      const tempoTotal = variacoes.reduce((acc, v) => acc + v.tempoProcessamento, 0);
      
      mockup.metadados = {
        variacoesTemporarias: variacoes.map(v => v.url),
        tempoProcessamento: tempoTotal,
        custo: 0.035 * 4 // $0.035 por imagem (4 variações)
      };
      
      // 🚀 CORREÇÃO: Atualizar status para 'concluido'
      mockup.status = 'concluido';
      
      console.log('🎨 [MOCKUP-SERVICE] ===== ATUALIZANDO MOCKUP NO BANCO =====');
      console.log('🎨 [MOCKUP-SERVICE] Metadados:', mockup.metadados);
      console.log('🎨 [MOCKUP-SERVICE] Tempo total de processamento:', tempoTotal + 'ms');
      console.log('🎨 [MOCKUP-SERVICE] URLs das variações:', variacoes.map(v => v.url));
      console.log('🎨 [MOCKUP-SERVICE] Status atualizado para:', mockup.status);
      
      await mockup.save();
      
      console.log('🎉 [MOCKUP-SERVICE] ===== TODAS AS VARIAÇÕES GERADAS COM SUCESSO =====');
      console.log('🎉 [MOCKUP-SERVICE] Mockup ID:', mockup._id);
      console.log('🎉 [MOCKUP-SERVICE] Status final:', mockup.status);
      console.log('🎉 [MOCKUP-SERVICE] Total de variações:', variacoes.length);
      
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
   * Deleta mockup (e remove do Cloudinary)
   */
  async deletarMockup(mockupId) {
    try {
      const mockup = await Mockup.findById(mockupId);
      if (!mockup) {
        throw new Error('Mockup não encontrado');
      }
      
      // Extrair public_id do Cloudinary da URL
      if (mockup.imagemUrl) {
        const publicId = this._extrairPublicIdCloudinary(mockup.imagemUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log('🗑️ Imagem removida do Cloudinary');
        }
      }
      
      await Mockup.findByIdAndDelete(mockupId);
      console.log('✅ Mockup deletado com sucesso');
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar mockup:', error);
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
