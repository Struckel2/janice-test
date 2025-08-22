const express = require('express');
const router = express.Router();
const { cloudinary } = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const Mockup = require('../models/Mockup');
const path = require('path');

// Função para pré-processar o prompt e garantir preservação da imagem original
function preprocessPrompt(originalPrompt) {
    // Verificar se o prompt já contém instruções de preservação
    const containsPreservation = /preserv(e|ar)|mant(er|ém|enha)|não (mude|altere|modifique)|keep|maintain|same/i.test(originalPrompt);
    
    if (containsPreservation) {
        // Se já contém instruções de preservação, apenas retornar o prompt original
        console.log('Prompt já contém instruções de preservação, mantendo original');
        return originalPrompt;
    }
    
    // Adicionar framework de preservação ao prompt seguindo as melhores práticas da documentação
    const preservationFramework = 
        "Preserve a estrutura e elementos originais da imagem. " +
        "Mantenha todos os elementos principais como pessoas, objetos, posições, expressões faciais e detalhes do fundo exatamente iguais, " +
        "apenas faça a seguinte modificação específica: ";
    
    const enhancedPrompt = preservationFramework + originalPrompt;
    console.log('Prompt original aprimorado com framework de preservação');
    return enhancedPrompt;
}

// O fetch já deve estar disponível globalmente através do polyfill em server/config/fetch-polyfill.js
console.log('🔍 [MOCKUP-EDIT] Iniciando módulo com fetch:', typeof fetch !== 'undefined' ? 'Disponível' : 'Não disponível');

// Rota para obter imagem para edição
router.get('/image/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const mockupId = req.params.id;
        let realMockupId = mockupId;
        let seed = null;
        
        // Verificar se o ID contém um underscore e extrair as partes
        if (mockupId.includes('_')) {
            const parts = mockupId.split('_');
            realMockupId = parts[0];
            seed = parts.slice(1).join('_'); // Juntar novamente caso haja múltiplos underscores
            
            console.log(`🔍 [MOCKUP-EDIT] ID original: ${mockupId}`);
            console.log(`🔍 [MOCKUP-EDIT] ID real para busca: ${realMockupId}`);
            console.log(`🔍 [MOCKUP-EDIT] Seed extraído: ${seed}`);
        }
        
        // Buscar mockup no banco de dados usando o ID real (sem o seed)
        const mockup = await Mockup.findById(realMockupId);
        
        if (!mockup) {
            console.log(`❌ [MOCKUP-EDIT] Mockup não encontrado com ID: ${realMockupId}`);
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        // Log detalhado do mockup encontrado para diagnóstico
        console.log(`🔍 [MOCKUP-EDIT] Mockup encontrado:`, {
            id: mockup._id,
            titulo: mockup.titulo,
            criadoPor: mockup.criadoPor,
            temMetadados: !!mockup.metadados,
            temImagensSalvas: !!(mockup.metadados && mockup.metadados.imagensSalvas),
            quantidadeImagensSalvas: mockup.metadados && mockup.metadados.imagensSalvas ? mockup.metadados.imagensSalvas.length : 0
        });
        
        // Verificar se o usuário tem permissão para acessar este mockup
        if (mockup.criadoPor && mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este mockup' });
        }
        
        // Processar imagem específica se tiver seed (formato mockupId_seed para imagens da galeria)
        if (seed) {
            
            console.log(`🔍 [MOCKUP-EDIT] Buscando imagem com ID: ${mockupId}`);
            console.log(`🔍 [MOCKUP-EDIT] Mockup ID real: ${realMockupId}, Seed: ${seed}`);
            
            // Verificar se existem imagens salvas
            if (mockup.metadados && mockup.metadados.imagensSalvas && mockup.metadados.imagensSalvas.length > 0) {
                console.log(`🔍 [MOCKUP-EDIT] Encontradas ${mockup.metadados.imagensSalvas.length} imagens salvas`);
                
                // Encontrar a imagem específica pelo seed - usando comparação mais flexível
                // O seed pode ser um número ou uma string como "1:1"
                const imagem = mockup.metadados.imagensSalvas.find(img => {
                    if (!img.seed) return false;
                    const imgSeedStr = img.seed.toString();
                    
                    console.log(`🔍 [MOCKUP-EDIT] Comparando seed: "${seed}" com "${imgSeedStr}"`);
                    
                    // Comparação direta
                    if (imgSeedStr === seed) return true;
                    
                    // Comparação numérica se possível
                    if (!isNaN(seed) && !isNaN(imgSeedStr) && parseInt(imgSeedStr) === parseInt(seed)) return true;
                    
                    // Comparação especial para seeds com formato de proporção (ex: "1:1")
                    if (seed.includes(':') && imgSeedStr.includes(':')) {
                        return seed.trim() === imgSeedStr.trim();
                    }
                    
                    // Comparação alternativa: verificar se o seed está contido no imgSeedStr
                    return imgSeedStr.includes(seed) || seed.includes(imgSeedStr);
                });
                
                if (imagem) {
                    console.log(`✅ [MOCKUP-EDIT] Imagem encontrada: ${imagem.url}`);
                    return res.json({
                        url: imagem.url,
                        nome: `${mockup.titulo} - Variação ${seed}`
                    });
                } else {
                    console.log(`❌ [MOCKUP-EDIT] Nenhuma imagem encontrada com seed: ${seed}`);
                    console.log(`🔍 [MOCKUP-EDIT] Seeds disponíveis:`, mockup.metadados.imagensSalvas.map(img => img.seed));
                }
            } else {
                console.log(`❌ [MOCKUP-EDIT] Mockup não possui imagens salvas`);
            }
            
            // Se não encontrou a imagem específica, tentar buscar pelo índice
            if (mockup.metadados && mockup.metadados.imagensSalvas && mockup.metadados.imagensSalvas.length > 0) {
                // Tentar interpretar o seed como um índice (1-based)
                const index = parseInt(seed) - 1;
                if (!isNaN(index) && index >= 0 && index < mockup.metadados.imagensSalvas.length) {
                    const imagem = mockup.metadados.imagensSalvas[index];
                    console.log(`✅ [MOCKUP-EDIT] Imagem encontrada pelo índice ${index}: ${imagem.url}`);
                    return res.json({
                        url: imagem.url,
                        nome: `${mockup.titulo} - Variação ${index + 1}`
                    });
                }
            }
            
            // Se não encontrou a imagem específica, retornar erro
            return res.status(404).json({ error: 'Imagem específica não encontrada' });
        }
        
        // Caso padrão: usar a imagem principal do mockup
        let imageUrl = mockup.imagemUrl;
        
        // Se não tiver imagem principal mas tiver imagens salvas, usar a primeira
        if (!imageUrl && mockup.metadados && mockup.metadados.imagensSalvas && mockup.metadados.imagensSalvas.length > 0) {
            imageUrl = mockup.metadados.imagensSalvas[0].url;
        }
        
        // Verificar se encontrou alguma URL de imagem
        if (!imageUrl) {
            return res.status(404).json({ error: 'Imagem não encontrada para este mockup' });
        }
        
        // Retornar URL da imagem
        res.json({
            url: imageUrl,
            nome: mockup.titulo || 'Imagem sem título'
        });
        
    } catch (error) {
        console.error('Erro ao obter imagem para edição:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Erro ao obter imagem: ${error.message}` });
    }
});

