const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const Mockup = require('../models/Mockup');
const path = require('path');

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
        const mockup = await Mockup.findById(realMockupId);
        
        if (!mockup) {
            console.log(`❌ [MOCKUP-EDIT-SESSION] Mockup não encontrado com ID: ${realMockupId}`);
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        // Verificar se o usuário tem permissão para acessar este mockup
        if (mockup.criadoPor && mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este mockup' });
        }
        
        // Determinar a URL da imagem original
        let imageUrl;
        
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
            return res.status(404).json({ error: 'Imagem não encontrada para este mockup' });
        }
        
        // Gerar um ID de sessão único
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        try {
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Tentando baixar imagem original: ${imageUrl}`);
            
            // Verificar se fetch está disponível
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch não está disponível globalmente');
            }
            
            // Baixar a imagem original usando fetch
            const imageResponse = await fetch(imageUrl);
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Resposta recebida: ${imageResponse.status} ${imageResponse.statusText}`);
            
            if (!imageResponse.ok) {
                throw new Error(`Erro ao baixar imagem original: ${imageResponse.status}`);
            }
            
            // Converter resposta para ArrayBuffer e depois para Buffer
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Convertendo resposta para ArrayBuffer`);
            const arrayBuffer = await imageResponse.arrayBuffer();
            console.log(`🔍 [MOCKUP-EDIT-SESSION] Convertendo ArrayBuffer para Buffer`);
            const imageBuffer = Buffer.from(arrayBuffer);
            
            // Fazer upload para pasta temporária no Cloudinary
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
                }).end(imageBuffer);
            });
            
            console.log(`✅ [MOCKUP-EDIT-SESSION] Sessão inicializada: ${sessionId}`);
            console.log(`✅ [MOCKUP-EDIT-SESSION] Imagem temporária: ${uploadResult.secure_url}`);
            
            // Retornar informações da sessão
            res.json({
                success: true,
                sessionId: sessionId,
                imageUrl: uploadResult.secure_url,
                originalImageUrl: imageUrl,
                mockupId: realMockupId,
                seed: seed
            });
            
        } catch (fetchError) {
            console.error('Erro ao processar imagem original:', fetchError);
            res.status(500).json({ error: `Erro ao inicializar sessão: ${fetchError.message}` });
        }
        
    } catch (error) {
        console.error('Erro ao inicializar sessão de edição:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: `Erro ao inicializar sessão: ${error.message}` });
    }
});

// Rota para atualizar imagem temporária
router.post('/update-temp/:sessionId', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { imageData } = req.body;
        
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
            
            // Modelo Flux 1.1 Pro
            const model = "black-forest-labs/flux-1.1-pro";
            
            // Parâmetros para o modelo
            const input = {
                prompt: prompt,
                image: imageUrl,
                output_format: 'webp',
                output_quality: 90,
                safety_tolerance: 2
            };
            
            console.log('Enviando para Replicate:', {
                model,
                input: {
                    ...input,
                    image: imageUrl + ' (URL Cloudinary)'
                }
            });
            
            // Executar o modelo
            const output = await replicate.run(model, { input });
            
            // Retornar URL da imagem editada
            res.json({
                success: true,
                editedImageUrl: output
            });
            
        } catch (replicateError) {
            console.error('Erro ao processar com Replicate:', replicateError);
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
            
            // Converter resposta para ArrayBuffer e depois para Buffer
            console.log(`🔍 [MOCKUP-EDIT-SAVE] Convertendo resposta para ArrayBuffer`);
            const arrayBuffer = await imageResponse.arrayBuffer();
            console.log(`🔍 [MOCKUP-EDIT-SAVE] Convertendo ArrayBuffer para Buffer`);
            const imageBuffer = Buffer.from(arrayBuffer);
            
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
