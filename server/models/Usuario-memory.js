// Modelo de usuário temporário em memória (sem MongoDB)
// Para uso apenas durante desenvolvimento/teste

class UsuarioMemory {
  constructor(data) {
    this._id = data._id || this.generateId();
    this.googleId = data.googleId;
    this.email = data.email;
    this.nome = data.nome;
    this.foto = data.foto || null;
    this.role = data.role || (data.email === process.env.ADMIN_EMAIL ? 'admin' : 'user');
    this.ativo = data.ativo !== undefined ? data.ativo : true; // Todos os usuários são ativados automaticamente
    this.criadoEm = data.criadoEm || new Date();
    this.ultimoLogin = data.ultimoLogin || new Date();
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  isAdmin() {
    return this.role === 'admin';
  }

  isAtivo() {
    return this.ativo === true;
  }

  async updateUltimoLogin() {
    this.ultimoLogin = new Date();
    return this;
  }

  async save() {
    // Salvar no "banco" em memória
    const index = UsuarioMemory.usuarios.findIndex(u => u._id === this._id);
    if (index >= 0) {
      UsuarioMemory.usuarios[index] = this;
    } else {
      UsuarioMemory.usuarios.push(this);
    }
    return this;
  }

  // Métodos estáticos para simular operações do MongoDB
  static async findOne(query) {
    return UsuarioMemory.usuarios.find(user => {
      if (query.googleId && user.googleId === query.googleId) return true;
      if (query.email && user.email === query.email) return true;
      if (query._id && user._id === query._id) return true;
      return false;
    });
  }

  static async findById(id) {
    return UsuarioMemory.usuarios.find(user => user._id === id);
  }

  static async find(query = {}) {
    if (Object.keys(query).length === 0) {
      return UsuarioMemory.usuarios;
    }
    return UsuarioMemory.usuarios.filter(user => {
      return Object.keys(query).every(key => user[key] === query[key]);
    });
  }
}

// "Banco de dados" em memória
UsuarioMemory.usuarios = [];

module.exports = UsuarioMemory;
