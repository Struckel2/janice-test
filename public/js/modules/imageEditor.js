// ===== MÓDULO DE EDITOR DE IMAGENS =====
window.AppModules = window.AppModules || {};

window.AppModules.ImageEditor = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  
  // ===== FUNÇÕES PARA EDIÇÃO DE IMAGENS =====
  
  // Configurar editor de imagens
  function setupImageEditor() {
    // Configurar eventos do editor
    setupImageEditorEvents();
    
    // Configurar seções do editor
    setupImageEditorSections();
    
    // Configurar validação do botão de processamento
    updateProcessButtonValidation();
  }
  
  // Processar edição de imagem
  async function processImageEdit(event) {
    if (event) event.preventDefault();
    
    // Obter dados do formulário
    const imageUrl = document.getElementById('edit-image-url').value;
    const editInstructions = document.getElementById('edit-instructions').value;
    
    // Validar dados
    if (!imageUrl) {
      alert('Selecione uma imagem para editar');
      return;
    }
    
    if (!editInstructions) {
      alert('Forneça instruções para a edição');
      return;
    }
    
    try {
      // Mostrar modal de loading
      showEditLoadingModal();
      
      // Iniciar simulação de progresso
      simulateEditProgress();
      
      // Preparar dados para envio
      const editData = {
        imageUrl,
        instructions: editInstructions,
        clienteId: window.currentClientId,
        configuracoes: {
          preservarAspectos: getPreserveAspects(),
          intensidade: getEditIntensity(),
          ajustesCor: getColorAdjustments()
        }
      };
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/imagens/editar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar edição');
      }
      
      // Processar resposta
      const editResult = await response.json();
      
      // Mostrar resultado
      showEditResult(editResult);
      
    } catch (error) {
      console.error('Erro ao processar edição:', error);
      
      // Esconder loading e mostrar erro
      hideEditLoadingModal();
      alert('Não foi possível processar a edição. Tente novamente.');
    }
  }
  
  // Mostrar modal de loading para edição
  function showEditLoadingModal() {
    const editForm = document.getElementById('image-edit-form');
    const loadingContainer = document.getElementById('edit-loading-container');
    
    if (editForm) editForm.style.display = 'none';
    if (loadingContainer) loadingContainer.style.display = 'flex';
  }
  
  // Esconder modal de loading para edição
  function hideEditLoadingModal() {
    const editForm = document.getElementById('image-edit-form');
    const loadingContainer = document.getElementById('edit-loading-container');
    
    if (editForm) editForm.style.display = 'block';
    if (loadingContainer) loadingContainer.style.display = 'none';
  }
  
  // Simular progresso de edição
  function simulateEditProgress() {
    const progressBar = document.getElementById('edit-progress-bar');
    const progressText = document.getElementById('edit-progress-text');
    const progressStage = document.getElementById('edit-progress-stage');
    
    if (!progressBar || !progressText || !progressStage) return;
    
    // Estágios de progresso
    const stages = [
      { name: 'Analisando imagem...', duration: 1000 },
      { name: 'Processando instruções...', duration: 1500 },
      { name: 'Aplicando edições...', duration: 3000 },
      { name: 'Finalizando...', duration: 1000 }
    ];
    
    let currentStage = 0;
    let progress = 0;
    
    // Atualizar estágio inicial
    progressStage.textContent = stages[currentStage].name;
    
    // Função para atualizar progresso
    const updateProgress = () => {
      // Calcular progresso total baseado no estágio atual
      const stageProgress = (progress / 100) * (1 / stages.length);
      const totalProgress = (currentStage / stages.length) + stageProgress;
      
      // Atualizar barra de progresso
      progressBar.style.width = `${totalProgress * 100}%`;
      progressText.textContent = `${Math.round(totalProgress * 100)}%`;
      
      // Verificar se o estágio atual foi concluído
      if (progress >= 100) {
        currentStage++;
        progress = 0;
        
        // Verificar se todos os estágios foram concluídos
        if (currentStage < stages.length) {
          progressStage.textContent = stages[currentStage].name;
        } else {
          // Progresso concluído
          clearInterval(progressInterval);
        }
      } else {
        // Incrementar progresso
        progress += 2;
      }
    };
    
    // Iniciar intervalo de atualização
    const progressInterval = setInterval(updateProgress, 50);
    
    // Salvar referência para uso posterior
    window.currentEditProgressInterval = progressInterval;
  }
  
  // Mostrar resultado da edição
  function showEditResult(result) {
    // Limpar intervalo de progresso
    if (window.currentEditProgressInterval) {
      clearInterval(window.currentEditProgressInterval);
    }
    
    // Esconder loading
    const loadingContainer = document.getElementById('edit-loading-container');
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Mostrar container de resultado
    const resultContainer = document.getElementById('edit-result-container');
    if (!resultContainer) return;
    
    resultContainer.style.display = 'block';
    
    // Preencher dados do resultado
    const resultImage = document.getElementById('edit-result-image');
    if (resultImage) {
      resultImage.src = result.imagemEditadaUrl;
      resultImage.alt = 'Imagem Editada';
    }
    
    // Configurar botão de salvar
    const saveEditBtn = document.getElementById('save-edit-btn');
    if (saveEditBtn) {
      saveEditBtn.onclick = () => {
        saveEditedImage(result);
      };
    }
    
    // Configurar botão de nova edição
    const newEditBtn = document.getElementById('new-edit-btn');
    if (newEditBtn) {
      newEditBtn.onclick = () => {
        // Esconder resultado
        resultContainer.style.display = 'none';
        
        // Mostrar formulário
        const editForm = document.getElementById('image-edit-form');
        if (editForm) editForm.style.display = 'block';
        
        // Limpar formulário
        resetEditSections();
      };
    }
    
    // Salvar referência para uso posterior
    window.currentEditResult = result;
  }
  
  // Salvar imagem editada
  async function saveEditedImage(editResult) {
    if (!editResult) return;
    
    try {
      // Mostrar loading
      const resultContainer = document.getElementById('edit-result-container');
      const loadingContainer = document.getElementById('edit-loading-container');
      
      if (resultContainer) resultContainer.style.display = 'none';
      if (loadingContainer) {
        loadingContainer.style.display = 'flex';
        
        // Atualizar mensagem de progresso
        const progressStage = document.getElementById('edit-progress-stage');
        if (progressStage) progressStage.textContent = 'Salvando imagem editada...';
      }
      
      // Preparar dados para envio
      const saveData = {
        imagemEditadaUrl: editResult.imagemEditadaUrl,
        imagemOriginalUrl: editResult.imagemOriginalUrl,
        instrucoes: editResult.instrucoes,
        clienteId: window.currentClientId,
        titulo: 'Imagem Editada'
      };
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/imagens/salvar-edicao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar imagem editada');
      }
      
      // Processar resposta
      const saveResult = await response.json();
      
      // Esconder loading
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Mostrar formulário
      const editForm = document.getElementById('image-edit-form');
      if (editForm) editForm.style.display = 'block';
      
      // Limpar formulário
      resetEditSections();
      
      // Recarregar galeria se estiver disponível
      if (window.AppModules.Gallery && typeof window.AppModules.Gallery.loadClientGallery === 'function') {
        window.AppModules.Gallery.loadClientGallery(window.currentClientId);
      }
      
      // Mostrar mensagem de sucesso
      alert('Imagem editada salva com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar imagem editada:', error);
      
      // Esconder loading
      const loadingContainer = document.getElementById('edit-loading-container');
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Mostrar resultado novamente
      const resultContainer = document.getElementById('edit-result-container');
      if (resultContainer) resultContainer.style.display = 'block';
      
      // Mostrar erro
      alert('Não foi possível salvar a imagem editada. Tente novamente.');
    }
  }
  
  // Configurar eventos do editor de imagens
  function setupImageEditorEvents() {
    // Formulário de edição
    const editForm = document.getElementById('image-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', processImageEdit);
    }
    
    // Campo de URL da imagem
    const imageUrlInput = document.getElementById('edit-image-url');
    if (imageUrlInput) {
      imageUrlInput.addEventListener('input', updateEditPreview);
      imageUrlInput.addEventListener('input', updateProcessButtonValidation);
    }
    
    // Campo de instruções
    const instructionsInput = document.getElementById('edit-instructions');
    if (instructionsInput) {
      instructionsInput.addEventListener('input', analyzeEditInstructions);
      instructionsInput.addEventListener('input', updateProcessButtonValidation);
    }
    
    // Botão para selecionar imagem da galeria
    const selectFromGalleryBtn = document.getElementById('select-from-gallery-btn');
    if (selectFromGalleryBtn) {
      selectFromGalleryBtn.addEventListener('click', () => {
        // Implementação simplificada - normalmente abriria um modal de seleção da galeria
        alert('Funcionalidade de seleção da galeria seria implementada aqui');
      });
    }
    
    // Controles de ajuste de cor
    document.querySelectorAll('.color-control input[type="range"]').forEach(range => {
      range.addEventListener('input', updateColorEditPreview);
    });
  }
  
  // Configurar seções do editor de imagens
  function setupImageEditorSections() {
    // Configurar listeners para as seções
    setupImageEditorSectionListeners();
    
    // Inicialmente, mostrar apenas a seção básica
    document.querySelectorAll('.edit-section').forEach(section => {
      if (section.id === 'basic-edit-section') {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
    
    // Marcar botão da seção básica como ativo
    document.querySelectorAll('.edit-section-btn').forEach(button => {
      if (button.dataset.section === 'basic-edit-section') {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
  
  // Configurar listeners para as seções do editor
  function setupImageEditorSectionListeners() {
    document.querySelectorAll('.edit-section-btn').forEach(button => {
      button.addEventListener('click', () => {
        const sectionId = button.dataset.section;
        if (sectionId) {
          toggleImageEditSection(sectionId);
        }
      });
    });
  }
  
  // Resetar seções de edição
  function resetEditSections() {
    // Limpar campos
    const imageUrlInput = document.getElementById('edit-image-url');
    const instructionsInput = document.getElementById('edit-instructions');
    
    if (imageUrlInput) imageUrlInput.value = '';
    if (instructionsInput) instructionsInput.value = '';
    
    // Resetar controles de cor
    document.querySelectorAll('.color-control input[type="range"]').forEach(range => {
      range.value = range.defaultValue;
    });
    
    // Resetar checkboxes de preservação
    document.querySelectorAll('.preserve-aspect-checkbox').forEach(checkbox => {
      checkbox.checked = true;
    });
    
    // Resetar intensidade
    const intensityRange = document.getElementById('edit-intensity');
    if (intensityRange) intensityRange.value = '50';
    
    // Limpar preview
    const previewImage = document.getElementById('edit-preview-image');
    if (previewImage) {
      previewImage.src = '';
      previewImage.style.display = 'none';
    }
    
    // Mostrar seção básica
    resetSectionsToInitialState();
    
    // Atualizar validação do botão
    updateProcessButtonValidation();
  }
  
  // Alternar seção de edição de imagem
  function toggleImageEditSection(sectionId) {
    // Esconder todas as seções
    document.querySelectorAll('.edit-section').forEach(section => {
      section.style.display = 'none';
    });
    
    // Mostrar seção selecionada
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
      selectedSection.style.display = 'block';
    }
    
    // Atualizar botões
    document.querySelectorAll('.edit-section-btn').forEach(button => {
      if (button.dataset.section === sectionId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
  
  // Resetar seções para o estado inicial
  function resetSectionsToInitialState() {
    toggleImageEditSection('basic-edit-section');
  }
  
  // Atualizar preview de edição de cor
  function updateColorEditPreview() {
    // Implementação simplificada - normalmente aplicaria filtros CSS à imagem de preview
    console.log('Atualizando preview de edição de cor');
    
    // Obter valores dos controles
    const brightness = document.getElementById('brightness-control').value;
    const contrast = document.getElementById('contrast-control').value;
    const saturation = document.getElementById('saturation-control').value;
    
    // Atualizar preview
    const previewImage = document.getElementById('edit-preview-image');
    if (previewImage && previewImage.style.display !== 'none') {
      // Aplicar filtros CSS
      previewImage.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    }
  }
  
  // Atualizar preview de edição
  function updateEditPreview() {
    const imageUrl = document.getElementById('edit-image-url').value;
    const previewImage = document.getElementById('edit-preview-image');
    const previewContainer = document.getElementById('edit-preview-container');
    
    if (!previewImage || !previewContainer) return;
    
    if (imageUrl) {
      previewImage.src = imageUrl;
      previewImage.style.display = 'block';
      previewContainer.style.display = 'block';
      
      // Detectar contexto da imagem
      detectImageContext(imageUrl);
    } else {
      previewImage.src = '';
      previewImage.style.display = 'none';
      previewContainer.style.display = 'none';
    }
  }
  
  // Atualizar validação do botão de processamento
  function updateProcessButtonValidation() {
    const processButton = document.getElementById('process-edit-btn');
    const imageUrl = document.getElementById('edit-image-url').value;
    const instructions = document.getElementById('edit-instructions').value;
    
    if (!processButton) return;
    
    // Verificar se há URL e instruções
    const isValid = imageUrl && instructions;
    processButton.disabled = !isValid;
  }
  
  // Analisar instruções de edição
  function analyzeEditInstructions() {
    const instructions = document.getElementById('edit-instructions').value;
    
    if (!instructions) return;
    
    // Implementação simplificada - normalmente faria uma análise mais complexa
    console.log('Analisando instruções de edição:', instructions);
    
    // Gerar prompt inteligente baseado nas instruções
    generateIntelligentPrompt(instructions);
  }
  
  // Detectar contexto da imagem
  function detectImageContext(imageUrl) {
    if (!imageUrl) return;
    
    // Implementação simplificada - normalmente faria uma análise da imagem
    console.log('Detectando contexto da imagem:', imageUrl);
  }
  
  // Gerar prompt inteligente
  function generateIntelligentPrompt(instructions) {
    if (!instructions) return;
    
    // Implementação simplificada - normalmente geraria sugestões baseadas na análise
    console.log('Gerando prompt inteligente baseado nas instruções:', instructions);
  }
  
  // Obter aspectos a preservar
  function getPreserveAspects() {
    const preserveAspects = [];
    
    document.querySelectorAll('.preserve-aspect-checkbox:checked').forEach(checkbox => {
      preserveAspects.push(checkbox.value);
    });
    
    return preserveAspects;
  }
  
  // Obter intensidade da edição
  function getEditIntensity() {
    const intensityRange = document.getElementById('edit-intensity');
    return intensityRange ? parseInt(intensityRange.value) : 50;
  }
  
  // Obter ajustes de cor
  function getColorAdjustments() {
    return {
      brightness: parseInt(document.getElementById('brightness-control').value),
      contrast: parseInt(document.getElementById('contrast-control').value),
      saturation: parseInt(document.getElementById('saturation-control').value)
    };
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Configurar editor de imagens
    setupImageEditor();
  }
  
  // Retornar API pública do módulo
  return {
    init,
    setupImageEditor,
    processImageEdit
  };
})();
