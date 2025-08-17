// Função para abrir o editor de imagens
function openImageEditor(imageId) {
  if (!imageId) return;
  
  // Redirecionar para a página do editor com o ID da imagem
  window.location.href = `/api/mockups-edit/editor/${imageId}`;
}

// Adicionar evento de clique para o botão de edição na galeria
document.addEventListener('DOMContentLoaded', function() {
  // Configurar delegação de eventos para botões de edição na galeria
  document.body.addEventListener('click', function(e) {
    // Verificar se o clique foi em um botão de edição
    if (e.target.closest('.gallery-edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Obter o item da galeria
      const galleryItem = e.target.closest('.gallery-item');
      if (!galleryItem) return;
      
      // Obter o ID da imagem
      const imageId = galleryItem.dataset.imageId;
      if (!imageId) {
        console.error('ID da imagem não encontrado');
        return;
      }
      
      // Abrir o editor
      openImageEditor(imageId);
    }
  });
});
