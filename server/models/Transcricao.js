const mongoose = require('mongoose');

/**
 * Schema para o modelo Transcricao
 * Armazena transcrições de áudio/vídeo realizadas para um determinado cliente
 */
const transcricaoSchema = new mongoose.Schema({
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
    required: [true, 'O título da transcrição é obrigatório'],
    trim: true
  },
  conteudo: {
    type: String,
    required: [true, 'O conteúdo da transcrição é obrigatório']
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  // Metadados específicos para transcrição
  duracao: {
    type: Number, // duração em segundos
    default: 0
  },
  idioma: {
    type: String,
    default: 'pt-BR'
  },
  nomeArquivoOriginal: {
    type: String,
    required: false
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
transcricaoSchema.index({ cliente: 1 });

// Método para verificar se é a transcrição mais recente para um cliente
transcricaoSchema.statics.getMaisRecentePorCliente = async function(clienteId) {
  return this.findOne({ cliente: clienteId })
    .sort({ dataCriacao: -1 })
    .exec();
};

const Transcricao = mongoose.model('Transcricao', transcricaoSchema);

module.exports = Transcricao;
