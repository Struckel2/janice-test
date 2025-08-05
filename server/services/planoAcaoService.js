const axios = require('axios');
const progressService = require('./progressService');
const { generatePDF } = require('./pdfGenerator');
const Transcricao = require('../models/Transcricao');
const Analise = require('../models/Analise');

/**
 * Serviço para geração de planos de ação baseados em transcrições e análises
 * Utiliza Claude 3.7 Sonnet via OpenRouter para máxima qualidade
 */

// Configurações do OpenRouter - usando mesmo modelo da análise de mercado
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CLAUDE_MODEL = process.env.OPENROUTER_CLAUDE_MODEL || 'anthropic/claude-sonnet-4';

/**
 * Gera um plano de ação baseado em transcrições e análises selecionadas
 * @param {Array} transcricaoIds - IDs das transcrições selecionadas
 * @param {Array} analiseIds - IDs das análises selecionadas
 * @param {string} clienteId - ID do cliente
 * @param {string} titulo - Título do plano de ação
 * @returns {Promise<Object>} - Resultado com plano gerado e URL do PDF
 */
async function generateActionPlan(transcricaoIds, analiseIds, clienteId, titulo) {
  try {
    console.log(`\n====== INICIANDO GERAÇÃO DE PLANO DE AÇÃO ======`);
    console.log(`Cliente: ${clienteId}`);
    console.log(`Título: ${titulo}`);
    console.log(`Transcrições: ${transcricaoIds.length}`);
    console.log(`Análises: ${analiseIds.length}`);
    
    // Validar se há pelo menos um documento
    if (transcricaoIds.length === 0 && analiseIds.length === 0) {
      throw new Error('É necessário selecionar pelo menos uma transcrição ou análise');
    }
    
    // Enviar atualização de progresso inicial
    progressService.sendProgressUpdate(clienteId, {
      percentage: 5,
      message: 'Carregando documentos selecionados...',
      step: 1,
      stepStatus: 'active'
    });
    
    // ETAPA 1: Carregar e processar documentos
    console.log('ETAPA 1: Carregando documentos selecionados');
    const documentos = await loadDocuments(transcricaoIds, analiseIds);
    console.log(`Documentos carregados: ${documentos.transcricoes.length} transcrições, ${documentos.analises.length} análises`);
    
    progressService.sendProgressUpdate(clienteId, {
      percentage: 20,
      message: 'Documentos carregados com sucesso',
      step: 1,
      stepStatus: 'completed'
    });
    
    // ETAPA 2: Preparar contexto para o Claude
    progressService.sendProgressUpdate(clienteId, {
      percentage: 25,
      message: 'Preparando contexto para análise...',
      step: 2,
      stepStatus: 'active'
    });
    
    console.log('ETAPA 2: Preparando contexto consolidado');
    const contextoConsolidado = prepareContext(documentos);
    console.log(`Contexto preparado: ${contextoConsolidado.length} caracteres`);
    
    progressService.sendProgressUpdate(clienteId, {
      percentage: 40,
      message: 'Contexto preparado - iniciando análise estratégica',
      step: 2,
      stepStatus: 'completed'
    });
    
    // ETAPA 3: Gerar plano de ação com Claude 3.7
    progressService.sendProgressUpdate(clienteId, {
      percentage: 45,
      message: 'Analisando documentos com IA...',
      step: 3,
      stepStatus: 'active'
    });
    
    console.log('ETAPA 3: Gerando plano de ação com Claude 3.7');
    const planoAcao = await generatePlanWithClaude37(contextoConsolidado, titulo);
    console.log(`Plano de ação gerado: ${planoAcao.length} caracteres`);
    
    // Atualizações de progresso durante a geração
    progressService.sendProgressUpdate(clienteId, {
      percentage: 70,
      message: 'Estruturando plano de ação...',
      step: 3,
      stepStatus: 'active'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    progressService.sendProgressUpdate(clienteId, {
      percentage: 85,
      message: 'Plano de ação gerado com sucesso',
      step: 3,
      stepStatus: 'completed'
    });
    
    // ETAPA 4: Gerar PDF
    progressService.sendProgressUpdate(clienteId, {
      percentage: 90,
      message: 'Gerando documento PDF...',
      step: 4,
      stepStatus: 'active'
    });
    
    console.log('ETAPA 4: Gerando PDF do plano de ação');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `plano_acao_${clienteId}_${timestamp}`;
    const pdfUrl = await generatePDF(filename, planoAcao);
    console.log(`PDF gerado: ${pdfUrl}`);
    
    progressService.sendProgressUpdate(clienteId, {
      percentage: 99,
      message: 'Plano de ação pronto para visualização',
      step: 4,
      stepStatus: 'completed'
    });
    
    console.log(`\n====== PLANO DE AÇÃO GERADO COM SUCESSO ======\n`);
    
    return {
      titulo,
      conteudo: planoAcao,
      pdfUrl,
      documentosBase: {
        transcricoes: transcricaoIds,
        analises: analiseIds
      },
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error('Erro na geração do plano de ação:', error);
    throw new Error(`Não foi possível gerar o plano de ação: ${error.message}`);
  }
}

/**
 * Carrega os documentos selecionados do banco de dados
 * @param {Array} transcricaoIds - IDs das transcrições
 * @param {Array} analiseIds - IDs das análises
 * @returns {Promise<Object>} - Documentos carregados
 */
async function loadDocuments(transcricaoIds, analiseIds) {
  try {
    const transcricoes = await Transcricao.find({
      _id: { $in: transcricaoIds }
    }).populate('cliente', 'nome cnpj');
    
    const analises = await Analise.find({
      _id: { $in: analiseIds }
    }).populate('cliente', 'nome cnpj');
    
    return {
      transcricoes,
      analises
    };
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    throw new Error('Falha ao carregar documentos selecionados');
  }
}

/**
 * Prepara o contexto consolidado para o Claude
 * @param {Object} documentos - Documentos carregados
 * @returns {string} - Contexto formatado
 */
function prepareContext(documentos) {
  let contexto = '';
  
  // Adicionar transcrições
  if (documentos.transcricoes.length > 0) {
    contexto += '# TRANSCRIÇÕES DE REUNIÕES\n\n';
    documentos.transcricoes.forEach((transcricao, index) => {
      contexto += `## Transcrição ${index + 1}: ${transcricao.titulo}\n`;
      contexto += `**Data:** ${transcricao.dataCriacao.toLocaleDateString('pt-BR')}\n`;
      contexto += `**Cliente:** ${transcricao.cliente?.nome || 'N/A'}\n`;
      contexto += `**Duração:** ${Math.floor(transcricao.duracao / 60)} minutos\n\n`;
      contexto += `**Conteúdo:**\n${transcricao.conteudo}\n\n`;
      contexto += '---\n\n';
    });
  }
  
  // Adicionar análises
  if (documentos.analises.length > 0) {
    contexto += '# ANÁLISES DE MERCADO\n\n';
    documentos.analises.forEach((analise, index) => {
      contexto += `## Análise ${index + 1}: ${analise.cnpj}\n`;
      contexto += `**Data:** ${analise.dataCriacao.toLocaleDateString('pt-BR')}\n`;
      contexto += `**Cliente:** ${analise.cliente?.nome || 'N/A'}\n\n`;
      contexto += `**Conteúdo:**\n${analise.conteudo}\n\n`;
      contexto += '---\n\n';
    });
  }
  
  return contexto;
}

/**
 * Gera o plano de ação usando Claude 3.7 Sonnet
 * @param {string} contexto - Contexto consolidado dos documentos
 * @param {string} titulo - Título do plano
 * @returns {Promise<string>} - Plano de ação gerado
 */
async function generatePlanWithClaude37(contexto, titulo) {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Chave de API do OpenRouter não configurada');
    }
    
    const prompt = buildActionPlanPrompt(contexto, titulo);
    
    console.log('🤖 [PLANO-ACAO] Enviando consulta ao Claude Sonnet...');
    console.log(`📊 [PLANO-ACAO] Modelo: ${OPENROUTER_CLAUDE_MODEL}`);
    console.log(`📝 [PLANO-ACAO] Tamanho do prompt: ${prompt.length} caracteres`);
    
    // Tentar com retry em caso de falha
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [PLANO-ACAO] Tentativa ${attempt}/${maxRetries}`);
        
        const response = await axios.post(
          OPENROUTER_API_URL,
          {
            model: OPENROUTER_CLAUDE_MODEL,
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: 8000,
            temperature: 0.7
          },
          {
            timeout: 300000, // 5 minutos para prompts grandes
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://janice.analyzer.app',
              'X-Title': 'Janice - Gerador de Planos de Ação'
            }
          }
        );
        
        console.log('✅ [PLANO-ACAO] Resposta recebida do Claude Sonnet');
        console.log(`📊 [PLANO-ACAO] Status: ${response.status}`);
        console.log(`📊 [PLANO-ACAO] Dados da resposta:`, {
          hasData: !!response.data,
          hasChoices: !!(response.data && response.data.choices),
          choicesLength: response.data?.choices?.length || 0,
          firstChoice: response.data?.choices?.[0] ? 'exists' : 'missing'
        });
        
        // Validação robusta da resposta
        if (!response.data) {
          throw new Error('Resposta da API está vazia');
        }
        
        if (!response.data.choices || !Array.isArray(response.data.choices)) {
          console.error('❌ [PLANO-ACAO] Estrutura de resposta inválida:', response.data);
          throw new Error('Estrutura de resposta da API é inválida - choices não encontrado');
        }
        
        if (response.data.choices.length === 0) {
          throw new Error('API retornou array de choices vazio');
        }
        
        const firstChoice = response.data.choices[0];
        if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
          console.error('❌ [PLANO-ACAO] Primeira escolha inválida:', firstChoice);
          throw new Error('Conteúdo da mensagem não encontrado na resposta da API');
        }
        
        const content = firstChoice.message.content;
        console.log(`✅ [PLANO-ACAO] Plano gerado com sucesso: ${content.length} caracteres`);
        
        return content;
        
      } catch (attemptError) {
        lastError = attemptError;
        console.error(`❌ [PLANO-ACAO] Tentativa ${attempt} falhou:`, attemptError.message);
        
        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          console.log(`⏳ [PLANO-ACAO] Aguardando 3 segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
    
  } catch (error) {
    console.error('❌ [PLANO-ACAO] Erro na consulta ao Claude:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    
    // Log mais detalhado para debug
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ [PLANO-ACAO] Timeout na requisição - prompt muito grande ou modelo sobrecarregado');
      throw new Error('Timeout na geração do plano de ação. Tente novamente com menos documentos.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Chave de API do OpenRouter inválida ou expirada');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Erro interno do servidor OpenRouter. Tente novamente em alguns minutos.');
    }
    
    throw new Error(`Falha na geração do plano de ação com IA: ${error.message}`);
  }
}

/**
 * Constrói o prompt estruturado para o Claude 3.7
 * @param {string} contexto - Contexto dos documentos
 * @param {string} titulo - Título do plano
 * @returns {string} - Prompt formatado
 */
function buildActionPlanPrompt(contexto, titulo) {
  return `
Atue como um consultor empresarial estratégico especializado em análise de reuniões e criação de planos de ação.

Com base nos documentos fornecidos (transcrições de reuniões, análises de mercado, relatórios empresariais), crie um plano de ação completo e estruturado seguindo esta metodologia:

**DOCUMENTOS FORNECIDOS:**
${contexto}

**TÍTULO DO PLANO:** ${titulo}

**ESTRUTURA OBRIGATÓRIA:**

# 📋 ${titulo.toUpperCase()}

## 1. 📊 RESUMO EXECUTIVO DA REUNIÃO
- Participantes identificados
- Contexto e objetivos
- Principais decisões tomadas

## 2. 🎯 DIAGNÓSTICO SITUACIONAL
### Análise SWOT
- **💪 Forças:** Vantagens competitivas e diferenciais identificados
- **⚠️ Fraquezas:** Áreas que precisam de melhorias
- **🚀 Oportunidades:** Tendências favoráveis do mercado
- **⚡ Ameaças:** Desafios e riscos do setor

### Principais Desafios Identificados
- Lista dos principais obstáculos
- Recursos disponíveis

## 3. 📈 PLANO DE AÇÃO DETALHADO

### 🔄 Fase 1: Fundação (0-3 meses)
- [ ] Ação específica 1
- [ ] Ação específica 2
- [ ] Ação específica 3
**Responsável:** [Quando identificado]
**Prazo:** [Data específica]

### 🚀 Fase 2: Implementação (3-6 meses)
- [ ] Ação específica 1
- [ ] Ação específica 2
- [ ] Ação específica 3
**Responsável:** [Quando identificado]
**Prazo:** [Data específica]

### 📊 Fase 3: Otimização (6-12 meses)
- [ ] Ação específica 1
- [ ] Ação específica 2
- [ ] Ação específica 3
**Responsável:** [Quando identificado]
**Prazo:** [Data específica]

### 🎯 Fase 4: Expansão (12+ meses)
- [ ] Ação específica 1
- [ ] Ação específica 2
- [ ] Ação específica 3
**Responsável:** [Quando identificado]
**Prazo:** [Data específica]

## 4. 📊 MÉTRICAS E KPIs

| Métrica | Meta | Prazo | Responsável |
|---------|------|-------|-------------|
| KPI 1 | Valor quantificável | Data | Pessoa |
| KPI 2 | Valor quantificável | Data | Pessoa |
| KPI 3 | Valor quantificável | Data | Pessoa |

### Indicadores de Sucesso
- Métrica 1: Descrição e meta
- Métrica 2: Descrição e meta
- Métrica 3: Descrição e meta

## 5. 💰 INVESTIMENTOS E ROI

### Custos Estimados por Categoria
| Categoria | Investimento | Período |
|-----------|--------------|---------|
| Marketing | R$ X.XXX | Mensal |
| Tecnologia | R$ X.XXX | Único |
| Pessoal | R$ X.XXX | Mensal |
| **Total** | **R$ X.XXX** | - |

### Projeção de Retorno
- **ROI Esperado:** X% em Y meses
- **Payback:** X meses
- **Análise de Viabilidade:** Descrição

## 6. ⚠️ RISCOS E MITIGAÇÕES

### Principais Riscos Identificados
1. **Risco 1:** Descrição
   - **Probabilidade:** Alta/Média/Baixa
   - **Impacto:** Alto/Médio/Baixo
   - **Mitigação:** Estratégia específica

2. **Risco 2:** Descrição
   - **Probabilidade:** Alta/Média/Baixa
   - **Impacto:** Alto/Médio/Baixo
   - **Mitigação:** Estratégia específica

### Planos de Contingência
- Cenário A: Descrição e ações
- Cenário B: Descrição e ações

## 7. ⚡ PRÓXIMOS PASSOS IMEDIATOS

### 📅 Esta Semana
- [ ] Ação urgente 1
- [ ] Ação urgente 2
- [ ] Ação urgente 3

### 📅 Próximas 2 Semanas
- [ ] Ação importante 1
- [ ] Ação importante 2
- [ ] Ação importante 3

### 🎯 Marcos Importantes
- **Marco 1:** Data e descrição
- **Marco 2:** Data e descrição
- **Marco 3:** Data e descrição

---

**DIRETRIZES DE FORMATAÇÃO:**
- Use markdown com emojis para organização visual
- Crie listas com checkboxes para ações práticas
- Inclua tabelas quando apropriado para dados financeiros
- Destaque informações críticas em **negrito**
- Use blocos de citação para insights importantes

**CRITÉRIOS DE QUALIDADE:**
- Ações específicas e mensuráveis
- Prazos realistas e detalhados
- Considerações de orçamento e recursos
- Abordagem estratégica e tática equilibrada
- Linguagem clara e orientada à execução

Analise os documentos fornecidos e produza um plano de ação abrangente seguindo exatamente esta estrutura.
`;
}

module.exports = {
  generateActionPlan
};
