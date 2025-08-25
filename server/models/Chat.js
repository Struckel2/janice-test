const mongoose = require('mongoose');

/**
 * Schema para o modelo Chat
 * Armazena histórico de conversas de chat para clientes
 */
const chatSchema = new mongoose.Schema({
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
  tipo: {
    type: String,
    enum: ['strategy', 'client'],
    required: true
  },
  documentosBase: {
    analises: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analise'
    }],
    planosAcao: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanoAcao'
    }]
  },
  mensagens: [{
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  dataUltimaInteracao: {
    type: Date,
    default: Date.now
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para consultas comuns
chatSchema.index({ cliente: 1, tipo: 1 });
chatSchema.index({ dataCriacao: -1 });
chatSchema.index({ dataUltimaInteracao: -1 });

// Método para adicionar uma mensagem ao chat
chatSchema.methods.adicionarMensagem = function(role, content) {
  this.mensagens.push({
    role,
    content,
    timestamp: new Date()
  });
  
  this.dataUltimaInteracao = new Date();
  return this.save();
};

// Método para obter o histórico de mensagens formatado para a API do OpenRouter
chatSchema.methods.obterHistoricoFormatado = function(limite = 10) {
  // Obter as últimas X mensagens
  const mensagensRecentes = this.mensagens
    .slice(-limite)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  
  return mensagensRecentes;
};

// Método estático para obter chats de um cliente
chatSchema.statics.obterChatsCliente = function(clienteId) {
  return this.find({ cliente: clienteId, ativo: true })
    .sort({ dataUltimaInteracao: -1 })
    .populate('documentosBase.analises', 'cnpj dataCriacao')
    .populate('documentosBase.planosAcao', 'titulo dataCriacao')
    .exec();
};

// Método estático para obter um chat específico
chatSchema.statics.obterChatPorId = function(chatId) {
  return this.findById(chatId)
    .populate('cliente', 'nome cnpj')
    .populate('documentosBase.analises', 'cnpj conteudo dataCriacao')
    .populate('documentosBase.planosAcao', 'titulo conteudo dataCriacao')
    .exec();
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
