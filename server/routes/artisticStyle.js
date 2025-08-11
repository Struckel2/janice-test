const express = require('express');
const router = express.Router();
const artisticStyleService = require('../services/artisticStyleService');
const progressService = require('../services/progressService');

// Aplicar estilo artístico a uma imagem
router.post('/apply', async (req, res) => {
    try {
        console.log('🎨 [ARTISTIC STYLE] Iniciando aplicação de estilo artístico');
        console.log('📝 [ARTISTIC STYLE] Dados recebidos:', {
            clienteId: req.body.clienteId,
            imageUrl: req.body.imageUrl ? 'URL fornecida' : 'URL não fornecida',
            style: req.body.style,
            intensity: req.body.intensity,
            preserveElements: req.body.preserveElements
        });

        const { clienteId, imageUrl, style, intensity, preserveElements } = req.body;

        // Validação dos dados obrigatórios
        if (!clienteId || !imageUrl || !style) {
            console.log('❌ [ARTISTIC STYLE] Dados obrigatórios faltando');
            return res.status(400).json({
                success: false,
                error: 'Cliente ID, URL da imagem e estilo são obrigatórios'
            });
        }

        // Validar estilo
        const validStyles = ['aquarela', 'oleo', 'sketch', 'cartoon', 'anime', 'vintage', 'vetorial', 'pop-art'];
        if (!validStyles.includes(style)) {
            console.log('❌ [ARTISTIC STYLE] Estilo inválido:', style);
            return res.status(400).json({
                success: false,
                error: 'Estilo artístico inválido'
            });
        }

        // Validar intensidade
        const intensityNum = parseInt(intensity) || 50;
        if (intensityNum < 10 || intensityNum > 100) {
            console.log('❌ [ARTISTIC STYLE] Intensidade inválida:', intensityNum);
            return res.status(400).json({
                success: false,
                error: 'Intensidade deve estar entre 10 e 100'
            });
        }

        // Criar processo de progresso
        const processId = `artistic-style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('🔄 [ARTISTIC STYLE] Criando processo de progresso:', processId);
        
        progressService.createProcess(processId, {
            type: 'artistic-style',
            clienteId,
            title: `Aplicando estilo ${style}`,
            estimatedTime: 45000, // 45 segundos
            steps: [
                'Analisando imagem original',
                'Preparando transformação artística',
                'Aplicando estilo com IA',
                'Finalizando resultado'
            ]
        });

        // Iniciar processamento assíncrono
        artisticStyleService.applyArtisticStyle({
            processId,
            clienteId,
            imageUrl,
            style,
            intensity: intensityNum,
            preserveElements: preserveElements || []
        }).catch(error => {
            console.error('❌ [ARTISTIC STYLE] Erro no processamento assíncrono:', error);
            progressService.updateProcess(processId, {
                status: 'error',
                error: error.message || 'Erro interno no processamento'
            });
        });

        console.log('✅ [ARTISTIC STYLE] Processo iniciado com sucesso');
        
        res.json({
            success: true,
            processId,
            message: 'Aplicação de estilo artístico iniciada'
        });

    } catch (error) {
        console.error('❌ [ARTISTIC STYLE] Erro na rota /apply:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Obter recomendações de estilo baseadas na imagem
router.post('/recommendations', async (req, res) => {
    try {
        console.log('💡 [ARTISTIC STYLE] Gerando recomendações de estilo');
        
        const { imageUrl, imageType } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'URL da imagem é obrigatória'
            });
        }

        const recommendations = artisticStyleService.generateStyleRecommendations(imageType);
        
        console.log('✅ [ARTISTIC STYLE] Recomendações geradas:', recommendations.length);
        
        res.json({
            success: true,
            recommendations
        });

    } catch (error) {
        console.error('❌ [ARTISTIC STYLE] Erro ao gerar recomendações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Salvar resultado do estilo artístico na galeria
router.post('/save', async (req, res) => {
    try {
        console.log('💾 [ARTISTIC STYLE] Salvando resultado na galeria');
        
        const { clienteId, originalImageUrl, styledImageUrl, style, intensity, preserveElements } = req.body;

        if (!clienteId || !originalImageUrl || !styledImageUrl || !style) {
            return res.status(400).json({
                success: false,
                error: 'Dados obrigatórios faltando para salvar'
            });
        }

        const result = await artisticStyleService.saveStyledImage({
            clienteId,
            originalImageUrl,
            styledImageUrl,
            style,
            intensity,
            preserveElements
        });

        console.log('✅ [ARTISTIC STYLE] Imagem salva na galeria:', result._id);
        
        res.json({
            success: true,
            savedImage: result,
            message: 'Imagem com estilo artístico salva na galeria'
        });

    } catch (error) {
        console.error('❌ [ARTISTIC STYLE] Erro ao salvar na galeria:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao salvar imagem na galeria'
        });
    }
});

module.exports = router;
