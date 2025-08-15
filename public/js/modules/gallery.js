// ===== MÓDULO DE GALERIA =====
window.AppModules = window.AppModules || {};

window.AppModules.Gallery = (function() {
  'use strict';
  
  // Dependências
  const Utils = window.AppModules.Utils;
  
  // ===== FUNÇÕES PARA GERENCIAMENTO DA GALERIA =====
  
  // Carregar galeria de um cliente
  async function loadClientGallery(clientId) {
    if (!clientId) return;
    
    try {
      const galleryContainer = document.getElementById('gallery-container');
      if (!galleryContainer) return;
      
      // Mostrar loading state
      galleryContainer.innerHTML = `
        <div class="tab-loading">
          <div class="loading-spinner"></div>
          <p>Carregando galeria...</p>
        </div>
      `;
      
      // Fazer requisição para o servidor
      const response = await fetch(`/api/clientes/${clientId}/galeria`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar galeria');
      }
      
      // Processar resposta
      const galleryItems = await response.json();
      
      // Verificar se há itens na galeria
      if (!galleryItems.length) {
        galleryContainer.innerHTML = `
          <div class="gallery-empty">
            <i class="fas fa-images"></i>
            <p>Nenhuma imagem encontrada na galeria</p>
            <p class="gallery-empty-hint">Crie mockups ou edite imagens para adicionar à galeria</p>
          </div>
        `;
        return;
      }
      
      // Renderizar galeria
      renderGallery(galleryItems);
      
      // Configurar eventos da galeria
      setupGalleryEvents();
      
      // Configurar filtros da galeria
      setupGalleryFilters();
      
      // Configurar botão de atualização
      setupGalleryRefreshButton(clientId);
      
    } catch (error) {
      console.error('Erro ao carregar galeria:', error);
      
      const galleryContainer = document.getElementById('gallery-container');
      if (galleryContainer) {
        galleryContainer.innerHTML = `
          <div class="gallery-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>Erro ao carregar galeria. Tente novamente.</p>
            <button id="refresh-gallery-btn" class="btn btn-primary">
              <i class="fas fa-sync-alt"></i> Atualizar
            </button>
          </div>
        `;
        
        // Configurar botão de atualização
        const refreshBtn = document.getElementById('refresh-gallery-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            loadClientGallery(clientId);
          });
        }
      }
    }
  }
  
  // Renderizar galeria
  function renderGallery(galleryItems) {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
    // Ordenar itens por data (mais recentes primeiro)
    galleryItems.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    
    // Renderizar header e grid
    galleryContainer.innerHTML = `
      <div class="gallery-header">
        <h3>Galeria de Imagens</h3>
        <div class="gallery-filters">
          <div class="filter-group">
            <label for="gallery-filter">Filtrar por:</label>
            <select id="gallery-filter" class="form-control">
              <option value="all">Todas as imagens</option>
              <option value="mockup">Mockups</option>
              <option value="edited">Imagens editadas</option>
              <option value="styled">Estilos artísticos</option>
            </select>
          </div>
          <button id="refresh-gallery-btn" class="btn btn-primary">
            <i class="fas fa-sync-alt"></i> Atualizar
          </button>
        </div>
      </div>
      <div class="gallery-grid">
        ${galleryItems.map(item => {
          let typeIcon = 'fa-image';
          let typeLabel = 'Imagem';
          
          if (item.tipo === 'mockup') {
            typeIcon = 'fa-object-group';
            typeLabel = 'Mockup';
          } else if (item.tipo === 'edited') {
            typeIcon = 'fa-edit';
            typeLabel = 'Editada';
          } else if (item.tipo === 'styled') {
            typeIcon = 'fa-paint-brush';
            typeLabel = 'Estilo artístico';
          }
          
          return `
            <div class="gallery-item" data-id="${item._id}" data-type="${item.tipo}">
              <div class="gallery-item-preview">
                <img src="${item.imagemUrl}" alt="${item.titulo || 'Imagem'}" loading="lazy">
              </div>
              <div class="gallery-item-info">
                <h4>${item.titulo || 'Imagem'}</h4>
                <div class="gallery-item-meta">
                  <span class="gallery-item-type">
                    <i class="fas ${typeIcon}"></i> ${typeLabel}
                  </span>
                  <span class="gallery-item-date">
                    <i class="fas fa-calendar-alt"></i> ${Utils.formatDate(item.dataCriacao)}
                  </span>
                </div>
              </div>
              <div class="gallery-item-actions">
                <button class="btn btn-sm btn-primary view-gallery-item-btn" title="Visualizar">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary download-gallery-item-btn" title="Download">
                  <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-gallery-item-btn" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  // Configurar eventos da galeria
  function setupGalleryEvents() {
    // Configurar eventos para os botões de visualização
    document.querySelectorAll('.view-gallery-item-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const galleryItem = e.target.closest('.gallery-item');
        if (galleryItem) {
          const itemId = galleryItem.dataset.id;
          viewGalleryImage(itemId);
        }
      });
    });
    
    // Configurar eventos para os botões de download
    document.querySelectorAll('.download-gallery-item-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const galleryItem = e.target.closest('.gallery-item');
        if (galleryItem) {
          const itemId = galleryItem.dataset.id;
          downloadGalleryImage(itemId);
        }
      });
    });
    
    // Configurar eventos para os botões de exclusão
    document.querySelectorAll('.delete-gallery-item-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const galleryItem = e.target.closest('.gallery-item');
        if (galleryItem) {
          const itemId = galleryItem.dataset.id;
          if (confirm('Tem certeza que deseja excluir esta imagem da galeria?')) {
            deleteGalleryImage(itemId);
          }
        }
      });
    });
    
    // Configurar eventos para os itens da galeria (clique na imagem)
    document.querySelectorAll('.gallery-item-preview').forEach(preview => {
      preview.addEventListener('click', (e) => {
        const galleryItem = e.target.closest('.gallery-item');
        if (galleryItem) {
          const itemId = galleryItem.dataset.id;
          viewGalleryImage(itemId);
        }
      });
    });
  }
  
  // Configurar filtros da galeria
  function setupGalleryFilters() {
    const galleryFilter = document.getElementById('gallery-filter');
    if (galleryFilter) {
      galleryFilter.addEventListener('change', () => {
        applyGalleryFilter(galleryFilter.value);
      });
    }
  }
  
  // Aplicar filtro à galeria
  function applyGalleryFilter(filterValue) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
      if (filterValue === 'all' || item.dataset.type === filterValue) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
  // Configurar botão de atualização da galeria
  function setupGalleryRefreshButton(clientId) {
    const refreshBtn = document.getElementById('refresh-gallery-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadClientGallery(clientId);
      });
    }
  }
  
  // Visualizar imagem da galeria
  async function viewGalleryImage(imageId) {
    if (!imageId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/galeria/${imageId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar imagem');
      }
      
      // Processar resposta
      const imageData = await response.json();
      
      // Mostrar modal de visualização
      const galleryModal = document.getElementById('gallery-modal');
      if (!galleryModal) return;
      
      galleryModal.style.display = 'flex';
      
      // Preencher dados da imagem
      const modalTitle = document.getElementById('gallery-modal-title');
      const modalImage = document.getElementById('gallery-modal-image');
      const modalDate = document.getElementById('gallery-modal-date');
      const modalType = document.getElementById('gallery-modal-type');
      const modalDescription = document.getElementById('gallery-modal-description');
      
      if (modalTitle) modalTitle.textContent = imageData.titulo || 'Imagem';
      
      if (modalImage) {
        modalImage.src = imageData.imagemUrl;
        modalImage.alt = imageData.titulo || 'Imagem';
      }
      
      if (modalDate) modalDate.textContent = Utils.formatDate(imageData.dataCriacao);
      
      if (modalType) {
        let typeLabel = 'Imagem';
        
        if (imageData.tipo === 'mockup') {
          typeLabel = 'Mockup';
        } else if (imageData.tipo === 'edited') {
          typeLabel = 'Imagem Editada';
        } else if (imageData.tipo === 'styled') {
          typeLabel = 'Estilo Artístico';
        }
        
        modalType.textContent = typeLabel;
      }
      
      if (modalDescription) {
        if (imageData.descricao) {
          modalDescription.textContent = imageData.descricao;
          modalDescription.parentElement.style.display = 'block';
        } else {
          modalDescription.parentElement.style.display = 'none';
        }
      }
      
      // Configurar botão de download
      const downloadBtn = document.getElementById('gallery-modal-download');
      if (downloadBtn) {
        downloadBtn.href = imageData.imagemUrl;
        downloadBtn.download = imageData.titulo || 'imagem';
      }
      
      // Configurar botão de exclusão
      const deleteBtn = document.getElementById('gallery-modal-delete');
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          if (confirm('Tem certeza que deseja excluir esta imagem da galeria?')) {
            deleteGalleryImage(imageId);
            
            // Fechar modal
            galleryModal.style.display = 'none';
          }
        };
      }
      
      // Configurar eventos do modal
      setupGalleryModalEvents();
      
    } catch (error) {
      console.error('Erro ao visualizar imagem:', error);
      alert('Não foi possível carregar a imagem. Tente novamente.');
    }
  }
  
  // Configurar eventos do modal da galeria
  function setupGalleryModalEvents() {
    // Botão para fechar modal
    const closeModalBtn = document.getElementById('gallery-modal-close');
    const galleryModal = document.getElementById('gallery-modal');
    
    if (closeModalBtn && galleryModal) {
      closeModalBtn.onclick = () => {
        galleryModal.style.display = 'none';
      };
    }
    
    // Fechar modal ao clicar fora da imagem
    if (galleryModal) {
      galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) {
          galleryModal.style.display = 'none';
        }
      });
    }
  }
  
  // Download de imagem da galeria
  async function downloadGalleryImage(imageId) {
    if (!imageId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/galeria/${imageId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar imagem');
      }
      
      // Processar resposta
      const imageData = await response.json();
      
      // Criar link de download
      const downloadLink = document.createElement('a');
      downloadLink.href = imageData.imagemUrl;
      downloadLink.download = imageData.titulo || 'imagem';
      downloadLink.target = '_blank';
      
      // Adicionar ao documento e clicar
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Remover link
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      alert('Não foi possível baixar a imagem. Tente novamente.');
    }
  }
  
  // Excluir imagem da galeria
  async function deleteGalleryImage(imageId) {
    if (!imageId) return;
    
    try {
      // Fazer requisição para o servidor
      const response = await fetch(`/api/galeria/${imageId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir imagem');
      }
      
      // Recarregar galeria
      loadClientGallery(window.currentClientId);
      
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      alert('Não foi possível excluir a imagem. Tente novamente.');
    }
  }
  
  // ===== INICIALIZAÇÃO DO MÓDULO =====
  
  // Função de inicialização
  function init() {
    // Escutar evento de cliente selecionado
    document.addEventListener('client-selected', (event) => {
      const { clientId } = event.detail;
      if (clientId) {
        loadClientGallery(clientId);
      }
    });
  }
  
  // Retornar API pública do módulo
  return {
    init,
    loadClientGallery
  };
})();
