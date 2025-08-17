const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const Mockup = require('../models/Mockup');
const path = require('path');

// Rota para obter imagem para edição
router.get('/image/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const mockupId = req.params.id;
        
        // Buscar mockup no banco de dados
        const mockup = await Mockup.findById(mockupId);
        
        if (!mockup) {
            return res.status(404).json({ error: 'Mockup não encontrado' });
        }
        
        // Verificar se o usuário tem permissão para acessar este mockup
        if (mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Você não tem permissão para acessar este mockup' });
        }
        
        // Retornar URL da imagem
        res.json({
            url: mockup.url,
            nome: mockup.nome
        });
        
    } catch (error) {
        console.error('Erro ao obter imagem para edição:', error);
        res.status(500).json({ error: `Erro ao obter imagem: ${error.message}` });
    }
});

// Rota para edição com IA
router.post('/ai-edit/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const { prompt, imageData } = req.body;
        
        if (!prompt || !imageData) {
            return res.status(400).json({ error: 'Prompt e dados da imagem são obrigatórios' });
        }
        
        // Remover o prefixo "data:image/..." da string base64
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Gerar nome de arquivo único
        const tempFilename = `temp_edit_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // Upload para Cloudinary para obter URL
        cloudinary.uploader.upload_stream({
            public_id: tempFilename,
            folder: 'temp_edits',
            format: 'png',
            resource_type: 'image',
            // Expirar em 1 hora (segurança adicional)
            expires_at: Math.floor(Date.now() / 1000) + 3600
        }, async (error, result) => {
            if (error) {
                console.error('Erro ao fazer upload para Cloudinary:', error);
                return res.status(500).json({ error: 'Erro ao processar imagem' });
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
                    image: result.secure_url,
                    output_format: 'webp',
                    output_quality: 90,
                    safety_tolerance: 2
                };
                
                console.log('Enviando para Replicate:', {
                    model,
                    input: {
                        ...input,
                        image: result.secure_url + ' (URL Cloudinary)'
                    }
                });
                
                // Executar o modelo
                const output = await replicate.run(model, { input });
                
                // Retornar URL da imagem editada
                res.json({
                    success: true,
                    editedImageUrl: output
                });
                
                // Remover imagem temporária do Cloudinary imediatamente
                try {
                    await cloudinary.uploader.destroy(result.public_id);
                    console.log('Imagem temporária removida do Cloudinary:', result.public_id);
                } catch (cleanupError) {
                    console.error('Erro ao remover imagem temporária:', cleanupError);
                }
                
            } catch (replicateError) {
                console.error('Erro ao processar com Replicate:', replicateError);
                
                // Limpar arquivo temporário mesmo em caso de erro
                try {
                    await cloudinary.uploader.destroy(result.public_id);
                } catch (cleanupError) {
                    console.error('Erro ao remover imagem temporária após falha:', cleanupError);
                }
                
                res.status(500).json({ error: `Erro na edição com IA: ${replicateError.message}` });
            }
        }).end(buffer);
        
    } catch (error) {
        console.error('Erro ao processar edição com IA:', error);
        res.status(500).json({ error: `Erro ao processar edição: ${error.message}` });
    }
});

// Rota para salvar imagem editada
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
        if (mockup.criadoPor.toString() !== req.user._id.toString() && !req.user.isAdmin) {
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
