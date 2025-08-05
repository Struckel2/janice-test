const mongoose = require('mongoose');

/**
 * Schema para o modelo Analise
 * Armazena análises realizadas para um determinado cliente/CNPJ
 */
const analiseSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: false // Pode ser null para análises avulsas
  },
  cnpj: {
    type: String,
    required: [true, 'O CNPJ é obrigatório'],
    trim: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  conteudo: {
    type: String,
    required: [true, 'O conteúdo da análise é obrigatório']
  },
  pdfUrl: {
    type: String,
    required: false // Não é obrigatório durante o processo de análise
  },
  dataExpiracao: {
    type: Date,
    required: false // Não é obrigatório durante o processo inicial
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

// Índice para consultas por CNPJ
analiseSchema.index({ cnpj: 1 });

// Método para verificar se o PDF expirou
analiseSchema.methods.pdfExpirou = function() {
  return new Date() > this.dataExpiracao;
};

// Método para verificar se é a análise mais recente para um determinado CNPJ
analiseSchema.statics.getMaisRecentePorCNPJ = async function(cnpj) {
  return this.findOne({ cnpj })
    .sort({ dataCriacao: -1 })
    .exec();
};

const Analise = mongoose.model('Analise', analiseSchema);

module.exports = Analise;
