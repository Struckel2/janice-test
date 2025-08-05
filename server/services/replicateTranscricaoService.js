/**
 * Serviço de transcrição usando Replicate API
 * 
 * Este módulo implementa transcrição de áudio/vídeo usando o Whisper via Replicate
 * Oferece melhor performance, sem limitações de tamanho e custos otimizados
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const Replicate = require('replicate');
const progressService = require('./progressService');
const { cloudinary } = require('../config/cloudinary');

const execAsync = promisify(exec);

// Inicializar cliente Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Configurações do modelo
const WHISPER_MODEL = "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e";
const DEFAULT_MODEL_SIZE = "medium"; // tiny, base, small, medium, large

// Mapeamento de idiomas para formato aceito pelo Replicate
const LANGUAGE_MAPPING = {
  // Português
  'portuguese': 'pt',
  'portugues': 'pt', 
  'pt': 'pt',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  
  // Inglês
  'english': 'en',
  'ingles': 'en',
  'en': 'en',
  'en-us': 'en',
  'en-gb': 'en',
  
  // Espanhol
  'spanish': 'es',
  'espanhol': 'es',
  'español': 'es',
  'es': 'es',
  'es-es': 'es',
  'es-mx': 'es',
  
  // Auto-detect
  'auto': 'auto',
  'automatico': 'auto'
};

/**
 * Normaliza o idioma para formato aceito pelo Replicate
 * @param {String} language - Idioma original
 * @returns {String} - Idioma normalizado
 */
function normalizeLanguage(language) {
  if (!language) return 'auto';
  
  const normalized = language.toLowerCase().trim();
  const mappedLanguage = LANGUAGE_MAPPING[normalized] || 'auto';
  
  console.log(`🌐 [LANGUAGE] Mapeamento: "${language}" → "${mappedLanguage}"`);
  return mappedLanguage;
}

/**
 * Verifica se FFmpeg está disponível no sistema
 * @returns {Promise<boolean>} - True se FFmpeg disponível
 */
async function checkFFmpegAvailability() {
  try {
    await execAsync('ffmpeg -version');
    console.log('✅ [FFMPEG] FFmpeg disponível no sistema');
    return true;
  } catch (error) {
    console.warn('⚠️ [FFMPEG] FFmpeg não disponível:', error.message);
    return false;
  }
}

/**
 * Comprime arquivo de áudio/vídeo usando FFmpeg
 * @param {String} inputPath - Caminho do arquivo original
 * @param {String} outputPath - Caminho do arquivo comprimido
 * @param {Function} progressCallback - Callback para progresso
 * @returns {Promise<Object>} - Informações da compressão
 */
