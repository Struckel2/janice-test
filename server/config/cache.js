// Configurações do sistema de cache de imagens

const path = require('path');
const os = require('os');

const cacheConfig = {
  // Diretório base para cache (usar temp do sistema)
  baseDir: path.join(os.tmpdir(), 'janice-image-cache'),
  
  // Tempo de vida máximo dos arquivos em cache (24 horas)
  maxAge: 24 * 60 * 60 * 1000, // 24 horas em milliseconds
  
  // Tamanho máximo do cache (100MB)
  maxSize: 100 * 1024 * 1024, // 100MB em bytes
  
  // Extensões de arquivo permitidas
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  
  // Timeout para requisições de download (30 segundos)
  downloadTimeout: 30000,
  
  // Intervalo de limpeza automática (1 hora)
  cleanupInterval: 60 * 60 * 1000, // 1 hora em milliseconds
  
  // Prefixo para arquivos de cache
  filePrefix: 'janice_cache_',
  
  // Arquivo de índice do cache
  indexFile: 'cache_index.json'
};

module.exports = cacheConfig;
