const axios = require('axios');
const progressService = require('./progressService'); // Usar o novo serviço de progresso
const { generatePDF } = require('./pdfGenerator'); // Usar o gerador de PDF migrado

/**
 * Serviço para análise de empresas por CNPJ
 * Implementa um fluxo de 4 etapas usando múltiplos modelos de IA via OpenRouter
 */

// Configurações do OpenRouter
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CLAUDE_MODEL = process.env.OPENROUTER_CLAUDE_MODEL || 'anthropic/claude-sonnet-4';
const OPENROUTER_PERPLEXITY_MODEL = process.env.OPENROUTER_PERPLEXITY_MODEL || 'perplexity/sonar-deep-research';
const OPENROUTER_PERPLEXITY_BASIC_MODEL = process.env.OPENROUTER_PERPLEXITY_BASIC_MODEL || 'perplexity/sonar-pro';


/**
 * Analisa um CNPJ utilizando um fluxo de 4 etapas com múltiplos modelos de IA
 * @param {string} cnpj - CNPJ a ser analisado
 * @param {string} clientId - ID do cliente para atualizações de progresso (opcional)
 * @returns {Promise<Object>} - Resultado da análise com texto e URL do PDF
 */
async function analyzeCNPJ(cnpj, clientId = null) {
  try {
    // Validar CNPJ (apenas números)
    const numericCnpj = cnpj.replace(/\D/g, '');
    
    if (numericCnpj.length !== 14) {
      throw new Error('CNPJ inválido. Deve conter 14 dígitos numéricos.');
    }
    
    // Formatar CNPJ para exibição
    const formattedCnpj = numericCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    
    console.log(`\n====== INICIANDO ANÁLISE DO CNPJ: ${formattedCnpj} ======\n`);
    
    // Enviar atualização de progresso inicial, se clientId estiver disponível
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 5,
        message: 'Os Minions estão investigando a empresa...',
        step: 1,
        stepStatus: 'active'
      });
    }
    
    // ETAPA 1: Pesquisa básica com Perplexity para obter dados da empresa
    console.log('ETAPA 1: Pesquisa básica de dados da empresa com Perplexity');
    const basicCompanyInfo = await queryPerplexityBasic(formattedCnpj);
    console.log('\n---- Resultado da Etapa 1 (Perplexity básico) ----');
    console.log(basicCompanyInfo);
    console.log('-----------------------------------------------\n');
    
    // Atualizar progresso após a etapa 1
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 15,
        message: 'Kevin encontrou os dados básicos da empresa!',
        step: 1,
        stepStatus: 'completed'
      });
    }
    
    // ETAPA 2: Criar prompt detalhado para pesquisa (SEM CHAMADA DE API)
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 20,
        message: 'Stuart está planejando a estratégia de análise...',
        step: 2,
        stepStatus: 'active'
      });
    }
    console.log('ETAPA 2: Criando prompt detalhado para pesquisa estratégica (sem API)');
    const searchInstructions = buildDetailedSearchPrompt(formattedCnpj, basicCompanyInfo);
    console.log('\n---- Resultado da Etapa 2 (Prompt detalhado criado) ----');
    console.log('Prompt mega detalhado criado com sucesso - sem custo de API!');
    console.log('-----------------------------------------------\n');
    
    // Atualizar progresso durante a etapa 2
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 40,
        message: 'Bob está organizando o plano de investigação...',
        step: 2,
        stepStatus: 'active'
      });
    }
    
    // Pequeno atraso para simular processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 50,
        message: 'Plano pronto! Minions partindo para a pesquisa!',
        step: 2,
        stepStatus: 'completed'
      });
    }
    
    // ETAPA 3: Pesquisa aprofundada com Perplexity Deep Research
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 55,
        message: 'Dave está vasculhando o mercado...',
        step: 3,
        stepStatus: 'active'
      });
    }
    console.log('ETAPA 3: Realizando pesquisa aprofundada com Perplexity Deep Research');
    const perplexityDeepResults = await queryPerplexityDeep(searchInstructions, formattedCnpj);
    console.log('\n---- Resultado da Etapa 3 (Perplexity deep research) ----');
    console.log(perplexityDeepResults.substring(0, 500) + '...');
    console.log('(Resposta completa omitida por tamanho)');
    console.log('-----------------------------------------------\n');
    
    // Atualizações de progresso durante a etapa 3 (análise de mercado)
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 65,
        message: 'Phil está espionando os concorrentes...',
        step: 3,
        stepStatus: 'active'
      });
    }
    
    // Pequeno atraso para simular processamento
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 75,
        message: 'Tim está avaliando riscos e oportunidades...',
        step: 3,
        stepStatus: 'active'
      });
    }
    
    // Pequeno atraso para simular processamento
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 80,
        message: 'Mark terminou a análise de mercado!',
        step: 3,
        stepStatus: 'completed'
      });
    }
    
    // ETAPA 4: Consolidar todos os resultados com Claude
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 85,
        message: 'Gru está compilando o relatório final...',
        step: 4,
        stepStatus: 'active'
      });
    }
    console.log('ETAPA 4: Consolidando resultados e gerando análise final com Claude');
    const finalAnalysis = await consolidateWithClaude(
      basicCompanyInfo,
      searchInstructions,
      perplexityDeepResults,
      formattedCnpj
    );
    console.log('\n---- Resultado da Etapa 4 (Claude - análise final) ----');
    console.log(finalAnalysis.substring(0, 500) + '...');
    console.log('(Análise completa omitida por tamanho)');
    console.log('-----------------------------------------------\n');
    
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 90,
        message: 'Dr. Nefario está organizando os insights...',
        step: 4,
        stepStatus: 'active'
      });
    }
    
    // Gerar PDF com a análise final
    if (clientId) {
      progressService.sendProgressUpdate(clientId, {
        percentage: 95,
        message: 'Margo está finalizando o documento...',
        step: 4,
        stepStatus: 'active'
      });
    }
    console.log('Gerando PDF com a análise');
    const pdfUrl = await generatePDF(formattedCnpj, finalAnalysis);
    console.log(`PDF gerado com sucesso: ${pdfUrl}`);
    
    console.log(`\n====== ANÁLISE DO CNPJ ${formattedCnpj} CONCLUÍDA ======\n`);
    
    // Concluir progresso
    if (clientId) {
      // Não enviamos o evento 'complete' aqui, pois ele será enviado pelo frontend
      // quando o usuário visualizar a análise.
      progressService.sendProgressUpdate(clientId, {
        percentage: 99,
        message: 'Análise completa! Os Minions fizeram um ótimo trabalho!',
        step: 4,
        stepStatus: 'completed'
      });
    }
    
    // Retornar resultado consolidado
    return {
      cnpj: formattedCnpj,
      analysis: finalAnalysis,
      pdfUrl,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Erro na análise de CNPJ:', error);
    throw new Error(`Não foi possível analisar o CNPJ: ${error.message}`);
  }
}

