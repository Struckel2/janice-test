const mongoose = require('mongoose');

/**
 * Schema para o modelo PlanoAcao
 * Armazena planos de ação gerados com base em transcrições e análises de mercado
 */
const planoAcaoSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  titulo: {
    type: String,
    required: [true, 'O título do plano de ação é obrigatório'],
    trim: true
  },
  documentosBase: {
    transcricoes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transcricao'
    }],
    analises: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analise'
    }]
  },
  conteudo: {
    type: String,
    required: [true, 'O conteúdo do plano de ação é obrigatório']
  },
  pdfUrl: {
    type: String,
    required: false // Não é obrigatório durante o processo inicial
  },
  dataExpiracao: {
    type: Date,
    required: false // Não é obrigatório durante o processo inicial
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  emProgresso: {
    type: Boolean,
    default: false
  },
  erro: {
    type: Boolean,
    default: false
  },
  mensagemErro: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Índice para consultas por cliente
planoAcaoSchema.index({ cliente: 1 });

// Método para verificar se o PDF expirou
planoAcaoSchema.methods.pdfExpirou = function() {
  return this.dataExpiracao && new Date() > this.dataExpiracao;
};

// Método para verificar se é o plano mais recente para um cliente
planoAcaoSchema.statics.getMaisRecentePorCliente = async function(clienteId) {
  return this.findOne({ cliente: clienteId })
    .sort({ dataCriacao: -1 })
    .populate('documentosBase.transcricoes', 'titulo dataCriacao')
    .populate('documentosBase.analises', 'cnpj dataCriacao')
    .exec();
};

// Método para obter todos os planos de um cliente
planoAcaoSchema.statics.getPorCliente = async function(clienteId) {
  return this.find({ cliente: clienteId })
    .sort({ dataCriacao: -1 })
    .populate('documentosBase.transcricoes', 'titulo dataCriacao')
    .populate('documentosBase.analises', 'cnpj dataCriacao')
    .exec();
};

const PlanoAcao = mongoose.model('PlanoAcao', planoAcaoSchema);

module.exports = PlanoAcao;
