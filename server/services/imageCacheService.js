// Serviço de cache just-in-time para imagens

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const cacheConfig = require('../config/cache');

class ImageCacheService {
  constructor() {
    this.cacheIndex = new Map();
    this.initialized = false;
    this.cleanupTimer = null;
    
    // Inicializar automaticamente
    this.init().catch(error => {
      console.error('❌ [CACHE] Erro na inicialização:', error);
    });
  }
  
  // Inicializar o serviço de cache
  async init() {
    try {
      console.log('🔧 [CACHE] ===== INICIALIZANDO SERVIÇO DE CACHE =====');
      
      // Criar diretório de cache se não existir
      await this.ensureCacheDirectory();
      
      // Carregar índice existente
      await this.loadCacheIndex();
      
      // Iniciar limpeza automática
      this.startCleanupTimer();
      
      this.initialized = true;
      console.log('✅ [CACHE] Serviço de cache inicializado com sucesso');
      console.log(`📁 [CACHE] Diretório: ${cacheConfig.baseDir}`);
      console.log(`📊 [CACHE] Itens no índice: ${this.cacheIndex.size}`);
      
    } catch (error) {
      console.error('❌ [CACHE] Erro na inicialização:', error);
      throw error;
    }
  }
  
  // Garantir que o diretório de cache existe
  async ensureCacheDirectory() {
    try {
      await fs.access(cacheConfig.baseDir);
      console.log('📁 [CACHE] Diretório de cache já existe');
    } catch (error) {
      console.log('📁 [CACHE] Criando diretório de cache...');
      await fs.mkdir(cacheConfig.baseDir, { recursive: true });
      console.log('✅ [CACHE] Diretório de cache criado');
    }
  }
  
  // Carregar índice do cache do disco
  async loadCacheIndex() {
    const indexPath = path.join(cacheConfig.baseDir, cacheConfig.indexFile);
    
    try {
      const indexData = await fs.readFile(indexPath, 'utf8');
      const indexObject = JSON.parse(indexData);
      
      // Converter objeto para Map
      this.cacheIndex = new Map(Object.entries(indexObject));
      
      console.log(`📊 [CACHE] Índice carregado: ${this.cacheIndex.size} itens`);
      
      // Validar entradas do índice
      await this.validateCacheEntries();
      
    } catch (error) {
      console.log('📊 [CACHE] Índice não encontrado, criando novo');
      this.cacheIndex = new Map();
      await this.saveCacheIndex();
    }
  }
  
  // Salvar índice do cache no disco
  async saveCacheIndex() {
    const indexPath = path.join(cacheConfig.baseDir, cacheConfig.indexFile);
    
    try {
      // Converter Map para objeto
      const indexObject = Object.fromEntries(this.cacheIndex);
      
      await fs.writeFile(indexPath, JSON.stringify(indexObject, null, 2));
      console.log(`💾 [CACHE] Índice salvo: ${this.cacheIndex.size} itens`);
      
    } catch (error) {
      console.error('❌ [CACHE] Erro ao salvar índice:', error);
    }
  }
  
  // Validar entradas do cache (remover arquivos que não existem mais)
  async validateCacheEntries() {
    const invalidEntries = [];
    
    for (const [url, entry] of this.cacheIndex) {
      try {
        await fs.access(entry.filePath);
        
        // Verificar se o arquivo não expirou
        const now = Date.now();
        if (now - entry.timestamp > cacheConfig.maxAge) {
          invalidEntries.push(url);
        }
      } catch (error) {
        // Arquivo não existe
        invalidEntries.push(url);
      }
    }
    
    // Remover entradas inválidas
    for (const url of invalidEntries) {
      this.cacheIndex.delete(url);
    }
    
    if (invalidEntries.length > 0) {
      console.log(`🧹 [CACHE] ${invalidEntries.length} entradas inválidas removidas do índice`);
      await this.saveCacheIndex();
    }
  }
  
