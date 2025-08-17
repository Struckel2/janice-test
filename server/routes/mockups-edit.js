const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
const cloudinary = require('../config/cloudinary');

// Middleware para verificar autenticação
const authMiddleware = require('../middleware/auth');

/**
 * Rota para renderizar a página do editor de imagens
 * GET /api/mockups-edit/editor/:id
 */
router.get('/editor/:id', authMiddleware.isAuthenticated, (req, res) => {
    // Renderizar a página do editor
    res.sendFile(path.join(__dirname, '../../public/editor.html'));
});

/**
 * Rota para obter informações da imagem
 * GET /api/mockups-edit/image/:id
 */
router.get('/image/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const imageId = req.params.id;
        
        // Verificar se o ID da imagem foi fornecido
        if (!imageId) {
            return res.status(400).json({ error: 'ID da imagem não fornecido' });
        }
        
        // Buscar imagem na galeria ou no banco de dados
        // Aqui você pode adaptar para buscar de onde suas imagens estão armazenadas
        // Por exemplo, do Cloudinary, do sistema de arquivos local, etc.
        
        // Exemplo com Cloudinary (assumindo que o ID é o public_id do Cloudinary)
        try {
            // Tentar buscar do Cloudinary
            const result = await cloudinary.api.resource(imageId);
            
            return res.json({
                id: imageId,
                url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format
            });
        } catch (cloudinaryError) {
            console.error('Erro ao buscar imagem do Cloudinary:', cloudinaryError);
            
            // Se não encontrar no Cloudinary, tentar buscar localmente
            // Verificar se existe na pasta de uploads
            const localPath = path.join(__dirname, '../../public/uploads', `${imageId}.webp`);
            
            if (await existsAsync(localPath)) {
                // Se existir localmente, retornar URL local
                return res.json({
                    id: imageId,
                    url: `/uploads/${imageId}.webp`,
                    // Não temos informações de dimensões para arquivos locais sem processamento adicional
                    width: 800, // valor padrão
                    height: 600, // valor padrão
                    format: 'webp'
                });
            }
            
            // Se não encontrar em nenhum lugar, retornar erro
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar informações da imagem:', error);
        res.status(500).json({ error: 'Erro ao buscar informações da imagem' });
    }
});

/**
 * Rota para salvar imagem editada
 * POST /api/mockups-edit/save/:id
 */
router.post('/save/:id', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const imageId = req.params.id;
        const { imageData, format, filename } = req.body;
        
        // Verificar se os dados necessários foram fornecidos
        if (!imageId || !imageData) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        // Verificar se o formato é válido
        const validFormats = ['webp', 'jpeg', 'png'];
        const imageFormat = format && validFormats.includes(format) ? format : 'webp';
        
        // Remover o prefixo "data:image/..." da string base64
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Gerar nome de arquivo único se não for fornecido
        const safeFilename = filename 
            ? filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() 
            : `imagem_editada_${Date.now()}`;
        
        // Opção 1: Salvar localmente
        try {
            // Garantir que o diretório de uploads existe
            const uploadsDir = path.join(__dirname, '../../public/uploads');
            if (!await existsAsync(uploadsDir)) {
                await mkdirAsync(uploadsDir, { recursive: true });
            }
            
            // Caminho completo do arquivo
            const filePath = path.join(uploadsDir, `${safeFilename}.${imageFormat}`);
            
            // Salvar arquivo
            await writeFileAsync(filePath, buffer);
            
            // URL relativa para acesso via navegador
            const fileUrl = `/uploads/${safeFilename}.${imageFormat}`;
            
            // Opção 2: Fazer upload para o Cloudinary (se configurado)
            let cloudinaryResult = null;
            
            if (cloudinary.uploader) {
                try {
                    // Upload para o Cloudinary
                    cloudinaryResult = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            {
                                public_id: safeFilename,
                                folder: 'edited',
                                format: imageFormat,
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        ).end(buffer);
                    });
                } catch (cloudinaryError) {
                    console.error('Erro ao fazer upload para o Cloudinary:', cloudinaryError);
                    // Continuar com o arquivo local se o upload para o Cloudinary falhar
                }
            }
            
            // Retornar informações da imagem salva
            return res.json({
                success: true,
                message: 'Imagem salva com sucesso',
                local: {
                    path: filePath,
                    url: fileUrl
                },
                cloudinary: cloudinaryResult ? {
                    public_id: cloudinaryResult.public_id,
                    url: cloudinaryResult.secure_url
                } : null
            });
            
        } catch (saveError) {
            console.error('Erro ao salvar imagem localmente:', saveError);
            return res.status(500).json({ error: 'Erro ao salvar imagem' });
        }
        
    } catch (error) {
        console.error('Erro ao processar imagem editada:', error);
        res.status(500).json({ error: 'Erro ao processar imagem editada' });
    }
});

/**
 * Rota para adicionar botão de edição na galeria
 * GET /api/mockups-edit/add-edit-button/:galleryItemId
 * Esta rota é apenas um exemplo e pode ser adaptada conforme necessário
 */
router.get('/add-edit-button/:galleryItemId', authMiddleware.isAuthenticated, (req, res) => {
    const galleryItemId = req.params.galleryItemId;
    
    // Aqui você pode implementar a lógica para adicionar o botão de edição
    // a um item específico da galeria, se necessário
    
    res.json({
        success: true,
        message: 'Botão de edição adicionado',
        galleryItemId
    });
});

module.exports = router;
