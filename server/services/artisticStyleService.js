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
            // ===== ESTILOS CLÁSSICOS =====
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
            impressionista: {
                prompt: "impressionist painting style, loose brushwork, light and color emphasis, plein air technique, visible brushstrokes, atmospheric effects",
                negativePrompt: "sharp details, digital art, photographic, precise lines",
                strength: 0.75
            },
            sketch: {
                prompt: "pencil sketch style, hand-drawn lines, graphite shading, artistic sketching, paper texture",
                negativePrompt: "colored, digital art, photographic, painted",
                strength: 0.6
            },
            cubista: {
                prompt: "cubist art style, geometric shapes, fragmented forms, multiple perspectives, Picasso inspired, angular composition",
                negativePrompt: "realistic, smooth curves, photographic, traditional perspective",
                strength: 0.85
            },
            surrealista: {
                prompt: "surrealist art style, dreamlike imagery, impossible combinations, Salvador Dali inspired, fantastical elements",
                negativePrompt: "realistic, logical, conventional, photographic",
                strength: 0.8
            },

            // ===== ESTILOS MODERNOS =====
            'pop-art': {
                prompt: "pop art style, bold bright colors, high contrast, comic book aesthetic, Andy Warhol inspired",
                negativePrompt: "muted colors, realistic, classical art, subtle tones",
                strength: 0.9
            },
            'street-art': {
                prompt: "street art graffiti style, urban wall art, spray paint texture, bold colors, underground art culture",
                negativePrompt: "clean, corporate, traditional art, photographic",
                strength: 0.85
            },
            minimalista: {
                prompt: "minimalist art style, clean simple lines, limited color palette, geometric simplicity, negative space emphasis",
                negativePrompt: "complex details, ornate, busy composition, photographic",
                strength: 0.7
            },
            abstrato: {
                prompt: "abstract art style, non-representational forms, expressive colors, gestural brushwork, emotional expression",
                negativePrompt: "realistic, representational, photographic, literal",
                strength: 0.8
            },
            vintage: {
                prompt: "vintage retro style, aged paper, sepia tones, old photograph aesthetic, nostalgic feel",
                negativePrompt: "modern, bright colors, digital, contemporary",
                strength: 0.7
            },
            'art-deco': {
                prompt: "art deco style, geometric patterns, luxury aesthetics, 1920s design, elegant symmetry, metallic accents",
                negativePrompt: "organic shapes, rustic, modern minimalism, photographic",
                strength: 0.8
            },

            // ===== ESTILOS DIGITAIS =====
            vetorial: {
                prompt: "vector art style, clean geometric shapes, flat colors, minimalist design, scalable graphics",
                negativePrompt: "textured, photographic, hand-drawn, complex details",
                strength: 0.8
            },
            'pixel-art': {
                prompt: "8-bit pixel art style, retro gaming aesthetic, blocky pixels, limited color palette, pixelated graphics, 16-bit game art",
                negativePrompt: "smooth, anti-aliased, high resolution, photographic, vector art",
                strength: 0.95
            },
            'low-poly': {
                prompt: "low poly 3D style, geometric faceted surfaces, polygonal art, simplified 3D forms, angular shapes",
                negativePrompt: "high poly, smooth surfaces, photographic, detailed textures",
                strength: 0.9
            },
            neon: {
                prompt: "neon cyberpunk style, glowing electric colors, dark background, futuristic lighting, synthwave aesthetic",
                negativePrompt: "matte colors, natural lighting, traditional art, photographic",
                strength: 0.85
            },
            glitch: {
                prompt: "glitch art digital style, data corruption aesthetic, digital artifacts, RGB shift, pixelated distortion",
                negativePrompt: "clean, perfect, traditional art, photographic",
                strength: 0.8
            },
            holografico: {
                prompt: "holographic iridescent style, rainbow reflections, metallic sheen, prismatic colors, futuristic shimmer",
                negativePrompt: "matte, flat colors, traditional art, photographic",
                strength: 0.8
            },

            // ===== ESTILOS ESPECIAIS =====
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
            steampunk: {
                prompt: "steampunk victorian style, brass gears, mechanical elements, industrial aesthetic, vintage machinery",
                negativePrompt: "modern technology, clean design, minimalist, photographic",
                strength: 0.85
            },
            gothic: {
                prompt: "gothic dark art style, dramatic shadows, ornate details, medieval architecture, mysterious atmosphere",
                negativePrompt: "bright colors, modern, minimalist, photographic",
                strength: 0.8
            },
            fantasia: {
                prompt: "fantasy magical art style, mystical elements, enchanted atmosphere, mythical creatures, magical lighting",
                negativePrompt: "realistic, modern, scientific, photographic",
                strength: 0.85
            },
            'sci-fi': {
                prompt: "sci-fi futuristic style, advanced technology, space age design, metallic surfaces, futuristic lighting",
                negativePrompt: "vintage, traditional, organic, photographic",
                strength: 0.85
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

            // 🚀 CALCULAR PARÂMETROS DINÂMICOS BASEADOS NA INTENSIDADE E ESTILO
            const dynamicParams = this.calculateDynamicParameters(style, intensity, styleConfig);

            console.log('⚙️ [ARTISTIC STYLE SERVICE] Parâmetros Flux dinâmicos:', dynamicParams);

            // Atualizar progresso - Aplicando estilo
            progressService.updateProcess(processId, {
                progress: 75,
                currentStep: 2,
                message: 'Aplicando estilo com IA...'
            });

            // Chamar Flux para aplicar o estilo com parâmetros dinâmicos
            const output = await replicate.run(
                "black-forest-labs/flux-1.1-pro",
                {
                    input: {
                        image: imageUrl,
                        prompt: prompt,
                        guidance_scale: dynamicParams.guidance_scale,
                        num_inference_steps: dynamicParams.num_inference_steps,
                        strength: dynamicParams.strength,
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
                    parameters: dynamicParams
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

    // Construir prompt otimizado para o estilo com intensidade dinâmica
    buildStylePrompt(styleConfig, intensity, preserveElements) {
        let basePrompt = styleConfig.prompt;
        
        // 🚀 SISTEMA DE INTENSIDADE DINÂMICA POR ESTILO
        const intensityPrompts = this.getIntensityPrompts(styleConfig, intensity);
        let prompt = `${intensityPrompts.prefix} ${basePrompt} ${intensityPrompts.suffix}`;
        
        // Adicionar instruções de preservação
        if (preserveElements && preserveElements.length > 0) {
            const preservationInstructions = this.getPreservationInstructions(preserveElements);
            prompt = `${prompt}, ${preservationInstructions}`;
        }

        // Adicionar negative prompt específico baseado na intensidade
        if (intensity >= 80) {
            prompt += ", extremely detailed, maximum artistic transformation";
        } else if (intensity >= 60) {
            prompt += ", well-defined artistic style, clear transformation";
        } else if (intensity >= 40) {
            prompt += ", balanced artistic effect, moderate transformation";
        } else {
            prompt += ", subtle artistic touch, gentle transformation";
        }

        // Adicionar instruções gerais de qualidade
        prompt += ", high quality, professional artwork";

        console.log(`🎨 [PROMPT-BUILDER] Estilo: ${styleConfig.prompt.split(',')[0]}, Intensidade: ${intensity}%`);
        console.log(`🎨 [PROMPT-BUILDER] Prompt final: ${prompt}`);

        return prompt;
    }

    // 🚀 NOVO: Obter prompts específicos baseados na intensidade
    getIntensityPrompts(styleConfig, intensity) {
        // Extrair nome do estilo do prompt base
        const styleName = Object.keys(this.stylePrompts).find(key => 
            this.stylePrompts[key] === styleConfig
        );

        // Prompts específicos por intensidade para cada estilo
        const intensityMap = {
            // ===== ESTILOS CLÁSSICOS =====
            'aquarela': {
                low: { prefix: "watercolor touch,", suffix: ", soft washes, gentle transparency" },
                medium: { prefix: "watercolor painting style,", suffix: ", flowing colors, artistic brush strokes" },
                high: { prefix: "intense watercolor,", suffix: ", dramatic color bleeds, maximum transparency effects" }
            },
            'oleo': {
                low: { prefix: "oil painting hint,", suffix: ", subtle brushstrokes, gentle texture" },
                medium: { prefix: "oil painting style,", suffix: ", thick brushstrokes, rich colors" },
                high: { prefix: "heavy impasto oil painting,", suffix: ", dramatic brushwork, maximum texture, classical technique" }
            },
            'impressionista': {
                low: { prefix: "impressionist touch,", suffix: ", soft brushwork, gentle light effects" },
                medium: { prefix: "impressionist painting style,", suffix: ", loose brushwork, atmospheric effects" },
                high: { prefix: "bold impressionist style,", suffix: ", dramatic brushstrokes, maximum light and color emphasis" }
            },
            'sketch': {
                low: { prefix: "light pencil sketch,", suffix: ", soft graphite lines, minimal shading" },
                medium: { prefix: "detailed pencil drawing,", suffix: ", clear sketch lines, artistic shading" },
                high: { prefix: "bold charcoal sketch,", suffix: ", strong contrast, dramatic pencil strokes" }
            },
            'cubista': {
                low: { prefix: "cubist inspired,", suffix: ", subtle geometric shapes, gentle fragmentation" },
                medium: { prefix: "cubist art style,", suffix: ", geometric shapes, multiple perspectives" },
                high: { prefix: "extreme cubist transformation,", suffix: ", dramatic fragmentation, maximum geometric abstraction" }
            },
            'surrealista': {
                low: { prefix: "surrealist touch,", suffix: ", dreamlike hints, subtle impossibilities" },
                medium: { prefix: "surrealist art style,", suffix: ", dreamlike imagery, fantastical elements" },
                high: { prefix: "extreme surrealism,", suffix: ", maximum dreamlike distortion, impossible combinations" }
            },

            // ===== ESTILOS MODERNOS =====
            'pop-art': {
                low: { prefix: "pop art inspired,", suffix: ", bright colors, comic book hints" },
                medium: { prefix: "classic pop art style,", suffix: ", bold colors, comic aesthetic" },
                high: { prefix: "extreme pop art transformation,", suffix: ", maximum contrast, Andy Warhol style, vibrant colors" }
            },
            'street-art': {
                low: { prefix: "street art touch,", suffix: ", urban hints, subtle spray paint texture" },
                medium: { prefix: "street art graffiti style,", suffix: ", urban wall art, bold colors" },
                high: { prefix: "extreme street art,", suffix: ", maximum graffiti effect, underground art culture" }
            },
            'minimalista': {
                low: { prefix: "minimalist touch,", suffix: ", clean lines, simple forms" },
                medium: { prefix: "minimalist art style,", suffix: ", geometric simplicity, limited palette" },
                high: { prefix: "extreme minimalism,", suffix: ", maximum simplicity, pure geometric forms" }
            },
            'abstrato': {
                low: { prefix: "abstract hints,", suffix: ", subtle non-representational forms" },
                medium: { prefix: "abstract art style,", suffix: ", expressive colors, gestural brushwork" },
                high: { prefix: "extreme abstraction,", suffix: ", maximum non-representational transformation" }
            },
            'vintage': {
                low: { prefix: "vintage touch,", suffix: ", slight aging effect, warm tones" },
                medium: { prefix: "retro vintage style,", suffix: ", aged paper texture, nostalgic feel" },
                high: { prefix: "heavily aged vintage,", suffix: ", strong sepia tones, old photograph aesthetic" }
            },
            'art-deco': {
                low: { prefix: "art deco touch,", suffix: ", elegant patterns, subtle luxury" },
                medium: { prefix: "art deco style,", suffix: ", geometric patterns, 1920s design" },
                high: { prefix: "extreme art deco,", suffix: ", maximum luxury aesthetics, dramatic symmetry" }
            },

            // ===== ESTILOS DIGITAIS =====
            'vetorial': {
                low: { prefix: "vector art hint,", suffix: ", clean shapes, subtle flat colors" },
                medium: { prefix: "vector art style,", suffix: ", geometric shapes, flat colors" },
                high: { prefix: "extreme vector art,", suffix: ", maximum geometric precision, pure flat design" }
            },
            'pixel-art': {
                low: { prefix: "subtle pixelated effect,", suffix: ", slight blockiness, soft pixel edges" },
                medium: { prefix: "clear pixel art style,", suffix: ", 16-bit aesthetic, defined pixels" },
                high: { prefix: "extreme 8-bit pixelation,", suffix: ", sharp blocky pixels, retro game graphics, no anti-aliasing" }
            },
            'low-poly': {
                low: { prefix: "low poly hint,", suffix: ", subtle geometric surfaces, gentle faceting" },
                medium: { prefix: "low poly 3D style,", suffix: ", geometric faceted surfaces, angular shapes" },
                high: { prefix: "extreme low poly,", suffix: ", maximum geometric faceting, dramatic angular forms" }
            },
            'neon': {
                low: { prefix: "subtle neon glow,", suffix: ", soft electric colors, minimal glow" },
                medium: { prefix: "neon cyberpunk style,", suffix: ", glowing colors, futuristic lighting" },
                high: { prefix: "extreme neon cyberpunk,", suffix: ", intense electric glow, maximum synthwave aesthetic" }
            },
            'glitch': {
                low: { prefix: "subtle glitch effect,", suffix: ", minor digital artifacts, slight distortion" },
                medium: { prefix: "glitch art style,", suffix: ", digital corruption, RGB shift" },
                high: { prefix: "extreme glitch distortion,", suffix: ", heavy digital artifacts, maximum data corruption aesthetic" }
            },
            'holografico': {
                low: { prefix: "holographic touch,", suffix: ", subtle iridescence, gentle shimmer" },
                medium: { prefix: "holographic style,", suffix: ", rainbow reflections, metallic sheen" },
                high: { prefix: "extreme holographic,", suffix: ", maximum iridescence, dramatic prismatic colors" }
            },

            // ===== ESTILOS ESPECIAIS =====
            'cartoon': {
                low: { prefix: "cartoon touch,", suffix: ", subtle stylization, gentle outlines" },
                medium: { prefix: "cartoon style,", suffix: ", bold outlines, vibrant colors" },
                high: { prefix: "extreme cartoon,", suffix: ", maximum stylization, dramatic animated features" }
            },
            'anime': {
                low: { prefix: "anime inspired,", suffix: ", subtle manga style, gentle cel-shading" },
                medium: { prefix: "anime manga style,", suffix: ", cel-shaded, clean lines" },
                high: { prefix: "extreme anime,", suffix: ", maximum manga transformation, dramatic anime features" }
            },
            'steampunk': {
                low: { prefix: "steampunk touch,", suffix: ", subtle brass elements, gentle industrial hints" },
                medium: { prefix: "steampunk style,", suffix: ", brass gears, mechanical elements" },
                high: { prefix: "extreme steampunk,", suffix: ", maximum victorian industrial, dramatic machinery" }
            },
            'gothic': {
                low: { prefix: "gothic touch,", suffix: ", subtle dark elements, gentle shadows" },
                medium: { prefix: "gothic style,", suffix: ", dramatic shadows, ornate details" },
                high: { prefix: "extreme gothic,", suffix: ", maximum dark atmosphere, dramatic medieval elements" }
            },
            'fantasia': {
                low: { prefix: "fantasy touch,", suffix: ", subtle magical elements, gentle enchantment" },
                medium: { prefix: "fantasy style,", suffix: ", mystical elements, magical atmosphere" },
                high: { prefix: "extreme fantasy,", suffix: ", maximum magical transformation, dramatic mythical elements" }
            },
            'sci-fi': {
                low: { prefix: "sci-fi touch,", suffix: ", subtle futuristic elements, gentle technology" },
                medium: { prefix: "sci-fi style,", suffix: ", advanced technology, futuristic design" },
                high: { prefix: "extreme sci-fi,", suffix: ", maximum futuristic transformation, dramatic space age design" }
            }
        };

        // Obter configuração específica ou usar padrão
        const styleIntensity = intensityMap[styleName] || {
            low: { prefix: "subtle", suffix: ", gentle artistic effect" },
            medium: { prefix: "stylized", suffix: ", moderate artistic transformation" },
            high: { prefix: "highly stylized", suffix: ", strong artistic effect" }
        };

        // Determinar nível de intensidade
        if (intensity >= 70) {
            return styleIntensity.high;
        } else if (intensity >= 40) {
            return styleIntensity.medium;
        } else {
            return styleIntensity.low;
        }
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

    // 🚀 NOVO: Calcular parâmetros dinâmicos baseados no estilo e intensidade
    calculateDynamicParameters(style, intensity, styleConfig) {
        // Parâmetros base
        let baseStrength = styleConfig.strength;
        let baseGuidanceScale = 3.5;
        let baseSteps = 28;

        // 🎯 AJUSTES ESPECÍFICOS POR ESTILO
        const styleAdjustments = {
            'pixel-art': {
                strengthMultiplier: 1.1,  // Mais agressivo
                guidanceScale: 6.0,       // Guidance mais alto para forçar pixelação
                steps: 35                 // Mais steps para melhor definição
            },
            'glitch': {
                strengthMultiplier: 1.05,
                guidanceScale: 5.0,       // Alto para efeitos dramáticos
                steps: 32
            },
            'neon': {
                strengthMultiplier: 1.0,
                guidanceScale: 4.5,       // Médio-alto para cores vibrantes
                steps: 30
            },
            'sketch': {
                strengthMultiplier: 0.9,  // Mais sutil
                guidanceScale: 3.0,       // Mais baixo para naturalidade
                steps: 25
            },
            'aquarela': {
                strengthMultiplier: 0.95,
                guidanceScale: 3.2,
                steps: 26
            },
            'pop-art': {
                strengthMultiplier: 1.05,
                guidanceScale: 4.8,       // Alto para cores vibrantes
                steps: 32
            },
            'vintage': {
                strengthMultiplier: 0.9,
                guidanceScale: 3.8,
                steps: 28
            },
            'oleo': {
                strengthMultiplier: 1.0,
                guidanceScale: 4.0,
                steps: 30
            }
        };

        // Obter ajustes específicos do estilo ou usar padrão
        const adjustments = styleAdjustments[style] || {
            strengthMultiplier: 1.0,
            guidanceScale: 3.5,
            steps: 28
        };

        // 🎚️ CALCULAR PARÂMETROS BASEADOS NA INTENSIDADE
        const intensityFactor = intensity / 100;

        // Strength: varia baseado na intensidade e estilo
        let finalStrength;
        if (intensity >= 80) {
            // Alta intensidade: usar strength máximo do estilo
            finalStrength = Math.min(0.98, baseStrength * adjustments.strengthMultiplier * 1.1);
        } else if (intensity >= 60) {
            // Média-alta: strength padrão do estilo
            finalStrength = Math.min(0.95, baseStrength * adjustments.strengthMultiplier);
        } else if (intensity >= 40) {
            // Média: reduzir um pouco
            finalStrength = Math.min(0.90, baseStrength * adjustments.strengthMultiplier * 0.9);
        } else {
            // Baixa: bem mais sutil
            finalStrength = Math.min(0.85, baseStrength * adjustments.strengthMultiplier * 0.7);
        }

        // Guidance Scale: ajustar baseado na intensidade
        let finalGuidanceScale;
        if (intensity >= 80) {
            finalGuidanceScale = adjustments.guidanceScale * 1.2;
        } else if (intensity >= 60) {
            finalGuidanceScale = adjustments.guidanceScale;
        } else if (intensity >= 40) {
            finalGuidanceScale = adjustments.guidanceScale * 0.9;
        } else {
            finalGuidanceScale = adjustments.guidanceScale * 0.8;
        }

        // Steps: mais steps para intensidades altas
        let finalSteps;
        if (intensity >= 80) {
            finalSteps = Math.min(50, adjustments.steps + 8);
        } else if (intensity >= 60) {
            finalSteps = adjustments.steps + 4;
        } else if (intensity >= 40) {
            finalSteps = adjustments.steps;
        } else {
            finalSteps = Math.max(20, adjustments.steps - 4);
        }

        const result = {
            strength: Math.round(finalStrength * 100) / 100,
            guidance_scale: Math.round(finalGuidanceScale * 10) / 10,
            num_inference_steps: finalSteps
        };

        console.log(`🎛️ [DYNAMIC-PARAMS] Estilo: ${style}, Intensidade: ${intensity}%`);
        console.log(`🎛️ [DYNAMIC-PARAMS] Parâmetros calculados:`, result);
        console.log(`🎛️ [DYNAMIC-PARAMS] Ajustes aplicados:`, adjustments);

        return result;
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
