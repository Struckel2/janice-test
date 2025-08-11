/**
 * Polyfill robusto para garantir que fetch funcione corretamente no Node.js
 * Suporta Node.js 18+ (fetch nativo) e versões anteriores (node-fetch)
 */

console.log('🔧 [FETCH-POLYFILL] ===== INICIANDO CONFIGURAÇÃO DO FETCH =====');
console.log('🔧 [FETCH-POLYFILL] Node.js version:', process.version);
console.log('🔧 [FETCH-POLYFILL] globalThis.fetch disponível?', typeof globalThis.fetch !== 'undefined');
console.log('🔧 [FETCH-POLYFILL] global.fetch disponível?', typeof global.fetch !== 'undefined');

// Verificar se fetch já está disponível globalmente
if (typeof globalThis.fetch === 'undefined') {
  console.log('⚠️ [FETCH-POLYFILL] Fetch não encontrado globalmente, tentando configurar...');
  
  try {
    // Tentar usar fetch nativo do Node.js 18+
    console.log('🔧 [FETCH-POLYFILL] Tentando usar fetch nativo do Node.js...');
    
    // No Node.js 18+, fetch pode estar disponível mas não globalmente
    if (typeof fetch !== 'undefined') {
      console.log('✅ [FETCH-POLYFILL] Fetch nativo encontrado, configurando globalmente...');
      globalThis.fetch = fetch;
      global.fetch = fetch;
      console.log('✅ [FETCH-POLYFILL] Fetch nativo configurado com sucesso');
    } else {
      console.log('⚠️ [FETCH-POLYFILL] Fetch nativo não disponível, tentando node-fetch...');
      
      // Tentar importar node-fetch como fallback
      try {
        const nodeFetch = require('node-fetch');
        console.log('✅ [FETCH-POLYFILL] node-fetch encontrado, configurando...');
        globalThis.fetch = nodeFetch.default || nodeFetch;
        global.fetch = nodeFetch.default || nodeFetch;
        console.log('✅ [FETCH-POLYFILL] node-fetch configurado com sucesso');
      } catch (nodeFetchError) {
        console.error('❌ [FETCH-POLYFILL] node-fetch não disponível:', nodeFetchError.message);
        
        // Criar um fetch mock básico para evitar erros
        console.log('⚠️ [FETCH-POLYFILL] Criando fetch mock básico...');
        const mockFetch = () => {
          throw new Error('Fetch não disponível neste ambiente Node.js. Instale node-fetch ou use Node.js 18+');
        };
        globalThis.fetch = mockFetch;
        global.fetch = mockFetch;
        console.log('⚠️ [FETCH-POLYFILL] Fetch mock criado (irá gerar erro ao ser usado)');
      }
    }
  } catch (error) {
    console.error('❌ [FETCH-POLYFILL] Erro ao configurar fetch:', error);
    
    // Criar fetch mock em caso de erro
    const mockFetch = () => {
      throw new Error('Erro na configuração do fetch: ' + error.message);
    };
    globalThis.fetch = mockFetch;
    global.fetch = mockFetch;
  }
} else {
  console.log('✅ [FETCH-POLYFILL] Fetch já disponível globalmente');
  
  // Garantir que também esteja disponível em global
  if (typeof global.fetch === 'undefined') {
    global.fetch = globalThis.fetch;
    console.log('✅ [FETCH-POLYFILL] Fetch copiado para global');
  }
}

// Verificação final
console.log('🔧 [FETCH-POLYFILL] ===== VERIFICAÇÃO FINAL =====');
console.log('🔧 [FETCH-POLYFILL] globalThis.fetch disponível?', typeof globalThis.fetch !== 'undefined');
console.log('🔧 [FETCH-POLYFILL] global.fetch disponível?', typeof global.fetch !== 'undefined');
console.log('🔧 [FETCH-POLYFILL] fetch (direto) disponível?', typeof fetch !== 'undefined');
console.log('🔧 [FETCH-POLYFILL] Tipo do fetch:', typeof globalThis.fetch);

// Teste básico do fetch (sem fazer requisição real)
try {
  if (typeof globalThis.fetch === 'function') {
    console.log('✅ [FETCH-POLYFILL] Fetch é uma função válida');
  } else {
    console.log('❌ [FETCH-POLYFILL] Fetch não é uma função:', typeof globalThis.fetch);
  }
} catch (testError) {
  console.error('❌ [FETCH-POLYFILL] Erro no teste do fetch:', testError.message);
}

console.log('🔧 [FETCH-POLYFILL] ===== CONFIGURAÇÃO CONCLUÍDA =====');

module.exports = {};
