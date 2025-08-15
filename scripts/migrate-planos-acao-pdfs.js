/**
 * Script para migrar PDFs de planos de ação da pasta 'janice/analises' para 'janice/planos-acao'
 * 
 * Este script identifica planos de ação com PDFs armazenados na pasta antiga (janice/analises)
 * e os move para a pasta correta (janice/planos-acao), atualizando as URLs no banco de dados.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { cloudinary } = require('../server/config/cloudinary');
const PlanoAcao = require('../server/models/PlanoAcao');

// Configurar conexão com o MongoDB
const connectDB = async () => {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Verifica se a URL do PDF está na pasta antiga
 * @param {string} url - URL do PDF
 * @returns {boolean} - true se estiver na pasta antiga
 */
function isInOldFolder(url) {
  return url && url.includes('/janice/analises/');
}

/**
 * Extrai o public_id de uma URL do Cloudinary
 * @param {string} url - URL do PDF
 * @returns {string|null} - public_id ou null se não for possível extrair
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  
  console.log(`🔍 Extraindo public_id da URL: ${url}`);
  
  try {
    // Regex para extrair o public_id
    const regex = /\/v\d+\/(.+?)(?:\.\w+)?$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      console.log(`✅ Public ID extraído: ${match[1]}`);
      return match[1];
    } else {
      // Tentar regex alternativa para URLs sem versão
      const altRegex = /\/upload\/(.+?)(?:\.\w+)?$/;
      const altMatch = url.match(altRegex);
      
      if (altMatch && altMatch[1]) {
        console.log(`✅ Public ID extraído (formato alternativo): ${altMatch[1]}`);
        return altMatch[1];
      }
      
      console.log(`❌ Não foi possível extrair public_id da URL`);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao extrair public_id:', error);
    return null;
  }
}

/**
 * Migra um PDF para a nova pasta
 * @param {string} oldPublicId - ID público antigo
 * @returns {Promise<string|null>} - Nova URL ou null se falhar
 */
async function migratePDF(oldPublicId) {
  try {
    console.log(`🔄 Migrando PDF: ${oldPublicId}`);
    
    // Verificar se o arquivo existe
    try {
      const resource = await cloudinary.api.resource(oldPublicId, { resource_type: 'raw' });
      console.log(`✅ Arquivo encontrado no Cloudinary: ${resource.public_id}`);
    } catch (error) {
      console.error(`❌ Arquivo não encontrado no Cloudinary: ${oldPublicId}`);
      console.error(`❌ Detalhes do erro:`, error);
      return null;
    }
    
    // Extrair nome do arquivo do public_id
    const parts = oldPublicId.split('/');
    const filename = parts[parts.length - 1];
    
    // Criar novo public_id na pasta correta
    const newPublicId = `janice/planos-acao/${filename}`;
    
    console.log(`🔄 Copiando de ${oldPublicId} para ${newPublicId}`);
    
    // Copiar o arquivo para a nova pasta
    const result = await cloudinary.uploader.rename(
      oldPublicId,
      newPublicId,
      { resource_type: 'raw' }
    );
    
    console.log(`✅ PDF migrado com sucesso para: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Erro ao migrar PDF:`, error);
    return null;
  }
}

/**
 * Função principal para migrar todos os PDFs
 */
async function migrateAllPDFs() {
  try {
    // Conectar ao banco de dados
    await connectDB();
    
    console.log('🔍 Buscando planos de ação com PDFs na pasta antiga...');
    
    // Buscar planos de ação com PDFs na pasta antiga
    const planos = await PlanoAcao.find({
      pdfUrl: { $regex: '/janice/analises/' },
      erro: false,
      emProgresso: false
    });
    
    console.log(`🔍 Encontrados ${planos.length} planos de ação para migrar`);
    
    // Contador de sucesso
    let successCount = 0;
    let errorCount = 0;
    
    // Migrar cada plano
    for (const plano of planos) {
      console.log(`\n🔄 Processando plano: ${plano._id} - ${plano.titulo}`);
      
      if (!plano.pdfUrl) {
        console.log(`⚠️ Plano sem URL de PDF, pulando...`);
        continue;
      }
      
      if (!isInOldFolder(plano.pdfUrl)) {
        console.log(`⚠️ PDF já está na pasta correta: ${plano.pdfUrl}`);
        continue;
      }
      
      // Extrair public_id
      const publicId = extractPublicId(plano.pdfUrl);
      if (!publicId) {
        console.error(`❌ Não foi possível extrair public_id da URL: ${plano.pdfUrl}`);
        errorCount++;
        continue;
      }
      
      // Migrar PDF
      const newUrl = await migratePDF(publicId);
      if (!newUrl) {
        console.error(`❌ Falha ao migrar PDF para o plano: ${plano._id}`);
        errorCount++;
        continue;
      }
      
      // Atualizar URL no banco de dados
      plano.pdfUrl = newUrl;
      await plano.save();
      
      console.log(`✅ Plano atualizado com sucesso: ${plano._id}`);
      successCount++;
    }
    
    console.log(`\n====== MIGRAÇÃO CONCLUÍDA ======`);
    console.log(`✅ ${successCount} planos migrados com sucesso`);
    console.log(`❌ ${errorCount} planos com erro`);
    console.log(`⚠️ ${planos.length - successCount - errorCount} planos pulados`);
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    // Fechar conexão com o banco de dados
    await mongoose.connection.close();
    console.log('🔄 Conexão com o MongoDB fechada');
  }
}

// Executar a migração
migrateAllPDFs();
