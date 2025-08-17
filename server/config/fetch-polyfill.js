/**
 * Polyfill para garantir que fetch funcione corretamente em todos os ambientes
 */

// Verificar se fetch já está disponível globalmente
if (typeof globalThis.fetch === 'undefined') {
  console.log('⚠️ Fetch não encontrado globalmente, usando node-fetch...');
  
  try {
    // Importar node-fetch
    const nodeFetch = require('node-fetch');
    
    // Definir fetch globalmente
    globalThis.fetch = nodeFetch;
    globalThis.Headers = nodeFetch.Headers;
    globalThis.Request = nodeFetch.Request;
    globalThis.Response = nodeFetch.Response;
    
    console.log('✅ node-fetch configurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao configurar node-fetch:', error);
    throw new Error('Falha ao configurar fetch: ' + error.message);
  }
} else {
  console.log('✅ Fetch já disponível globalmente');
}

module.exports = {};
