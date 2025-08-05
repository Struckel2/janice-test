const mongoose = require('mongoose');

// Configuração para banco em memória (apenas para desenvolvimento/teste)
const connectDB = async () => {
  try {
    console.log('🔄 Conectando ao banco em memória...');
    
    // Usar banco em memória se MongoDB não estiver disponível
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/janice';
    
    const conn = await mongoose.connect(mongoUri, {
      // Remover opções depreciadas
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.log('❌ Erro ao conectar ao MongoDB:', error.message);
    console.log('🔄 Tentando usar banco em memória...');
    
    try {
      // Fallback para banco em memória
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      const mongod = new MongoMemoryServer();
      await mongod.start();
      const uri = mongod.getUri();
      
      const conn = await mongoose.connect(uri);
      console.log('✅ Banco em memória conectado com sucesso!');
      console.log('⚠️  ATENÇÃO: Dados serão perdidos ao reiniciar o servidor');
      
      return conn;
    } catch (memoryError) {
      console.error('❌ Erro ao conectar ao banco em memória:', memoryError.message);
      console.log('📋 Para resolver permanentemente, instale o MongoDB seguindo CONFIGURAR_MONGODB.md');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
