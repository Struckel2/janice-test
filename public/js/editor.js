// Editor de Imagens - JavaScript

// Variáveis globais
let canvas;
let originalImage;
let imageId;
let undoStack = [];
let redoStack = [];
let currentFilter = 'none';
let isDrawing = false;
let cropMode = false;
let cropRect = null;
let adjustmentValues = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar o canvas com Fabric.js
    canvas = new fabric.Canvas('editor-canvas', {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff'
    });

    // Obter o ID da imagem da URL
    const urlParams = new URLSearchParams(window.location.search);
    const pathSegments = window.location.pathname.split('/');
    imageId = pathSegments[pathSegments.length - 1];

    if (!imageId) {
        showError('ID da imagem não encontrado na URL');
        return;
    }

    // Carregar a imagem
    loadImage(imageId);

    // Configurar eventos de ferramentas
    setupToolEvents();
    
    // Configurar eventos de propriedades
    setupPropertyEvents();
    
    // Configurar eventos de modais
    setupModalEvents();
    
    // Configurar eventos de canvas
    setupCanvasEvents();
    
    // Configurar eventos de botões de ação
    setupActionEvents();
});

// Função para carregar a imagem
async function loadImage(imageId) {
    try {
        const response = await fetch(`/api/mockups-edit/image/${imageId}`);
        if (!response.ok) {
            throw new Error(`Erro ao carregar imagem: ${response.status}`);
        }
        
        const imageData = await response.json();
        
        // Carregar a imagem no canvas
        fabric.Image.fromURL(imageData.url, (img) => {
            // Redimensionar a imagem para caber no canvas mantendo a proporção
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            ) * 0.9;
            
            img.scale(scale);
            img.set({
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true
            });
            
            // Limpar o canvas e adicionar a imagem
            canvas.clear();
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            
            // Salvar a imagem original para referência
            originalImage = img;
            
            // Adicionar ao histórico de desfazer
            addToUndoStack();
            
            // Esconder o overlay de carregamento
            document.getElementById('loading-overlay').style.display = 'none';
            
            // Mostrar propriedades da imagem
            showImageProperties();
        });
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        showError(`Erro ao carregar imagem: ${error.message}`);
    }
}

