const Replicate = require('replicate');
const Mockup = require('../models/Mockup');
const progressService = require('./progressService');

// Configurar Replicate
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

class ArtisticStyleService {
    constructor() {
        this.stylePrompts = {
            aquarela: {
                prompt: "watercolor painting style, soft flowing colors, translucent washes, artistic brush strokes, paper texture visible",
                negativePrompt: "digital art, sharp edges, solid colors, photographic",
                strength: 0.7
            },
            oleo: {
                prompt: "oil painting style, thick impasto brushstrokes, rich colors, classical painting technique, canvas texture",
                negativePrompt: "digital art, flat colors, smooth surfaces, photographic",
                strength: 0.8
            },
            sketch: {
                prompt: "pencil sketch style, hand-drawn lines, graphite shading, artistic sketching, paper texture",
                negativePrompt: "colored, digital art, photographic, painted",
                strength: 0.6
            },
            cartoon: {
                prompt: "cartoon style, animated character design, bold outlines, vibrant colors, stylized features",
                negativePrompt: "realistic, photographic, detailed textures, complex shading",
                strength: 0.9
            },
            anime: {
                prompt: "anime manga style, cel-shaded, large expressive eyes, clean lines, Japanese animation style",
                negativePrompt: "realistic, western cartoon, photographic, rough sketches",
                strength: 0.85
            },
            vintage: {
                prompt: "vintage retro style, aged paper, sepia tones, old photograph aesthetic, nostalgic feel",
                negativePrompt: "modern, bright colors, digital, contemporary",
                strength: 0.7
            },
            vetorial: {
                prompt: "vector art style, clean geometric shapes, flat colors, minimalist design, scalable graphics",
                negativePrompt: "textured, photographic, hand-drawn, complex details",
                strength: 0.8
            },
            'pop-art': {
                prompt: "pop art style, bold bright colors, high contrast, comic book aesthetic, Andy Warhol inspired",
                negativePrompt: "muted colors, realistic, classical art, subtle tones",
                strength: 0.9
            }
        };
    }

    // Aplicar estilo artístico usando Flux
    async applyArtisticStyle({ processId, clienteId, imageUrl, style, intensity, preserveElements }) {
        try {
            console.log('🎨 [ARTISTIC STYLE SERVICE] Iniciando aplicação de estilo:', {
                processId,
                style,
                intensity,
                preserveElements
            });

            // Atualizar progresso - Analisando imagem
            progressService.updateProcess(processId, {
                status: 'in-progress',
                progress: 25,
                currentStep: 0,
                message: 'Analisando imagem original...'
            });

            // Obter configurações do estilo
            const styleConfig = this.stylePrompts[style];
            if (!styleConfig) {
                throw new Error(`Estilo '${style}' não encontrado`);
            }

            // Construir prompt baseado no estilo e preservação
            const prompt = this.buildStylePrompt(styleConfig, intensity, preserveElements);
            
            console.log('📝 [ARTISTIC STYLE SERVICE] Prompt construído:', prompt);

            // Atualizar progresso - Preparando transformação
            progressService.updateProcess(processId, {
                progress: 50,
                currentStep: 1,
                message: 'Preparando transformação artística...'
            });

            // Calcular strength baseado na intensidade
            const baseStrength = styleConfig.strength;
            const intensityFactor = intensity / 100;
            const finalStrength = Math.min(0.95, baseStrength * intensityFactor);

            console.log('⚙️ [ARTISTIC STYLE SERVICE] Parâmetros Flux:', {
                strength: finalStrength,
                guidance_scale: 3.5,
                num_inference_steps: 28
            });

            // Atualizar progresso - Aplicando estilo
            progressService.updateProcess(processId, {
                progress: 75,
                currentStep: 2,
                message: 'Aplicando estilo com IA...'
            });

            // Chamar Flux para aplicar o estilo
            const output = await replicate.run(
                "black-forest-labs/flux-1.1-pro",
                {
                    input: {
                        image: imageUrl,
                        prompt: prompt,
                        guidance_scale: 3.5,
                        num_inference_steps: 28,
                        strength: finalStrength,
                        output_format: "webp",
                        output_quality: 90,
                        safety_tolerance: 2
                    }
                }
            );

            console.log('✅ [ARTISTIC STYLE SERVICE] Flux processamento concluído');

            // Verificar se o output é válido
            if (!output || (Array.isArray(output) && output.length === 0)) {
                throw new Error('Nenhuma imagem foi gerada pelo Flux');
            }

            const resultImageUrl = Array.isArray(output) ? output[0] : output;
            
            console.log('🖼️ [ARTISTIC STYLE SERVICE] URL da imagem resultado:', resultImageUrl);

            // Atualizar progresso - Finalizando
            progressService.updateProcess(processId, {
                progress: 100,
                currentStep: 3,
                message: 'Finalizando resultado...',
                status: 'completed',
                result: {
                    originalImageUrl: imageUrl,
                    styledImageUrl: resultImageUrl,
                    style,
                    intensity,
                    preserveElements,
                    prompt: prompt,
                    parameters: {
                        strength: finalStrength,
                        guidance_scale: 3.5,
                        num_inference_steps: 28
                    }
                }
            });

            console.log('🎉 [ARTISTIC STYLE SERVICE] Estilo artístico aplicado com sucesso!');

            return {
                success: true,
                originalImageUrl: imageUrl,
                styledImageUrl: resultImageUrl,
                style,
                intensity,
                preserveElements
            };

        } catch (error) {
            console.error('❌ [ARTISTIC STYLE SERVICE] Erro ao aplicar estilo:', error);
            
            progressService.updateProcess(processId, {
                status: 'error',
                error: error.message || 'Erro ao aplicar estilo artístico'
            });

            throw error;
        }
    }

