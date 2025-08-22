/**
 * Polyfill para garantir que fetch funcione corretamente em todos os ambientes
 * com suporte adequado a UTF-8 e outros encodings
 */

// Configurar encoding padrão para Node.js
process.env.LANG = 'en_US.UTF-8';
process.env.LC_ALL = 'en_US.UTF-8';
process.env.LC_CTYPE = 'en_US.UTF-8';

// Verificar se fetch já está disponível globalmente
if (typeof globalThis.fetch === 'undefined') {
  console.log('⚠️ Fetch não encontrado globalmente, usando node-fetch...');
  
  try {
    // Importar node-fetch
    const nodeFetch = require('node-fetch');
    
    // Wrapper para garantir headers de encoding corretos
    const fetchWithEncoding = (url, options = {}) => {
      // Garantir que options existe
      options = options || {};
      
      // Garantir que headers existe
      options.headers = options.headers || {};
      
      // Adicionar Accept-Charset se não existir
      if (!options.headers['Accept-Charset']) {
        options.headers['Accept-Charset'] = 'utf-8';
      }
      
      // Se for uma requisição com body, garantir Content-Type com charset
      if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json; charset=utf-8';
      } else if (options.body && options.headers['Content-Type'] && 
                !options.headers['Content-Type'].includes('charset=')) {
        options.headers['Content-Type'] += '; charset=utf-8';
      }
      
      return nodeFetch(url, options);
    };
    
    // Definir fetch globalmente com o wrapper
    globalThis.fetch = fetchWithEncoding;
    globalThis.Headers = nodeFetch.Headers;
    globalThis.Request = nodeFetch.Request;
    globalThis.Response = nodeFetch.Response;
    
    console.log('✅ node-fetch configurado com sucesso (com suporte UTF-8)');
  } catch (error) {
    console.error('❌ Erro ao configurar node-fetch:', error);
    throw new Error('Falha ao configurar fetch: ' + error.message);
  }
} else {
  console.log('✅ Fetch já disponível globalmente');
  
  // Mesmo com fetch nativo, podemos fazer um monkey patch para garantir encoding
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => {
    // Garantir que options existe
    options = options || {};
    
    // Garantir que headers existe
    options.headers = options.headers || {};
    
    // Adicionar Accept-Charset se não existir
    if (!options.headers['Accept-Charset']) {
      options.headers['Accept-Charset'] = 'utf-8';
    }
    
    // Se for uma requisição com body, garantir Content-Type com charset
    if (options.body && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json; charset=utf-8';
    } else if (options.body && options.headers['Content-Type'] && 
              !options.headers['Content-Type'].includes('charset=')) {
      options.headers['Content-Type'] += '; charset=utf-8';
    }
    
    return originalFetch(url, options);
  };
  
  console.log('✅ Fetch nativo aprimorado com suporte UTF-8');
}

module.exports = {};