async function compressAudioWithFFmpeg(inputPath, outputPath, progressCallback = null) {
  console.log('🗜️ [FFMPEG] Iniciando compressão...');
  console.log('🗜️ [FFMPEG] Input:', inputPath);
  console.log('🗜️ [FFMPEG] Output:', outputPath);
  
  const startTime = Date.now();
  
  // Configuração otimizada para transcrição
  const ffmpegCommand = [
    'ffmpeg',
    '-i', `"${inputPath}"`,
    '-vn',                    // Remover vídeo (só áudio)
    '-acodec', 'mp3',         // Codec MP3
    '-ab', '64k',             // Bitrate 64kbps
    '-ar', '16000',           // Sample rate 16kHz (padrão Whisper)
    '-ac', '1',               // Mono (1 canal)
    '-y',                     // Sobrescrever arquivo existente
    `"${outputPath}"`
  ].join(' ');
  
  console.log('🗜️ [FFMPEG] Comando:', ffmpegCommand);
  
  try {
    // Simular progresso durante compressão
    const progressInterval = setInterval(() => {
      if (progressCallback) {
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedProgress = Math.min(35, 15 + (elapsed / 10) * 20);
        progressCallback(Math.round(estimatedProgress));
      }
    }, 2000);
    
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    clearInterval(progressInterval);
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    // Verificar se arquivo foi criado
    if (!fs.existsSync(outputPath)) {
      throw new Error('Arquivo comprimido não foi criado');
    }
    
    // Calcular estatísticas
    const originalStats = fs.statSync(inputPath);
    const compressedStats = fs.statSync(outputPath);
    const originalSizeMB = originalStats.size / (1024 * 1024);
    const compressedSizeMB = compressedStats.size / (1024 * 1024);
    const compressionRatio = ((originalSizeMB - compressedSizeMB) / originalSizeMB * 100);
    
    console.log('✅ [FFMPEG] Compressão concluída!');
    console.log('✅ [FFMPEG] Tempo:', processingTime.toFixed(2) + 's');
    console.log('✅ [FFMPEG] Tamanho original:', originalSizeMB.toFixed(2) + 'MB');
    console.log('✅ [FFMPEG] Tamanho comprimido:', compressedSizeMB.toFixed(2) + 'MB');
    console.log('✅ [FFMPEG] Redução:', compressionRatio.toFixed(1) + '%');
    
    return {
      success: true,
      originalSizeMB: originalSizeMB,
      compressedSizeMB: compressedSizeMB,
      compressionRatio: compressionRatio,
      processingTime: processingTime,
      outputPath: outputPath
    };
    
  } catch (error) {
    console.error('❌ [FFMPEG] Erro na compressão:', error.message);
    console.error('❌ [FFMPEG] Stderr:', error.stderr || 'N/A');
    
    // Remover arquivo parcial se existir
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
        console.log('🗑️ [FFMPEG] Arquivo parcial removido');
      } catch (cleanupError) {
        console.warn('⚠️ [FFMPEG] Erro ao remover arquivo parcial:', cleanupError.message);
      }
    }
    
    throw new Error(`Falha na compressão FFmpeg: ${error.message}`);
  }
}

/**
 * Upload temporário de áudio para Cloudinary
 * @param {String} filePath - Caminho do arquivo local
 * @param {String} transcriptionId - ID único da transcrição
 * @returns {Promise<Object>} - Resultado do upload com URL
 */
async function uploadTemporaryAudio(filePath, transcriptionId) {
  console.log('📤 [CLOUDINARY] Iniciando upload temporário...');
  console.log('📤 [CLOUDINARY] Arquivo:', filePath);
  console.log('📤 [CLOUDINARY] ID transcrição:', transcriptionId);
  
  try {
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "video", // Suporta áudio também
      public_id: `temp_audio_${transcriptionId}`,
      folder: "temp_transcriptions",
      expires_at: Math.floor(Date.now() / 1000) + 7200, // 2 horas de segurança
      tags: ["temporary", "transcription", "replicate"]
    });
    
    console.log('✅ [CLOUDINARY] Upload concluído com sucesso!');
    console.log('✅ [CLOUDINARY] URL:', uploadResult.secure_url);
    console.log('✅ [CLOUDINARY] Public ID:', uploadResult.public_id);
    console.log('✅ [CLOUDINARY] Tamanho:', Math.round(uploadResult.bytes / 1024 / 1024 * 100) / 100, 'MB');
    
    return uploadResult;
    
  } catch (error) {
    console.error('❌ [CLOUDINARY] Erro no upload:', error.message);
    console.error('❌ [CLOUDINARY] Stack trace:', error.stack);
    throw new Error(`Falha no upload temporário: ${error.message}`);
  }
}

/**
 * Remove arquivo temporário do Cloudinary
 * @param {String} publicId - ID público do arquivo
 * @returns {Promise<void>}
 */
async function cleanupTemporaryAudio(publicId) {
  if (!publicId) {
    console.warn('🗑️ [CLOUDINARY] Public ID não fornecido para limpeza');
    return;
  }
  
  try {
    console.log('🗑️ [CLOUDINARY] Removendo arquivo temporário:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log('✅ [CLOUDINARY] Arquivo temporário removido com sucesso');
    } else {
      console.warn('⚠️ [CLOUDINARY] Resultado da remoção:', result);
    }
    
  } catch (error) {
    console.error('❌ [CLOUDINARY] Erro na limpeza (não crítico):', error.message);
    // Não propagar erro de limpeza para não quebrar o fluxo principal
  }
}