/**
 * Faz uma consulta ao modelo Perplexity básico para obter informações iniciais da empresa
 * @param {string} cnpj - CNPJ formatado
 * @returns {Promise<string>} - Dados básicos da empresa
 */
async function queryPerplexityBasic(cnpj) {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Chave de API do OpenRouter não configurada');
    }
    
    const prompt = `
Você é um assistente especializado em buscar informações básicas sobre empresas brasileiras.
Preciso de informações sobre a empresa com CNPJ ${cnpj}.

Por favor, forneça apenas os seguintes dados básicos sobre a empresa:
1. Razão social
2. Nome fantasia (se disponível)
3. CNPJ
4. Situação cadastral (ativa, suspensa, etc.)
5. Data de abertura
6. Porte da empresa
7. Setor de atuação / CNAE principal
8. Localização (cidade e estado)
9. Site oficial (se disponível)
10. Contatos (telefone, email, se disponíveis)

Se você não conseguir encontrar alguma informação, indique como "Não disponível".
Responda de forma direta e objetiva, apenas com os dados solicitados.
`;

    console.log('Enviando consulta ao Perplexity básico...');
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_PERPLEXITY_BASIC_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://janice.analyzer.app',
          'X-Title': 'Janice - Analisador Empresarial'
        }
      }
    );
    
    console.log('Resposta recebida do Perplexity básico');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Erro na consulta ao Perplexity (básico):', error.response?.data || error.message);
    throw new Error('Falha na consulta de dados básicos da empresa');
  }
}

/**
 * Constrói o prompt detalhado para pesquisa estratégica (sem chamada de API)
 * @param {string} cnpj - CNPJ formatado
 * @param {string} basicInfo - Informações básicas da empresa obtidas na etapa 1
 * @returns {string} - Prompt mega detalhado para pesquisa
 */
