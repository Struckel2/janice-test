// ===== MÓDULO DE GERENCIAMENTO DE PROGRESSO =====
window.AppModules = window.AppModules || {};

window.AppModules.Progress = (function() {
  'use strict';
  
  // ===== ELEMENTOS DO DOM =====
  let progressFill, progressText, loadingStatus, progressSteps;
  let progressEventSource = null;
  let currentProcessInfo = null;
  let statusCheckInterval = null;
  
  // ===== INICIALIZAÇÃO =====
  function init() {
    // Capturar elementos do DOM
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    loadingStatus = document.getElementById('loading-status');
    progressSteps = {
      step1: document.getElementById('step-1'),
      step2: document.getElementById('step-2'),
      step3: document.getElementById('step-3'),
      step4: document.getElementById('step-4')
    };
  }
  
  // ===== FUNÇÃO PARA RESETAR PROGRESSO =====
  function resetProgress() {
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    if (loadingStatus) loadingStatus.textContent = 'Iniciando...';
    
    // Resetar todos os indicadores de etapa
    for (const step of Object.values(progressSteps)) {
      if (step) {
        const indicator = step.querySelector('.step-indicator');
        if (indicator) {
          indicator.className = 'step-indicator pending';
        }
        step.className = 'progress-step';
      }
    }
  }
  
  // ===== FUNÇÃO PARA ATUALIZAR PROGRESSO =====
  function updateProgress(data) {
    console.log('🔍 [DEBUG-PROGRESS] Recebendo atualização de progresso:', data);
    
    // Verificar se esta atualização é para o tipo de operação atual
    const operationType = data.operationType || 'analysis';
    
    // Se não corresponder à operação atual, ignorar
    if (currentProcessInfo && currentProcessInfo.type && 
        operationType !== currentProcessInfo.type) {
      console.log(`🚫 [DEBUG-PROGRESS] Ignorando atualização de tipo ${operationType}`);
      return;
    }
    
    // Atualizar barra de progresso
    if (progressFill) progressFill.style.width = `${data.percentage}%`;
    if (progressText) progressText.textContent = `${data.percentage}%`;
    
    // Atualizar mensagem de status
    if (data.message && loadingStatus) {
      loadingStatus.textContent = data.message;
    }
    
    // Adicionar mensagens educativas específicas para transcrições
    if (currentProcessInfo && currentProcessInfo.type === 'transcription') {
      updateTranscriptionProgressInfo(data.percentage);
    }
    
    // Atualizar etapas
    if (data.step && data.stepStatus) {
      updateStepStatus(data.step, data.stepStatus);
    }
  }
  
  // ===== FUNÇÃO PARA ATUALIZAR STATUS DE ETAPA =====
  function updateStepStatus(stepNumber, status) {
    const stepKey = `step${stepNumber}`;
    const step = progressSteps[stepKey];
    
    if (!step) return;
    
    // Atualizar classe do indicador
    const indicator = step.querySelector('.step-indicator');
    if (indicator) {
      indicator.className = `step-indicator ${status}`;
    }
    
    // Atualizar classe da etapa
    step.className = `progress-step ${status}`;
    
    // Atualizar etapas anteriores para 'completed' se necessário
    if (status === 'active' || status === 'completed') {
      for (let i = 1; i < stepNumber; i++) {
        const prevStepKey = `step${i}`;
        const prevStep = progressSteps[prevStepKey];
        if (prevStep) {
          const prevIndicator = prevStep.querySelector('.step-indicator');
          if (prevIndicator) {
            prevIndicator.className = 'step-indicator completed';
          }
          prevStep.className = 'progress-step completed';
        }
      }
    }
  }
  
  // ===== FUNÇÃO PARA INFORMAÇÕES DE PROGRESSO DE TRANSCRIÇÃO =====
  function updateTranscriptionProgressInfo(percentage) {
    let infoElement = document.querySelector('.transcription-progress-info');
    
    // Criar elemento se não existir
    if (!infoElement) {
      infoElement = document.createElement('div');
      infoElement.className = 'transcription-progress-info';
      infoElement.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 8px;
        border-left: 4px solid #007bff;
        font-size: 14px;
        line-height: 1.5;
      `;
      
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) {
        progressContainer.appendChild(infoElement);
      }
    }
    
    // Atualizar conteúdo baseado na porcentagem
    let content = '';
    
    if (percentage < 50) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-info-circle" style="color: #007bff; margin-right: 8px;"></i>
          <strong>Analisando arquivo de áudio...</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          O Whisper está processando e analisando o arquivo. Esta etapa é rápida e prepara o áudio para transcrição.
        </p>
      `;
    } else if (percentage < 90) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-microphone" style="color: #28a745; margin-right: 8px;"></i>
          <strong>Transcrevendo conteúdo...</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          Processamento em andamento. O Whisper está convertendo o áudio em texto com alta precisão.
        </p>
      `;
    } else if (percentage < 100) {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-cog fa-spin" style="color: #ffc107; margin-right: 8px;"></i>
          <strong>Processamento final - Esta etapa pode demorar mais</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          <strong>Normal:</strong> Suspeitamos que quando Jerry diz que está em 90%, na verdade ele está relendo tudo desde o início para garantir que cada palavra ficou perfeita. Esta etapa de revisão pode levar a maior parte do tempo total.
        </p>
        <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
          <small style="color: #856404;">
            <i class="fas fa-clock" style="margin-right: 5px;"></i>
            <strong>Dica:</strong> É normal que transcrições de 40 minutos cheguem a 90% em 1 minuto e depois levem mais 39 minutos para finalizar.
          </small>
        </div>
      `;
    } else {
      content = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>
          <strong>Transcrição concluída!</strong>
        </div>
        <p style="margin: 0; color: #6c757d;">
          Processamento finalizado com sucesso. Preparando resultado...
        </p>
      `;
    }
    
    infoElement.innerHTML = content;
  }
  
  // ===== FUNÇÃO PARA INICIAR ATUALIZAÇÕES VIA SSE =====
  function startProgressUpdates(clientId, type = 'analysis', resourceId = null) {
    // Fechar conexão anterior se existir
    if (progressEventSource) {
      progressEventSource.close();
    }
    
    // Armazenar informações sobre o processo atual
    currentProcessInfo = {
      type: type,
      resourceId: resourceId,
      clientId: clientId,
      startTime: new Date(),
      isChecking: false
    };
    
    // Abrir nova conexão SSE
    const eventSource = new EventSource(`/api/progress/${clientId}`);
    progressEventSource = eventSource;
    
    // Manipular eventos de progresso
    eventSource.addEventListener('progress', function(event) {
      const data = JSON.parse(event.data);
      updateProgress(data);
    });
    
    // Manipular eventos de erro
    eventSource.addEventListener('error', function() {
      eventSource.close();
      progressEventSource = null;
      
      // Iniciar verificação periódica como fallback se for transcrição
      if (type === 'transcription' && resourceId) {
        startPeriodicStatusCheck(resourceId);
      }
    });
    
    // Manipular eventos de conclusão
    eventSource.addEventListener('complete', function(event) {
      const data = event.data ? JSON.parse(event.data) : {};
      const operationType = data.operationType || (currentProcessInfo ? currentProcessInfo.type : 'analysis');
      
      // Atualizar para 100% e fechar conexão
      updateProgress({
        percentage: 100,
        message: operationType === 'transcription' ? 'Transcrição concluída!' : 'Análise concluída!',
        step: 4,
        stepStatus: 'completed',
        operationType: operationType
      });
      
      // Aguardar antes de mostrar resultado
      setTimeout(() => {
        if (operationType === 'transcription' && currentProcessInfo && currentProcessInfo.resourceId) {
          // Callback para visualizar transcrição
          if (window.viewTranscription) {
            window.viewTranscription(currentProcessInfo.resourceId);
          }
          stopPeriodicStatusCheck();
        } else if (window.currentAnalysisId) {
          // Callback para visualizar análise
          if (window.viewAnalysis) {
            window.viewAnalysis(window.currentAnalysisId);
          }
        }
        
        eventSource.close();
        progressEventSource = null;
      }, 2000);
    });
    
    // Para transcrições, iniciar verificação periódica como backup
    if (type === 'transcription' && resourceId) {
      setTimeout(() => {
        startPeriodicStatusCheck(resourceId);
      }, 30000);
    }
  }
  
  // ===== FUNÇÃO PARA VERIFICAÇÃO PERIÓDICA =====
  function startPeriodicStatusCheck(transcriptionId) {
    if (!currentProcessInfo || currentProcessInfo.isChecking) return;
    
    currentProcessInfo.isChecking = true;
    
    // Verificar status a cada 30 segundos
    statusCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/transcricoes/${transcriptionId}`);
        if (!response.ok) {
          console.error('Erro ao verificar status da transcrição');
          return;
        }
        
        const transcription = await response.json();
        
        // Se não está mais em progresso
        if (!transcription.emProgresso) {
          console.log('Transcrição concluída via verificação periódica');
          
          stopPeriodicStatusCheck();
          
          // Atualizar UI para mostrar conclusão
          updateProgress({
            percentage: 100,
            message: transcription.erro ? 'Erro na transcrição!' : 'Transcrição concluída!',
            step: 4,
            stepStatus: transcription.erro ? 'error' : 'completed'
          });
          
          // Após 2 segundos, mostrar o resultado
          setTimeout(() => {
            if (progressEventSource) {
              progressEventSource.close();
              progressEventSource = null;
            }
            
            if (!transcription.erro && window.viewTranscription) {
              window.viewTranscription(transcriptionId);
            } else if (transcription.erro && window.showError) {
              window.showError(transcription.mensagemErro || 'Ocorreu um erro durante a transcrição.');
            }
          }, 2000);
          
          // Recarregar lista de transcrições
          if (window.currentClientId && window.loadClientTranscriptions) {
            window.loadClientTranscriptions(window.currentClientId);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 30000);
  }
  
  // ===== FUNÇÃO PARA PARAR VERIFICAÇÃO PERIÓDICA =====
  function stopPeriodicStatusCheck() {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      statusCheckInterval = null;
    }
    
    if (currentProcessInfo) {
      currentProcessInfo.isChecking = false;
    }
  }
  
  // ===== CONFIGURAR ETAPAS ESPECÍFICAS =====
  function setupMockupProgressSteps() {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');
    
    if (step1) step1.querySelector('.step-text').textContent = 'Processando Prompt';
    if (step2) step2.querySelector('.step-text').textContent = 'Gerando Variações';
    if (step3) step3.querySelector('.step-text').textContent = 'Renderizando Imagens';
    if (step4) step4.querySelector('.step-text').textContent = 'Finalizando';
  }
  
  function setupActionPlanProgressSteps() {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');
    
    if (step1) step1.querySelector('.step-text').textContent = 'Análise de Documentos';
    if (step2) step2.querySelector('.step-text').textContent = 'Processamento IA';
    if (step3) step3.querySelector('.step-text').textContent = 'Geração de Estratégias';
    if (step4) step4.querySelector('.step-text').textContent = 'Finalização';
  }
  
  // ===== EXPORTAR FUNÇÕES PÚBLICAS =====
  return {
    init: init,
    resetProgress: resetProgress,
    updateProgress: updateProgress,
    updateStepStatus: updateStepStatus,
    startProgressUpdates: startProgressUpdates,
    stopPeriodicStatusCheck: stopPeriodicStatusCheck,
    setupMockupProgressSteps: setupMockupProgressSteps,
    setupActionPlanProgressSteps: setupActionPlanProgressSteps
  };
})();
