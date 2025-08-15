const cloudinary = require('cloudinary').v2;

// Verificar se as credenciais do Cloudinary estão disponíveis
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Flag para rastrear se o Cloudinary está configurado corretamente
let cloudinaryConfigured = false;

// Configurar o Cloudinary com as credenciais do .env ou variáveis de ambiente
if (cloudName && apiKey && apiSecret) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true // Usar HTTPS
    });
    cloudinaryConfigured = true;
    console.log('Cloudinary configurado com sucesso');
  } catch (error) {
    console.error('Erro ao configurar Cloudinary:', error);
  }
} else {
  console.error('Configuração do Cloudinary incompleta:');
  console.error('- CLOUDINARY_CLOUD_NAME:', cloudName ? 'Configurado' : 'Não configurado');
  console.error('- CLOUDINARY_API_KEY:', apiKey ? 'Configurado' : 'Não configurado');
  console.error('- CLOUDINARY_API_SECRET:', apiSecret ? 'Configurado' : 'Não configurado');
}

/**
 * Configurações e funções utilitárias para o Cloudinary
 */

/**
 * Faz upload de uma imagem para o Cloudinary
 * @param {Buffer} fileBuffer - Buffer do arquivo
 * @param {Object} options - Opções adicionais como pasta, nome do arquivo, etc
 * @returns {Promise<Object>} - Resultado do upload contendo URL e outras informações
 */
const uploadImage = async (fileBuffer, options = {}) => {
  // Verificar se o Cloudinary está configurado
  if (!cloudinaryConfigured) {
    console.error('Tentativa de upload para Cloudinary, mas configuração está incompleta');
    
    // Em produção, retornar um objeto com URL dummy para não quebrar a aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('Retornando URL placeholder em vez de fazer upload (modo produção)');
      return {
        secure_url: '/placeholder-image.jpg',
        public_id: 'placeholder',
      };
    }
    
    throw new Error('Cloudinary não está configurado. Verifique as variáveis de ambiente.');
  }
  
  // Configurar opções padrão
  const uploadOptions = {
    folder: options.folder || 'janice/logos',
    public_id: options.public_id,
    resource_type: 'image',
    ...options
  };

  try {
    console.log('Iniciando upload para Cloudinary...');
    
    // Converter o buffer para base64 para upload
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Erro durante upload para Cloudinary:', error);
            return reject(error);
          }
          console.log('Upload para Cloudinary bem-sucedido');
          resolve(result);
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw error;
  }
};

/**
 * Faz upload de um PDF para o Cloudinary
 * @param {Buffer} fileBuffer - Buffer do arquivo PDF
 * @param {Object} options - Opções adicionais como pasta, nome do arquivo, etc
 * @returns {Promise<Object>} - Resultado do upload contendo URL e outras informações
 */
const uploadPDF = async (fileBuffer, options = {}) => {
  // Verificar se o Cloudinary está configurado
  if (!cloudinaryConfigured) {
    console.error('❌ [CLOUDINARY-PDF] Tentativa de upload de PDF para Cloudinary, mas configuração está incompleta');
    
    // Em produção, retornar um objeto com URL dummy para não quebrar a aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ [CLOUDINARY-PDF] Retornando URL placeholder em vez de fazer upload de PDF (modo produção)');
      return {
        secure_url: '/placeholder-pdf.pdf',
        public_id: 'placeholder-pdf',
      };
    }
    
    throw new Error('Cloudinary não está configurado. Verifique as variáveis de ambiente.');
  }
  
  // Configurar opções padrão para PDFs
  const uploadOptions = {
    folder: options.folder || 'janice/pdfs',
    public_id: options.public_id,
    resource_type: 'raw', // Para PDFs, usar 'raw' para URLs públicas
    ...options
  };

  console.log(`🔍 [CLOUDINARY-PDF] Iniciando upload de PDF para Cloudinary...`);
  console.log(`📊 [CLOUDINARY-PDF] Opções de upload:`, {
    folder: uploadOptions.folder,
    public_id: uploadOptions.public_id,
    resource_type: uploadOptions.resource_type,
    format: uploadOptions.format || 'pdf'
  });
  console.log(`📊 [CLOUDINARY-PDF] Tamanho do buffer: ${fileBuffer.length} bytes`);

  try {
    // Converter o buffer para base64 para upload
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ [CLOUDINARY-PDF] Erro durante upload de PDF para Cloudinary:', error);
            console.error('❌ [CLOUDINARY-PDF] Detalhes do erro:', {
              message: error.message,
              code: error.http_code || error.code,
              type: error.name
            });
            return reject(error);
          }
          
          console.log('✅ [CLOUDINARY-PDF] Upload de PDF para Cloudinary bem-sucedido');
          console.log('📊 [CLOUDINARY-PDF] URL gerada:', result.secure_url);
          console.log('📊 [CLOUDINARY-PDF] Public ID:', result.public_id);
          
          // Verificar se a URL gerada é acessível
          fetch(result.secure_url, { method: 'HEAD' })
            .then(response => {
              console.log(`📊 [CLOUDINARY-PDF] Verificação de acesso à URL: ${response.status} ${response.statusText}`);
              if (!response.ok) {
                console.warn(`⚠️ [CLOUDINARY-PDF] A URL gerada pode não ser acessível: ${response.status}`);
              }
            })
            .catch(err => {
              console.warn(`⚠️ [CLOUDINARY-PDF] Erro ao verificar acesso à URL: ${err.message}`);
            });
          
          resolve(result);
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('❌ [CLOUDINARY-PDF] Erro ao fazer upload de PDF para Cloudinary:', error);
    console.error('❌ [CLOUDINARY-PDF] Stack trace:', error.stack);
    throw error;
  }
};