function buildDetailedSearchPrompt(cnpj, basicInfo) {
  // Extrair nome da empresa das informações básicas
  const nomeEmpresa = extractCompanyName(basicInfo);
  
  return `
# PROMPT: PESQUISA ESTRATÉGICA DE MERCADO PARA PARCERIA COMERCIAL

Você é um consultor sênior em inteligência de mercado e estratégia comercial, especializado no mercado brasileiro. Conduza uma análise estratégica profunda sobre **${nomeEmpresa}** (CNPJ: ${cnpj}) para fundamentar uma proposta de parceria comercial e desenvolvimento de estratégia de marketing.

**OBJETIVO PRIMÁRIO:** Identificar oportunidades de crescimento, pontos de dor na retenção de clientes e estratégias de marketing mais eficazes para posicionamento competitivo.

**INFORMAÇÕES BÁSICAS DISPONÍVEIS:**
${basicInfo}

---

## 1. DIAGNÓSTICO ESTRATÉGICO DA EMPRESA

### Posicionamento Atual
- Análise do modelo de negócios e proposta de valor
- Segmentos de clientes atendidos e perfil do público-alvo
- Canais de distribuição e pontos de contato
- Estrutura de receita e principais fontes de faturamento

### Situação Operacional
- Estrutura organizacional e capacidade operacional
- Presença geográfica e cobertura de mercado
- Investimentos em tecnologia e inovação
- Principais desafios operacionais identificados

---

## 2. ANÁLISE PROFUNDA DE MERCADO

### Dimensionamento e Oportunidades
- **Tamanho total do mercado (TAM)** no Brasil e crescimento projetado
- **Mercado endereçável (SAM)** para o perfil da empresa
- **Taxa de crescimento** dos últimos 3-5 anos com projeções
- **Sazonalidades** e ciclos do setor
- **Barreiras de entrada** e fatores críticos de sucesso

### Tendências e Disrupções
- Mudanças no comportamento do consumidor
- Impacto da digitalização no setor
- Sustentabilidade e responsabilidade social
- Regulamentações emergentes e compliance
- Tecnologias disruptivas que podem afetar o mercado

---

## 3. INTELIGÊNCIA COMPETITIVA AVANÇADA

### Mapeamento Competitivo
- **Top 10 concorrentes** (5 diretos + 5 indiretos/substitutos)
- **Market share estimado** de cada player principal
- **Análise SWOT detalhada** dos 3 principais concorrentes
- **Estratégias de diferenciação** utilizadas no mercado
- **Gaps competitivos** e oportunidades de nicho não exploradas

### Benchmarking Estratégico
- Estruturas de pricing e modelos de cobrança
- Estratégias de customer success e retenção
- Inovações em produto/serviço dos concorrentes
- Parcerias estratégicas e ecossistema de negócios
- Cases de sucesso e fracasso no setor

---

## 4. ANÁLISE DE PRESENÇA DIGITAL E MARKETING

### Performance Digital Atual
- **Audit completo do site**: UX, conversão, SEO técnico
- **Presença em redes sociais**: engajamento, growth, conteúdo
- **Performance SEM/SEO**: palavras-chave, ranking, tráfego orgânico
- **Marketing de conteúdo**: blog, materiais ricos, thought leadership
- **Email marketing e automação**: listas, segmentação, performance

### Reputação e Percepção de Marca
- **Análise de sentiment** em redes sociais e review sites
- **Share of voice** vs. concorrentes principais
- **Net Promoter Score (NPS)** e satisfação do cliente (se disponível)
- **Principais reclamações** e pontos de fricção identificados
- **Oportunidades de melhoria** na experiência do cliente

---

## 5. INTELIGÊNCIA FINANCEIRA E OPERACIONAL

### Saúde Financeira
- Faturamento estimado e evolução nos últimos 3 anos
- Análise de crescimento orgânico vs. inorgânico
- Investimentos em marketing e vendas (% do faturamento)
- Indicadores de eficiência operacional
- Situação creditícia e histórico de pagamentos

### Capacidade de Investimento
- Recursos disponíveis para marketing e crescimento
- Histórico de investimentos em tecnologia/inovação
- Parcerias comerciais ativas e potencial de expansão
- Apetite de risco para novas iniciativas

---

## 6. ANÁLISE DE CUSTOMER JOURNEY E RETENÇÃO

### Experiência do Cliente
- **Mapeamento do customer journey** completo
- **Pontos de fricção** na jornada de compra
- **Taxa de conversão** estimada por canal
- **Cycle de vendas** médio e fatores de influência
- **Customer Lifetime Value (CLV)** estimado

### Estratégias de Retenção
- **Churn rate** estimado e principais causas de cancelamento
- **Programas de fidelidade** e customer success existentes
- **Upselling e cross-selling**: oportunidades identificadas
- **Suporte ao cliente**: qualidade e eficiência
- **Comunidade e advocacy**: potencial de clientes embaixadores

---

## 7. OPORTUNIDADES ESTRATÉGICAS PRIORITÁRIAS

### Quick Wins (0-6 meses)
- Melhorias imediatas em conversão e retenção
- Otimizações de marketing digital com ROI claro
- Parcerias táticas para expansão de reach

### Iniciativas Médio Prazo (6-18 meses)
- Desenvolvimento de novos canais de aquisição
- Programas estruturados de customer success
- Expansão para novos segmentos ou regiões

### Visão de Longo Prazo (18+ meses)
- Inovações em produto/serviço
- Transformação digital e automação
- Expansão internacional ou diversificação

---

## 8. RECOMENDAÇÕES PARA PARCERIA ESTRATÉGICA

### Proposta de Valor da Parceria
- **Benefícios mútuos** identificados
- **Investimento necessário** e ROI projetado
- **KPIs e métricas** para acompanhamento
- **Timeline de implementação** com marcos claros
- **Estrutura de parceria** mais adequada

### Próximos Passos Sugeridos
- Workshop estratégico para alinhamento
- Teste piloto em segmento específico
- Cronograma de implementação detalhado

---

**INSTRUÇÕES ESPECIAIS:**
1. **Cite fontes específicas** para todos os dados apresentados
2. **Quantifique sempre que possível** com números, percentuais e projeções
3. **Identifique lacunas de informação** que precisam ser investigadas
4. **Priorize insights acionáveis** sobre dados descritivos
5. **Mantenha foco na viabilidade comercial** da parceria proposta
6. **Destaque riscos e limitações** identificados na análise

**FORMATO DE ENTREGA:**
- Relatório executivo com sumário executivo (2 páginas máximo)
- Análise detalhada por seção com dados de suporte
- Dashboard visual com principais KPIs e benchmarks
- Matriz de oportunidades vs. facilidade de implementação
- Cronograma de ações prioritárias com ownership definido
`;
}