/**
 * Transcreve um arquivo de áudio usando Replicate Whisper
 * @param {String} filePath - Caminho do arquivo a ser transcrito
 * @param {String} clientId - ID do cliente para atualizações de progresso
 * @param {Object} options - Opções de transcrição
 * @returns {Promise<Object>} - Resultado da transcrição
 */
async function transcribeFile(filePath, clientId = null, options = {}) {
  let uploadResult = null;
  let compressedFilePath = null;
  
  try {
    const {
      language = 'portuguese',
      modelSize = DEFAULT_MODEL_SIZE,
      wordTimestamps = true,
      temperature = 0
    } = options;

    const transcriptionId = uuidv4();
    const normalizedLanguage = normalizeLanguage(language);

    console.log('=== INÍCIO TRANSCRIÇÃO REPLICATE COM COMPRESSÃO ===');
    console.log(`Arquivo: ${filePath}`);
    console.log(`Modelo: ${WHISPER_MODEL} (${modelSize})`);
    console.log(`Idioma original: ${language} → normalizado: ${normalizedLanguage}`);
    console.log(`Word timestamps: ${wordTimestamps}`);
    console.log(`ID da transcrição: ${transcriptionId}`);

    // Progresso inicial
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 5,
        message: 'Preparando arquivo para transcrição...',
        step: 1,
        stepStatus: 'active'
      }, 'transcription');
    }

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    // Verificar tamanho do arquivo
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    console.log(`Tamanho do arquivo: ${fileSizeMB.toFixed(2)}MB`);

    if (fileSizeMB > 1000) {
      throw new Error(`Arquivo muito grande (${fileSizeMB.toFixed(2)}MB). O limite é 1GB.`);
    }

    // Progresso - análise de tamanho
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 10,
        message: `Analisando arquivo (${fileSizeMB.toFixed(1)}MB)...`,
        step: 1,
        stepStatus: 'active'
      }, 'transcription');
    }

    const startTime = Date.now();
    let finalFilePath = filePath;

    // DECISÃO: Comprimir se arquivo > 10MB
    if (fileSizeMB > 10) {
      console.log('🗜️ [COMPRESSION] Arquivo grande detectado, iniciando compressão...');
      
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 15,
          message: `Arquivo grande (${fileSizeMB.toFixed(1)}MB) - iniciando compressão inteligente...`,
          step: 2,
          stepStatus: 'active'
        }, 'transcription');
      }

      // Verificar se FFmpeg está disponível
      const ffmpegAvailable = await checkFFmpegAvailability();
      
      if (ffmpegAvailable) {
        try {
          // Gerar caminho para arquivo comprimido
          const fileExtension = path.extname(filePath);
          const baseName = path.basename(filePath, fileExtension);
          const dirName = path.dirname(filePath);
          compressedFilePath = path.join(dirName, `${baseName}_compressed_${transcriptionId}.mp3`);

          // Callback de progresso da compressão
          const compressionProgressCallback = (progress) => {
            if (clientId) {
              progressService.sendProgressUpdate(clientId, {
                percentage: progress,
                message: `Otimizando áudio para transcrição (64kbps, 16kHz)... ${progress}%`,
                step: 2,
                stepStatus: 'active'
              }, 'transcription');
            }
          };

          // Executar compressão
          const compressionResult = await compressAudioWithFFmpeg(
            filePath, 
            compressedFilePath, 
            compressionProgressCallback
          );

          console.log('✅ [COMPRESSION] Compressão bem-sucedida!');
          console.log(`✅ [COMPRESSION] Redução: ${compressionResult.originalSizeMB.toFixed(2)}MB → ${compressionResult.compressedSizeMB.toFixed(2)}MB (${compressionResult.compressionRatio.toFixed(1)}% menor)`);

          finalFilePath = compressedFilePath;

          if (clientId) {
            progressService.sendProgressUpdate(clientId, {
              percentage: 40,
              message: `Compressão concluída! Tamanho reduzido em ${compressionResult.compressionRatio.toFixed(1)}%`,
              step: 2,
              stepStatus: 'active'
            }, 'transcription');
          }

        } catch (compressionError) {
          console.warn('⚠️ [COMPRESSION] Falha na compressão, usando arquivo original:', compressionError.message);
          
          if (clientId) {
            progressService.sendProgressUpdate(clientId, {
              percentage: 40,
              message: 'Compressão falhou, usando arquivo original...',
              step: 2,
              stepStatus: 'active'
            }, 'transcription');
          }
        }
      } else {
        console.warn('⚠️ [COMPRESSION] FFmpeg não disponível, usando arquivo original');
        
        if (clientId) {
          progressService.sendProgressUpdate(clientId, {
            percentage: 40,
            message: 'FFmpeg não disponível, usando arquivo original...',
            step: 2,
            stepStatus: 'active'
          }, 'transcription');
        }
      }
    } else {
      console.log('✅ [COMPRESSION] Arquivo pequeno, sem necessidade de compressão');
      
      if (clientId) {
        progressService.sendProgressUpdate(clientId, {
          percentage: 40,
          message: 'Arquivo pequeno, sem necessidade de compressão',
          step: 2,
          stepStatus: 'active'
        }, 'transcription');
      }
    }

    // UPLOAD PARA CLOUDINARY
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 45,
        message: 'Enviando arquivo para Cloudinary...',
        step: 3,
        stepStatus: 'active'
      }, 'transcription');
    }

    uploadResult = await uploadTemporaryAudio(finalFilePath, transcriptionId);

    // PREPARAR INPUT PARA REPLICATE
    const input = {
      audio: uploadResult.secure_url  // ✅ URL STRING (correto)
    };

    // Adicionar parâmetros com idioma normalizado
    if (normalizedLanguage && normalizedLanguage !== 'auto') {
      input.language = normalizedLanguage;
    }
    
    if (wordTimestamps) {
      input.word_timestamps = true;
    }
    
    if (temperature !== undefined) {
      input.temperature = temperature;
    }

    console.log('🔍 [REPLICATE] Configuração corrigida:', JSON.stringify({
      model: WHISPER_MODEL,
      input: {
        ...input,
        audio: uploadResult.secure_url + ' (URL Cloudinary)'
      }
    }, null, 2));

    // TRANSCRIÇÃO REPLICATE
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 50,
        message: 'Jerry está transcrevendo seu arquivo...',
        step: 4,
        stepStatus: 'active'
      }, 'transcription');
    }

    console.log('🚀 [REPLICATE] Iniciando transcrição...');
    console.log('🔍 [REPLICATE] Token (primeiros 10 chars):', process.env.REPLICATE_API_TOKEN?.substring(0, 10) + '...');
    console.log('🔍 [REPLICATE] Modelo:', WHISPER_MODEL);
    console.log('🔍 [REPLICATE] URL Cloudinary:', uploadResult.secure_url);
    console.log('🔍 [REPLICATE] Idioma normalizado:', normalizedLanguage);

    // Progresso durante transcrição
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedProgress = Math.min(90, 50 + (elapsed / 60) * 40);
      
      if (clientId) {
        const jerryMessage = Math.round(estimatedProgress) >= 90 
          ? `Jerry demora mais nos últimos 10%... achamos que ele mente que já leu 90%! (${Math.round(elapsed)}s)`
          : `Jerry está concentrado transcrevendo... ${Math.round(elapsed)}s`;
        
        progressService.sendProgressUpdate(clientId, {
          percentage: Math.round(estimatedProgress),
          message: jerryMessage,
          step: 4,
          stepStatus: 'active'
        }, 'transcription');
      }
    }, 5000);

    let output;
    try {
      output = await replicate.run(WHISPER_MODEL, { input });
      clearInterval(progressInterval);
      
      const processingTime = (Date.now() - startTime) / 1000;
      console.log('✅ [REPLICATE] Transcrição concluída!');
      console.log('✅ [REPLICATE] Tempo total:', processingTime.toFixed(2) + 's');
      
    } catch (replicateError) {
      clearInterval(progressInterval);
      
      console.error('❌ [REPLICATE ERROR] Falha na transcrição!');
      console.error('❌ [REPLICATE ERROR] Mensagem:', replicateError.message);
      
      // Log detalhado do erro
      if (replicateError.response) {
        try {
          const responseText = await replicateError.response.text();
          console.error('❌ [REPLICATE ERROR] Response body:', responseText);
        } catch (bodyError) {
          console.error('❌ [REPLICATE ERROR] Erro ao ler response body:', bodyError.message);
        }
      }
      
      throw new Error(`Falha na transcrição Replicate: ${replicateError.message}`);
    }

    // PROCESSAR RESULTADO
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 95,
        message: 'Jerry está organizando as palavras...',
        step: 5,
        stepStatus: 'active'
      }, 'transcription');
    }

    let formattedText = '';
    let segments = null;
    let duration = 0;

    // Processar output do Replicate
    if (output && Array.isArray(output.segments) && output.segments.length > 0) {
      console.log('✅ [TIMESTAMPS] Usando segments para timestamps!');
      segments = output.segments;
      formattedText = formatSegmentsWithTimestamps(segments);
      duration = segments[segments.length - 1]?.end || output.duration || 0;
    } else if (output && output.text) {
      console.log('⚠️ [NO TIMESTAMPS] Usando .text simples');
      formattedText = output.text;
      duration = output.duration || 0;
    } else if (typeof output === 'string') {
      console.log('⚠️ [NO TIMESTAMPS] Output é string simples');
      formattedText = output;
    } else {
      console.warn('❌ [ERROR] Formato inesperado:', output);
      formattedText = JSON.stringify(output);
    }

    // Adicionar timestamp básico se necessário
    if (!segments && formattedText && !formattedText.includes('[')) {
      formattedText = `[00:00:00] ${formattedText}`;
    }

    // CONCLUSÃO
    if (clientId) {
      progressService.sendCompletionEvent(clientId, {
        percentage: 100,
        message: 'Jerry terminou! Transcrição pronta!',
        step: 5,
        stepStatus: 'completed'
      }, 'transcription');
    }

    console.log('=== FIM TRANSCRIÇÃO REPLICATE ===');

    return {
      text: formattedText,
      duration: duration,
      language: normalizedLanguage,
      transcriptionId: transcriptionId,
      modelUsed: `${WHISPER_MODEL} (${modelSize})`,
      processingTime: (Date.now() - startTime) / 1000,
      provider: 'replicate'
    };

  } catch (error) {
    console.error('❌ [ERROR] Erro na transcrição:', error);

    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 100,
        message: `Erro: ${error.message}`,
        step: 5,
        stepStatus: 'error'
      }, 'transcription');
    }

    throw new Error(`Falha na transcrição Replicate: ${error.message}`);
    
  } finally {
    // LIMPEZA GARANTIDA
    try {
      // Limpar Cloudinary
      if (uploadResult && uploadResult.public_id) {
        await cleanupTemporaryAudio(uploadResult.public_id);
      }
      
      // Limpar arquivo comprimido local
      if (compressedFilePath && fs.existsSync(compressedFilePath)) {
        fs.unlinkSync(compressedFilePath);
        console.log('🗑️ [CLEANUP] Arquivo comprimido removido:', compressedFilePath);
      }
    } catch (cleanupError) {
      console.warn('⚠️ [CLEANUP] Erro na limpeza (não crítico):', cleanupError.message);
    }
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