    // Construir prompt otimizado para o estilo
    buildStylePrompt(styleConfig, intensity, preserveElements) {
        let prompt = styleConfig.prompt;
        
        // Adicionar instruções de preservação
        if (preserveElements && preserveElements.length > 0) {
            const preservationInstructions = this.getPreservationInstructions(preserveElements);
            prompt = `${prompt}, ${preservationInstructions}`;
        }

        // Ajustar intensidade no prompt
        if (intensity >= 80) {
            prompt = `highly stylized ${prompt}, strong artistic effect`;
        } else if (intensity >= 60) {
            prompt = `stylized ${prompt}, moderate artistic effect`;
        } else if (intensity >= 40) {
            prompt = `subtle ${prompt}, gentle artistic effect`;
        } else {
            prompt = `lightly ${prompt}, minimal artistic effect`;
        }

        // Adicionar instruções gerais de qualidade
        prompt += ", high quality, detailed, professional artwork";

        return prompt;
    }

    // Obter instruções de preservação
    getPreservationInstructions(preserveElements) {
        const instructions = [];
        
        if (preserveElements.includes('texto')) {
            instructions.push('preserve all text and typography exactly');
        }
        
        if (preserveElements.includes('logos')) {
            instructions.push('maintain logo shapes and brand elements');
        }
        
        if (preserveElements.includes('faces')) {
            instructions.push('keep facial features recognizable');
        }

        return instructions.join(', ');
    }

    // Gerar recomendações de estilo baseadas no tipo de imagem
    generateStyleRecommendations(imageType) {
        const recommendations = {
            logo: [
                {
                    style: 'vetorial',
                    reason: 'Ideal para logos - mantém formas limpas e escalabilidade',
                    intensity: 60
                },
                {
                    style: 'vintage',
                    reason: 'Cria um visual retrô e memorável para a marca',
                    intensity: 50
                }
            ],
            'post-social': [
                {
                    style: 'pop-art',
                    reason: 'Chama atenção nas redes sociais com cores vibrantes',
                    intensity: 70
                },
                {
                    style: 'cartoon',
                    reason: 'Estilo amigável e envolvente para engajamento',
                    intensity: 65
                }
            ],
            banner: [
                {
                    style: 'oleo',
                    reason: 'Transmite sofisticação e qualidade premium',
                    intensity: 55
                },
                {
                    style: 'aquarela',
                    reason: 'Visual suave e elegante para campanhas',
                    intensity: 60
                }
            ],
            default: [
                {
                    style: 'aquarela',
                    reason: 'Estilo versátil e artisticamente agradável',
                    intensity: 50
                },
                {
                    style: 'sketch',
                    reason: 'Aparência artesanal e autêntica',
                    intensity: 45
                },
                {
                    style: 'vintage',
                    reason: 'Adiciona caráter nostálgico e único',
                    intensity: 55
                }
            ]
        };

        return recommendations[imageType] || recommendations.default;
    }

