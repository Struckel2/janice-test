// Editor de Imagens - Janice
// Implementação usando Fabric.js para manipulação de canvas

// Variáveis globais
let canvas;
let originalImage;
let currentFilter = 'normal';
let zoomLevel = 1;
let imageUrl;
let imageId;
let clientId;
let history = [];
let historyIndex = -1;
let maxHistorySteps = 10;

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o canvas do Fabric.js
    canvas = new fabric.Canvas('editor-canvas', {
        preserveObjectStacking: true
    });
    
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    imageUrl = urlParams.get('imageUrl');
    imageId = urlParams.get('id');
    clientId = urlParams.get('clientId');
    
    if (!imageUrl || !imageId || !clientId) {
        showError('Parâmetros de URL inválidos. Não foi possível carregar a imagem.');
        return;
    }
    
    // Carregar a imagem
    loadImage(imageUrl);
    
    // Configurar eventos para os controles
    setupEventListeners();
});

// Função para carregar a imagem no canvas
function loadImage(url) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    
    fabric.Image.fromURL(url, function(img) {
        originalImage = img;
        
        // Redimensionar a imagem para caber no canvas
        const containerWidth = document.querySelector('.editor-canvas-container').clientWidth - 40;
        const containerHeight = document.querySelector('.editor-canvas-container').clientHeight - 40;
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        let scale = 1;
        if (imgWidth > containerWidth || imgHeight > containerHeight) {
            const scaleX = containerWidth / imgWidth;
            const scaleY = containerHeight / imgHeight;
            scale = Math.min(scaleX, scaleY);
        }
        
        img.scale(scale);
        
        // Configurar o tamanho do canvas
        canvas.setWidth(img.getScaledWidth());
        canvas.setHeight(img.getScaledHeight());
        
        // Adicionar a imagem ao canvas
        canvas.add(img);
        canvas.centerObject(img);
        canvas.renderAll();
        
        // Salvar o estado inicial no histórico
        saveToHistory();
        
        // Carregar as miniaturas dos filtros
        loadFilterPreviews(url);
        
        // Esconder o overlay de carregamento
        loadingOverlay.style.display = 'none';
    }, { crossOrigin: 'Anonymous' });
}

// Função para configurar os listeners de eventos
function setupEventListeners() {
    // Ajustes básicos
    document.getElementById('brightness').addEventListener('input', applyAdjustments);
    document.getElementById('contrast').addEventListener('input', applyAdjustments);
    document.getElementById('saturation').addEventListener('input', applyAdjustments);
    
    // Filtros
    const filterPresets = document.querySelectorAll('.filter-preset');
    filterPresets.forEach(preset => {
        preset.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            applyFilter(filter);
            
            // Atualizar classe ativa
            filterPresets.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Recorte e rotação
    document.getElementById('crop-btn').addEventListener('click', enableCropMode);
    document.getElementById('rotate-left-btn').addEventListener('click', () => rotateImage(-90));
    document.getElementById('rotate-right-btn').addEventListener('click', () => rotateImage(90));
    document.getElementById('flip-h-btn').addEventListener('click', () => flipImage('horizontal'));
    document.getElementById('flip-v-btn').addEventListener('click', () => flipImage('vertical'));
    
    // Efeitos
    document.getElementById('sharpen-btn').addEventListener('click', () => activateEffect('sharpen'));
    document.getElementById('blur-btn').addEventListener('click', () => activateEffect('blur'));
    document.getElementById('noise-btn').addEventListener('click', () => activateEffect('noise'));
    document.getElementById('vignette-btn').addEventListener('click', () => activateEffect('vignette'));
    document.getElementById('effect-intensity').addEventListener('input', applyCurrentEffect);
    
    // Texto
    document.getElementById('add-text-btn').addEventListener('click', addText);
    document.getElementById('text-input').addEventListener('input', updateSelectedText);
    document.getElementById('text-color').addEventListener('input', updateSelectedText);
    document.getElementById('text-size').addEventListener('input', updateSelectedText);
    
    // Histórico
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('reset-btn').addEventListener('click', resetImage);
    
    // Zoom
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    
    // Salvar e cancelar
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
    document.getElementById('save-image').addEventListener('click', saveImage);
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    document.getElementById('apply-changes-btn').addEventListener('click', applyChanges);
}

// Função para aplicar ajustes básicos (brilho, contraste, saturação)
function applyAdjustments() {
    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);
    const saturation = parseInt(document.getElementById('saturation').value);
    
    // Atualizar os valores exibidos
    document.getElementById('brightness-value').textContent = brightness;
    document.getElementById('contrast-value').textContent = contrast;
    document.getElementById('saturation-value').textContent = saturation;
    
    // Obter a imagem principal
    const img = canvas.getObjects().find(obj => obj.type === 'image');
    if (!img) return;
    
    // Aplicar filtros
    img.filters = [];
    
    if (brightness !== 0) {
        img.filters.push(new fabric.Image.filters.Brightness({
            brightness: brightness / 100
        }));
    }
    
    if (contrast !== 0) {
        img.filters.push(new fabric.Image.filters.Contrast({
            contrast: contrast / 100
        }));
    }
    
    if (saturation !== 0) {
        img.filters.push(new fabric.Image.filters.Saturation({
            saturation: saturation / 100 + 1
        }));
    }
    
    // Aplicar o filtro atual
    applyCurrentFilter(img);
    
    // Aplicar os filtros e renderizar
    img.applyFilters();
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Função para carregar as miniaturas dos filtros
function loadFilterPreviews(url) {
    const filters = ['normal', 'vintage', 'sepia', 'grayscale', 'vibrant', 'cool', 'warm', 'clarity'];
    
    filters.forEach(filter => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Desenhar a imagem original
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // Aplicar o filtro
            switch (filter) {
                case 'vintage':
                    applyVintageFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'sepia':
                    applySepiaFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'grayscale':
                    applyGrayscaleFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'vibrant':
                    applyVibrantFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'cool':
                    applyCoolFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'warm':
                    applyWarmFilter(ctx, canvas.width, canvas.height);
                    break;
                case 'clarity':
                    applyClarityFilter(ctx, canvas.width, canvas.height);
                    break;
                // Normal não precisa de filtro
            }
            
            // Atualizar a miniatura
            document.getElementById(`filter-preview-${filter}`).src = canvas.toDataURL();
        };
    });
}

