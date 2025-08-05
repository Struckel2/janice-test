/**
 * Serviço de transcrição usando Replicate API
 * 
 * Este módulo implementa transcrição de áudio/vídeo usando o Whisper via Replicate
 * Oferece melhor performance, sem limitações de tamanho e custos otimizados
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Replicate = require('replicate');
const progressService = require('./progressService');

// Inicializar cliente Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Configurações do modelo
const WHISPER_MODEL = "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e";
const DEFAULT_MODEL_SIZE = "medium"; // tiny, base, small, medium, large


/**
 * Transcreve um arquivo de áudio usando Replicate Whisper
 * @param {String} filePath - Caminho do arquivo a ser transcrito
 * @param {String} clientId - ID do cliente para atualizações de progresso
 * @param {Object} options - Opções de transcrição
 * @returns {Promise<Object>} - Resultado da transcrição
 */
async function transcribeFile(filePath, clientId = null, options = {}) {
  try {
    const {
      language = 'portuguese',
      modelSize = DEFAULT_MODEL_SIZE,
      wordTimestamps = true,
      temperature = 0
    } = options;

    const transcriptionId = uuidv4();

    console.log('=== INÍCIO TRANSCRIÇÃO REPLICATE ===');
    console.log(`Arquivo: ${filePath}`);
    console.log(`Modelo: ${WHISPER_MODEL} (${modelSize})`);
    console.log(`Idioma: ${language}`);
    console.log(`Word timestamps: ${wordTimestamps}`);
    console.log(`ID da transcrição: ${transcriptionId}`);

    // Enviar progresso inicial
    if (clientId) {
    progressService.sendProgressUpdate(clientId, {
      percentage: 5,
      message: 'Mandando para os Minions traduzirem...',
      step: 1,
      stepStatus: 'active'
    }, 'transcription', 'replicate');
    }

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    // Verificar tamanho do arquivo
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    console.log(`Tamanho do arquivo: ${fileSizeMB.toFixed(2)}MB`);

    // Replicate não tem limite de 25MB como OpenAI
    if (fileSizeMB > 1000) { // Limite generoso de 1GB
      throw new Error(`Arquivo muito grande (${fileSizeMB.toFixed(2)}MB). O limite é 1GB.`);
    }

    // NOVA IMPLEMENTAÇÃO: Upload direto para Replicate (sem Cloudinary)
    const startTime = Date.now();
    
    try {
      // Atualizar progresso - Preparação
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 10,
          message: 'Preparando arquivo para envio direto ao Jerry...',
          step: 1,
          stepStatus: 'active'
        }, 'transcription');
      }

      // Preparar input para Replicate com ReadStream (upload direto)
      const input = {
        audio: fs.createReadStream(filePath)  // ✅ UPLOAD DIRETO - sem Cloudinary
      };

      // Adicionar parâmetros opcionais apenas se suportados
      if (language && language !== 'auto') {
        input.language = language;
      }
      
      if (wordTimestamps) {
        input.word_timestamps = true;
      }
      
      if (temperature !== undefined) {
        input.temperature = temperature;
      }

      console.log('🔍 [REPLICATE] Configuração de upload direto:', JSON.stringify({
        model: WHISPER_MODEL,
        input: {
          ...input,
          audio: `ReadStream(${filePath}) - Upload direto`
        }
      }, null, 2));

      // Atualizar progresso - Upload e Transcrição
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 20,
          message: 'Enviando arquivo diretamente para Jerry transcrever...',
          step: 2,
          stepStatus: 'active'
        }, 'transcription');
      }

      // Executar transcrição
      console.log('🚀 [REPLICATE] Iniciando transcrição com upload direto...');
      console.log('🔍 [REPLICATE] Token (primeiros 10 chars):', process.env.REPLICATE_API_TOKEN?.substring(0, 10) + '...');
      console.log('🔍 [REPLICATE] Modelo:', WHISPER_MODEL);
      console.log('🔍 [REPLICATE] Arquivo local:', filePath);
      console.log('� [REPLICATE] Tamanho:', fileSizeMB.toFixed(2) + 'MB');

      // Simular progresso durante processamento
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedProgress = Math.min(90, 20 + (elapsed / 60) * 70); // Estimar baseado no tempo
        
        console.log(`🔍 [REPLICATE] Progresso estimado: ${Math.round(estimatedProgress)}% (${Math.round(elapsed)}s)`);
        
        if (clientId) {
          const jerryMessage = Math.round(estimatedProgress) >= 90 
            ? `Jerry demora mais nos últimos 10%... achamos que ele mente que já leu 90%! (${Math.round(elapsed)}s)`
            : `Jerry está concentrado transcrevendo... ${Math.round(elapsed)}s`;
          
          progressService.sendProgressUpdate(clientId, {
            percentage: Math.round(estimatedProgress),
            message: jerryMessage,
            step: 2,
            stepStatus: 'active'
          }, 'transcription');
        }
      }, 5000); // Atualizar a cada 5 segundos

      let output;
      try {
        console.log('🔍 [REPLICATE] Chamando replicate.run()...');
        console.log('🔍 [REPLICATE] Timestamp início:', new Date().toISOString());
        
        output = await replicate.run(WHISPER_MODEL, { input });
        
        clearInterval(progressInterval);
        const processingTime = (Date.now() - startTime) / 1000;
        
        console.log('✅ [REPLICATE] Transcrição concluída com sucesso!');
        console.log('✅ [REPLICATE] Tempo de processamento:', processingTime.toFixed(2) + 's');
        console.log('✅ [REPLICATE] Timestamp fim:', new Date().toISOString());
        
      } catch (replicateError) {
        clearInterval(progressInterval);
        
        console.error('❌ [REPLICATE ERROR] Falha na transcrição!');
        console.error('❌ [REPLICATE ERROR] Tipo do erro:', replicateError.constructor.name);
        console.error('❌ [REPLICATE ERROR] Mensagem:', replicateError.message);
        console.error('❌ [REPLICATE ERROR] Stack trace:', replicateError.stack);
        console.error('❌ [REPLICATE ERROR] Propriedades do erro:', Object.keys(replicateError));
        
        // Logs específicos para diferentes tipos de erro
        if (replicateError.response) {
          console.error('❌ [REPLICATE ERROR] Response status:', replicateError.response.status);
          console.error('❌ [REPLICATE ERROR] Response statusText:', replicateError.response.statusText);
          console.error('❌ [REPLICATE ERROR] Response headers:', replicateError.response.headers);
          
          try {
            const responseText = await replicateError.response.text();
            console.error('❌ [REPLICATE ERROR] Response body:', responseText);
          } catch (bodyError) {
            console.error('❌ [REPLICATE ERROR] Erro ao ler response body:', bodyError.message);
          }
        }
        
        if (replicateError.status) {
          console.error('❌ [REPLICATE ERROR] Status code:', replicateError.status);
        }
        
        if (replicateError.code) {
          console.error('❌ [REPLICATE ERROR] Error code:', replicateError.code);
        }
        
        // Verificar se é erro de créditos
        if (replicateError.message?.includes('credit') || replicateError.message?.includes('402')) {
          console.error('💳 [REPLICATE ERROR] ERRO DE CRÉDITOS DETECTADO!');
          console.error('💳 [REPLICATE ERROR] Verifique: https://replicate.com/account/billing');
        }
        
        // Verificar se é erro de rate limiting
        if (replicateError.message?.includes('rate') || replicateError.message?.includes('429')) {
          console.error('⏱️ [REPLICATE ERROR] RATE LIMITING DETECTADO!');
          console.error('⏱️ [REPLICATE ERROR] Aguarde alguns minutos antes de tentar novamente');
        }
        
        // Verificar se é erro de modelo
        if (replicateError.message?.includes('model') || replicateError.message?.includes('404')) {
          console.error('🤖 [REPLICATE ERROR] ERRO DE MODELO DETECTADO!');
          console.error('🤖 [REPLICATE ERROR] Modelo usado:', WHISPER_MODEL);
        }
        
        throw new Error(`Falha na transcrição Replicate: ${replicateError.message}`);
      }

      // Atualizar progresso
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 95,
          message: 'Jerry está organizando as palavras...',
          step: 3,
          stepStatus: 'active'
        }, 'transcription');
      }

      // Processar resultado
      console.log('=== ANÁLISE DETALHADA DO OUTPUT REPLICATE ===');
      console.log('🔍 Tipo do output:', typeof output);
      console.log('🔍 É string?', typeof output === 'string');
      console.log('🔍 É object?', typeof output === 'object' && output !== null);
      console.log('🔍 É array?', Array.isArray(output));
      console.log('🔍 Output keys:', Object.keys(output || {}));
      
      if (output && typeof output === 'object') {
        console.log('🔍 Tem .text?', !!output.text);
        console.log('🔍 Tem .transcription?', !!output.transcription);
        console.log('🔍 Tem .segments?', !!output.segments);
        console.log('🔍 Tem .duration?', !!output.duration);
        
        if (output.segments) {
          console.log('🔍 Tipo de .segments:', typeof output.segments);
          console.log('🔍 .segments é array?', Array.isArray(output.segments));
          console.log('🔍 Número de segments:', output.segments?.length || 0);
          
          if (Array.isArray(output.segments) && output.segments.length > 0) {
            console.log('🔍 Primeiro segment:', JSON.stringify(output.segments[0], null, 2));
            console.log('🔍 Último segment:', JSON.stringify(output.segments[output.segments.length - 1], null, 2));
          }
        }
        
        if (output.text) {
          console.log('🔍 Tamanho do .text:', output.text.length);
          console.log('🔍 .text (primeiros 100 chars):', output.text.substring(0, 100));
        }
      }
      
      console.log('🔍 Output completo (JSON):', JSON.stringify(output, null, 2));

      let formattedText = '';
      let segments = null;
      let duration = 0;

      // NOVA ORDEM: Priorizar segments com timestamps
      if (output && Array.isArray(output.segments) && output.segments.length > 0) {
        console.log('✅ [TIMESTAMPS] Usando segments para timestamps!');
        segments = output.segments;
        formattedText = formatSegmentsWithTimestamps(segments);
        duration = segments[segments.length - 1]?.end || output.duration || 0;
        console.log('✅ [TIMESTAMPS] Segments processados:', segments.length);
        console.log('✅ [TIMESTAMPS] Duração calculada:', duration);
      } else if (output && output.text) {
        console.log('⚠️ [NO TIMESTAMPS] Usando .text simples (sem timestamps)');
        formattedText = output.text;
        duration = output.duration || 0;
      } else if (output && output.transcription) {
        console.log('⚠️ [NO TIMESTAMPS] Usando .transcription simples');
        formattedText = output.transcription;
      } else if (typeof output === 'string') {
        console.log('⚠️ [NO TIMESTAMPS] Output é string simples');
        formattedText = output;
      } else {
        console.warn('❌ [ERROR] Formato de resultado inesperado:', output);
        formattedText = JSON.stringify(output);
      }

      // Se não temos timestamps mas o texto existe, criar formato básico
      if (!segments && formattedText && !formattedText.includes('[')) {
        console.log('🔧 [FALLBACK] Adicionando timestamp básico [00:00:00]');
        formattedText = `[00:00:00] ${formattedText}`;
      }

      console.log(`Texto formatado: ${formattedText.length} caracteres`);
      console.log('Primeiros 200 chars:', formattedText.substring(0, 200));

      // Enviar evento de conclusão
      if (clientId) {
        progressService.sendCompletionEvent(clientId, {
          percentage: 100,
          message: 'Jerry terminou! Transcrição pronta!',
          step: 4,
          stepStatus: 'completed'
        }, 'transcription');
      }

      console.log('=== FIM TRANSCRIÇÃO REPLICATE ===');

      return {
        text: formattedText,
        duration: duration,
        language: language,
        transcriptionId: transcriptionId,
        modelUsed: `${WHISPER_MODEL} (${modelSize})`,
        processingTime: (Date.now() - startTime) / 1000,
        provider: 'replicate'
      };

    } catch (error) {
      console.error('Erro na transcrição Replicate:', error);

      // Enviar evento de erro
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 100,
          message: `Erro: ${error.message}`,
          step: 4,
          stepStatus: 'error'
        }, 'transcription');
      }

      throw new Error(`Falha na transcrição Replicate: ${error.message}`);
    }
    // Não há mais necessidade de limpeza - upload direto para Replicate

  } catch (error) {
    console.error('Erro geral na transcrição:', error);

    // Enviar evento de erro
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 100,
        message: `Erro: ${error.message}`,
        step: 4,
        stepStatus: 'error'
      }, 'transcription');
    }

    throw new Error(`Falha na transcrição Replicate: ${error.message}`);
  }
}