/**
 * Exclui uma imagem do Cloudinary
 * @param {string} publicId - ID público da imagem
 * @returns {Promise<Object>} - Resultado da exclusão
 */
const deleteImage = async (publicId) => {
  // Verificar se o Cloudinary está configurado
  if (!cloudinaryConfigured) {
    console.error('Tentativa de exclusão no Cloudinary, mas configuração está incompleta');
    
    // Em produção, retornar um objeto de sucesso simulado para não quebrar a aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('Retornando resultado simulado de exclusão (modo produção)');
      return { result: 'ok' };
    }
    
    throw new Error('Cloudinary não está configurado. Verifique as variáveis de ambiente.');
  }
  
  try {
    console.log(`Excluindo imagem do Cloudinary (public_id: ${publicId})...`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Exclusão de imagem do Cloudinary concluída:', result);
    return result;
  } catch (error) {
    console.error('Erro ao excluir imagem do Cloudinary:', error);
    
    // Em produção, não propagar o erro para não quebrar o fluxo da aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('Ignorando erro de exclusão do Cloudinary (modo produção)');
      return { result: 'error', error: error.message };
    }
    
    throw error;
  }
};

/**
 * Exclui um PDF do Cloudinary
 * @param {string} publicId - ID público do PDF
 * @returns {Promise<Object>} - Resultado da exclusão
 */
const deletePDF = async (publicId) => {
  // Verificar se o Cloudinary está configurado
  if (!cloudinaryConfigured) {
    console.error('Tentativa de exclusão de PDF no Cloudinary, mas configuração está incompleta');
    
    // Em produção, retornar um objeto de sucesso simulado para não quebrar a aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('Retornando resultado simulado de exclusão de PDF (modo produção)');
      return { result: 'ok' };
    }
    
    throw new Error('Cloudinary não está configurado. Verifique as variáveis de ambiente.');
  }
  
  try {
    console.log(`Excluindo PDF do Cloudinary (public_id: ${publicId})...`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    console.log('Exclusão de PDF do Cloudinary concluída:', result);
    return result;
  } catch (error) {
    console.error('Erro ao excluir PDF do Cloudinary:', error);
    
    // Em produção, não propagar o erro para não quebrar o fluxo da aplicação
    if (process.env.NODE_ENV === 'production') {
      console.warn('Ignorando erro de exclusão de PDF do Cloudinary (modo produção)');
      return { result: 'error', error: error.message };
    }
    
    throw error;
  }
};

/**
 * Extrai o public_id de uma URL do Cloudinary
 * @param {string} url - URL completa da imagem ou arquivo
 * @returns {string|null} - public_id ou null se não for uma URL do Cloudinary
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  console.log(`🔍 [CLOUDINARY] Extraindo public_id da URL: ${url}`);
  
  // Tentar extrair o public_id de uma URL do Cloudinary
  // Formato típico para imagens: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/pasta/nome_arquivo.jpg
  // Formato típico para PDFs: https://res.cloudinary.com/cloud_name/raw/upload/v1234567890/pasta/nome_arquivo.pdf
  try {
    // Regex melhorada para capturar tanto arquivos raw quanto imagens
    // Captura o caminho após o número de versão, sem a extensão
    const regex = /\/v\d+\/(.+?)(?:\.\w+)?$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      console.log(`✅ [CLOUDINARY] Public ID extraído: ${match[1]}`);
      return match[1];
    } else {
      // Tentar regex alternativa para URLs sem versão
      const altRegex = /\/upload\/(.+?)(?:\.\w+)?$/;
      const altMatch = url.match(altRegex);
      
      if (altMatch && altMatch[1]) {
        console.log(`✅ [CLOUDINARY] Public ID extraído (formato alternativo): ${altMatch[1]}`);
        return altMatch[1];
      }
      
      console.log(`❌ [CLOUDINARY] Não foi possível extrair public_id da URL`);
      return null;
    }
  } catch (error) {
    console.error('❌ [CLOUDINARY] Erro ao extrair public_id:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadPDF,
  deleteImage,
  deletePDF,
  getPublicIdFromUrl
};
