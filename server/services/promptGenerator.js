/**
 * Gera o prompt inicial para o Claude
 * @param {string} cnpj - CNPJ formatado
 * @returns {string} - Prompt inicial para o Claude
 */
function generateClaudePrompt(cnpj) {
  return `
Preciso de uma análise completa sobre a empresa brasileira com CNPJ ${cnpj}.

# Contexto
Você está atuando como um consultor de inteligência empresarial para um estrategista de marketing. Sua tarefa é realizar uma pesquisa detalhada sobre esta empresa e fornecer todas as informações relevantes que puderem ser inferidas a partir do CNPJ.

# Informações Necessárias

## 1. Dados Cadastrais Completos
- Razão social
- Nome fantasia
- Data de abertura
- Situação cadastral (ativa, suspensa, baixada, etc.)
- Endereço completo
- CNAE principal e secundários (com descrição detalhada das atividades)
- Capital social
- Porte da empresa (MEI, ME, EPP, médio ou grande porte)
- Natureza jurídica

## 2. Informações sobre os Sócios
- Nome completo dos sócios e administradores
- Participação societária de cada um
- Histórico profissional dos principais sócios (se disponível)
- Outras empresas relacionadas aos sócios

## 3. Presença Online e Reputação
- Site oficial e domínios associados
- Perfis em redes sociais (LinkedIn, Instagram, Facebook, Twitter, etc.)
- Avaliações em plataformas como Google, Reclame Aqui, TrustPilot
- Notícias recentes envolvendo a empresa
- Processos judiciais relevantes (se públicos)

## 4. Informações Financeiras
- Faturamento estimado (baseado no porte e setor)
- Histórico financeiro disponível publicamente
- Indicadores de crescimento
- Investimentos recebidos ou aquisições (se houver)

## 5. Setor de Atuação e Mercado
- Descrição detalhada do mercado em que atua
- Tamanho estimado do mercado no Brasil
- Taxa de crescimento do setor
- Principais concorrentes diretos e indiretos
- Diferenciação da empresa no mercado
- Tendências atuais no setor

# Instruções Adicionais
- Baseie sua análise em informações que poderiam ser obtidas de fontes públicas
- Indique claramente quando uma informação é inferida ou estimada
- Estruture a resposta de forma clara e organizada, usando cabeçalhos e listas
- Forneça o máximo de detalhes possível em cada seção
- Se não encontrar informações específicas sobre algum tópico, explique quais informações seriam relevantes nesse contexto

Esta análise será a base para desenvolver uma estratégia de marketing e crescimento para a empresa, então seja o mais completo e preciso possível.
`;
}

/**
 * Gera o prompt para o Gemini com capacidade de websearch
 * @param {string} cnpj - CNPJ formatado
 * @param {string} basePrompt - Prompt base do Claude
 * @returns {string} - Prompt para o Gemini com instruções para websearch
 */
function generateGeminiPrompt(cnpj, basePrompt) {
  return `
Por favor, realize uma pesquisa web detalhada sobre a empresa com CNPJ ${cnpj}.

${basePrompt}

Importante:
1. Busque em fontes oficiais como Receita Federal, juntas comerciais e portais de transparência
2. Consulte sites como LinkedIn, Glassdoor e outras plataformas para informações sobre a empresa
3. Verifique notícias recentes sobre a empresa ou seu setor
4. Busque análises de mercado relacionadas ao setor da empresa
5. Encontre informações sobre os principais concorrentes

Forneça todas as informações que encontrar, citando as fontes. Organize os dados de forma clara e estruturada.
Caso não encontre informações específicas para algum dos itens solicitados, indique claramente.
`;
}

module.exports = {
  generateClaudePrompt,
  generateGeminiPrompt
};
