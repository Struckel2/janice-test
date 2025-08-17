const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../config/cloudinary');
const Mockup = require('../models/Mockup');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads/temp');
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'edited-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Rota para salvar imagem editada
router.post('/save-edited', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { imageId, clientId } = req.body;
        
        if (!imageId || !clientId || !req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parâmetros inválidos. Imagem, ID da imagem e ID do cliente são obrigatórios.' 
            });
        }
        
        // Caminho do arquivo temporário
        const filePath = req.file.path;
        
        // Upload para o Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `clientes/${clientId}/mockups/edited`,
            resource_type: 'image'
        });
        
        // Remover arquivo temporário
        fs.unlinkSync(filePath);
        
        // Buscar mockup original
        const mockup = await Mockup.findById(imageId);
        if (!mockup) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mockup não encontrado' 
            });
        }
        
        // Criar novo mockup com a imagem editada
        const editedMockup = new Mockup({
            cliente: clientId,
            titulo: `${mockup.titulo} (Editado)`,
            prompt: mockup.prompt,
            configuracao: mockup.configuracao,
            status: 'concluido',
            imagemUrl: result.secure_url,
            metadados: {
                ...mockup.metadados,
                editado: true,
                originalId: mockup._id,
                cloudinaryId: result.public_id
            }
        });
        
        await editedMockup.save();
        
        res.status(200).json({
            success: true,
            message: 'Imagem editada salva com sucesso',
            data: {
                mockupId: editedMockup._id,
                url: result.secure_url
            }
        });
        
    } catch (error) {
        console.error('Erro ao salvar imagem editada:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao salvar imagem editada',
            error: error.message
        });
    }
});

// Rota para abrir o editor com uma imagem específica
router.get('/editor/:imageId', isAuthenticated, async (req, res) => {
    try {
        const { imageId } = req.params;
        
        // Buscar mockup
        const mockup = await Mockup.findById(imageId);
        if (!mockup) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mockup não encontrado' 
            });
        }
        
        // Redirecionar para o editor com os parâmetros necessários
        res.redirect(`/editor.html?id=${imageId}&imageUrl=${encodeURIComponent(mockup.imagemUrl)}&clientId=${mockup.cliente}`);
        
    } catch (error) {
        console.error('Erro ao abrir editor:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao abrir editor',
            error: error.message
        });
    }
});

module.exports = router;