// Funções para aplicar filtros nas miniaturas
function applyVintageFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Efeito vintage (sépia com tom azulado)
        data[i] = Math.min(255, (r * 0.9) + (g * 0.2) + (b * 0.1));
        data[i + 1] = Math.min(255, (r * 0.3) + (g * 0.8) + (b * 0.1));
        data[i + 2] = Math.min(255, (r * 0.2) + (g * 0.2) + (b * 0.8));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applySepiaFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyGrayscaleFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyVibrantFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Aumentar saturação
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        const satIncrease = 1.5; // Fator de aumento de saturação
        
        if (delta > 0) {
            if (max === r) {
                data[i + 1] = g - (satIncrease * (g - min));
                data[i + 2] = b - (satIncrease * (b - min));
            } else if (max === g) {
                data[i] = r - (satIncrease * (r - min));
                data[i + 2] = b - (satIncrease * (b - min));
            } else {
                data[i] = r - (satIncrease * (r - min));
                data[i + 1] = g - (satIncrease * (g - min));
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyCoolFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Adicionar tom azulado
        data[i + 2] = Math.min(255, data[i + 2] + 30);
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyWarmFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Adicionar tom avermelhado/amarelado
        data[i] = Math.min(255, data[i] + 30);
        data[i + 1] = Math.min(255, data[i + 1] + 15);
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function applyClarityFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Aplicar um efeito de nitidez simples
    const temp = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                const i = idx + c;
                data[i] = Math.min(255, Math.max(0, 
                    5 * temp[i] - temp[i - 4] - temp[i + 4] - temp[i - width * 4] - temp[i + width * 4]
                ));
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Função para aplicar filtro à imagem principal
function applyFilter(filter) {
    currentFilter = filter;
    
    // Obter a imagem principal
    const img = canvas.getObjects().find(obj => obj.type === 'image');
    if (!img) return;
    
    // Preservar os ajustes atuais
    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);
    const saturation = parseInt(document.getElementById('saturation').value);
    
    // Resetar filtros
    img.filters = [];
    
    // Replicar os ajustes básicos
    if (brightness !== 0) {
        img.filters.push(new fabric.Image.filters.Brightness({
            brightness: brightness / 100
        }));
    }
    
    if (contrast !== 0) {
        img.filters.push(new fabric.Image.filters.Contrast({
            contrast: contrast / 100
        }));
    }
    
    if (saturation !== 0) {
        img.filters.push(new fabric.Image.filters.Saturation({
            saturation: saturation / 100 + 1
        }));
    }
    
    // Aplicar o filtro selecionado
    applyCurrentFilter(img);
    
    // Aplicar os filtros e renderizar
    img.applyFilters();
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Aplicar o filtro atual à imagem
function applyCurrentFilter(img) {
    switch (currentFilter) {
        case 'vintage':
            img.filters.push(new fabric.Image.filters.Sepia());
            img.filters.push(new fabric.Image.filters.BlendColor({
                color: '#0074D9',
                mode: 'tint',
                alpha: 0.2
            }));
            break;
        case 'sepia':
            img.filters.push(new fabric.Image.filters.Sepia());
            break;
        case 'grayscale':
            img.filters.push(new fabric.Image.filters.Grayscale());
            break;
        case 'vibrant':
            img.filters.push(new fabric.Image.filters.Saturation({
                saturation: 0.5
            }));
            break;
        case 'cool':
            img.filters.push(new fabric.Image.filters.BlendColor({
                color: '#0074D9',
                mode: 'tint',
                alpha: 0.2
            }));
            break;
        case 'warm':
            img.filters.push(new fabric.Image.filters.BlendColor({
                color: '#FF4136',
                mode: 'tint',
                alpha: 0.2
            }));
            break;
        case 'clarity':
            img.filters.push(new fabric.Image.filters.Convolute({
                matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0]
            }));
            break;
        // Normal não precisa de filtro adicional
    }
}

// Função para ativar o modo de recorte
function enableCropMode() {
    // Implementação básica - na versão completa, seria necessário adicionar um retângulo de recorte
    alert('Funcionalidade de recorte em desenvolvimento');
}

// Função para rotacionar a imagem
function rotateImage(angle) {
    const img = canvas.getObjects().find(obj => obj.type === 'image');
    if (!img) return;
    
    img.rotate(img.angle + angle);
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Função para espelhar a imagem
function flipImage(direction) {
    const img = canvas.getObjects().find(obj => obj.type === 'image');
    if (!img) return;
    
    if (direction === 'horizontal') {
        img.set('flipX', !img.flipX);
    } else {
        img.set('flipY', !img.flipY);
    }
    
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Variável para armazenar o efeito atual
let currentEffect = null;

// Função para ativar um efeito
function activateEffect(effect) {
    currentEffect = effect;
    
    // Mostrar as opções de efeito
    const effectOptions = document.getElementById('effect-options');
    effectOptions.classList.add('active');
    
    // Atualizar a interface
    const effectButtons = document.querySelectorAll('.tool-section:nth-child(4) .tool-button');
    effectButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${effect}-btn`).classList.add('active');
    
    // Aplicar o efeito
    applyCurrentEffect();
}

// Função para aplicar o efeito atual
function applyCurrentEffect() {
    if (!currentEffect) return;
    
    const intensity = parseInt(document.getElementById('effect-intensity').value);
    document.getElementById('effect-intensity-value').textContent = intensity;
    
    const img = canvas.getObjects().find(obj => obj.type === 'image');
    if (!img) return;
    
    // Preservar os ajustes e filtros atuais
    const brightness = parseInt(document.getElementById('brightness').value);
    const contrast = parseInt(document.getElementById('contrast').value);
    const saturation = parseInt(document.getElementById('saturation').value);
    
    // Resetar filtros
    img.filters = [];
    
    // Replicar os ajustes básicos
    if (brightness !== 0) {
        img.filters.push(new fabric.Image.filters.Brightness({
            brightness: brightness / 100
        }));
    }
    
    if (contrast !== 0) {
        img.filters.push(new fabric.Image.filters.Contrast({
            contrast: contrast / 100
        }));
    }
    
    if (saturation !== 0) {
        img.filters.push(new fabric.Image.filters.Saturation({
            saturation: saturation / 100 + 1
        }));
    }
    
    // Aplicar o filtro atual
    applyCurrentFilter(img);
    
    // Aplicar o efeito selecionado
    const normalizedIntensity = intensity / 100;
    
    switch (currentEffect) {
        case 'sharpen':
            img.filters.push(new fabric.Image.filters.Convolute({
                matrix: [
                    0, -normalizedIntensity, 0,
                    -normalizedIntensity, 1 + 4 * normalizedIntensity, -normalizedIntensity,
                    0, -normalizedIntensity, 0
                ]
            }));
            break;
        case 'blur':
            // Simulação de desfoque usando convolução
            const blurValue = normalizedIntensity / 9;
            img.filters.push(new fabric.Image.filters.Convolute({
                matrix: [
                    blurValue, blurValue, blurValue,
                    blurValue, blurValue, blurValue,
                    blurValue, blurValue, blurValue
                ]
            }));
            break;
        case 'noise':
            // Implementação simplificada de ruído
            // Na versão completa, seria necessário um filtro personalizado
            alert('Funcionalidade de ruído em desenvolvimento');
            break;
        case 'vignette':
            // Implementação simplificada de vinheta
            // Na versão completa, seria necessário um filtro personalizado
            alert('Funcionalidade de vinheta em desenvolvimento');
            break;
    }
    
    // Aplicar os filtros e renderizar
    img.applyFilters();
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Função para adicionar texto
function addText() {
    const textInput = document.getElementById('text-input');
    const text = textInput.value || 'Texto de exemplo';
    const color = document.getElementById('text-color').value;
    const size = parseInt(document.getElementById('text-size').value);
    
    const textObj = new fabric.IText(text, {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontFamily: 'Arial',
        fill: color,
        fontSize: size,
        originX: 'center',
        originY: 'center'
    });
    
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
    
    // Mostrar as opções de texto
    document.getElementById('text-options').classList.add('active');
    
    // Salvar no histórico
    saveToHistory();
}

// Função para atualizar o texto selecionado
function updateSelectedText() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'i-text') return;
    
    const text = document.getElementById('text-input').value;
    const color = document.getElementById('text-color').value;
    const size = parseInt(document.getElementById('text-size').value);
    
    document.getElementById('text-size-value').textContent = size;
    
    if (text) {
        activeObject.set('text', text);
    }
    
    activeObject.set({
        fill: color,
        fontSize: size
    });
    
    canvas.renderAll();
    
    // Salvar no histórico
    saveToHistory();
}

// Funções para zoom
function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.1, 3);
    updateZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
    updateZoom();
}

function updateZoom() {
    const wrapper = document.querySelector('.editor-canvas-wrapper');
    wrapper.style.transform = `scale(${zoomLevel})`;
    document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;
}

// Funções para histórico
function saveToHistory() {
    // Limitar o tamanho do histórico
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    if (history.length >= maxHistorySteps) {
        history.shift();
    } else {
        historyIndex++;
    }
    
    // Salvar o estado atual do canvas
    history.push(JSON.stringify(canvas));
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        loadFromHistory();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        loadFromHistory();
    }
}

function loadFromHistory() {
    if (historyIndex >= 0 && historyIndex < history.length) {
        canvas.loadFromJSON(history[historyIndex], function() {
            canvas.renderAll();
        });
    }
}

// Função para resetar a imagem
function resetImage() {
    if (confirm('Tem certeza que deseja resetar todas as alterações?')) {
        // Recarregar a imagem original
        loadImage(imageUrl);
        
        // Resetar os controles
        document.getElementById('brightness').value = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('saturation').value = 0;
        document.getElementById('brightness-value').textContent = 0;
        document.getElementById('contrast-value').textContent = 0;
        document.getElementById('saturation-value').textContent = 0;
        
        // Resetar filtros
        currentFilter = 'normal';
        const filterPresets = document.querySelectorAll('.filter-preset');
        filterPresets.forEach(p => p.classList.remove('active'));
        document.querySelector('.filter-preset[data-filter="normal"]').classList.add('active');
        
        // Resetar efeitos
        currentEffect = null;
        const effectButtons = document.querySelectorAll('.tool-section:nth-child(4) .tool-button');
        effectButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('effect-options').classList.remove('active');
    }
}

// Função para cancelar a edição
function cancelEdit() {
    if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
        window.location.href = `/index.html`;
    }
}

// Função para salvar a imagem
function saveImage() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    document.querySelector('.loading-text').textContent = 'Salvando imagem...';
    
    // Converter o canvas para uma imagem
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 0.8
    });
    
    // Criar um objeto FormData para enviar a imagem
    const formData = new FormData();
    formData.append('image', dataURLtoBlob(dataURL));
    formData.append('imageId', imageId);
    formData.append('clientId', clientId);
    
    // Enviar a imagem para o servidor
    fetch('/api/mockups/save-edited', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar a imagem');
        }
        return response.json();
    })
    .then(data => {
        loadingOverlay.style.display = 'none';
        alert('Imagem salva com sucesso!');
        window.location.href = `/index.html`;
    })
    .catch(error => {
        loadingOverlay.style.display = 'none';
        showError('Erro ao salvar a imagem: ' + error.message);
    });
}

// Função para aplicar as alterações (sem salvar no servidor)
function applyChanges() {
    alert('Alterações aplicadas! Clique em "Salvar Alterações" para salvar no servidor.');
}

// Função para baixar a imagem
function downloadImage() {
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 0.8
    });
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'imagem-editada.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função auxiliar para converter dataURL para Blob
function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
}

// Função para mostrar erro
function showError(message) {
    alert('Erro: ' + message);
    document.getElementById('loading-overlay').style.display = 'none';
}
