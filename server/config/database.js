const mongoose = require('mongoose');

/**
 * Conecta ao banco de dados MongoDB
 * Utiliza a string de conexão definida em MONGODB_URI no arquivo .env ou variáveis de ambiente
 */
const connectDB = async () => {
  try {
    // Verificar se a string de conexão está definida
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('Variável de ambiente MONGODB_URI não está definida. Verifique as configurações.');
    }
    
    console.log('Tentando conectar ao MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Erro ao conectar ao MongoDB: ${error.message}`);
    console.error('Detalhes completos do erro:', error);
    
    // Em ambiente de produção, podemos continuar mesmo com erro de DB
    // para que a aplicação ainda possa servir conteúdo estático
    if (process.env.NODE_ENV === 'production') {
      console.warn('Continuando execução mesmo sem conexão com o banco de dados (modo produção)');
      return null;
    }
    
    throw error;
  }
};

module.exports = connectDB;