/**
 * Extrai o nome da empresa das informações básicas
 * @param {string} basicInfo - Informações básicas da empresa
 * @returns {string} - Nome da empresa extraído
 */
function extractCompanyName(basicInfo) {
  // Tentar extrair razão social das informações básicas
  const lines = basicInfo.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('razão social') || line.toLowerCase().includes('nome')) {
      const match = line.match(/[:]\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
  }
  // Fallback: usar primeira linha não vazia
  for (const line of lines) {
    if (line.trim() && !line.includes('CNPJ') && !line.includes('empresa')) {
      return line.trim();
    }
  }
  return 'EMPRESA ANALISADA';
}

/**
 * Faz uma consulta ao modelo Claude via OpenRouter
 * @param {string} prompt - Prompt para o Claude
 * @param {number} maxTokens - Máximo de tokens na resposta
 * @returns {Promise<string>} - Resposta do Claude
 */
async function queryClaude(prompt, maxTokens = 4000) {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Chave de API do OpenRouter não configurada');
    }
    
    console.log('Enviando consulta ao Claude...');
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_CLAUDE_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://janice.analyzer.app',
          'X-Title': 'Janice - Analisador Empresarial'
        }
      }
    );
    
    console.log('Resposta recebida do Claude');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Erro na consulta ao Claude:', error.response?.data || error.message);
    throw new Error('Falha na comunicação com o Claude');
  }
}

/**
 * Faz uma consulta ao modelo Perplexity Deep Research via OpenRouter
 * @param {string} searchInstructions - Instruções de pesquisa geradas pelo Claude
 * @param {string} cnpj - CNPJ formatado
 * @returns {Promise<string>} - Resultados da pesquisa aprofundada do Perplexity
 */
