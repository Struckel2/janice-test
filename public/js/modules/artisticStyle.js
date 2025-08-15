// ===== MÓDULO DE ESTILO ARTÍSTICO =====
window.AppModules = window.AppModules || {};

window.AppModules.ArtisticStyle = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  
  // ===== FUNÇÕES PARA APLICAÇÃO DE ESTILOS ARTÍSTICOS =====
  
  // Mostrar seção de estilo artístico
  function showArtisticStyleSection() {
    // Verificar se há imagens na galeria
    checkGalleryForImages();
  }
  
  // Verificar se há imagens na galeria
  async function checkGalleryForImages() {
    if (!window.currentClientId) {
      showNoImageSelected();
      return;
    }
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/clientes/${window.currentClientId}/galeria`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar galeria');
      }
      
      // Processar resposta
      const galleryItems = await response.json();
      
      // Verificar se há itens na galeria
      if (!galleryItems.length) {
        showGoToGalleryOption();
        return;
      }
      
      // Carregar galeria para seleção
      loadGalleryForStyleSelection(galleryItems);
      
    } catch (error) {
      console.error('Erro ao verificar galeria:', error);
      showNoImageSelected();
    }
  }
  
  // Carregar galeria para seleção de estilo
  function loadGalleryForStyleSelection(galleryItems) {
    const gallerySelectionContainer = document.getElementById('gallery-selection-container');
    if (!gallerySelectionContainer) return;
    
    // Ordenar itens por data (mais recentes primeiro)
    galleryItems.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    
    // Renderizar grid de seleção
    gallerySelectionContainer.innerHTML = `
      <h3>Selecione uma imagem para aplicar estilo artístico</h3>
      <div class="gallery-selection-grid">
        ${galleryItems.map(item => {
          return `
            <div class="gallery-selection-item" data-id="${item._id}" data-url="${item.imagemUrl}">
              <div class="gallery-selection-preview">
                <img src="${item.imagemUrl}" alt="${item.titulo || 'Imagem'}" loading="lazy">
              </div>
              <div class="gallery-selection-info">
                <h4>${item.titulo || 'Imagem'}</h4>
                <p>${Utils.formatDate(item.dataCriacao)}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Mostrar container de seleção
    gallerySelectionContainer.style.display = 'block';
    
    // Esconder outros containers
    const styleSelectionContainer = document.getElementById('style-selection-container');
    const noImageContainer = document.getElementById('no-image-container');
    const styleResultContainer = document.getElementById('style-result-container');
    
    if (styleSelectionContainer) styleSelectionContainer.style.display = 'none';
    if (noImageContainer) noImageContainer.style.display = 'none';
    if (styleResultContainer) styleResultContainer.style.display = 'none';
    
    // Configurar eventos para os itens da galeria
    document.querySelectorAll('.gallery-selection-item').forEach(item => {
      item.addEventListener('click', () => {
        const imageId = item.dataset.id;
        const imageUrl = item.dataset.url;
        
        if (imageUrl) {
          setupImageForArtisticStyle(imageUrl, imageId);
        }
      });
    });
  }
  
  // Mostrar mensagem de nenhuma imagem selecionada
  function showNoImageSelected() {
    const noImageContainer = document.getElementById('no-image-container');
    if (!noImageContainer) return;
    
    noImageContainer.innerHTML = `
      <div class="no-image-message">
        <i class="fas fa-image"></i>
        <p>Nenhuma imagem selecionada</p>
        <p>Selecione uma imagem da galeria para aplicar um estilo artístico</p>
      </div>
    `;
    
    // Mostrar container de nenhuma imagem
    noImageContainer.style.display = 'block';
    
    // Esconder outros containers
    const gallerySelectionContainer = document.getElementById('gallery-selection-container');
    const styleSelectionContainer = document.getElementById('style-selection-container');
    const styleResultContainer = document.getElementById('style-result-container');
    
    if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'none';
    if (styleSelectionContainer) styleSelectionContainer.style.display = 'none';
    if (styleResultContainer) styleResultContainer.style.display = 'none';
  }
  
  // Mostrar opção de ir para a galeria
  function showGoToGalleryOption() {
    const noImageContainer = document.getElementById('no-image-container');
    if (!noImageContainer) return;
    
    noImageContainer.innerHTML = `
      <div class="no-image-message">
        <i class="fas fa-images"></i>
        <p>Nenhuma imagem encontrada na galeria</p>
        <p>Adicione imagens à galeria para aplicar estilos artísticos</p>
        <button id="go-to-gallery-btn" class="btn btn-primary">
          <i class="fas fa-arrow-right"></i> Ir para Galeria
        </button>
      </div>
    `;
    
    // Mostrar container de nenhuma imagem
    noImageContainer.style.display = 'block';
    
    // Esconder outros containers
    const gallerySelectionContainer = document.getElementById('gallery-selection-container');
    const styleSelectionContainer = document.getElementById('style-selection-container');
    const styleResultContainer = document.getElementById('style-result-container');
    
    if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'none';
    if (styleSelectionContainer) styleSelectionContainer.style.display = 'none';
    if (styleResultContainer) styleResultContainer.style.display = 'none';
    
    // Configurar botão de ir para galeria
    const goToGalleryBtn = document.getElementById('go-to-gallery-btn');
    if (goToGalleryBtn) {
      goToGalleryBtn.addEventListener('click', () => {
        // Mudar para a aba de galeria
        const galleryTab = document.querySelector('[data-tab="gallery-tab"]');
        if (galleryTab) {
          galleryTab.click();
        }
      });
    }
  }
  
  // Configurar imagem para aplicação de estilo artístico
  function setupImageForArtisticStyle(imageUrl, imageId) {
    if (!imageUrl) return;
    
    // Salvar referências para uso posterior
    window.currentStyleImageUrl = imageUrl;
    window.currentStyleImageId = imageId;
    
    // Mostrar container de seleção de estilo
    const styleSelectionContainer = document.getElementById('style-selection-container');
    if (!styleSelectionContainer) return;
    
    // Atualizar preview da imagem
    const styleImagePreview = document.getElementById('style-image-preview');
    if (styleImagePreview) {
      styleImagePreview.src = imageUrl;
      styleImagePreview.alt = 'Imagem selecionada';
    }
    
    // Mostrar container de seleção de estilo
    styleSelectionContainer.style.display = 'block';
    
    // Esconder outros containers
    const gallerySelectionContainer = document.getElementById('gallery-selection-container');
    const noImageContainer = document.getElementById('no-image-container');
    const styleResultContainer = document.getElementById('style-result-container');
    
    if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'none';
    if (noImageContainer) noImageContainer.style.display = 'none';
    if (styleResultContainer) styleResultContainer.style.display = 'none';
    
    // Resetar resultado de estilo
    resetArtisticStyleResult();
    
    // Configurar navegação de categorias de estilo
    setupStyleCategoryNavigation();
    
    // Configurar eventos para opções de estilo
    setupStyleOptionEventListeners();
    
    // Atualizar recomendações de estilo
    updateStyleRecommendations(imageUrl);
  }
  
  // Resetar resultado de estilo artístico
  function resetArtisticStyleResult() {
    // Limpar seleção de estilo
    document.querySelectorAll('.style-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    // Desabilitar botão de aplicar
    const applyStyleBtn = document.getElementById('apply-style-btn');
    if (applyStyleBtn) {
      applyStyleBtn.disabled = true;
    }
    
    // Limpar estilo selecionado
    window.currentSelectedStyle = null;
  }
  
  // Selecionar estilo artístico
  function selectArtisticStyle(styleId, styleName, stylePreviewUrl) {
    if (!styleId) return;
    
    // Atualizar seleção visual
    document.querySelectorAll('.style-option').forEach(option => {
      if (option.dataset.styleId === styleId) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // Salvar referência para uso posterior
    window.currentSelectedStyle = {
      id: styleId,
      name: styleName,
      previewUrl: stylePreviewUrl
    };
    
    // Habilitar botão de aplicar
    updateApplyButtonState();
  }
  
  // Atualizar recomendações de estilo
  function updateStyleRecommendations(imageUrl) {
    if (!imageUrl) return;
    
    // Implementação simplificada - normalmente faria uma análise da imagem
    console.log('Atualizando recomendações de estilo para a imagem:', imageUrl);
    
    // Obter recomendações
    const recommendations = getStyleRecommendations(imageUrl);
    
    // Atualizar UI com recomendações
    const recommendedStylesContainer = document.getElementById('recommended-styles');
    if (recommendedStylesContainer && recommendations.length) {
      recommendedStylesContainer.innerHTML = `
        <h4>Estilos Recomendados</h4>
        <div class="style-options-grid">
          ${recommendations.map(style => {
            return `
              <div class="style-option" data-style-id="${style.id}" data-style-name="${style.name}" data-preview-url="${style.previewUrl}">
                <div class="style-preview">
                  <img src="${style.previewUrl}" alt="${style.name}" loading="lazy">
                </div>
                <div class="style-name">${style.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      // Mostrar seção de recomendações
      recommendedStylesContainer.style.display = 'block';
      
      // Configurar eventos para opções de estilo
      setupStyleOptionEventListeners();
    }
  }
  
  // Obter recomendações de estilo
  function getStyleRecommendations(imageUrl) {
    // Implementação simplificada - normalmente seria baseado em análise da imagem
    return [
      { id: 'impressionist', name: 'Impressionista', previewUrl: '/images/styles/impressionist.jpg' },
      { id: 'cubism', name: 'Cubismo', previewUrl: '/images/styles/cubism.jpg' },
      { id: 'watercolor', name: 'Aquarela', previewUrl: '/images/styles/watercolor.jpg' }
    ];
  }
  
  // Atualizar estado do botão de aplicar
  function updateApplyButtonState() {
    const applyStyleBtn = document.getElementById('apply-style-btn');
    if (!applyStyleBtn) return;
    
    applyStyleBtn.disabled = !window.currentSelectedStyle;
  }
  
  // Aplicar estilo artístico
  async function applyArtisticStyle() {
    if (!window.currentStyleImageUrl || !window.currentSelectedStyle) {
      alert('Selecione uma imagem e um estilo para continuar');
      return;
    }
    
    try {
      // Mostrar modal de loading
      showArtisticStyleLoadingModal();
      
      // Iniciar simulação de progresso
      simulateArtisticStyleProgress();
      
      // Preparar dados para envio
      const styleData = {
        imageUrl: window.currentStyleImageUrl,
        styleId: window.currentSelectedStyle.id,
        clienteId: window.currentClientId,
        configuracoes: {
          intensidade: document.getElementById('style-intensity') ? 
            parseInt(document.getElementById('style-intensity').value) : 50,
          preservarCores: document.getElementById('preserve-colors-checkbox') ? 
            document.getElementById('preserve-colors-checkbox').checked : false
        }
      };
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/imagens/aplicar-estilo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(styleData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao aplicar estilo artístico');
      }
      
      // Processar resposta
      const styleResult = await response.json();
      
      // Mostrar resultado
      showArtisticStyleResult(styleResult);
      
    } catch (error) {
      console.error('Erro ao aplicar estilo artístico:', error);
      
      // Esconder loading e mostrar erro
      hideArtisticStyleLoadingModal();
      alert('Não foi possível aplicar o estilo artístico. Tente novamente.');
    }
  }
  
  // Mostrar modal de loading para estilo artístico
  function showArtisticStyleLoadingModal() {
    const styleSelectionContainer = document.getElementById('style-selection-container');
    const loadingContainer = document.getElementById('style-loading-container');
    
    if (styleSelectionContainer) styleSelectionContainer.style.display = 'none';
    if (loadingContainer) loadingContainer.style.display = 'flex';
  }
  
  // Esconder modal de loading para estilo artístico
  function hideArtisticStyleLoadingModal() {
    const styleSelectionContainer = document.getElementById('style-selection-container');
    const loadingContainer = document.getElementById('style-loading-container');
    
    if (styleSelectionContainer) styleSelectionContainer.style.display = 'block';
    if (loadingContainer) loadingContainer.style.display = 'none';
  }
  
  // Simular progresso de aplicação de estilo artístico
  function simulateArtisticStyleProgress() {
    const progressBar = document.getElementById('style-progress-bar');
    const progressText = document.getElementById('style-progress-text');
    const progressStage = document.getElementById('style-progress-stage');
    
    if (!progressBar || !progressText || !progressStage) return;
    
    // Estágios de progresso
    const stages = [
      { name: 'Analisando imagem...', duration: 1000 },
      { name: 'Aplicando estilo...', duration: 3000 },
      { name: 'Refinando resultado...', duration: 1500 },
      { name: 'Finalizando...', duration: 500 }
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
    window.currentStyleProgressInterval = progressInterval;
  }
  
  // Mostrar resultado do estilo artístico
  function showArtisticStyleResult(result) {
    // Limpar intervalo de progresso
    if (window.currentStyleProgressInterval) {
      clearInterval(window.currentStyleProgressInterval);
    }
    
    // Esconder loading
    const loadingContainer = document.getElementById('style-loading-container');
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Mostrar container de resultado
    const resultContainer = document.getElementById('style-result-container');
    if (!resultContainer) return;
    
    resultContainer.style.display = 'block';
    
    // Preencher dados do resultado
    const resultImage = document.getElementById('style-result-image');
    if (resultImage) {
      resultImage.src = result.imagemEstilizadaUrl;
      resultImage.alt = 'Imagem Estilizada';
    }
    
    const resultStyleName = document.getElementById('style-result-name');
    if (resultStyleName && window.currentSelectedStyle) {
      resultStyleName.textContent = window.currentSelectedStyle.name;
    }
    
    // Configurar botão de salvar
    const saveStyleBtn = document.getElementById('save-style-btn');
    if (saveStyleBtn) {
      saveStyleBtn.onclick = () => {
        saveStyledImage(result);
      };
    }
    
    // Configurar botão de novo estilo
    const newStyleBtn = document.getElementById('new-style-btn');
    if (newStyleBtn) {
      newStyleBtn.onclick = () => {
        // Esconder resultado
        resultContainer.style.display = 'none';
        
        // Mostrar seleção de imagem
        const gallerySelectionContainer = document.getElementById('gallery-selection-container');
        if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'block';
        
        // Resetar estado
        resetArtisticStyleState();
      };
    }
    
    // Salvar referência para uso posterior
    window.currentStyleResult = result;
  }
  
  // Salvar imagem estilizada
  async function saveStyledImage(styleResult) {
    if (!styleResult) return;
    
    try {
      // Mostrar loading
      const resultContainer = document.getElementById('style-result-container');
      const loadingContainer = document.getElementById('style-loading-container');
      
      if (resultContainer) resultContainer.style.display = 'none';
      if (loadingContainer) {
        loadingContainer.style.display = 'flex';
        
        // Atualizar mensagem de progresso
        const progressStage = document.getElementById('style-progress-stage');
        if (progressStage) progressStage.textContent = 'Salvando imagem estilizada...';
      }
      
      // Preparar dados para envio
      const saveData = {
        imagemEstilizadaUrl: styleResult.imagemEstilizadaUrl,
        imagemOriginalUrl: styleResult.imagemOriginalUrl,
        estiloId: window.currentSelectedStyle ? window.currentSelectedStyle.id : '',
        estiloNome: window.currentSelectedStyle ? window.currentSelectedStyle.name : '',
        clienteId: window.currentClientId,
        titulo: `Estilo ${window.currentSelectedStyle ? window.currentSelectedStyle.name : 'Artístico'}`
      };
      
      // Enviar requisição para o servidor
      const response = await fetch('/api/imagens/salvar-estilo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar imagem estilizada');
      }
      
      // Processar resposta
      const saveResult = await response.json();
      
      // Esconder loading
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Mostrar seleção de imagem
      const gallerySelectionContainer = document.getElementById('gallery-selection-container');
      if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'block';
      
      // Resetar estado
      resetArtisticStyleState();
      
      // Recarregar galeria se estiver disponível
      if (window.AppModules.Gallery && typeof window.AppModules.Gallery.loadClientGallery === 'function') {
        window.AppModules.Gallery.loadClientGallery(window.currentClientId);
      }
      
      // Mostrar mensagem de sucesso
      alert('Imagem estilizada salva com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar imagem estilizada:', error);
      
      // Esconder loading
      const loadingContainer = document.getElementById('style-loading-container');
      if (loadingContainer) loadingContainer.style.display = 'none';
      
      // Mostrar resultado novamente
      const resultContainer = document.getElementById('style-result-container');
      if (resultContainer) resultContainer.style.display = 'block';
      
      // Mostrar erro
      alert('Não foi possível salvar a imagem estilizada. Tente novamente.');
    }
  }
  
  // Resetar estado do estilo artístico
  function resetArtisticStyleState() {
    // Limpar seleção de estilo
    window.currentSelectedStyle = null;
    
    // Limpar resultado
    window.currentStyleResult = null;
  }
  
  // Configurar navegação de categorias de estilo
  function setupStyleCategoryNavigation() {
    const categoryTabs = document.querySelectorAll('.style-category-tab');
    const categoryContents = document.querySelectorAll('.style-category-content');
    
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category;
        
        // Atualizar tabs
        categoryTabs.forEach(t => {
          if (t.dataset.category === category) {
            t.classList.add('active');
          } else {
            t.classList.remove('active');
          }
        });
        
        // Atualizar conteúdos
        categoryContents.forEach(content => {
          if (content.dataset.category === category) {
            content.style.display = 'block';
          } else {
            content.style.display = 'none';
          }
        });
      });
    });
    
    // Ativar primeira categoria por padrão
    if (categoryTabs.length > 0) {
      categoryTabs[0].click();
    }
  }
  
  // Configurar eventos do módulo
  function setupArtisticStyleEvents() {
    // Botão para aplicar estilo
    const applyStyleBtn = document.getElementById('apply-style-btn');
    if (applyStyleBtn) {
      applyStyleBtn.addEventListener('click', applyArtisticStyle);
    }
    
    // Botão para voltar à seleção de imagem
    const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
    if (backToGalleryBtn) {
      backToGalleryBtn.addEventListener('click', () => {
        // Esconder seleção de estilo
        const styleSelectionContainer = document.getElementById('style-selection-container');
        if (styleSelectionContainer) styleSelectionContainer.style.display = 'none';
        
        // Mostrar seleção de imagem
        const gallerySelectionContainer = document.getElementById('gallery-selection-container');
        if (gallerySelectionContainer) gallerySelectionContainer.style.display = 'block';
      });
    }
    
    // Controle de intensidade
    const intensityControl = document.getElementById('style-intensity');
    if (intensityControl) {
      intensityControl.addEventListener('input', () => {
        const intensityValue = document.getElementById('style-intensity-value');
        if (intensityValue) {
          intensityValue.textContent = intensityControl.value;
        }
      });
    }
  }
  
  // Configurar listeners para opções de estilo
  function setupStyleOptionEventListeners() {
    document.querySelectorAll('.style-option').forEach(option => {
      option.addEventListener('click', () => {
        const styleId = option.dataset.styleId;
        const styleName = option.dataset.styleName;
        const previewUrl = option.dataset.previewUrl;
        
        if (styleId) {
          selectArtisticStyle(styleId, styleName, previewUrl);
        }
      });
    });
  }
  
  // Alternar seção artística
  function toggleArtisticSection(show) {
    const artisticStyleContainer = document.getElementById('artistic-style-container');
    if (!artisticStyleContainer) {
      console.log('Elemento artistic-style-container não encontrado');
      return;
    }
    
    if (show) {
      artisticStyleContainer.style.display = 'block';
      showArtisticStyleSection();
    } else {
      artisticStyleContainer.style.display = 'none';
    }
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Configurar eventos
    setupArtisticStyleEvents();
    
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId && document.getElementById('artistic-style-container').style.display !== 'none') {
        showArtisticStyleSection();
      }
    });
    
    // Escutar evento de mudança de aba
    document.addEventListener('tab-changed', (event) => {
      const { tabId } = event.detail;
      if (tabId === 'artistic-style-tab') {
        toggleArtisticSection(true);
      } else {
        toggleArtisticSection(false);
      }
    });
  }
  
  // Retornar API pública do módulo
  return {
    init,
    showArtisticStyleSection,
    applyArtisticStyle
  };
})();
