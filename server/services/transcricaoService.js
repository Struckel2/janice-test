/**
 * Serviço de transcrição de áudio/vídeo
 * 
 * Este módulo gerencia o processo de transcrição usando o Whisper
 * Implementa uma interface com o sistema de processamento para conversão 
 * de áudio/vídeo em texto com timestamps.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const { Whisper, manager } = require('smart-whisper');
const { decode } = require('node-wav');
const progressService = require('./progressService');

const execAsync = promisify(exec);

// Diretório para armazenamento temporário de arquivos
const TEMP_STORAGE_PATH = path.join(__dirname, '..', '..', 'temp');

// Garantir que o diretório temporário existe
if (!fs.existsSync(TEMP_STORAGE_PATH)) {
  fs.mkdirSync(TEMP_STORAGE_PATH, { recursive: true });
}

// Configuração do Whisper
let whisper = null;
const MODEL_PATH = process.env.MODEL_PATH || path.join(__dirname, '..', '..', 'models');
const MODEL_NAME = 'medium';

/**
 * Inicializa o Whisper com o modelo especificado
 * @returns {Promise<boolean>} - True se inicializado com sucesso
 */
async function initializeWhisper() {
  try {
    console.log('🔍 [DEBUG] initializeWhisper() iniciada');
    console.log(`🔍 [DEBUG] Inicializando Whisper com modelo: ${MODEL_NAME}`);
    console.log('🔍 [DEBUG] MODEL_PATH:', MODEL_PATH);
    
    // Verificar se o modelo existe, se não, baixar
    console.log('🔍 [DEBUG] Chamando manager.list()...');
    let modelosExistentes;
    try {
      modelosExistentes = await manager.list();
      console.log('🔍 [DEBUG] manager.list() retornou:', modelosExistentes);
    } catch (listError) {
      console.error('❌ [ERROR] Falha em manager.list():', listError.message);
      console.error('❌ [ERROR] Stack trace:', listError.stack);
      throw listError;
    }
    
    if (!modelosExistentes.includes(MODEL_NAME)) {
      console.log(`🔍 [DEBUG] Modelo ${MODEL_NAME} não encontrado. Baixando...`);
      console.log('🔍 [DEBUG] Modelos existentes:', modelosExistentes);
      
      try {
        console.log('🔍 [DEBUG] Chamando manager.download()...');
        await manager.download(MODEL_NAME);
        console.log('🔍 [DEBUG] manager.download() concluído');
        console.log('✅ Modelo baixado com sucesso.');
      } catch (downloadError) {
        console.error('❌ [ERROR] Falha em manager.download():', downloadError.message);
        console.error('❌ [ERROR] Stack trace:', downloadError.stack);
        throw downloadError;
      }
    } else {
      console.log(`🔍 [DEBUG] Modelo ${MODEL_NAME} já existe`);
    }
    
    // Resolver caminho do modelo
    console.log('🔍 [DEBUG] Chamando manager.resolve()...');
    let modelPath;
    try {
      modelPath = manager.resolve(MODEL_NAME);
      console.log(`🔍 [DEBUG] manager.resolve() retornou: ${modelPath}`);
      console.log(`✅ Caminho do modelo: ${modelPath}`);
    } catch (resolveError) {
      console.error('❌ [ERROR] Falha em manager.resolve():', resolveError.message);
      console.error('❌ [ERROR] Stack trace:', resolveError.stack);
      throw resolveError;
    }
    
    // Verificar se o arquivo do modelo existe
    console.log('🔍 [DEBUG] Verificando se arquivo do modelo existe...');
    if (!fs.existsSync(modelPath)) {
      console.error('❌ [ERROR] Arquivo do modelo não existe:', modelPath);
      throw new Error(`Arquivo do modelo não encontrado: ${modelPath}`);
    }
    console.log('🔍 [DEBUG] Arquivo do modelo existe');
    
    // Criar instância do Whisper com caminho completo
    console.log('🔍 [DEBUG] Criando instância Whisper...');
    console.log('🔍 [DEBUG] Configuração Whisper:', { gpu: false, offload: 300 });
    
    try {
      // CRÍTICO: Railway é CPU-only, gpu DEVE ser false
      whisper = new Whisper(modelPath, {
        gpu: false,   // OBRIGATÓRIO: Railway não tem GPU
        offload: 300  // Configuração otimizada para Railway Pro (32GB RAM)
      });
      console.log('🔍 [DEBUG] new Whisper() concluído');
    } catch (whisperError) {
      console.error('❌ [ERROR] Falha ao criar instância Whisper:', whisperError.message);
      console.error('❌ [ERROR] Stack trace:', whisperError.stack);
      console.error('❌ [ERROR] Tipo do erro:', whisperError.constructor.name);
      throw whisperError;
    }

    console.log('🔍 [DEBUG] Verificando se whisper foi criado...');
    if (!whisper) {
      console.error('❌ [ERROR] whisper é null após criação');
      throw new Error('Whisper é null após criação');
    }
    
    console.log('🔍 [DEBUG] Verificando whisper.config...');
    try {
      const config = whisper.config;
      console.log('✅ Whisper inicializado com sucesso.');
      console.log('✅ Configuração:', config);
    } catch (configError) {
      console.error('❌ [ERROR] Erro ao acessar whisper.config:', configError.message);
      // Não falhar por causa disso, apenas avisar
    }
    
    console.log('🔍 [DEBUG] initializeWhisper() concluída com sucesso');
    return true;
  } catch (error) {
    console.error('❌ [ERROR] Falha geral ao inicializar Whisper:', error.message);
    console.error('❌ [ERROR] Stack trace completo:', error.stack);
    console.error('❌ [ERROR] Tipo do erro:', error.constructor.name);
    console.error('❌ [ERROR] Propriedades do erro:', Object.keys(error));
    
    // Garantir que whisper seja null em caso de erro
    whisper = null;
    console.log('🔍 [DEBUG] whisper definido como null devido ao erro');
    
    return false;
  }
}

