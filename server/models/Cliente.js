const mongoose = require('mongoose');

/**
 * Schema para o modelo Cliente
 * Armazena informações básicas de clientes como nome, CNPJ e logo
 */
const clienteSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'O nome é obrigatório'],
    trim: true
  },
  cnpj: {
    type: String,
    required: [true, 'O CNPJ é obrigatório'],
    trim: true,
    unique: true,
    validate: {
      validator: function(cnpj) {
        // Remove caracteres não numéricos
        const numericCNPJ = cnpj.replace(/\D/g, '');
        // Verifica se tem 14 dígitos
        return numericCNPJ.length === 14;
      },
      message: 'Formato de CNPJ inválido'
    }
  },
  logo: {
    type: String, // URL da imagem armazenada
    default: null
  },
  cor: {
    type: String, // Cor personalizada do cliente (hex)
    default: '#6a5acd', // Cor padrão (primary-color)
    validate: {
      validator: function(cor) {
        // Valida formato hexadecimal (#RRGGBB)
        return /^#[0-9A-Fa-f]{6}$/.test(cor);
      },
      message: 'Formato de cor inválido. Use formato hexadecimal (#RRGGBB)'
    }
  },
  dataCadastro: {
    type: Date,
    default: Date.now
  },
  dataUltimaAtualizacao: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para formatar o CNPJ
clienteSchema.virtual('cnpjFormatado').get(function() {
  if (!this.cnpj) return null;
  const numericCNPJ = this.cnpj.replace(/\D/g, '');
  return numericCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
});

// Middleware para atualizar a data de última atualização
clienteSchema.pre('save', function(next) {
  this.dataUltimaAtualizacao = Date.now();
  next();
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;