// Função para mostrar erro
function showError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--error-color); margin-bottom: 15px;"></i>
            <p style="color: var(--error-color); font-weight: bold;">${message}</p>
            <button id="back-to-gallery" class="action-button" style="margin-top: 15px;">
                <i class="fas fa-arrow-left"></i> Voltar para a Galeria
            </button>
        </div>
    `;
    
    // Adicionar evento ao botão de voltar
    document.getElementById('back-to-gallery').addEventListener('click', () => {
        window.history.back();
    });
}

// Configurar eventos de ferramentas
function setupToolEvents() {
    // Ferramenta de seleção
    document.getElementById('select-tool').addEventListener('click', () => {
        setActiveTool('select-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.forEachObject(obj => {
            obj.selectable = true;
        });
        updatePropertiesPanel();
    });
    
    // Ferramenta de recorte
    document.getElementById('crop-tool').addEventListener('click', () => {
        setActiveTool('crop-tool');
        enterCropMode();
        updatePropertiesPanel();
    });
    
    // Ferramenta de rotação
    document.getElementById('rotate-tool').addEventListener('click', () => {
        setActiveTool('rotate-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        updatePropertiesPanel();
    });
    
    // Ferramenta de texto
    document.getElementById('text-tool').addEventListener('click', () => {
        setActiveTool('text-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        addText();
        updatePropertiesPanel();
    });
    
    // Ferramenta de desenho
    document.getElementById('draw-tool').addEventListener('click', () => {
        setActiveTool('draw-tool');
        exitCropMode();
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = parseInt(document.getElementById('brush-width').value, 10) || 5;
        canvas.freeDrawingBrush.color = document.getElementById('brush-color').value || '#000000';
        updatePropertiesPanel();
    });
    
    // Ferramenta de formas
    document.getElementById('shape-tool').addEventListener('click', () => {
        setActiveTool('shape-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        document.getElementById('shapes-modal').classList.add('show');
        updatePropertiesPanel();
    });
    
    // Ferramentas de ajuste
    document.getElementById('brightness-tool').addEventListener('click', () => {
        setActiveTool('brightness-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        updatePropertiesPanel();
    });
    
    document.getElementById('contrast-tool').addEventListener('click', () => {
        setActiveTool('contrast-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        updatePropertiesPanel();
    });
    
    document.getElementById('saturation-tool').addEventListener('click', () => {
        setActiveTool('saturation-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        updatePropertiesPanel();
    });
    
    document.getElementById('blur-tool').addEventListener('click', () => {
        setActiveTool('blur-tool');
        exitCropMode();
        canvas.isDrawingMode = false;
        updatePropertiesPanel();
    });
    
    // Filtros
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', () => {
            const filterId = button.id.replace('filter-', '');
            applyFilter(filterId);
            
            // Atualizar botões de filtro
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });
}

// Configurar eventos de propriedades
function setupPropertyEvents() {
    // Propriedades de texto
    document.getElementById('text-content').addEventListener('input', updateTextProperties);
    document.getElementById('text-font').addEventListener('change', updateTextProperties);
    document.getElementById('text-size').addEventListener('input', updateTextProperties);
    document.getElementById('text-color').addEventListener('input', updateTextProperties);
    document.getElementById('text-bold').addEventListener('click', toggleTextStyle);
    document.getElementById('text-italic').addEventListener('click', toggleTextStyle);
    document.getElementById('text-underline').addEventListener('click', toggleTextStyle);
    document.getElementById('text-align-left').addEventListener('click', setTextAlign);
    document.getElementById('text-align-center').addEventListener('click', setTextAlign);
    document.getElementById('text-align-right').addEventListener('click', setTextAlign);
    
    // Propriedades de forma
    document.getElementById('shape-color').addEventListener('input', updateShapeProperties);
    document.getElementById('shape-border-color').addEventListener('input', updateShapeProperties);
    document.getElementById('shape-border-width').addEventListener('input', updateShapeProperties);
    document.getElementById('shape-opacity').addEventListener('input', updateShapeProperties);
    
    // Propriedades de desenho
    document.getElementById('brush-color').addEventListener('input', updateBrushProperties);
    document.getElementById('brush-width').addEventListener('input', updateBrushProperties);
    
    // Propriedades de imagem
    document.getElementById('image-opacity').addEventListener('input', updateImageProperties);
    document.getElementById('flip-horizontal').addEventListener('click', flipImage);
    document.getElementById('flip-vertical').addEventListener('click', flipImage);
    
    // Propriedades de ajustes
    document.getElementById('brightness-value').addEventListener('input', updateAdjustmentValue);
    document.getElementById('contrast-value').addEventListener('input', updateAdjustmentValue);
    document.getElementById('saturation-value').addEventListener('input', updateAdjustmentValue);
    document.getElementById('blur-value').addEventListener('input', updateAdjustmentValue);
    document.getElementById('apply-adjustments').addEventListener('click', applyAdjustments);
    
    // Propriedades de recorte
    document.getElementById('apply-crop').addEventListener('click', applyCrop);
    document.getElementById('cancel-crop').addEventListener('click', exitCropMode);
    
    // Propriedades de rotação
    document.getElementById('rotation-angle').addEventListener('input', updateRotationAngle);
    document.getElementById('rotate-left').addEventListener('click', rotateLeft);
    document.getElementById('rotate-right').addEventListener('click', rotateRight);
    document.getElementById('apply-rotation').addEventListener('click', applyRotation);
}

// Configurar eventos de modais
function setupModalEvents() {
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.classList.remove('show');
        });
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Modal de salvar
    document.getElementById('save-btn').addEventListener('click', () => {
        // Preparar prévia
        const preview = document.getElementById('save-preview');
        preview.innerHTML = '';
        
        const previewImg = new Image();
        previewImg.src = canvas.toDataURL({
            format: document.getElementById('save-format').value || 'webp',
            quality: parseInt(document.getElementById('save-quality').value, 10) / 100 || 0.9
        });
        preview.appendChild(previewImg);
        
        // Mostrar modal
        document.getElementById('save-modal').classList.add('show');
    });
    
    // Atualizar prévia quando mudar formato ou qualidade
    document.getElementById('save-format').addEventListener('change', updateSavePreview);
    document.getElementById('save-quality').addEventListener('input', updateSavePreview);
    document.getElementById('save-quality').addEventListener('input', () => {
        document.getElementById('save-quality-value').textContent = `${document.getElementById('save-quality').value}%`;
    });
    
    // Botões do modal de salvar
    document.getElementById('confirm-save').addEventListener('click', saveImage);
    document.getElementById('cancel-save').addEventListener('click', () => {
        document.getElementById('save-modal').classList.remove('show');
    });
    
    // Modal de formas
    document.querySelectorAll('.shape-item').forEach(item => {
        item.addEventListener('click', () => {
            const shapeType = item.dataset.shape;
            addShape(shapeType);
            document.getElementById('shapes-modal').classList.remove('show');
        });
    });
}

// Configurar eventos de canvas
function setupCanvasEvents() {
    // Evento de seleção
    canvas.on('selection:created', updatePropertiesPanel);
    canvas.on('selection:updated', updatePropertiesPanel);
    canvas.on('selection:cleared', updatePropertiesPanel);
    
    // Evento de modificação de objeto
    canvas.on('object:modified', () => {
        addToUndoStack();
    });
    
    // Evento de adição de objeto
    canvas.on('object:added', () => {
        if (!isDrawing) {
            addToUndoStack();
        }
    });
    
    // Evento de remoção de objeto
    canvas.on('object:removed', () => {
        if (!isDrawing) {
            addToUndoStack();
        }
    });
    
    // Eventos de desenho
    canvas.on('path:created', () => {
        addToUndoStack();
    });
    
    canvas.on('mouse:down', () => {
        if (canvas.isDrawingMode) {
            isDrawing = true;
        }
    });
    
    canvas.on('mouse:up', () => {
        if (isDrawing) {
            isDrawing = false;
        }
    });
}

// Configurar eventos de botões de ação
function setupActionEvents() {
    // Botão de voltar
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });
    
    // Botão de download
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    
    // Botão de desfazer
    document.getElementById('undo-btn').addEventListener('click', undo);
    
    // Botão de refazer
    document.getElementById('redo-btn').addEventListener('click', redo);
    
    // Botão de resetar
    document.getElementById('reset-btn').addEventListener('click', resetImage);
}

// Função para definir a ferramenta ativa
function setActiveTool(toolId) {
    // Remover classe ativa de todas as ferramentas
    document.querySelectorAll('.tool-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Adicionar classe ativa à ferramenta selecionada
    document.getElementById(toolId).classList.add('active');
}

// Função para atualizar o painel de propriedades
function updatePropertiesPanel() {
    // Esconder todos os grupos de propriedades
    document.querySelectorAll('.property-group').forEach(group => {
        group.style.display = 'none';
    });
    
    // Mostrar mensagem de nenhuma seleção por padrão
    document.getElementById('no-selection-message').style.display = 'block';
    
    // Verificar qual ferramenta está ativa
    const activeTool = document.querySelector('.tool-button.active');
    if (!activeTool) return;
    
    const toolId = activeTool.id;
    
    // Mostrar propriedades com base na ferramenta ativa
    switch (toolId) {
        case 'draw-tool':
            document.getElementById('draw-properties').style.display = 'block';
            document.getElementById('no-selection-message').style.display = 'none';
            break;
        case 'crop-tool':
            document.getElementById('crop-properties').style.display = 'block';
            document.getElementById('no-selection-message').style.display = 'none';
            break;
        case 'rotate-tool':
            document.getElementById('rotate-properties').style.display = 'block';
            document.getElementById('no-selection-message').style.display = 'none';
            break;
        case 'brightness-tool':
        case 'contrast-tool':
        case 'saturation-tool':
        case 'blur-tool':
            document.getElementById('adjustment-properties').style.display = 'block';
            document.getElementById('no-selection-message').style.display = 'none';
            break;
        default:
            // Verificar se há um objeto selecionado
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
                document.getElementById('no-selection-message').style.display = 'none';
                
                // Mostrar propriedades com base no tipo de objeto
                if (activeObject.type === 'textbox') {
                    document.getElementById('text-properties').style.display = 'block';
                    updateTextControls(activeObject);
                } else if (activeObject.type === 'rect' || activeObject.type === 'circle' || 
                           activeObject.type === 'triangle' || activeObject.type === 'polygon' ||
                           activeObject.type === 'line') {
                    document.getElementById('shape-properties').style.display = 'block';
                    updateShapeControls(activeObject);
                } else if (activeObject.type === 'image') {
                    document.getElementById('image-properties').style.display = 'block';
                    updateImageControls(activeObject);
                }
            }
            break;
    }
}

// Função para atualizar controles de texto
function updateTextControls(textObject) {
    document.getElementById('text-content').value = textObject.text;
    document.getElementById('text-font').value = textObject.fontFamily;
    document.getElementById('text-size').value = textObject.fontSize;
    document.getElementById('text-size-value').textContent = `${textObject.fontSize}px`;
    document.getElementById('text-color').value = textObject.fill;
    
    // Atualizar botões de estilo
    document.getElementById('text-bold').classList.toggle('active', textObject.fontWeight === 'bold');
    document.getElementById('text-italic').classList.toggle('active', textObject.fontStyle === 'italic');
    document.getElementById('text-underline').classList.toggle('active', textObject.underline);
    
    // Atualizar botões de alinhamento
    document.getElementById('text-align-left').classList.toggle('active', textObject.textAlign === 'left');
    document.getElementById('text-align-center').classList.toggle('active', textObject.textAlign === 'center');
    document.getElementById('text-align-right').classList.toggle('active', textObject.textAlign === 'right');
}

// Função para atualizar controles de forma
function updateShapeControls(shapeObject) {
    document.getElementById('shape-color').value = shapeObject.fill || '#ffffff';
    document.getElementById('shape-border-color').value = shapeObject.stroke || '#000000';
    document.getElementById('shape-border-width').value = shapeObject.strokeWidth || 0;
    document.getElementById('shape-border-width-value').textContent = `${shapeObject.strokeWidth || 0}px`;
    document.getElementById('shape-opacity').value = shapeObject.opacity * 100;
    document.getElementById('shape-opacity-value').textContent = `${Math.round(shapeObject.opacity * 100)}%`;
}

// Função para atualizar controles de imagem
function updateImageControls(imageObject) {
    document.getElementById('image-opacity').value = imageObject.opacity * 100;
    document.getElementById('image-opacity-value').textContent = `${Math.round(imageObject.opacity * 100)}%`;
}

// Função para atualizar propriedades de texto
function updateTextProperties() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') return;
    
    const textContent = document.getElementById('text-content').value;
    const fontFamily = document.getElementById('text-font').value;
    const fontSize = parseInt(document.getElementById('text-size').value, 10);
    const textColor = document.getElementById('text-color').value;
    
    activeObject.set({
        text: textContent,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: textColor
    });
    
    document.getElementById('text-size-value').textContent = `${fontSize}px`;
    
    canvas.renderAll();
}

// Função para alternar estilo de texto
function toggleTextStyle(e) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') return;
    
    const button = e.currentTarget;
    const styleType = button.id.replace('text-', '');
    
    button.classList.toggle('active');
    
    switch (styleType) {
        case 'bold':
            activeObject.set('fontWeight', button.classList.contains('active') ? 'bold' : 'normal');
            break;
        case 'italic':
            activeObject.set('fontStyle', button.classList.contains('active') ? 'italic' : 'normal');
            break;
        case 'underline':
            activeObject.set('underline', button.classList.contains('active'));
            break;
    }
    
    canvas.renderAll();
}

// Função para definir alinhamento de texto
function setTextAlign(e) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') return;
    
    const button = e.currentTarget;
    const alignType = button.id.replace('text-align-', '');
    
    // Remover classe ativa de todos os botões de alinhamento
    document.querySelectorAll('[id^="text-align-"]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adicionar classe ativa ao botão clicado
    button.classList.add('active');
    
    // Definir alinhamento
    activeObject.set('textAlign', alignType);
    canvas.renderAll();
}

// Função para atualizar propriedades de forma
function updateShapeProperties() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    const fillColor = document.getElementById('shape-color').value;
    const strokeColor = document.getElementById('shape-border-color').value;
    const strokeWidth = parseInt(document.getElementById('shape-border-width').value, 10);
    const opacity = parseInt(document.getElementById('shape-opacity').value, 10) / 100;
    
    activeObject.set({
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        opacity: opacity
    });
    
    document.getElementById('shape-border-width-value').textContent = `${strokeWidth}px`;
    document.getElementById('shape-opacity-value').textContent = `${Math.round(opacity * 100)}%`;
    
    canvas.renderAll();
}

// Função para atualizar propriedades de pincel
function updateBrushProperties() {
    const brushColor = document.getElementById('brush-color').value;
    const brushWidth = parseInt(document.getElementById('brush-width').value, 10);
    
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushWidth;
    
    document.getElementById('brush-width-value').textContent = `${brushWidth}px`;
}

// Função para atualizar propriedades de imagem
function updateImageProperties() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') return;
    
    const opacity = parseInt(document.getElementById('image-opacity').value, 10) / 100;
    
    activeObject.set({
        opacity: opacity
    });
    
    document.getElementById('image-opacity-value').textContent = `${Math.round(opacity * 100)}%`;
    
    canvas.renderAll();
}

// Função para espelhar imagem
function flipImage(e) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    const direction = e.currentTarget.id;
    
    if (direction === 'flip-horizontal') {
        activeObject.set('flipX', !activeObject.flipX);
    } else if (direction === 'flip-vertical') {
        activeObject.set('flipY', !activeObject.flipY);
    }
    
    canvas.renderAll();
    addToUndoStack();
}

// Função para atualizar valor de ajuste
function updateAdjustmentValue(e) {
    const slider = e.currentTarget;
    const type = slider.id.replace('-value', '');
    const value = parseInt(slider.value, 10);
    
    adjustmentValues[type] = value;
    
    document.getElementById(`${type}-value-display`).textContent = value;
}

// Função para aplicar ajustes
function applyAdjustments() {
    // Verificar se há uma imagem no canvas
    const objects = canvas.getObjects();
    const imageObject = objects.find(obj => obj.type === 'image');
    
    if (!imageObject) return;
    
    // Criar um filtro de ajuste personalizado
    const filter = new fabric.Image.filters.BlendColor({
        color: '#ffffff',
        mode: 'tint',
        alpha: 0
    });
    
    // Aplicar ajustes
    applyImageAdjustments(imageObject);
    
    // Renderizar canvas
    canvas.renderAll();
    
    // Adicionar ao histórico
    addToUndoStack();
}

// Função para aplicar ajustes à imagem
function applyImageAdjustments(imageObject) {
    // Remover filtros existentes
    imageObject.filters = [];
    
    // Aplicar brilho
    if (adjustmentValues.brightness !== 0) {
        const brightness = adjustmentValues.brightness / 100;
        imageObject.filters.push(new fabric.Image.filters.Brightness({
            brightness: brightness
        }));
    }
    
    // Aplicar contraste
    if (adjustmentValues.contrast !== 0) {
        const contrast = adjustmentValues.contrast / 100;
        imageObject.filters.push(new fabric.Image.filters.Contrast({
            contrast: contrast
        }));
    }
    
    // Aplicar saturação
    if (adjustmentValues.saturation !== 0) {
        const saturation = adjustmentValues.saturation / 100;
        imageObject.filters.push(new fabric.Image.filters.Saturation({
            saturation: 1 + saturation
        }));
    }
    
    // Aplicar desfoque
    if (adjustmentValues.blur > 0) {
        imageObject.filters.push(new fabric.Image.filters.Blur({
            blur: adjustmentValues.blur / 10
        }));
    }
    
    // Aplicar filtros
    imageObject.applyFilters();
}

// Função para entrar no modo de recorte
function enterCropMode() {
    cropMode = true;
    
    // Desativar seleção de objetos
    canvas.selection = false;
    canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
    });
    
    // Criar retângulo de recorte
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    cropRect = new fabric.Rect({
        left: canvasWidth * 0.2,
        top: canvasHeight * 0.2,
        width: canvasWidth * 0.6,
        height: canvasHeight * 0.6,
        fill: 'rgba(0,0,0,0.1)',
        stroke: '#ffffff',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true
    });
    
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    canvas.renderAll();
}

// Função para sair do modo de recorte
function exitCropMode() {
    if (!cropMode) return;
    
    cropMode = false;
    
    // Remover retângulo de recorte
    if (cropRect) {
        canvas.remove(cropRect);
        cropRect = null;
    }
    
    // Reativar seleção de objetos
    canvas.selection = true;
    canvas.forEachObject(obj => {
        obj.selectable = true;
        obj.evented = true;
    });
    
    canvas.renderAll();
}

// Função para aplicar recorte
function applyCrop() {
    if (!cropMode || !cropRect) return;
    
    // Obter coordenadas do retângulo de recorte
    const cropX = cropRect.left - cropRect.width / 2;
    const cropY = cropRect.top - cropRect.height / 2;
    const cropWidth = cropRect.width;
    const cropHeight = cropRect.height;
    
    // Criar novo canvas para o recorte
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Renderizar apenas a área de recorte
    const dataUrl = canvas.toDataURL({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
        format: 'png'
    });
    
    // Carregar a imagem recortada
    const img = new Image();
    img.onload = function() {
        // Limpar o canvas
        canvas.clear();
        
        // Criar nova imagem com o recorte
        fabric.Image.fromURL(img.src, function(oImg) {
            // Centralizar a imagem no canvas
            oImg.set({
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true
            });
            
            canvas.add(oImg);
            canvas.setActiveObject(oImg);
            canvas.renderAll();
            
            // Sair do modo de recorte
            exitCropMode();
            
            // Adicionar ao histórico
            addToUndoStack();
        });
    };
    img.src = dataUrl;
}

// Função para atualizar ângulo de rotação
function updateRotationAngle() {
    const angle = parseInt(document.getElementById('rotation-angle').value, 10);
    document.getElementById('rotation-angle-value').textContent = `${angle}°`;
    
    // Atualizar visualização em tempo real
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        activeObject.set('angle', angle);
        canvas.renderAll();
    }
}

// Função para rotacionar à esquerda
function rotateLeft() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    const currentAngle = activeObject.angle || 0;
    const newAngle = (currentAngle - 90) % 360;
    
    activeObject.set('angle', newAngle);
    document.getElementById('rotation-angle').value = newAngle;
    document.getElementById('rotation-angle-value').textContent = `${newAngle}°`;
    canvas.renderAll();
}

// Função para rotacionar à direita
function rotateRight() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    const currentAngle = activeObject.angle || 0;
    const newAngle = (currentAngle + 90) % 360;
    
    activeObject.set('angle', newAngle);
    document.getElementById('rotation-angle').value = newAngle;
    document.getElementById('rotation-angle-value').textContent = `${newAngle}°`;
    canvas.renderAll();
}

// Função para aplicar rotação
function applyRotation() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // A rotação já foi aplicada em tempo real, então só precisamos adicionar ao histórico
    addToUndoStack();
}

// Função para adicionar texto
function addText() {
    const text = new fabric.Textbox('Clique para editar', {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#000000',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: 200
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    
    // Adicionar ao histórico
    addToUndoStack();
}

// Função para adicionar forma
function addShape(shapeType) {
    let shape;
    
    switch (shapeType) {
        case 'rectangle':
            shape = new fabric.Rect({
                left: canvas.width / 2,
                top: canvas.height / 2,
                width: 100,
                height: 100,
                fill: document.getElementById('shape-color').value || '#ffffff',
                stroke: document.getElementById('shape-border-color').value || '#000000',
                strokeWidth: parseInt(document.getElementById('shape-border-width').value, 10) || 1,
                opacity: parseInt(document.getElementById('shape-opacity').value, 10) / 100 || 1,
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'circle':
            shape = new fabric.Circle({
                left: canvas.width / 2,
                top: canvas.height / 2,
                radius: 50,
                fill: document.getElementById('shape-color').value || '#ffffff',
                stroke: document.getElementById('shape-border-color').value || '#000000',
                strokeWidth: parseInt(document.getElementById('shape-border-width').value, 10) || 1,
                opacity: parseInt(document.getElementById('shape-opacity').value, 10) / 100 || 1,
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'triangle':
            shape = new fabric.Triangle({
                left: canvas.width / 2,
                top: canvas.height / 2,
                width: 100,
                height: 100,
                fill: document.getElementById('shape-color').value || '#ffffff',
                stroke: document.getElementById('shape-border-color').value || '#000000',
                strokeWidth: parseInt(document.getElementById('shape-border-width').value, 10) || 1,
                opacity: parseInt(document.getElementById('shape-opacity').value, 10) / 100 || 1,
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'line':
            shape = new fabric.Line([0, 0, 100, 0], {
                left: canvas.width / 2,
                top: canvas.height / 2,
                stroke: document.getElementById('shape-border-color').value || '#000000',
                strokeWidth: parseInt(document.getElementById('shape-border-width').value, 10) || 3,
                opacity: parseInt(document.getElementById('shape-opacity').value, 10) / 100 || 1,
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'star':
            const points = [
                {x: 0, y: -50},
                {x: 19.1, y: -15.5},
                {x: 58.8, y: -15.5},
                {x: 26.9, y: 5.9},
                {x: 38.2, y: 40.5},
                {x: 0, y: 19.1},
                {x: -38.2, y: 40.5},
                {x: -26.9, y: 5.9},
                {x: -58.8, y: -15.5},
                {x: -19.1, y: -15.5}
            ];
            shape = new fabric.Polygon(points, {
                left: canvas.width / 2,
                top: canvas.height / 2,
                fill: document.getElementById('shape-color').value || '#ffffff',
                stroke: document.getElementById('shape-border-color').value || '#000000',
                strokeWidth: parseInt(document.getElementById('shape-border-width').value, 10) || 1,
                opacity: parseInt(document.getElementById('shape-opacity').value, 10) / 100 || 1,
                originX: 'center',
                originY: 'center'
            });
            break;
    }
    
    if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
        
        // Adicionar ao histórico
        addToUndoStack();
    }
}

// Função para aplicar filtro
function applyFilter(filterId) {
    // Verificar se há uma imagem no canvas
    const objects = canvas.getObjects();
    const imageObject = objects.find(obj => obj.type === 'image');
    
    if (!imageObject) return;
    
    // Salvar filtro atual
    currentFilter = filterId;
    
    // Remover filtros existentes
    imageObject.filters = [];
    
    // Aplicar filtro selecionado
    switch (filterId) {
        case 'none':
            // Sem filtro
            break;
        case 'grayscale':
            imageObject.filters.push(new fabric.Image.filters.Grayscale());
            break;
        case 'sepia':
            imageObject.filters.push(new fabric.Image.filters.Sepia());
            break;
        case 'invert':
            imageObject.filters.push(new fabric.Image.filters.Invert());
            break;
        case 'vintage':
            // Combinação de filtros para efeito vintage
            imageObject.filters.push(new fabric.Image.filters.Sepia());
            imageObject.filters.push(new fabric.Image.filters.Contrast({
                contrast: 0.15
            }));
            imageObject.filters.push(new fabric.Image.filters.Brightness({
                brightness: -0.05
            }));
            break;
        case 'blueprint':
            // Efeito blueprint (azul)
            imageObject.filters.push(new fabric.Image.filters.BlendColor({
                color: '#0000ff',
                mode: 'tint',
                alpha: 0.5
            }));
            break;
        case 'blackwhite':
            // Preto e branco com alto contraste
            imageObject.filters.push(new fabric.Image.filters.Grayscale());
            imageObject.filters.push(new fabric.Image.filters.Contrast({
                contrast: 0.3
            }));
            break;
    }
    
    // Aplicar ajustes atuais
    applyImageAdjustments(imageObject);
    
    // Aplicar filtros
    imageObject.applyFilters();
    canvas.renderAll();
    
    // Adicionar ao histórico
    addToUndoStack();
}

// Função para atualizar prévia de salvamento
function updateSavePreview() {
    const preview = document.getElementById('save-preview');
    preview.innerHTML = '';
    
    const format = document.getElementById('save-format').value || 'webp';
    const quality = parseInt(document.getElementById('save-quality').value, 10) / 100 || 0.9;
    
    const previewImg = new Image();
    previewImg.src = canvas.toDataURL({
        format: format,
        quality: quality
    });
    preview.appendChild(previewImg);
    
    // Atualizar tamanho estimado
    const base64 = previewImg.src.split(',')[1];
    const byteSize = Math.ceil((base64.length * 3) / 4);
    const sizeInKB = Math.round(byteSize / 1024);
    
    document.getElementById('save-size').textContent = `Tamanho estimado: ${sizeInKB} KB`;
}

// Função para salvar imagem
async function saveImage() {
    try {
        // Mostrar overlay de carregamento
        document.getElementById('loading-overlay').style.display = 'flex';
        document.getElementById('loading-overlay').innerHTML = `
            <div class="spinner"></div>
            <p>Salvando imagem...</p>
        `;
        
        // Obter dados da imagem
        const format = document.getElementById('save-format').value || 'webp';
        const quality = parseInt(document.getElementById('save-quality').value, 10) / 100 || 0.9;
        const dataUrl = canvas.toDataURL({
            format: format,
            quality: quality
        });
        
        // Enviar para o servidor
        const response = await fetch(`/api/mockups-edit/save/${imageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: dataUrl,
                format: format
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro ao salvar imagem: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Fechar modal
        document.getElementById('save-modal').classList.remove('show');
        
        // Mostrar mensagem de sucesso
        document.getElementById('loading-overlay').innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 15px;"></i>
                <p style="color: var(--success-color); font-weight: bold;">Imagem salva com sucesso!</p>
                <button id="back-to-gallery" class="action-button" style="margin-top: 15px;">
                    <i class="fas fa-arrow-left"></i> Voltar para a Galeria
                </button>
                <button id="continue-editing" class="action-button" style="margin-top: 15px;">
                    <i class="fas fa-edit"></i> Continuar Editando
                </button>
            </div>
        `;
        
        // Adicionar eventos aos botões
        document.getElementById('back-to-gallery').addEventListener('click', () => {
            window.history.back();
        });
        
        document.getElementById('continue-editing').addEventListener('click', () => {
            document.getElementById('loading-overlay').style.display = 'none';
        });
    } catch (error) {
        console.error('Erro ao salvar imagem:', error);
        
        // Mostrar mensagem de erro
        document.getElementById('loading-overlay').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--error-color); margin-bottom: 15px;"></i>
                <p style="color: var(--error-color); font-weight: bold;">Erro ao salvar imagem: ${error.message}</p>
                <button id="try-again" class="action-button" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
            </div>
        `;
        
        // Adicionar evento ao botão
        document.getElementById('try-again').addEventListener('click', () => {
            document.getElementById('loading-overlay').style.display = 'none';
        });
    }
}