/**
 * Formata segments com timestamps no formato esperado
 * @param {Array} segments - Array de segments com timestamps
 * @returns {String} - Texto formatado com timestamps
 */
function formatSegmentsWithTimestamps(segments) {
  console.log('🔧 [FORMAT] Iniciando formatação de segments...');
  console.log('🔧 [FORMAT] Segments recebidos:', segments?.length || 0);
  
  if (!segments || !Array.isArray(segments)) {
    console.warn('⚠️ [FORMAT] Segments inválidos ou não é array');
    return '';
  }

  if (segments.length === 0) {
    console.warn('⚠️ [FORMAT] Array de segments vazio');
    return '';
  }

  console.log('🔧 [FORMAT] Processando', segments.length, 'segments...');
  
  const formattedLines = segments.map((segment, index) => {
    // Logs detalhados para debug
    if (index < 3 || index >= segments.length - 3) {
      console.log(`🔧 [FORMAT] Segment ${index}:`, JSON.stringify(segment, null, 2));
    }
    
    // Extrair timestamp (pode estar em diferentes propriedades)
    const start = segment.start || segment.from || segment.timestamp || 0;
    const timestamp = formatTimestamp(start);
    
    // Extrair texto (pode estar em diferentes propriedades)
    const text = segment.text || segment.word || segment.content || '';
    
    // Criar linha formatada
    const line = `[${timestamp}] ${text.trim()}`;
    
    if (index < 3) {
      console.log(`🔧 [FORMAT] Linha ${index} formatada:`, line);
    }
    
    return line;
  }).filter(line => {
    // Filtrar linhas vazias ou só com timestamp
    const hasContent = line.length > 12 && !line.endsWith('] ');
    return hasContent;
  });

  console.log('🔧 [FORMAT] Linhas válidas após filtro:', formattedLines.length);
  console.log('🔧 [FORMAT] Primeiras 3 linhas:', formattedLines.slice(0, 3));
  console.log('🔧 [FORMAT] Últimas 3 linhas:', formattedLines.slice(-3));

  const result = formattedLines.join('\n');
  console.log('🔧 [FORMAT] Resultado final:', result.length, 'caracteres');
  
  return result;
}

/**
 * Formata um tempo em segundos para o formato HH:MM:SS
 * @param {Number} seconds - Tempo em segundos
 * @returns {String} - Tempo formatado
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Remove um arquivo após a transcrição
 * @param {String} filePath - Caminho do arquivo a ser removido
 */
function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Arquivo removido: ${filePath}`);
    }
  } catch (error) {
    console.error(`Erro ao remover arquivo ${filePath}:`, error);
  }
}

/**
 * Testa a conectividade com Replicate
 * @returns {Promise<boolean>} - True se conectado com sucesso
 */
async function testConnection() {
  try {
    console.log('Testando conexão com Replicate...');
    
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN não configurado');
    }

    // Fazer uma chamada simples para testar a API
    const models = await replicate.models.list();
    console.log('Conexão Replicate OK. Modelos disponíveis:', models.results?.length || 0);
    return true;
    
  } catch (error) {
    console.error('Erro na conexão Replicate:', error);
    return false;
  }
}

module.exports = {
  transcribeFile,
  removeFile,
  testConnection
};