    // Salvar imagem com estilo na galeria
    async saveStyledImage({ clienteId, originalImageUrl, styledImageUrl, style, intensity, preserveElements }) {
        try {
            console.log('💾 [ARTISTIC STYLE SERVICE] Salvando imagem estilizada na galeria');

            // Criar entrada no banco de dados
            const mockup = new Mockup({
                clienteId,
                titulo: `Estilo ${style.charAt(0).toUpperCase() + style.slice(1)}`,
                tipo: 'artistic-style',
                prompt: `Estilo artístico ${style} aplicado com intensidade ${intensity}%`,
                imagensSalvas: [
                    {
                        url: styledImageUrl,
                        seed: `style-${style}-${Date.now()}`,
                        parametros: {
                            originalImage: originalImageUrl,
                            style,
                            intensity,
                            preserveElements,
                            model: 'flux-1.1-pro'
                        }
                    }
                ],
                status: 'completed',
                criadoEm: new Date(),
                configuracoes: {
                    aspectRatio: '1:1',
                    estilo: style,
                    cores: 'artistic',
                    elementos: 'stylized',
                    setor: 'arte',
                    audiencia: 'geral',
                    mood: 'artistic',
                    renderStyle: 'artistic'
                }
            });

            const savedMockup = await mockup.save();
            
            console.log('✅ [ARTISTIC STYLE SERVICE] Imagem salva com ID:', savedMockup._id);

            return savedMockup;

        } catch (error) {
            console.error('❌ [ARTISTIC STYLE SERVICE] Erro ao salvar imagem:', error);
            throw error;
        }
    }

    // Analisar imagem para sugerir melhores estilos
    async analyzeImageForStyles(imageUrl) {
        try {
            // Esta função pode ser expandida para usar IA de análise de imagem
            // Por enquanto, retorna recomendações genéricas
            
            console.log('🔍 [ARTISTIC STYLE SERVICE] Analisando imagem para sugestões de estilo');
            
            // Simulação de análise - pode ser implementada com Vision AI
            const analysis = {
                hasText: Math.random() > 0.5,
                hasLogos: Math.random() > 0.7,
                hasFaces: Math.random() > 0.6,
                dominantColors: ['blue', 'white', 'gray'],
                complexity: Math.random() > 0.5 ? 'high' : 'low',
                style: Math.random() > 0.5 ? 'modern' : 'classic'
            };

            // Gerar recomendações baseadas na análise
            const recommendations = this.generateRecommendationsFromAnalysis(analysis);
            
            return {
                analysis,
                recommendations
            };

        } catch (error) {
            console.error('❌ [ARTISTIC STYLE SERVICE] Erro na análise de imagem:', error);
            throw error;
        }
    }

    // Gerar recomendações baseadas na análise
    generateRecommendationsFromAnalysis(analysis) {
        const recommendations = [];

        if (analysis.hasText) {
            recommendations.push({
                style: 'vetorial',
                reason: 'Preserva melhor a legibilidade do texto',
                preserveElements: ['texto']
            });
        }

        if (analysis.hasLogos) {
            recommendations.push({
                style: 'vintage',
                reason: 'Mantém a identidade da marca com toque artístico',
                preserveElements: ['logos']
            });
        }

        if (analysis.hasFaces) {
            recommendations.push({
                style: 'aquarela',
                reason: 'Suaviza características faciais artisticamente',
                preserveElements: ['faces']
            });
        }

        if (analysis.complexity === 'high') {
            recommendations.push({
                style: 'sketch',
                reason: 'Simplifica elementos complexos mantendo essência',
                intensity: 40
            });
        }

        if (analysis.style === 'modern') {
            recommendations.push({
                style: 'pop-art',
                reason: 'Complementa estética moderna com cores vibrantes',
                intensity: 70
            });
        }

        return recommendations.slice(0, 3); // Máximo 3 recomendações
    }

    // Validar se a imagem é adequada para estilização
    async validateImageForStyling(imageUrl) {
        try {
            console.log('✅ [ARTISTIC STYLE SERVICE] Validando imagem para estilização');
            
            // Verificações básicas
            if (!imageUrl || typeof imageUrl !== 'string') {
                throw new Error('URL da imagem inválida');
            }

            // Verificar se é uma URL válida
            try {
                new URL(imageUrl);
            } catch {
                throw new Error('Formato de URL inválido');
            }

            // Verificar extensão (básico)
            const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            const hasValidExtension = validExtensions.some(ext => 
                imageUrl.toLowerCase().includes(ext)
            );

            if (!hasValidExtension) {
                console.warn('⚠️ [ARTISTIC STYLE SERVICE] Extensão de arquivo não reconhecida, mas prosseguindo');
            }

            return {
                valid: true,
                warnings: hasValidExtension ? [] : ['Extensão de arquivo não reconhecida']
            };

        } catch (error) {
            console.error('❌ [ARTISTIC STYLE SERVICE] Erro na validação:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = new ArtisticStyleService();
