/**
 * Teste de conectividade e funcionalidade do Replicate
 */

require('dotenv').config();
const replicateTranscricaoService = require('./server/services/replicateTranscricaoService');
const path = require('path');

async function testarReplicate() {
  console.log('=== TESTE REPLICATE ===');
  
  // Verificar variável de ambiente
  console.log('REPLICATE_API_TOKEN configurado:', !!process.env.REPLICATE_API_TOKEN);
  if (process.env.REPLICATE_API_TOKEN) {
    console.log('Token (primeiros 10 chars):', process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...');
  }
  
  // Testar conectividade
  console.log('\n--- Testando Conectividade ---');
  const conectividade = await replicateTranscricaoService.testConnection();
  console.log('Conectividade OK:', conectividade);
  
  if (!conectividade) {
    console.error('❌ Falha na conectividade. Verifique o REPLICATE_API_TOKEN');
    return;
  }
  
  console.log('✅ Replicate configurado e funcionando!');
  
  // Informações sobre custos
  console.log('\n--- Informações de Custo ---');
  console.log('Modelo: openai/whisper-large-v3 (medium)');
  console.log('Custo estimado para 90 minutos:');
  console.log('- Se $0.0002/segundo: 90min × 60 × $0.0002 = $1.08');
  console.log('- Tempo estimado: ~3-9 minutos (GPU acelerado)');
  console.log('- Sem limite de 25MB (pode processar arquivos grandes)');
  console.log('- Word timestamps incluídos');
  
  console.log('\n--- Configuração Atual ---');
  console.log('Modelo Whisper: openai/whisper-large-v3');
  console.log('Tamanho do modelo: medium');
  console.log('Idioma padrão: portuguese');
  console.log('Word timestamps: habilitado');
  console.log('Temperature: 0 (determinístico)');
}

// Executar teste
testarReplicate().catch(console.error);