// Função para baixar imagem
function downloadImage() {
    // Obter formato e qualidade
    const format = document.getElementById('save-format')?.value || 'webp';
    const quality = parseInt(document.getElementById('save-quality')?.value, 10) / 100 || 0.9;
    
    // Criar link de download
    const link = document.createElement('a');
    link.href = canvas.toDataURL({
        format: format,
        quality: quality
    });
    
    // Definir nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `imagem-editada-${timestamp}.${format}`;
    
    // Simular clique para iniciar download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função para resetar imagem
function resetImage() {
    if (!originalImage) return;
    
    // Confirmar reset
    if (!confirm('Tem certeza que deseja resetar a imagem para o estado original? Todas as edições serão perdidas.')) {
        return;
    }
    
    // Limpar canvas
    canvas.clear();
    
    // Clonar imagem original
    originalImage.clone(function(cloned) {
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
        
        // Resetar ajustes
        adjustmentValues = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            blur: 0
        };
        
        // Atualizar sliders
        document.getElementById('brightness-value').value = 0;
        document.getElementById('contrast-value').value = 0;
        document.getElementById('saturation-value').value = 0;
        document.getElementById('blur-value').value = 0;
        
        document.getElementById('brightness-value-display').textContent = '0';
        document.getElementById('contrast-value-display').textContent = '0';
        document.getElementById('saturation-value-display').textContent = '0';
        document.getElementById('blur-value-display').textContent = '0';
        
        // Resetar filtro atual
        currentFilter = 'none';
        
        // Atualizar botões de filtro
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('filter-none').classList.add('active');
        
        // Adicionar ao histórico
        undoStack = [];
        redoStack = [];
        addToUndoStack();
    });
}

