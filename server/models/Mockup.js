const mongoose = require('mongoose');

/**
 * Schema para armazenar mockups gerados com IA
 */
const mockupSchema = new mongoose.Schema({
  // Relacionamento com cliente
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    index: true
  },
  
  // Usuário que criou o mockup
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  
  // Título/nome do mockup
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Configurações de geração
  configuracao: {
    // Tipo de arte
    tipoArte: {
      type: String,
      required: true,
      enum: [
        'logo',
        'post-social',
        'banner',
        'landing-page',
        'material-apresentacao',
        'ilustracao-conceitual',
        'mockup-produto'
      ]
    },
    
    // Proporção da imagem
    aspectRatio: {
      type: String,
      required: true,
      enum: ['1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'],
      default: '1:1'
    },
    
    // Estilo visual
    estilo: {
      type: String,
      required: true,
      enum: [
        'minimalista',
        'corporativo',
        'criativo-artistico',
        'moderno',
        'vintage-retro',
        'tecnologico'
      ]
    },
    
    // Paleta de cores
    paletaCores: {
      type: String,
      enum: [
        'monocromatico',
        'colorido',
        'tons-pasteis',
        'alto-contraste',
        'cores-marca',
        'personalizado'
      ],
      default: 'colorido'
    },
    
    // Elementos visuais
    elementosVisuais: {
      type: String,
      enum: [
        'com-pessoas',
        'apenas-objetos',
        'abstrato-conceitual',
        'com-texto-integrado',
        'icones-simbolos'
      ],
      default: 'apenas-objetos'
    },
    
    // Setor/indústria
    setor: {
      type: String,
      enum: [
        'tecnologia',
        'saude-medicina',
        'educacao',
        'alimentacao',
        'moda-beleza',
        'financas',
        'imobiliario',
        'outros'
      ],
      default: 'outros'
    },
    
    // Público-alvo
    publicoAlvo: {
      type: String,
      enum: [
        'jovem-18-30',
        'adulto-30-50',
        'maduro-50-plus',
        'corporativo-b2b',
        'consumidor-b2c'
      ],
      default: 'consumidor-b2c'
    },
    
    // Mood/sentimento
    mood: {
      type: String,
      enum: [
        'profissional-serio',
        'amigavel-caloroso',
        'inovador-futurista',
        'confiavel-estavel',
        'dinamico-energetico'
      ],
      default: 'profissional-serio'
    },
    
    // Estilo de renderização
    estiloRenderizacao: {
      type: String,
      enum: [
        'fotorrealista',
        'ilustracao-digital',
        'desenho-vetorial',
        'aquarela-artistico',
        '3d-render'
      ],
      default: 'ilustracao-digital'
    }
  },
  
  // Prompt usado para geração
  prompt: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Configurações técnicas da API
  configuracaoTecnica: {
    cfg: {
      type: Number,
      min: 0,
      max: 20,
      default: 3.5
    },
    steps: {
      type: Number,
      min: 1,
      max: 28,
      default: 28
    },
    outputFormat: {
      type: String,
      enum: ['webp', 'jpg', 'png'],
      default: 'webp'
    },
    outputQuality: {
      type: Number,
      min: 0,
      max: 100,
      default: 90
    },
    seed: {
      type: Number
    }
  },
  
  // URL da imagem final no Cloudinary
  imagemUrl: {
    type: String,
    required: true
  },
  
  // Metadados da geração
  metadados: {
    // ID da predição no Replicate
    replicateId: String,
    
    // Tempo de processamento
    tempoProcessamento: Number,
    
    // Custo da geração
    custo: {
      type: Number,
      default: 0.035
    },
    
    // URLs temporárias das 4 variações (para debug)
    variacoesTemporarias: [String]
  },
  
  // Status do mockup
  status: {
    type: String,
    enum: ['gerando', 'concluido', 'erro'],
    default: 'gerando'
  },
  
  // Mensagem de erro (se houver)
  mensagemErro: String,
  
  // Timestamps
  dataCriacao: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  dataAtualizacao: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar dataAtualizacao
mockupSchema.pre('save', function(next) {
  this.dataAtualizacao = new Date();
  next();
});

// Índices compostos para consultas eficientes
mockupSchema.index({ cliente: 1, dataCriacao: -1 });
mockupSchema.index({ criadoPor: 1, dataCriacao: -1 });
mockupSchema.index({ status: 1, dataCriacao: -1 });

// Métodos estáticos
mockupSchema.statics.getPorCliente = function(clienteId) {
  return this.find({ cliente: clienteId })
    .populate('criadoPor', 'nome email')
    .sort({ dataCriacao: -1 });
};

mockupSchema.statics.getRecentes = function(limite = 10) {
  return this.find({ status: 'concluido' })
    .populate('cliente', 'nome')
    .populate('criadoPor', 'nome')
    .sort({ dataCriacao: -1 })
    .limit(limite);
};

// Método para gerar prompt otimizado
mockupSchema.methods.gerarPromptOtimizado = function() {
  const config = this.configuracao;
  let prompt = '';
  
  // Adicionar qualificadores baseados no tipo de arte
  switch (config.tipoArte) {
    case 'logo':
      prompt += 'professional vector logo design, ';
      break;
    case 'post-social':
      prompt += 'social media post design, ';
      break;
    case 'banner':
      prompt += 'web banner design, ';
      break;
    case 'landing-page':
      prompt += 'landing page mockup, ';
      break;
    default:
      prompt += 'professional design, ';
  }
  
  // Adicionar estilo
  switch (config.estilo) {
    case 'minimalista':
      prompt += 'minimalist style, clean lines, simple composition, ';
      break;
    case 'corporativo':
      prompt += 'corporate style, professional, business-oriented, ';
      break;
    case 'moderno':
      prompt += 'modern style, contemporary design, sleek, ';
      break;
    default:
      prompt += `${config.estilo} style, `;
  }
  
  // Adicionar o prompt personalizado
  prompt += this.prompt;
  
  // Adicionar qualificadores de qualidade (substitui negative prompts)
  prompt += ', high quality, professional, clean design, sharp details, well-composed, commercial grade';
  
  return prompt;
};

const Mockup = mongoose.model('Mockup', mockupSchema);

module.exports = Mockup;