// Whisper será inicializado apenas quando necessário (lazy loading)
// Se REPLICATE_API_TOKEN estiver configurado, o Whisper não será inicializado

/**
 * Garante que o Whisper está inicializado apenas quando necessário
 * Se REPLICATE_API_TOKEN estiver configurado, pula a inicialização
 * @returns {Promise<boolean>} - True se inicializado ou se Replicate estiver disponível
 */
async function ensureWhisperInitialized() {
  console.log('🔍 [DEBUG] ensureWhisperInitialized() chamada');
  console.log('🔍 [DEBUG] REPLICATE_API_TOKEN presente:', !!process.env.REPLICATE_API_TOKEN);
  console.log('🔍 [DEBUG] REPLICATE_API_TOKEN valor:', process.env.REPLICATE_API_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.log('🔍 [DEBUG] whisper atual estado:', whisper ? 'INICIALIZADO' : 'NULL');
  
  // Se Replicate estiver configurado, não inicializar Whisper
  if (process.env.REPLICATE_API_TOKEN) {
    console.log('🚀 REPLICATE_API_TOKEN configurado, pulando inicialização do Whisper');
    console.log('💡 Economia: ~1.5GB de modelo não baixado, deploy 3-4min mais rápido');
    console.log('🔍 [DEBUG] Retornando true (Replicate disponível)');
    return true;
  }
  
  console.log('⚠️ REPLICATE_API_TOKEN não configurado, inicializando Whisper como fallback...');
  console.log('🔍 [DEBUG] Verificando se whisper precisa ser inicializado...');
  
  // Só inicializar se necessário
  if (!whisper) {
    console.log('🔍 [DEBUG] whisper é null, chamando initializeWhisper()...');
    try {
      const success = await initializeWhisper();
      console.log('🔍 [DEBUG] initializeWhisper() retornou:', success);
      console.log('🔍 [DEBUG] whisper após inicialização:', whisper ? 'INICIALIZADO' : 'AINDA NULL');
      
      if (!success) {
        console.error('❌ [ERROR] initializeWhisper() retornou false');
        throw new Error('Falha ao inicializar Whisper e Replicate não está configurado');
      }
      
      if (!whisper) {
        console.error('❌ [ERROR] initializeWhisper() retornou true mas whisper ainda é null');
        throw new Error('Inconsistência: inicialização reportou sucesso mas whisper é null');
      }
      
    } catch (error) {
      console.error('❌ [ERROR] Exceção durante inicialização do Whisper:', error.message);
      console.error('❌ [ERROR] Stack trace:', error.stack);
      console.error('❌ [ERROR] Tipo do erro:', error.constructor.name);
      throw error;
    }
  } else {
    console.log('🔍 [DEBUG] whisper já está inicializado, não precisa reinicializar');
  }
  
  console.log('🔍 [DEBUG] ensureWhisperInitialized() concluída com sucesso');
  return true;
}

/**
 * Converte um arquivo de áudio para WAV 16kHz mono
 * @param {String} inputPath - Caminho do arquivo de entrada
 * @param {String} outputPath - Caminho do arquivo de saída
 * @returns {Promise<void>}
 */
async function convertToWav(inputPath, outputPath) {
  const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`;
  
  try {
    await execAsync(command);
    console.log(`Arquivo convertido para WAV: ${outputPath}`);
  } catch (error) {
    throw new Error(`Falha na conversão de áudio: ${error.message}`);
  }
}

/**
 * Lê um arquivo WAV e converte para Float32Array
 * @param {String} wavPath - Caminho do arquivo WAV
 * @returns {Float32Array} - Dados PCM
 */
function readWavFile(wavPath) {
  try {
    console.log('=== INÍCIO PREPARAÇÃO PCM ===');
    console.log('Lendo arquivo WAV:', wavPath);
    
    const buffer = fs.readFileSync(wavPath);
    console.log('Tamanho do buffer WAV:', buffer.length, 'bytes');
    
    const { sampleRate, channelData } = decode(buffer);
    console.log('Resultado decode:', { 
      sampleRate, 
      channels: channelData.length,
      samplesPerChannel: channelData[0]?.length 
    });
    
    if (sampleRate !== 16000) {
      throw new Error(`Taxa de amostragem inválida: ${sampleRate}. Esperado: 16000`);
    }
    
    if (channelData.length !== 1) {
      throw new Error(`Número de canais inválido: ${channelData.length}. Esperado: 1 (mono)`);
    }
    
    const pcmData = channelData[0];
    console.log('Amostras PCM:', pcmData.length);
    console.log('Primeiras 10 amostras:', Array.from(pcmData.slice(0, 10)));
    console.log('Últimas 10 amostras:', Array.from(pcmData.slice(-10)));
    
    // Calcular min/max sem spread operator para evitar stack overflow
    let minVal = pcmData[0];
    let maxVal = pcmData[0];
    for (let i = 1; i < pcmData.length; i++) {
      if (pcmData[i] < minVal) minVal = pcmData[i];
      if (pcmData[i] > maxVal) maxVal = pcmData[i];
    }
    console.log('Range de valores PCM:', { min: minVal, max: maxVal });
    console.log('Tipo de dados:', pcmData.constructor.name);
    console.log('=== FIM PREPARAÇÃO PCM ===');
    
    return pcmData;
  } catch (error) {
    console.error('Erro na preparação PCM:', error);
    throw new Error(`Falha ao ler arquivo WAV: ${error.message}`);
  }
}

/**
 * Processa transcrição usando chunking WAV para arquivos grandes
 * @param {String} wavPath - Caminho do arquivo WAV
 * @param {String} transcriptionId - ID da transcrição para nomes únicos
 * @param {String} clientId - ID do cliente para progresso
 * @param {Object} options - Opções de transcrição
 * @returns {Promise<Object>} - Resultado da transcrição
 */
async function transcribeWithWavChunking(wavPath, transcriptionId, clientId = null, options = {}) {
  const { language = 'pt' } = options;
  const CHUNK_DURATION = 30; // 30 segundos por chunk
  const OVERLAP_DURATION = 2; // 2 segundos de overlap
  
  console.log('=== INÍCIO TRANSCRIÇÃO COM CHUNKING WAV ===');
  console.log(`Arquivo WAV: ${wavPath}`);
  console.log(`Duração do chunk: ${CHUNK_DURATION}s`);
  console.log(`Overlap: ${OVERLAP_DURATION}s`);
  
  // Obter duração total do arquivo
  const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${wavPath}"`);
  const totalDuration = parseFloat(stdout.trim());
  console.log(`Duração total: ${totalDuration}s`);
  
  // Calcular número de chunks
  const totalChunks = Math.ceil(totalDuration / CHUNK_DURATION);
  console.log(`Total de chunks: ${totalChunks}`);
  
  let fullTranscription = '';
  const chunkPaths = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Processar cada chunk individualmente
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startTime = chunkIndex * CHUNK_DURATION;
    const chunkPath = path.join(TEMP_STORAGE_PATH, `${transcriptionId}_chunk_${chunkIndex}.wav`);
    chunkPaths.push(chunkPath);
    
    console.log(`\n=== PROCESSANDO CHUNK ${chunkIndex + 1}/${totalChunks} ===`);
    console.log(`Tempo: ${startTime}s - ${startTime + CHUNK_DURATION}s`);
    
    // Atualizar progresso
    const chunkProgress = (chunkIndex / totalChunks) * 0.85; // 85% do progresso total
    const progressPercentage = 50 + (chunkProgress * 45); // 50% a 95%
    
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: Math.round(progressPercentage),
        message: `Processando chunk ${chunkIndex + 1} de ${totalChunks}...`,
        step: 2,
        stepStatus: 'active'
      }, 'transcription');
    }
    
    // Variáveis para este chunk específico
    let chunkSuccess = false;
    let chunkText = '';
    let chunkResult = null;
    
    try {
      // Logs detalhados de criação do chunk
      console.log(`\n=== CRIANDO CHUNK WAV ${chunkIndex + 1} ===`);
      const ffmpegCommand = `ffmpeg -i "${wavPath}" -ss ${startTime} -t ${CHUNK_DURATION + OVERLAP_DURATION} "${chunkPath}" -y`;
      console.log('Comando FFmpeg:', ffmpegCommand);
      console.log('Arquivo origem:', wavPath);
      console.log('Chunk destino:', chunkPath);
      console.log('Tempo início:', startTime, 'segundos');
      console.log('Duração solicitada:', CHUNK_DURATION + OVERLAP_DURATION, 'segundos');
      
      // Executar FFmpeg com logs detalhados
      const ffmpegStartTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync(ffmpegCommand);
        const ffmpegTime = Date.now() - ffmpegStartTime;
        console.log('FFmpeg concluído em:', ffmpegTime, 'ms');
        if (stdout) console.log('FFmpeg stdout:', stdout);
        if (stderr) console.log('FFmpeg stderr:', stderr);
      } catch (ffmpegError) {
        console.error('ERRO CRÍTICO NO FFMPEG:', ffmpegError);
        console.error('FFmpeg stderr:', ffmpegError.stderr);
        throw new Error(`Falha no FFmpeg: ${ffmpegError.message}`);
      }
      
      // Validação detalhada do chunk criado
      console.log('\n=== VALIDANDO CHUNK CRIADO ===');
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Chunk não foi criado: ${chunkPath}`);
      }
      
      const chunkStats = fs.statSync(chunkPath);
      const chunkSize = chunkStats.size;
      console.log('Chunk existe:', true);
      console.log('Tamanho do chunk:', chunkSize, 'bytes');
      console.log('Data criação:', chunkStats.birthtime);
      
      if (chunkSize < 1000) {
        throw new Error(`Chunk muito pequeno: ${chunkSize} bytes`);
      }
      
      // Verificar duração real do chunk com ffprobe
      try {
        const { stdout: durationOutput } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${chunkPath}"`);
        const actualDuration = parseFloat(durationOutput.trim());
        console.log('Duração real do chunk:', actualDuration, 'segundos');
        
        if (actualDuration < 0.5) {
          throw new Error(`Chunk com duração inválida: ${actualDuration}s`);
        }
      } catch (probeError) {
        console.warn('Erro ao verificar duração do chunk:', probeError.message);
      }
      
      // Logs de sistema antes da transcrição
      console.log('\n=== STATUS SISTEMA PRÉ-TRANSCRIÇÃO ===');
      console.log('Memória:', process.memoryUsage());
      console.log('CPU:', process.cpuUsage());
      console.log('Uptime:', process.uptime(), 'segundos');
      console.log('Chunk atual:', chunkIndex + 1, 'de', totalChunks);
      
      // Transcrever chunk WAV diretamente
      console.log('\n=== TRANSCREVENDO CHUNK WAV ===');
      console.log('Arquivo para transcrição:', chunkPath);
      // SIMPLIFICADA: Configuração mínima baseada na pesquisa
      const transcribeConfig = {
        language: 'pt'  // Usar 'pt' em vez de 'portuguese' (mais compatível)
        // Remover word_timestamps temporariamente para teste
      };
      console.log('Configuração transcrição:', JSON.stringify(transcribeConfig));
      console.log('Timestamp início transcrição:', new Date().toISOString());
      
      // VERIFICAÇÃO CRÍTICA DO ESTADO DO WHISPER
      console.log('\n=== VERIFICAÇÃO CRÍTICA WHISPER ===');
      console.log('🔍 [CRITICAL] whisper é null?', whisper === null);
      console.log('🔍 [CRITICAL] whisper é undefined?', whisper === undefined);
      console.log('🔍 [CRITICAL] typeof whisper:', typeof whisper);
      console.log('🔍 [CRITICAL] whisper tem transcribe?', whisper && typeof whisper.transcribe === 'function');
      
      if (!whisper) {
        console.error('❌ [CRITICAL ERROR] whisper é null/undefined no momento da transcrição!');
        console.error('❌ [CRITICAL ERROR] Isso indica falha na inicialização que não foi detectada');
        console.error('❌ [CRITICAL ERROR] REPLICATE_API_TOKEN:', !!process.env.REPLICATE_API_TOKEN);
        console.error('❌ [CRITICAL ERROR] ensureWhisperInitialized() deveria ter falhado antes');
        throw new Error('CRITICAL: whisper é null no momento da transcrição');
      }
      
      if (typeof whisper.transcribe !== 'function') {
        console.error('❌ [CRITICAL ERROR] whisper.transcribe não é uma função!');
        console.error('❌ [CRITICAL ERROR] whisper object:', Object.keys(whisper || {}));
        console.error('❌ [CRITICAL ERROR] whisper.transcribe type:', typeof whisper.transcribe);
        throw new Error('CRITICAL: whisper.transcribe não é uma função');
      }
      
      console.log('✅ [CRITICAL] whisper está válido e tem método transcribe');
      
      const transcribeStartTime = Date.now();
      let task;
      
      try {
        // Criar task de transcrição
        console.log('Chamando whisper.transcribe para chunk...');
        task = await whisper.transcribe(chunkPath, transcribeConfig);
        const taskTime = Date.now() - transcribeStartTime;
        console.log('Task criada em:', taskTime, 'ms');
        console.log('Task tipo:', typeof task);
        console.log('Task tem .result:', !!task.result);
        console.log('Task tem .on:', typeof task.on);
        
        // Timeout específico para este chunk
        const chunkTimeout = new Promise((_, reject) => {
          setTimeout(() => {
            console.log(`[TIMEOUT CHUNK ${chunkIndex + 1}] 2 minutos atingidos`);
            reject(new Error(`Timeout na transcrição do chunk ${chunkIndex + 1}`));
          }, 2 * 60 * 1000);
        });
        
        // Heartbeat durante transcrição do chunk
        const heartbeat = setInterval(() => {
          const elapsed = (Date.now() - transcribeStartTime) / 1000;
          console.log(`[HEARTBEAT CHUNK ${chunkIndex + 1}] ${elapsed}s - Ainda transcrevendo...`);
          console.log('Memória atual:', Math.round(process.memoryUsage().rss / 1024 / 1024), 'MB');
        }, 30000);
        
        // Aguardar resultado da transcrição
        console.log('Aguardando resultado da transcrição do chunk...');
        chunkResult = await Promise.race([task.result, chunkTimeout]);
        
        clearInterval(heartbeat);
        const totalTranscribeTime = Date.now() - transcribeStartTime;
        console.log('Transcrição do chunk concluída em:', totalTranscribeTime, 'ms');
        
      } catch (transcribeError) {
        console.error(`ERRO CRÍTICO NA TRANSCRIÇÃO DO CHUNK ${chunkIndex + 1}:`, transcribeError);
        console.error('Tipo do erro:', transcribeError.constructor.name);
        console.error('Stack trace:', transcribeError.stack);
        console.error('Arquivo chunk:', chunkPath);
        console.error('Tamanho chunk:', chunkSize, 'bytes');
        throw transcribeError;
      }
      
      // Logs detalhados do resultado
      console.log('\n=== RESULTADO DA TRANSCRIÇÃO ===');
      console.log('Resultado obtido:', !!chunkResult);
      console.log('Tipo do resultado:', typeof chunkResult);
      console.log('Tem segments:', !!chunkResult?.segments);
      console.log('Número de segments:', chunkResult?.segments?.length || 0);
      console.log('Tem text:', !!chunkResult?.text);
      console.log('Tamanho do text:', chunkResult?.text?.length || 0);
      
      if (chunkResult?.segments?.length > 0) {
        console.log('Primeiro segment:', chunkResult.segments[0]);
      }
      if (chunkResult?.text) {
        console.log('Texto (primeiros 100 chars):', chunkResult.text.substring(0, 100));
      }
      
      console.log(`✅ Chunk ${chunkIndex + 1} transcrito com sucesso`);
      chunkSuccess = true;
      successCount++;
      
      // Ajustar timestamps baseado na posição do chunk
      const timeOffset = startTime;
      
      if (chunkResult.segments && chunkResult.segments.length > 0) {
        const adjustedSegments = chunkResult.segments.map(segment => {
          const adjustedStart = (segment.start || segment.from || 0) + timeOffset;
          const timestamp = formatTimestamp(adjustedStart);
          return `[${timestamp}] ${segment.text.trim()}`;
        });
        
        // Para chunks com overlap, remover duplicatas do início (exceto primeiro chunk)
        let segmentsToAdd = adjustedSegments;
        if (chunkIndex > 0 && OVERLAP_DURATION > 0) {
          // Remover primeiros 2 segundos para evitar duplicatas
          segmentsToAdd = adjustedSegments.filter(segment => {
            const timeMatch = segment.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
            if (timeMatch) {
              const segmentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
              return segmentTime >= timeOffset + OVERLAP_DURATION;
            }
            return true;
          });
        }
        
        chunkText = segmentsToAdd.join('\n');
      } else if (chunkResult.text) {
        const timestamp = formatTimestamp(timeOffset);
        chunkText = `[${timestamp}] ${chunkResult.text.trim()}`;
      }
      
    } catch (chunkError) {
      console.error(`❌ ERRO DETALHADO CHUNK ${chunkIndex + 1}:`);
      console.error('Mensagem do erro:', chunkError.message);
      console.error('Código do erro:', chunkError.code);
      console.error('Nome do erro:', chunkError.name);
      console.error('Stack trace completo:', chunkError.stack);
      console.error('Tipo do erro:', chunkError.constructor.name);
      console.error('Propriedades do erro:', Object.keys(chunkError));
      console.error('Arquivo chunk:', chunkPath);
      console.error('Existe chunk?', fs.existsSync(chunkPath));
      if (fs.existsSync(chunkPath)) {
        console.error('Tamanho do chunk:', fs.statSync(chunkPath).size, 'bytes');
      }
      console.error('Configuração usada:', JSON.stringify({language: 'pt'}));
      console.error('Whisper inicializado?', !!whisper);
      console.error('Whisper config:', whisper?.config);
      
      chunkSuccess = false;
      errorCount++;
      
      // Continuar com próximo chunk em caso de erro
      const timestamp = formatTimestamp(startTime);
      chunkText = `[${timestamp}] [Erro na transcrição deste segmento]`;
    }
    
    // Sempre adicionar resultado (sucesso ou erro) à transcrição final
    if (chunkText) {
      fullTranscription += (fullTranscription ? '\n' : '') + chunkText;
    }
    
    console.log(`Chunk ${chunkIndex + 1} processado: ${chunkSuccess ? 'SUCESSO' : 'ERRO'}`);
  }
  
  // Logs finais do chunking
  console.log('\n=== RESUMO DO CHUNKING ===');
  console.log(`Total de chunks: ${totalChunks}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`Taxa de sucesso: ${Math.round((successCount / totalChunks) * 100)}%`);
  
  // Limpar chunks temporários
  console.log('\nLimpando chunks temporários...');
  chunkPaths.forEach(chunkPath => {
    try {
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
        console.log(`Chunk removido: ${chunkPath}`);
      }
    } catch (error) {
      console.warn(`Erro ao remover chunk ${chunkPath}:`, error.message);
    }
  });
  
  console.log('=== FIM TRANSCRIÇÃO COM CHUNKING WAV ===');
  console.log(`Transcrição completa: ${fullTranscription.length} caracteres`);
  
  return {
    text: fullTranscription,
    duration: totalDuration,
    segments: null // Já formatado como texto
  };
}

/**
 * Processa um arquivo de áudio/vídeo e retorna a transcrição
 * @param {String} filePath - Caminho do arquivo a ser transcrito
 * @param {String} clientId - ID do cliente para atualizações de progresso
 * @param {Object} options - Opções de transcrição (idioma, etc.)
 * @returns {Promise<Object>} - Resultado da transcrição
 */
async function transcribeFile(filePath, clientId = null, options = {}) {
  try {
    console.log('🎯 [TRANSCRIPTION] Iniciando transcrição - REPLICATE ONLY');
    console.log('🎯 [TRANSCRIPTION] Arquivo:', filePath);
    console.log('🎯 [TRANSCRIPTION] Cliente ID:', clientId);
    console.log('🎯 [TRANSCRIPTION] Opções:', options);
    
    // VERIFICAR SE REPLICATE ESTÁ CONFIGURADO
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('❌ [ERROR] REPLICATE_API_TOKEN não configurado');
      throw new Error('❌ REPLICATE_API_TOKEN não configurado. Configure para usar transcrições.');
    }
    
    console.log('✅ [REPLICATE] Token configurado, usando Replicate exclusivamente');
    console.log('🚀 [REPLICATE] Redirecionando para replicateTranscricaoService...');
    
    // USAR APENAS REPLICATE - SEM FALLBACKS
    const replicateTranscricaoService = require('./replicateTranscricaoService');
    return await replicateTranscricaoService.transcribeFile(filePath, clientId, options);
  } catch (error) {
    console.error('Erro na transcrição:', error);
    
    // Enviar evento de erro
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 100,
        message: `Erro: ${error.message}`,
        step: 4,
        stepStatus: 'error'
      }, 'transcription');
    }
    
    throw new Error(`Falha na transcrição: ${error.message}`);
  }
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

module.exports = {
  transcribeFile,
  removeFile
};