// Função para mostrar propriedades da imagem
function showImageProperties() {
    const objects = canvas.getObjects();
    const imageObject = objects.find(obj => obj.type === 'image');
    
    if (!imageObject) return;
    
    // Atualizar propriedades de imagem
    document.getElementById('image-opacity').value = imageObject.opacity * 100;
    document.getElementById('image-opacity-value').textContent = `${Math.round(imageObject.opacity * 100)}%`;
}

// Função para adicionar ao histórico de desfazer
function addToUndoStack() {
    // Salvar estado atual do canvas
    const json = JSON.stringify(canvas);
    
    // Adicionar ao histórico
    undoStack.push(json);
    
    // Limitar tamanho do histórico
    if (undoStack.length > 20) {
        undoStack.shift();
    }
    
    // Limpar histórico de refazer
    redoStack = [];
    
    // Atualizar estado dos botões
    updateUndoRedoButtons();
}

// Função para desfazer
function undo() {
    if (undoStack.length <= 1) return;
    
    // Remover estado atual
    const currentState = undoStack.pop();
    
    // Adicionar ao histórico de refazer
    redoStack.push(currentState);
    
    // Restaurar estado anterior
    const previousState = undoStack[undoStack.length - 1];
    canvas.loadFromJSON(previousState, function() {
        canvas.renderAll();
        
        // Atualizar propriedades
        updatePropertiesPanel();
    });
    
    // Atualizar estado dos botões
    updateUndoRedoButtons();
}

// Função para refazer
function redo() {
    if (redoStack.length === 0) return;
    
    // Obter estado a ser restaurado
    const nextState = redoStack.pop();
    
    // Adicionar ao histórico de desfazer
    undoStack.push(nextState);
    
    // Restaurar estado
    canvas.loadFromJSON(nextState, function() {
        canvas.renderAll();
        
        // Atualizar propriedades
        updatePropertiesPanel();
    });
    
    // Atualizar estado dos botões
    updateUndoRedoButtons();
}

// Função para atualizar estado dos botões de desfazer/refazer
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    // Atualizar botão de desfazer
    if (undoStack.length <= 1) {
        undoBtn.classList.add('disabled');
    } else {
        undoBtn.classList.remove('disabled');
    }
    
    // Atualizar botão de refazer
    if (redoStack.length === 0) {
        redoBtn.classList.add('disabled');
    } else {
        redoBtn.classList.remove('disabled');
    }
}