// Rota para inicializar sessão de edição
router.post('/init-session/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== INICIANDO SESSÃO DE EDIÇÃO =====`);
        console.log(`🔍 [MOCKUP-EDIT-SESSION] Parâmetros da requisição:`, req.params);
        console.log(`🔍 [MOCKUP-EDIT-SESSION] Headers da requisição:`, req.headers);
        console.log(`🔍 [MOCKUP-EDIT-SESSION] Usuário:`, req.user ? req.user._id : 'Não autenticado');
        
        const mockupId = req.params.id;
        let realMockupId = mockupId;
        let seed = null;
        
        // Verificar se o ID contém um underscore e extrair as partes
        if (mockupId.includes('_')) {
            const parts = mockupId.split('_');
            realMockupId = parts[0];
            seed = parts.slice(1).join('_'); // Juntar novamente caso haja múltiplos underscores
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ID original: ${mockupId}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ID real para busca: ${realMockupId}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Seed extraído: ${seed}`);
        }
        
        // Buscar mockup no banco de dados usando o ID real (sem o seed)
        console.log(`🔍 [MOCKUP-EDIT-SESSION] Buscando mockup no banco de dados com ID: ${realMockupId}`);
        const mockup = await Mockup.findById(realMockupId);
        
        if (!mockup) {
            console.log(`❌ [MOCKUP-EDIT-SESSION] Mockup não encontrado com ID: ${realMockupId}`);
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        console.log(`✅ [MOCKUP-EDIT-SESSION] Mockup encontrado:`, {
            id: mockup._id,
            titulo: mockup.titulo,
            status: mockup.status,
            imagemUrl: mockup.imagemUrl ? 'Presente' : 'Ausente',
            metadados: mockup.metadados ? 'Presente' : 'Ausente'
        });
        
        // Verificar se o usuário tem permissão para acessar este mockup
        if (mockup.criadoPor && mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este mockup' });
        }
        
        // Determinar a URL da imagem original
        let imageUrl;
        
        console.log(`🔍 [MOCKUP-EDIT-SESSION] Determinando URL da imagem original...`);
        
        if (seed) {
            // Buscar imagem específica pelo seed
            if (mockup.metadados && mockup.metadados.imagensSalvas && mockup.metadados.imagensSalvas.length > 0) {
                const imagem = mockup.metadados.imagensSalvas.find(img => {
                    if (!img.seed) return false;
                    const imgSeedStr = img.seed.toString();
                    
                    // Comparação direta
                    if (imgSeedStr === seed) return true;
                    
                    // Comparação numérica se possível
                    if (!isNaN(seed) && !isNaN(imgSeedStr) && parseInt(imgSeedStr) === parseInt(seed)) return true;
                    
                    // Comparação especial para seeds com formato de proporção (ex: "1:1")
                    if (seed.includes(':') && imgSeedStr.includes(':')) {
                        return seed.trim() === imgSeedStr.trim();
                    }
                    
                    // Comparação alternativa: verificar se o seed está contido no imgSeedStr
                    return imgSeedStr.includes(seed) || seed.includes(imgSeedStr);
                });
                
                if (imagem) {
                    imageUrl = imagem.url;
                    console.log(`✅ [MOCKUP-EDIT-SESSION] Imagem encontrada: ${imageUrl}`);
                } else {
                    // Tentar buscar pelo índice
                    const index = parseInt(seed) - 1;
                    if (!isNaN(index) && index >= 0 && index < mockup.metadados.imagensSalvas.length) {
                        imageUrl = mockup.metadados.imagensSalvas[index].url;
                        console.log(`✅ [MOCKUP-EDIT-SESSION] Imagem encontrada pelo índice ${index}: ${imageUrl}`);
                    } else {
                        return res.status(404).json({ error: 'Imagem específica não encontrada' });
                    }
                }
            } else {
                return res.status(404).json({ error: 'Mockup não possui imagens salvas' });
            }
        } else {
            // Usar imagem principal
            imageUrl = mockup.imagemUrl;
            
            // Se não tiver imagem principal, usar a primeira imagem salva
            if (!imageUrl && mockup.metadados && mockup.metadados.imagensSalvas && mockup.metadados.imagensSalvas.length > 0) {
                imageUrl = mockup.metadados.imagensSalvas[0].url;
            }
        }
        
        if (!imageUrl) {
            console.log(`❌ [MOCKUP-EDIT-SESSION] Nenhuma URL de imagem encontrada para o mockup`);
            return res.status(404).json({ error: 'Imagem não encontrada para este mockup' });
        }
        
        console.log(`✅ [MOCKUP-EDIT-SESSION] URL da imagem original determinada: ${imageUrl}`);
        
        // Gerar um ID de sessão único
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log(`🔍 [MOCKUP-EDIT-SESSION] ID de sessão gerado: ${sessionId}`);
        
        try {
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== INICIANDO DOWNLOAD DA IMAGEM =====`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] URL da imagem: ${imageUrl}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Ambiente Node.js: ${process.version}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Fetch disponível: ${typeof fetch !== 'undefined'}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Fetch é nativo: ${fetch.toString().includes('[native code]')}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Cloudinary configurado:`, {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'Não configurado',
                apiKey: process.env.CLOUDINARY_API_KEY ? 'Configurado' : 'Não configurado',
                apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Configurado' : 'Não configurado'
            });
            
            // Verificar se fetch está disponível
            if (typeof fetch === 'undefined') {
                console.error(`❌ [MOCKUP-EDIT-SESSION] Fetch não está disponível globalmente`);
                throw new Error('Fetch não está disponível globalmente');
            }
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Iniciando fetch para URL: ${imageUrl}`);
            
            // Baixar a imagem original usando fetch
            const imageResponse = await fetch(imageUrl);
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== RESPOSTA DO FETCH RECEBIDA =====`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Status: ${imageResponse.status} ${imageResponse.statusText}`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Headers:`, Object.fromEntries([...imageResponse.headers.entries()]));
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Content-Type:`, imageResponse.headers.get('content-type'));
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Content-Length:`, imageResponse.headers.get('content-length'));
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Métodos disponíveis na resposta:`, 
                        Object.getOwnPropertyNames(Object.getPrototypeOf(imageResponse)));
            
            if (!imageResponse.ok) {
                console.error(`❌ [MOCKUP-EDIT-SESSION] Resposta não OK: ${imageResponse.status} ${imageResponse.statusText}`);
                throw new Error(`Erro ao baixar imagem original: ${imageResponse.status}`);
            }
            
            console.log(`✅ [MOCKUP-EDIT-SESSION] Resposta OK recebida`);
            
            // Método mais robusto para obter os dados binários
            let imageBuffer;
            try {
                // Tentar usar arrayBuffer() primeiro (API moderna)
                console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== TENTANDO MÉTODO 1: arrayBuffer() =====`);
                console.log(`🔍 [MOCKUP-EDIT-SESSION] arrayBuffer disponível:`, typeof imageResponse.arrayBuffer === 'function');
                
                const arrayBuffer = await imageResponse.arrayBuffer();
                console.log(`🔍 [MOCKUP-EDIT-SESSION] arrayBuffer obtido com sucesso, tamanho:`, arrayBuffer.byteLength);
                
                imageBuffer = Buffer.from(arrayBuffer);
                console.log(`✅ [MOCKUP-EDIT-SESSION] Buffer criado com sucesso, tamanho:`, imageBuffer.length);
                console.log(`✅ [MOCKUP-EDIT-SESSION] arrayBuffer() funcionou com sucesso`);
            } catch (bufferError) {
                console.error(`❌ [MOCKUP-EDIT-SESSION] Erro ao usar arrayBuffer():`, bufferError);
                console.error(`❌ [MOCKUP-EDIT-SESSION] Stack trace:`, bufferError.stack);
                
                try {
                    // Fallback para buffer() (node-fetch)
                    console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== TENTANDO MÉTODO 2: buffer() =====`);
                    console.log(`🔍 [MOCKUP-EDIT-SESSION] buffer disponível:`, typeof imageResponse.buffer === 'function');
                    
                    if (typeof imageResponse.buffer === 'function') {
                        imageBuffer = await imageResponse.buffer();
                        console.log(`✅ [MOCKUP-EDIT-SESSION] buffer() funcionou com sucesso, tamanho:`, imageBuffer.length);
                    } else {
                        // Último recurso: obter como texto e converter para buffer
                        console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== TENTANDO MÉTODO 3: blob() e arrayBuffer() =====`);
                        console.log(`🔍 [MOCKUP-EDIT-SESSION] blob disponível:`, typeof imageResponse.blob === 'function');
                        
                        const blob = await imageResponse.blob();
                        console.log(`🔍 [MOCKUP-EDIT-SESSION] Blob obtido com sucesso, tamanho:`, blob.size);
                        
                        const arrayBuffer = await blob.arrayBuffer();
                        console.log(`🔍 [MOCKUP-EDIT-SESSION] ArrayBuffer obtido do blob, tamanho:`, arrayBuffer.byteLength);
                        
                        imageBuffer = Buffer.from(arrayBuffer);
                        console.log(`✅ [MOCKUP-EDIT-SESSION] Buffer criado com sucesso, tamanho:`, imageBuffer.length);
                        console.log(`✅ [MOCKUP-EDIT-SESSION] blob() e arrayBuffer() funcionaram com sucesso`);
                    }
                } catch (fallbackError) {
                    console.error(`❌ [MOCKUP-EDIT-SESSION] Erro no fallback:`, fallbackError);
                    console.error(`❌ [MOCKUP-EDIT-SESSION] Stack trace:`, fallbackError.stack);
                    throw new Error(`Não foi possível processar a resposta da imagem: ${fallbackError.message}`);
                }
            }
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== PREPARANDO UPLOAD PARA CLOUDINARY =====`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Buffer obtido com sucesso, tamanho:`, imageBuffer.length);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Primeiros bytes do buffer:`, imageBuffer.slice(0, 20).toString('hex'));
            
            // Verificar se o buffer parece ser uma imagem válida
            const isValidImage = imageBuffer.length > 100 && 
                                (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 || // JPEG
                                 imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 || // PNG
                                 imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49);  // GIF
                                 
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Buffer parece ser uma imagem válida:`, isValidImage);
            
            // Opções de upload para Cloudinary
            const uploadOptions = {
                public_id: sessionId,
                folder: 'temp_edits',
                format: 'png',
                resource_type: 'image',
                // Expirar em 24 horas
                expires_at: Math.floor(Date.now() / 1000) + 86400
            };
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Opções de upload:`, uploadOptions);
            
            // Fazer upload para pasta temporária no Cloudinary
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Iniciando upload para Cloudinary...`);
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                    if (error) {
                        console.error(`❌ [MOCKUP-EDIT-SESSION] Erro no upload para Cloudinary:`, error);
                        reject(error);
                    } else {
                        console.log(`✅ [MOCKUP-EDIT-SESSION] Upload para Cloudinary bem-sucedido`);
                        resolve(result);
                    }
                }).end(imageBuffer);
            });
            
            console.log(`✅ [MOCKUP-EDIT-SESSION] ===== UPLOAD CONCLUÍDO COM SUCESSO =====`);
            console.log(`✅ [MOCKUP-EDIT-SESSION] Sessão inicializada: ${sessionId}`);
            console.log(`✅ [MOCKUP-EDIT-SESSION] Imagem temporária: ${uploadResult.secure_url}`);
            console.log(`✅ [MOCKUP-EDIT-SESSION] Detalhes do upload:`, {
                publicId: uploadResult.public_id,
                formato: uploadResult.format,
                tamanho: uploadResult.bytes,
                largura: uploadResult.width,
                altura: uploadResult.height
            });
            
            // Preparar resposta para o cliente
            const responseData = {
                success: true,
                sessionId: sessionId,
                imageUrl: uploadResult.secure_url,
                originalImageUrl: imageUrl,
                mockupId: realMockupId,
                seed: seed
            };
            
            console.log(`🔍 [MOCKUP-EDIT-SESSION] ===== ENVIANDO RESPOSTA AO CLIENTE =====`);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Dados da resposta:`, responseData);
            
            // Retornar informações da sessão
            res.json(responseData);
            
        } catch (fetchError) {
            console.error('❌ [MOCKUP-EDIT-SESSION] Erro ao processar imagem original:', fetchError);
            console.error('❌ [MOCKUP-EDIT-SESSION] Stack trace:', fetchError.stack);
            
            // Tentar obter mais informações sobre o erro
            let errorDetails = fetchError.message;
            if (fetchError.cause) {
                console.error('❌ [MOCKUP-EDIT-SESSION] Causa do erro:', fetchError.cause);
                errorDetails += ` (Causa: ${fetchError.cause})`;
            }
            
            res.status(500).json({ 
                error: `Erro ao inicializar sessão: ${errorDetails}`,
                stack: process.env.NODE_ENV === 'development' ? fetchError.stack : undefined
            });
        }
        
    } catch (error) {
        console.error('❌ [MOCKUP-EDIT-SESSION] Erro ao inicializar sessão de edição:', error);
        console.error('❌ [MOCKUP-EDIT-SESSION] Stack trace:', error.stack);
        
        // Tentar obter mais informações sobre o erro
        let errorDetails = error.message;
        if (error.cause) {
            console.error('❌ [MOCKUP-EDIT-SESSION] Causa do erro:', error.cause);
            errorDetails += ` (Causa: ${error.cause})`;
        }
        
        res.status(500).json({ 
            error: `Erro ao inicializar sessão: ${errorDetails}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Rota para atualizar imagem temporária
router.post('/update-temp/:sessionId', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { imageData, useExistingImage, currentImageUrl } = req.body;
        
        // Se useExistingImage for verdadeiro, usar a URL atual sem fazer upload
        if (useExistingImage === true) {
            if (!currentImageUrl) {
                return res.status(400).json({ error: 'URL da imagem atual é obrigatória quando useExistingImage é verdadeiro' });
            }
            
            console.log(`✅ [MOCKUP-EDIT-UPDATE] Usando URL existente devido a canvas contaminado: ${currentImageUrl}`);
            
            // Retornar a URL atual sem fazer upload
            return res.json({
                success: true,
                imageUrl: currentImageUrl
            });
        }
        
        // Caso contrário, processar normalmente com os dados da imagem
        if (!imageData) {
            return res.status(400).json({ error: 'Dados da imagem são obrigatórios' });
        }
        
        // Remover o prefixo "data:image/..." da string base64
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload para Cloudinary (substituindo a imagem temporária existente)
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                public_id: sessionId,
                folder: 'temp_edits',
                format: 'png',
                resource_type: 'image',
                // Expirar em 24 horas
                expires_at: Math.floor(Date.now() / 1000) + 86400
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }).end(buffer);
        });
        
        console.log(`✅ [MOCKUP-EDIT-UPDATE] Imagem temporária atualizada: ${uploadResult.secure_url}`);
        
        // Retornar URL da imagem atualizada
        res.json({
            success: true,
            imageUrl: uploadResult.secure_url
        });
        
    } catch (error) {
        console.error('Erro ao atualizar imagem temporária:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Erro ao atualizar imagem: ${error.message}` });
    }
});

