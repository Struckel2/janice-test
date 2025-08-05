const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  nome: {
    type: String,
    required: true
  },
  foto: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  ativo: {
    type: Boolean,
    default: true // Todos os usuários são ativados automaticamente
  },
  primeiroLogin: {
    type: Date,
    default: Date.now
  },
  ultimoLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware para definir admin automático e ativar usuário
usuarioSchema.pre('save', function(next) {
  // Se é o email do admin, definir como admin e ativo
  if (this.email === process.env.ADMIN_EMAIL) {
    this.role = 'admin';
    this.ativo = true;
  }
  
  // Por enquanto, todos os usuários ficam ativos (futuramente será sistema de aprovação)
  if (this.isNew) {
    this.ativo = true;
  }
  
  next();
});

// Método para verificar se é admin
usuarioSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Método para verificar se está ativo
usuarioSchema.methods.isAtivo = function() {
  return this.ativo === true;
};

// Método para atualizar último login
usuarioSchema.methods.updateUltimoLogin = function() {
  this.ultimoLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('Usuario', usuarioSchema);
