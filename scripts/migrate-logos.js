/**
 * Script para migrar logos armazenados localmente para o Cloudinary
 * Executar com: node scripts/migrate-logos.js
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { uploadImage } = require('../server/config/cloudinary');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelo Cliente
const Cliente = require('../server/models/Cliente');

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado para migração');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Função principal para migrar logos locais para o Cloudinary
 */
const migrateLogos = async () => {
  try {
    // Conectar ao banco de dados
    await connectDB();
    
    console.log('Iniciando migração de logos...');
    
    // Buscar todos os clientes com logo que começam com /uploads/
    const clientes = await Cliente.find({ 
      logo: { $ne: null, $regex: '^/uploads/' }
    });
    
    console.log(`Encontrados ${clientes.length} clientes com logos locais para migrar`);
    
    // Para cada cliente, fazer upload do logo para o Cloudinary
    for (const cliente of clientes) {
      try {
        const logoPath = path.join(__dirname, '..', 'public', cliente.logo);
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(logoPath)) {
          console.log(`Logo não encontrado para cliente ${cliente.nome}: ${logoPath}`);
          continue;
        }
        
        // Ler o arquivo como buffer
        const fileBuffer = fs.readFileSync(logoPath);
        
        // Fazer upload para o Cloudinary
        const result = await uploadImage(fileBuffer, {
          folder: 'janice/logos',
          public_id: `logo-migrado-${cliente._id}`
        });
        
        // Atualizar o cliente com a nova URL
        await Cliente.findByIdAndUpdate(cliente._id, {
          logo: result.secure_url
        });
        
        console.log(`Logo migrado com sucesso para cliente ${cliente.nome}`);
      } catch (error) {
        console.error(`Erro ao migrar logo para cliente ${cliente.nome}:`, error);
      }
    }
    
    console.log('Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
};

// Executar migração
migrateLogos();