// Rota para edição com IA
router.post('/ai-edit/:sessionId', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { prompt, imageUrl } = req.body;
        
        if (!prompt || !imageUrl) {
            return res.status(400).json({ error: 'Prompt e URL da imagem são obrigatórios' });
        }
        
        // Verificar se a URL é de uma imagem temporária válida
        if (!imageUrl.includes('temp_edits') || !imageUrl.includes('cloudinary')) {
            return res.status(400).json({ error: 'URL de imagem inválida' });
        }
        
        try {
            // Inicializar cliente Replicate
            const Replicate = require('replicate');
            const replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });
            
            // Modelo Flux Kontext Pro (para edição de imagens)
            const model = "black-forest-labs/flux-kontext-pro";
            
            // Pré-processador de prompt para garantir preservação da imagem original
            const processedPrompt = preprocessPrompt(prompt);
            console.log('Prompt original:', prompt);
            console.log('Prompt processado:', processedPrompt);
            
            // Parâmetros para o modelo
            const input = {
                prompt: processedPrompt,
                input_image: imageUrl, // Nota: Flux Kontext Pro usa input_image em vez de image
                output_format: 'png', // Nota: Replicate só aceita 'jpg' ou 'png', não 'webp'
                output_quality: 90,
                safety_tolerance: 2
            };
            
            console.log('===== INICIANDO CHAMADA AO REPLICATE =====');
            console.log('Modelo:', model);
            console.log('Parâmetros de entrada:', JSON.stringify(input, null, 2));
            console.log('Token Replicate configurado:', process.env.REPLICATE_API_TOKEN ? 'Sim (primeiros 5 caracteres: ' + process.env.REPLICATE_API_TOKEN.substring(0, 5) + '...)' : 'Não');
            
            try {
                // Executar o modelo
                console.log('Chamando replicate.run()...');
                let output = await replicate.run(model, { input });
                
                console.log('===== RESPOSTA DO REPLICATE RECEBIDA =====');
                console.log('Tipo da resposta:', typeof output);
                console.log('É array?', Array.isArray(output));
                console.log('É null ou undefined?', output === null || output === undefined);
                console.log('É ReadableStream?', output && typeof output === 'object' && output.constructor && output.constructor.name === 'ReadableStream');
                
                // Verificar se a resposta é um ReadableStream e processá-lo
                if (output && typeof output === 'object' && output.constructor && output.constructor.name === 'ReadableStream') {
                    console.log('Resposta é um ReadableStream, processando...');
                    
                    try {
                        // Acumular todos os chunks antes de processar
                        const chunks = [];
                        const reader = output.getReader();
                        
                        let done = false;
                        while (!done) {
                            const { value, done: doneReading } = await reader.read();
                            done = doneReading;
                            if (value) {
                                chunks.push(value);
                            }
                        }
                        
                        // Converter os chunks acumulados para texto
                        const decoder = new TextDecoder('utf-8');
                        let responseText = '';
                        
                        for (const chunk of chunks) {
                            responseText += decoder.decode(chunk, { stream: true });
                        }
                        responseText += decoder.decode(); // Finalizar a decodificação
                        
                        console.log('Texto completo extraído do ReadableStream:', responseText);
                        console.log('Tamanho do texto extraído:', responseText.length);
                        console.log('Primeiros 100 caracteres:', responseText.substring(0, 100));
                        console.log('Últimos 100 caracteres:', responseText.substring(responseText.length - 100));
                        
                        // Tentar extrair URL diretamente usando regex primeiro
                        const urlRegex = /(https?:\/\/[^\s"',<>]+\.(jpg|jpeg|png|webp|gif))/i;
                        const urlMatch = responseText.match(urlRegex);
                        
                        if (urlMatch && urlMatch[1]) {
                            const extractedUrl = urlMatch[1];
                            console.log('URL de imagem extraída diretamente via regex:', extractedUrl);
                            
                            // Retornar URL da imagem editada imediatamente
                            res.json({
                                success: true,
                                editedImageUrl: extractedUrl
                            });
                            return; // Encerrar a função aqui
                        }
                        
                        // Se não encontrou URL de imagem específica, tentar URL genérica
                        const genericUrlMatch = responseText.match(/(https?:\/\/[^\s"',<>]+)/i);
                        if (genericUrlMatch && genericUrlMatch[1]) {
                            const extractedUrl = genericUrlMatch[1];
                            console.log('URL genérica extraída via regex:', extractedUrl);
                            
                            // Retornar URL extraída imediatamente
                            res.json({
                                success: true,
                                editedImageUrl: extractedUrl
                            });
                            return; // Encerrar a função aqui
                        }
                        
                        // Tentar converter para JSON se não encontrou URL direta
                        try {
                            if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
                                output = JSON.parse(responseText);
                                console.log('ReadableStream convertido para JSON:', output);
                                
                                // Procurar URL no objeto JSON
                                let jsonUrl = null;
                                
                                // Caso 1: Array com URL como primeiro elemento
                                if (Array.isArray(output) && output.length > 0) {
                                    if (typeof output[0] === 'string' && output[0].startsWith('http')) {
                                        jsonUrl = output[0];
                                        console.log('URL encontrada como primeiro elemento do array:', jsonUrl);
                                    }
                                }
                                
                                // Caso 2: Objeto com propriedade output ou url
                                if (!jsonUrl && typeof output === 'object') {
                                    if (output.output && typeof output.output === 'string' && output.output.startsWith('http')) {
                                        jsonUrl = output.output;
                                        console.log('URL encontrada na propriedade output:', jsonUrl);
                                    } else if (output.url && typeof output.url === 'string' && output.url.startsWith('http')) {
                                        jsonUrl = output.url;
                                        console.log('URL encontrada na propriedade url:', jsonUrl);
                                    }
                                }
                                
                                if (jsonUrl) {
                                    // Retornar URL encontrada no JSON
                                    res.json({
                                        success: true,
                                        editedImageUrl: jsonUrl
                                    });
                                    return; // Encerrar a função aqui
                                }
                            } else {
                                console.log('Conteúdo do ReadableStream não é JSON nem URL:', responseText);
                                output = responseText;
                            }
                        } catch (jsonError) {
                            console.log('Não foi possível converter para JSON, usando texto como está:', jsonError.message);
                            output = responseText;
                        }
                        
                        // Se chegamos aqui, não conseguimos extrair uma URL válida
                        console.error('Não foi possível encontrar uma URL válida no objeto de resposta:', output);
                        throw new Error('Não foi possível encontrar uma URL válida no objeto de resposta: ' + 
                                       (typeof output === 'object' ? JSON.stringify(output) : output));
                    } catch (streamError) {
                        console.error('Erro ao processar ReadableStream:', streamError);
                        throw new Error(`Erro ao processar resposta do Replicate: ${streamError.message}`);
                    }
                }
                
                if (output !== null && output !== undefined) {
                    if (typeof output === 'object' && !Array.isArray(output)) {
                        console.log('Chaves do objeto:', Object.keys(output).join(', '));
                    }
                    console.log('Resposta completa:', JSON.stringify(output, null, 2));
                } else {
                    console.log('Resposta é null ou undefined');
                    throw new Error('Resposta vazia do Replicate');
                }
                
                // Extrair a URL da imagem editada
                let editedImageUrl;
                
                // Versão melhorada para extração de URL
                // Caso 1: Resposta é uma string (URL direta)
                if (typeof output === 'string') {
                    if (output.startsWith('http')) {
                        editedImageUrl = output;
                        console.log('Resposta é uma URL direta:', editedImageUrl);
                    } else {
                        // Tentar extrair URL da string usando regex
                        const urlMatch = output.match(/(https?:\/\/[^\s"',<>]+)/i);
                        if (urlMatch && urlMatch[1]) {
                            editedImageUrl = urlMatch[1];
                            console.log('URL extraída da string via regex:', editedImageUrl);
                        } else {
                            console.error('String não contém uma URL válida:', output);
                            throw new Error('Resposta não contém uma URL válida: ' + output.substring(0, 100) + '...');
                        }
                    }
                }
                // Caso 2: Resposta é um array
                else if (Array.isArray(output)) {
                    if (output.length === 0) {
                        console.error('Array de resposta está vazio');
                        throw new Error('Array de resposta está vazio');
                    }
                    
                    // Tentar extrair do primeiro elemento
                    const firstItem = output[0];
                    
                    if (typeof firstItem === 'string' && firstItem.startsWith('http')) {
                        editedImageUrl = firstItem;
                        console.log('URL extraída do primeiro elemento do array:', editedImageUrl);
                    } else if (firstItem && typeof firstItem === 'object') {
                        // Pode ser um objeto com uma URL
                        if (firstItem.url && typeof firstItem.url === 'string') {
                            editedImageUrl = firstItem.url;
                            console.log('URL extraída da propriedade url do primeiro elemento:', editedImageUrl);
                        } else if (firstItem.output && typeof firstItem.output === 'string') {
                            editedImageUrl = firstItem.output;
                            console.log('URL extraída da propriedade output do primeiro elemento:', editedImageUrl);
                        } else {
                            // Tentar extrair via regex
                            const objStr = JSON.stringify(firstItem);
                            const urlMatch = objStr.match(/(https?:\/\/[^\s"',<>]+)/i);
                            if (urlMatch && urlMatch[1]) {
                                editedImageUrl = urlMatch[1];
                                console.log('URL extraída via regex do primeiro elemento:', editedImageUrl);
                            } else {
                                // Tentar extrair de qualquer elemento do array
                                for (let i = 1; i < output.length; i++) {
                                    const item = output[i];
                                    if (typeof item === 'string' && item.startsWith('http')) {
                                        editedImageUrl = item;
                                        console.log(`URL extraída do elemento ${i} do array:`, editedImageUrl);
                                        break;
                                    }
                                }
                                
                                if (!editedImageUrl) {
                                    console.error('Nenhum elemento do array contém uma URL válida:', output);
                                    throw new Error('Nenhum elemento do array contém uma URL válida');
                                }
                            }
                        }
                    } else {
                        // Tentar extrair de qualquer elemento do array
                        for (let i = 1; i < output.length; i++) {
                            const item = output[i];
                            if (typeof item === 'string' && item.startsWith('http')) {
                                editedImageUrl = item;
                                console.log(`URL extraída do elemento ${i} do array:`, editedImageUrl);
                                break;
                            }
                        }
                        
                        if (!editedImageUrl) {
                            console.error('Nenhum elemento do array contém uma URL válida:', output);
                            throw new Error('Nenhum elemento do array contém uma URL válida');
                        }
                    }
                }
                // Caso 3: Resposta é um objeto
                else if (typeof output === 'object' && output !== null) {
                    console.log('Analisando objeto de resposta. Chaves disponíveis:', Object.keys(output));
                    
                    // Tentar extrair de propriedades comuns
                    if (output.output && typeof output.output === 'string' && output.output.startsWith('http')) {
                        editedImageUrl = output.output;
                        console.log('URL extraída da propriedade output:', editedImageUrl);
                    } else if (output.url && typeof output.url === 'string' && output.url.startsWith('http')) {
                        editedImageUrl = output.url;
                        console.log('URL extraída da propriedade url:', editedImageUrl);
                    } else if (output.image && typeof output.image === 'string' && output.image.startsWith('http')) {
                        editedImageUrl = output.image;
                        console.log('URL extraída da propriedade image:', editedImageUrl);
                    } else if (output.result && typeof output.result === 'string' && output.result.startsWith('http')) {
                        editedImageUrl = output.result;
                        console.log('URL extraída da propriedade result:', editedImageUrl);
                    } else {
                        // Procurar em qualquer propriedade que possa conter uma URL
                        for (const key in output) {
                            if (typeof output[key] === 'string' && output[key].startsWith('http')) {
                                editedImageUrl = output[key];
                                console.log(`URL extraída da propriedade ${key}:`, editedImageUrl);
                                break;
                            }
                        }
                        
                        // Se ainda não encontrou, tentar extrair via regex do JSON completo
                        if (!editedImageUrl) {
                            const objStr = JSON.stringify(output);
                            const urlMatch = objStr.match(/(https?:\/\/[^\s"',<>]+\.(jpg|jpeg|png|webp|gif))/i);
                            if (urlMatch && urlMatch[1]) {
                                editedImageUrl = urlMatch[1];
                                console.log('URL de imagem extraída via regex do JSON completo:', editedImageUrl);
                            } else {
                                // Tentar qualquer URL
                                const genericUrlMatch = objStr.match(/(https?:\/\/[^\s"',<>]+)/i);
                                if (genericUrlMatch && genericUrlMatch[1]) {
                                    editedImageUrl = genericUrlMatch[1];
                                    console.log('URL genérica extraída via regex do JSON completo:', editedImageUrl);
                                } else {
                                    console.error('Não foi possível encontrar uma URL válida no objeto de resposta:', output);
                                    throw new Error('Não foi possível encontrar uma URL válida no objeto de resposta');
                                }
                            }
                        }
                    }
                }
                // Caso 4: Formato não reconhecido
                else {
                    console.error('Formato de resposta não reconhecido:', typeof output, output);
                    throw new Error(`Formato de resposta não reconhecido: ${typeof output}`);
                }
                
                // Verificação final
                if (!editedImageUrl) {
                    throw new Error('Não foi possível extrair uma URL válida da resposta');
                }
                
                // Verificar se a URL parece válida
                if (!editedImageUrl.startsWith('http')) {
                    console.error('URL extraída não parece ser válida:', editedImageUrl);
                    throw new Error('URL extraída não é válida');
                }
                
                console.log('===== URL DA IMAGEM EDITADA EXTRAÍDA COM SUCESSO =====');
                console.log('URL final:', editedImageUrl);
            } catch (replicateError) {
                console.error('===== ERRO NA CHAMADA AO REPLICATE =====');
                console.error('Mensagem de erro:', replicateError.message);
                console.error('Stack trace:', replicateError.stack);
                
                // Se o erro tiver detalhes adicionais
                if (replicateError.response) {
                    console.error('Detalhes da resposta de erro:', replicateError.response);
                }
                
                throw replicateError;
            }
            
            // Retornar URL da imagem editada
            res.json({
                success: true,
                editedImageUrl: editedImageUrl
            });
            
        } catch (replicateError) {
            console.error('Erro ao processar com Replicate:', replicateError);
            console.error('Stack trace:', replicateError.stack);
            res.status(500).json({ error: `Erro na edição com IA: ${replicateError.message}` });
        }
        
    } catch (error) {
        console.error('Erro ao processar edição com IA:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Erro ao processar edição: ${error.message}` });
    }
});

// Rota para salvar imagem final
router.post('/save-final/:sessionId', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { mockupId, seed, imageUrl } = req.body;
        
        if (!mockupId || !imageUrl) {
            return res.status(400).json({ error: 'ID do mockup e URL da imagem são obrigatórios' });
        }
        
        // Buscar mockup no banco de dados
        const mockup = await Mockup.findById(mockupId);
        
        if (!mockup) {
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        // Verificar se o usuário tem permissão para editar este mockup
        if (mockup.criadoPor && mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para editar este mockup' });
        }
        
        try {
            console.log(`🔍 [MOCKUP-EDIT-SAVE] Tentando baixar imagem temporária: ${imageUrl}`);
            
            // Verificar se fetch está disponível
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch não está disponível globalmente');
            }
            
            // Baixar a imagem temporária usando fetch
            const imageResponse = await fetch(imageUrl);
            console.log(`🔍 [MOCKUP-EDIT-SAVE] Resposta recebida: ${imageResponse.status} ${imageResponse.statusText}`);
            
            if (!imageResponse.ok) {
                throw new Error(`Erro ao baixar imagem temporária: ${imageResponse.status}`);
            }
            
            // Método mais robusto para obter os dados binários
            let imageBuffer;
            try {
                // Tentar usar arrayBuffer() primeiro (API moderna)
                console.log(`🔍 [MOCKUP-EDIT-SAVE] Tentando usar arrayBuffer()`);
                const arrayBuffer = await imageResponse.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                console.log(`✅ [MOCKUP-EDIT-SAVE] arrayBuffer() funcionou com sucesso`);
            } catch (bufferError) {
                console.error(`❌ [MOCKUP-EDIT-SAVE] Erro ao usar arrayBuffer():`, bufferError);
                
                try {
                    // Fallback para buffer() (node-fetch)
                    console.log(`🔍 [MOCKUP-EDIT-SAVE] Tentando usar buffer()`);
                    if (typeof imageResponse.buffer === 'function') {
                        imageBuffer = await imageResponse.buffer();
                        console.log(`✅ [MOCKUP-EDIT-SAVE] buffer() funcionou com sucesso`);
                    } else {
                        // Último recurso: obter como texto e converter para buffer
                        console.log(`🔍 [MOCKUP-EDIT-SAVE] Tentando usar blob() e arrayBuffer()`);
                        const blob = await imageResponse.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        imageBuffer = Buffer.from(arrayBuffer);
                        console.log(`✅ [MOCKUP-EDIT-SAVE] blob() e arrayBuffer() funcionaram com sucesso`);
                    }
                } catch (fallbackError) {
                    console.error(`❌ [MOCKUP-EDIT-SAVE] Erro no fallback:`, fallbackError);
                    throw new Error(`Não foi possível processar a resposta da imagem: ${fallbackError.message}`);
                }
            }
            
            // Upload para pasta permanente no Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    public_id: `mockup_${mockupId}_${seed || 'edited'}`,
                    folder: 'mockups',
                    format: 'webp',
                    resource_type: 'image'
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }).end(imageBuffer);
            });
            
            // Atualizar o mockup no banco de dados
            if (seed) {
                // Atualizar uma variação específica
                if (mockup.metadados && mockup.metadados.imagensSalvas) {
                    const imagemIndex = mockup.metadados.imagensSalvas.findIndex(img => 
                        img.seed && img.seed.toString() === seed
                    );
                    
                    if (imagemIndex >= 0) {
                        // Atualizar imagem existente
                        mockup.metadados.imagensSalvas[imagemIndex].url = uploadResult.secure_url;
                        mockup.metadados.imagensSalvas[imagemIndex].publicId = uploadResult.public_id;
                        mockup.metadados.imagensSalvas[imagemIndex].editado = true;
                        mockup.metadados.imagensSalvas[imagemIndex].dataEdicao = new Date();
                    } else {
                        // Adicionar nova imagem
                        if (!mockup.metadados.imagensSalvas) {
                            mockup.metadados.imagensSalvas = [];
                        }
                        
                        mockup.metadados.imagensSalvas.push({
                            seed: seed,
                            url: uploadResult.secure_url,
                            publicId: uploadResult.public_id,
                            dataSalvamento: new Date(),
                            editado: true,
                            dataEdicao: new Date()
                        });
                    }
                } else {
                    // Inicializar metadados se não existirem
                    if (!mockup.metadados) {
                        mockup.metadados = {};
                    }
                    
                    mockup.metadados.imagensSalvas = [{
                        seed: seed,
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        dataSalvamento: new Date(),
                        editado: true,
                        dataEdicao: new Date()
                    }];
                }
            } else {
                // Atualizar imagem principal
                mockup.imagemUrl = uploadResult.secure_url;
                mockup.publicId = uploadResult.public_id;
                mockup.editado = true;
                mockup.dataEdicao = new Date();
            }
            
            await mockup.save();
            
            // Tentar remover a imagem temporária do Cloudinary
            try {
                await cloudinary.uploader.destroy(`temp_edits/${sessionId}`);
                console.log(`Imagem temporária removida: temp_edits/${sessionId}`);
            } catch (cleanupError) {
                console.error('Erro ao remover imagem temporária:', cleanupError);
                // Continuar mesmo se falhar na limpeza
            }
            
            // Retornar sucesso
            res.json({
                success: true,
                url: uploadResult.secure_url,
                message: 'Imagem salva com sucesso'
            });
            
        } catch (processError) {
            console.error('Erro ao processar imagem final:', processError);
            res.status(500).json({ error: `Erro ao salvar imagem: ${processError.message}` });
        }
        
    } catch (error) {
        console.error('Erro ao salvar imagem final:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Erro ao salvar imagem: ${error.message}` });
    }
});

// Rota para salvar imagem editada (mantida para compatibilidade)
router.post('/save/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const mockupId = req.params.id;
        const { imageData, format } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: 'Dados da imagem são obrigatórios' });
        }
        
        // Buscar mockup no banco de dados
        const mockup = await Mockup.findById(mockupId);
        
        if (!mockup) {
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        // Verificar se o usuário tem permissão para editar este mockup
        if (mockup.criadoPor && mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para editar este mockup' });
        }
        
        // Remover o prefixo "data:image/..." da string base64
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload para Cloudinary
        cloudinary.uploader.upload_stream({
            public_id: `mockup_${mockupId}_edited`,
            folder: 'mockups',
            format: format || 'webp',
            resource_type: 'image'
        }, async (error, result) => {
            if (error) {
                console.error('Erro ao fazer upload para Cloudinary:', error);
                return res.status(500).json({ error: 'Erro ao salvar imagem' });
            }
            
            try {
                // Atualizar mockup no banco de dados
                mockup.url = result.secure_url;
                mockup.publicId = result.public_id;
                mockup.editado = true;
                mockup.dataEdicao = new Date();
                
                await mockup.save();
                
                // Retornar sucesso
                res.json({
                    success: true,
                    url: result.secure_url
                });
                
            } catch (dbError) {
                console.error('Erro ao atualizar mockup no banco de dados:', dbError);
                res.status(500).json({ error: `Erro ao salvar imagem: ${dbError.message}` });
            }
        }).end(buffer);
        
    } catch (error) {
        console.error('Erro ao salvar imagem editada:', error);
        res.status(500).json({ error: `Erro ao salvar imagem: ${error.message}` });
    }
});

// Rota para servir a página do editor
router.get('/editor/:id', authMiddleware.isAuthenticated, (req, res) => {
    // Servir a página HTML do editor
    res.sendFile(path.join(__dirname, '../../public/editor.html'));
});

module.exports = router;