  // Gerar hash único para URL
  generateUrlHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }
  
  // Obter extensão do arquivo baseada na URL ou Content-Type
  getFileExtension(url, contentType = '') {
    // Tentar extrair da URL primeiro
    const urlPath = new URL(url).pathname;
    const urlExt = path.extname(urlPath).toLowerCase();
    
    if (urlExt && cacheConfig.allowedExtensions.includes(urlExt)) {
      return urlExt;
    }
    
    // Tentar extrair do Content-Type
    if (contentType) {
      const typeMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
      };
      
      const ext = typeMap[contentType.toLowerCase()];
      if (ext) {
        return ext;
      }
    }
    
    // Fallback para .jpg
    return '.jpg';
  }
  
  // Verificar se uma URL está em cache e é válida
  async isInCache(url) {
    if (!this.cacheIndex.has(url)) {
      return false;
    }
    
    const entry = this.cacheIndex.get(url);
    
    try {
      // Verificar se o arquivo existe
      await fs.access(entry.filePath);
      
      // Verificar se não expirou
      const now = Date.now();
      if (now - entry.timestamp > cacheConfig.maxAge) {
        console.log(`⏰ [CACHE] Entrada expirada: ${url}`);
        await this.removeFromCache(url);
        return false;
      }
      
      return true;
    } catch (error) {
      // Arquivo não existe, remover do índice
      console.log(`🗑️ [CACHE] Arquivo não encontrado, removendo do índice: ${url}`);
      this.cacheIndex.delete(url);
      await this.saveCacheIndex();
      return false;
    }
  }
  
  // Obter caminho do arquivo em cache
  getCachedFilePath(url) {
    const entry = this.cacheIndex.get(url);
    return entry ? entry.filePath : null;
  }
  
  // Fazer download e cache de uma imagem
  async cacheImage(url) {
    console.log(`📥 [CACHE] ===== INICIANDO CACHE DE IMAGEM =====`);
    console.log(`📥 [CACHE] URL: ${url}`);
    
    try {
      // Verificar se já está em cache
      if (await this.isInCache(url)) {
        console.log(`✅ [CACHE] Imagem já está em cache: ${url}`);
        return this.getCachedFilePath(url);
      }
      
      console.log(`📥 [CACHE] Fazendo download da imagem...`);
      
      // Fazer download da imagem
      const response = await fetch(url, {
        timeout: cacheConfig.downloadTimeout,
        headers: {
          'User-Agent': 'Janice-ImageCache/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Verificar Content-Type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Tipo de conteúdo inválido: ${contentType}`);
      }
      
      console.log(`📥 [CACHE] Download concluído. Content-Type: ${contentType}`);
      
      // Gerar nome do arquivo
      const urlHash = this.generateUrlHash(url);
      const fileExtension = this.getFileExtension(url, contentType);
      const fileName = `${cacheConfig.filePrefix}${urlHash}${fileExtension}`;
      const filePath = path.join(cacheConfig.baseDir, fileName);
      
      console.log(`💾 [CACHE] Salvando em: ${filePath}`);
      
      // Salvar arquivo
      const buffer = await response.buffer();
      await fs.writeFile(filePath, buffer);
      
      // Adicionar ao índice
      const entry = {
        url: url,
        filePath: filePath,
        fileName: fileName,
        contentType: contentType,
        size: buffer.length,
        timestamp: Date.now()
      };
      
      this.cacheIndex.set(url, entry);
      await this.saveCacheIndex();
      
      console.log(`✅ [CACHE] Imagem cacheada com sucesso`);
      console.log(`📊 [CACHE] Tamanho: ${(buffer.length / 1024).toFixed(2)} KB`);
      console.log(`📊 [CACHE] Total de itens no cache: ${this.cacheIndex.size}`);
      
      return filePath;
      
    } catch (error) {
      console.error(`❌ [CACHE] Erro ao cachear imagem:`, error);
      throw new Error(`Falha no cache da imagem: ${error.message}`);
    }
  }
  
  // Remover uma entrada do cache
  async removeFromCache(url) {
    if (!this.cacheIndex.has(url)) {
      return false;
    }
    
    const entry = this.cacheIndex.get(url);
    
    try {
      // Remover arquivo do disco
      await fs.unlink(entry.filePath);
      console.log(`🗑️ [CACHE] Arquivo removido: ${entry.fileName}`);
    } catch (error) {
      console.log(`⚠️ [CACHE] Arquivo já não existe: ${entry.fileName}`);
    }
    
    // Remover do índice
    this.cacheIndex.delete(url);
    await this.saveCacheIndex();
    
    return true;
  }
  
  // Limpeza automática do cache
  async cleanupCache() {
    console.log(`🧹 [CACHE] ===== INICIANDO LIMPEZA AUTOMÁTICA =====`);
    
    const now = Date.now();
    const expiredEntries = [];
    let totalSize = 0;
    
    // Identificar entradas expiradas e calcular tamanho total
    for (const [url, entry] of this.cacheIndex) {
      if (now - entry.timestamp > cacheConfig.maxAge) {
        expiredEntries.push(url);
      } else {
        totalSize += entry.size || 0;
      }
    }
    
    // Remover entradas expiradas
    for (const url of expiredEntries) {
      await this.removeFromCache(url);
    }
    
    console.log(`🧹 [CACHE] ${expiredEntries.length} entradas expiradas removidas`);
    
    // Verificar se o cache excede o tamanho máximo
    if (totalSize > cacheConfig.maxSize) {
      console.log(`📊 [CACHE] Cache excede tamanho máximo (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
      await this.cleanupBySize();
    }
    
    console.log(`✅ [CACHE] Limpeza concluída. Itens restantes: ${this.cacheIndex.size}`);
  }
  
  // Limpeza por tamanho (remover itens mais antigos)
  async cleanupBySize() {
    const entries = Array.from(this.cacheIndex.entries());
    
    // Ordenar por timestamp (mais antigos primeiro)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let currentSize = entries.reduce((sum, [, entry]) => sum + (entry.size || 0), 0);
    const targetSize = cacheConfig.maxSize * 0.8; // Reduzir para 80% do máximo
    
    let removedCount = 0;
    
    for (const [url, entry] of entries) {
      if (currentSize <= targetSize) {
        break;
      }
      
      await this.removeFromCache(url);
      currentSize -= (entry.size || 0);
      removedCount++;
    }
    
    console.log(`🧹 [CACHE] ${removedCount} itens removidos para reduzir tamanho`);
  }
  
  // Iniciar timer de limpeza automática
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache().catch(error => {
        console.error('❌ [CACHE] Erro na limpeza automática:', error);
      });
    }, cacheConfig.cleanupInterval);
    
    console.log(`⏰ [CACHE] Timer de limpeza iniciado (${cacheConfig.cleanupInterval / 1000 / 60} min)`);
  }
  
  // Parar timer de limpeza
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log(`⏰ [CACHE] Timer de limpeza parado`);
    }
  }
  
  // Obter estatísticas do cache
  async getCacheStats() {
    const stats = {
      totalItems: this.cacheIndex.size,
      totalSize: 0,
      oldestItem: null,
      newestItem: null,
      cacheDirectory: cacheConfig.baseDir
    };
    
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    
    for (const [url, entry] of this.cacheIndex) {
      stats.totalSize += entry.size || 0;
      
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        stats.oldestItem = {
          url: url,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp
        };
      }
      
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
        stats.newestItem = {
          url: url,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp
        };
      }
    }
    
    return stats;
  }
  
  // Limpar todo o cache
  async clearCache() {
    console.log(`🧹 [CACHE] ===== LIMPANDO TODO O CACHE =====`);
    
    const urls = Array.from(this.cacheIndex.keys());
    let removedCount = 0;
    
    for (const url of urls) {
      if (await this.removeFromCache(url)) {
        removedCount++;
      }
    }
    
    console.log(`✅ [CACHE] Cache limpo completamente. ${removedCount} itens removidos`);
    return removedCount;
  }
  
  // Destruir o serviço
  destroy() {
    this.stopCleanupTimer();
    this.initialized = false;
    console.log(`🔧 [CACHE] Serviço de cache destruído`);
  }
}

// Instância singleton
let imageCacheServiceInstance = null;

function getImageCacheService() {
  if (!imageCacheServiceInstance) {
    imageCacheServiceInstance = new ImageCacheService();
  }
  return imageCacheServiceInstance;
}

module.exports = {
  ImageCacheService,
  getImageCacheService
};
