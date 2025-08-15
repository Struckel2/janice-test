/**
 * Polyfill para garantir que fetch funcione corretamente no Node.js 18+
 * Evita conflitos com node-fetch instalado como dependência indireta
 */

// Verificar se fetch já está disponível globalmente
if (typeof globalThis.fetch === 'undefined') {
  console.log('⚠️ Fetch não encontrado globalmente, tentando importar...');
  
  // Tentar usar fetch nativo do Node.js 18+
  try {
    // No Node.js 18+, fetch está disponível globalmente
    // Se não estiver, isso significa que estamos em uma versão mais antiga
    if (typeof fetch !== 'undefined') {
      globalThis.fetch = fetch;
      console.log('✅ Fetch nativo do Node.js configurado');
    } else {
      console.log('❌ Fetch nativo não disponível');
    }
  } catch (error) {
    console.error('❌ Erro ao configurar fetch:', error);
  }
} else {
  console.log('✅ Fetch já disponível globalmente');
}

module.exports = {};