async function queryPerplexityDeep(searchInstructions, cnpj) {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Chave de API do OpenRouter não configurada');
    }
    
    const prompt = `
Você é um especialista em análise de mercado e inteligência competitiva para empresas brasileiras.
Preciso que você faça uma pesquisa detalhada sobre a empresa com CNPJ ${cnpj}, seu mercado, concorrentes, tendências do setor e quaisquer informações relevantes para análise estratégica.

Aqui estão as instruções específicas para sua pesquisa:

${searchInstructions}

Importante:
- Use sua capacidade de pesquisa para encontrar as informações mais relevantes e atualizadas
- Organize sua resposta de forma estruturada e lógica
- Cite fontes e dados específicos para respaldar sua análise
- Foque em dados financeiros, análise de mercado, concorrentes e oportunidades estratégicas
- Inclua notícias recentes relevantes sobre a empresa ou setor
- Seja detalhado em sua análise, mas direto ao ponto
`;

    console.log('Enviando consulta ao Perplexity Deep Research...');
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_PERPLEXITY_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 7000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://janice.analyzer.app',
          'X-Title': 'Janice - Analisador Empresarial'
        }
      }
    );
    
    console.log('Resposta recebida do Perplexity Deep Research');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Erro na consulta ao Perplexity (deep):', error.response?.data || error.message);
    throw new Error('Falha na pesquisa aprofundada de mercado');
  }
}

/**
 * Consolida todos os resultados com o Claude para gerar o relatório final
 * @param {string} basicInfo - Informações básicas da empresa (Etapa 1)
 * @param {string} searchInstructions - Instruções de pesquisa (Etapa 2)
 * @param {string} perplexityResults - Resultados da pesquisa do Perplexity (Etapa 3)
 * @param {string} cnpj - CNPJ formatado
 * @returns {Promise<string>} - Análise final consolidada
 */
async function consolidateWithClaude(basicInfo, searchInstructions, perplexityResults, cnpj) {
  try {
    const consolidationPrompt = `
Você é um consultor estratégico de marketing especializado em análise empresarial e de mercado. Baseado nas informações abaixo sobre a empresa com CNPJ ${cnpj}, crie um relatório completo e bem estruturado.

## INFORMAÇÕES BÁSICAS DA EMPRESA:
${basicInfo}

## RESULTADOS DA PESQUISA APROFUNDADA:
${perplexityResults}

Agora, crie um relatório completo e detalhado seguindo esta estrutura:

# ANÁLISE EMPRESARIAL E ESTRATÉGICA

## 1. PERFIL DA EMPRESA
- Razão social e nome fantasia
- CNPJ: ${cnpj}
- Setor de atuação
- Porte da empresa
- Tempo de mercado
- Localização e abrangência

## 2. ANÁLISE DE MERCADO
- Tamanho e crescimento do mercado
- Tendências do setor
- Principais concorrentes
- Público-alvo

## 3. ANÁLISE SWOT
- Forças: vantagens competitivas e diferenciais da empresa
- Fraquezas: áreas que precisam de melhorias
- Oportunidades: tendências favoráveis do mercado
- Ameaças: desafios e riscos do setor

## 4. PRESENÇA DIGITAL
- Site e SEO
- Redes sociais
- Reputação online
- Marketing digital atual

## 5. RECOMENDAÇÕES ESTRATÉGICAS
- Estratégias de posicionamento
- Oportunidades de marketing
- Canais prioritários
- Próximos passos recomendados

Utilize um tom profissional e analítico. Seja específico com recomendações práticas e viáveis. Quando não tiver informações suficientes sobre algum aspecto, indique claramente e sugira como estas informações poderiam ser obtidas.

Seu relatório será usado por profissionais de marketing para desenvolver estratégias para a empresa, então seja o mais completo e detalhado possível. Cite dados específicos das pesquisas realizadas para respaldar suas conclusões.
`;

    console.log('Enviando consolidação para o Claude...');
    const consolidatedResponse = await queryClaude(consolidationPrompt, 8000);
    console.log('Resposta de consolidação recebida do Claude');
    return consolidatedResponse;
  } catch (error) {
    console.error('Erro na consolidação com Claude:', error);
    throw new Error('Falha na consolidação dos resultados');
  }
}


module.exports = {
  analyzeCNPJ
};
