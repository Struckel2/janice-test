const axios = require('axios');
const Chat = require('../models/Chat');
const Cliente = require('../models/Cliente');
const Analise = require('../models/Analise');
const PlanoAcao = require('../models/PlanoAcao');

/**
 * Serviço para gerenciamento de chats e integração com OpenRouter/Claude
 * Utiliza Claude 3.7 Sonnet via OpenRouter para máxima qualidade
 */

// Configurações do OpenRouter - usando mesmo modelo da análise de mercado
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CLAUDE_MODEL = process.env.OPENROUTER_CLAUDE_MODEL || 'anthropic/claude-sonnet-4';

/**
 * Cria um novo chat
 * @param {Object} chatData - Dados do chat
 * @returns {Promise<Object>} - Chat criado
 */
async function criarChat(chatData) {
  try {
    const novoChat = new Chat({
      cliente: chatData.clienteId,
      criadoPor: chatData.usuarioId,
      tipo: chatData.tipo,
      documentosBase: {
        analises: chatData.analiseIds || [],
        planosAcao: chatData.planoAcaoIds || []
      },
      mensagens: []
    });
    
    // Adicionar mensagem de sistema inicial
    await novoChat.adicionarMensagem('system', 'Iniciando conversa...');
    
    return novoChat;
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    throw new Error(`Não foi possível criar o chat: ${error.message}`);
  }
}

/**
 * Gera uma mensagem de boas-vindas para o chat
 * @param {Object} params - Parâmetros para geração da mensagem
 * @returns {Promise<string>} - Mensagem de boas-vindas
 */
async function gerarMensagemBoasVindas(params) {
  try {
    console.log(`\n====== GERANDO MENSAGEM DE BOAS-VINDAS PARA CHAT ======`);
    console.log(`Cliente: ${params.clienteId}`);
    console.log(`Tipo: ${params.chatType}`);
    console.log(`Documentos: ${params.documentIds ? params.documentIds.length : 0}`);
    
    // Carregar dados do cliente
    const cliente = await Cliente.findById(params.clienteId);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    // Carregar documentos
    const documentos = await carregarDocumentos(params.documentIds);
    
    // Preparar contexto
    const contexto = prepararContexto(cliente, documentos, params.chatType);
    
    // Gerar prompt
    const prompt = gerarPromptBoasVindas(contexto, params.chatType);
    
    // Chamar API do Claude
    const resposta = await chamarClaudeAPI(prompt);
    
    console.log(`\n====== MENSAGEM DE BOAS-VINDAS GERADA COM SUCESSO ======\n`);
    
    return resposta;
  } catch (error) {
    console.error('Erro ao gerar mensagem de boas-vindas:', error);
    
    // Retornar mensagem padrão em caso de erro
    if (params.chatType === 'strategy') {
      return 'Olá! Sou seu assistente de estratégia de marketing. Como posso ajudar você hoje?';
    } else {
      return 'Olá! Sou o cliente ideal para sua empresa. Como posso ajudar você a entender melhor minhas necessidades?';
    }
  }
}

/**
 * Gera uma resposta para uma mensagem do usuário
 * @param {Object} params - Parâmetros para geração da resposta
 * @returns {Promise<string>} - Resposta gerada
 */
async function gerarResposta(params) {
  try {
    console.log(`\n====== GERANDO RESPOSTA PARA MENSAGEM ======`);
    console.log(`Cliente: ${params.clienteId}`);
    console.log(`Tipo: ${params.chatType}`);
    console.log(`Mensagem: ${params.message.substring(0, 50)}...`);
    
    // Carregar dados do cliente
    const cliente = await Cliente.findById(params.clienteId);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }
    
    // Carregar documentos
    const documentos = await carregarDocumentos(params.documentIds);
    
    // Preparar contexto
    const contexto = prepararContexto(cliente, documentos, params.chatType);
    
    // Gerar prompt
    const prompt = gerarPromptResposta(contexto, params.chatType, params.message, params.history);
    
    // Chamar API do Claude
    const resposta = await chamarClaudeAPI(prompt);
    
    console.log(`\n====== RESPOSTA GERADA COM SUCESSO ======\n`);
    
    return resposta;
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    throw new Error(`Não foi possível gerar uma resposta: ${error.message}`);
  }
}

/**
 * Carrega os documentos selecionados
 * @param {Array} documentIds - IDs dos documentos
 * @returns {Promise<Object>} - Documentos carregados
 */
async function carregarDocumentos(documentIds) {
  try {
    if (!documentIds || documentIds.length === 0) {
      return { analises: [], planosAcao: [] };
    }
    
    const analiseIds = documentIds
      .filter(doc => doc.type === 'analysis')
      .map(doc => doc.id);
    
    const planoAcaoIds = documentIds
      .filter(doc => doc.type === 'plan')
      .map(doc => doc.id);
    
    // Carregar análises
    const analises = analiseIds.length > 0 
      ? await Analise.find({ _id: { $in: analiseIds } })
      : [];
    
    // Carregar planos de ação
    const planosAcao = planoAcaoIds.length > 0
      ? await PlanoAcao.find({ _id: { $in: planoAcaoIds } })
      : [];
    
    return { analises, planosAcao };
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    throw new Error('Falha ao carregar documentos selecionados');
  }
}

/**
 * Prepara o contexto para o Claude
 * @param {Object} cliente - Dados do cliente
 * @param {Object} documentos - Documentos carregados
 * @param {string} chatType - Tipo de chat
 * @returns {string} - Contexto formatado
 */
function prepararContexto(cliente, documentos, chatType) {
  let contexto = '';
  
  // Adicionar informações do cliente
  contexto += '# INFORMAÇÕES DO CLIENTE\n\n';
  contexto += `**Nome:** ${cliente.nome}\n`;
  contexto += `**CNPJ:** ${cliente.cnpj}\n\n`;
  
  // Adicionar análises
  if (documentos.analises && documentos.analises.length > 0) {
    contexto += '# ANÁLISES DE MERCADO\n\n';
    documentos.analises.forEach((analise, index) => {
      contexto += `## Análise ${index + 1}: ${analise.cnpj}\n`;
      contexto += `**Data:** ${analise.dataCriacao.toLocaleDateString('pt-BR')}\n\n`;
      contexto += `**Conteúdo:**\n${analise.conteudo}\n\n`;
      contexto += '---\n\n';
    });
  }
  
  // Adicionar planos de ação
  if (documentos.planosAcao && documentos.planosAcao.length > 0) {
    contexto += '# PLANOS DE AÇÃO\n\n';
    documentos.planosAcao.forEach((plano, index) => {
      contexto += `## Plano ${index + 1}: ${plano.titulo}\n`;
      contexto += `**Data:** ${plano.dataCriacao.toLocaleDateString('pt-BR')}\n\n`;
      contexto += `**Conteúdo:**\n${plano.conteudo}\n\n`;
      contexto += '---\n\n';
    });
  }
  
  return contexto;
}

/**
 * Gera o prompt para mensagem de boas-vindas
 * @param {string} contexto - Contexto com informações e documentos
 * @param {string} chatType - Tipo de chat
 * @returns {string} - Prompt formatado
 */
function gerarPromptBoasVindas(contexto, chatType) {
  if (chatType === 'strategy') {
    return `
Você é um especialista em marketing e estratégia empresarial, com vasto conhecimento em análise de mercado, posicionamento de marca e planejamento estratégico.

${contexto}

Com base nas informações acima sobre o cliente e nos documentos fornecidos (análises de mercado e planos de ação), você irá conversar com um usuário que busca orientações estratégicas para marketing e negócios.

Seu papel é:
1. Fornecer insights estratégicos baseados nas análises e planos existentes
2. Sugerir abordagens de marketing alinhadas ao perfil do cliente
3. Responder dúvidas sobre estratégias de mercado, posicionamento e planos de ação
4. Oferecer recomendações práticas e acionáveis

Mantenha um tom profissional, estratégico e orientado a resultados. Use linguagem clara e direta, evitando jargões desnecessários. Suas respostas devem ser específicas para o contexto do cliente, não genéricas.

Comece a conversa com uma breve introdução e ofereça ajuda inicial, mencionando que você está familiarizado com as análises e planos de ação do cliente.
`;
  } else if (chatType === 'client') {
    return `
Você vai assumir o papel do cliente ideal para a empresa descrita abaixo. Você deve personificar o perfil psicológico, necessidades, desejos, objeções e linguagem típica deste cliente ideal.

${contexto}

Com base nas informações acima sobre a empresa e nos documentos fornecidos (análises de mercado e planos de ação), você irá simular ser o cliente ideal desta empresa, conversando com um usuário que está tentando entender melhor como abordar e se comunicar com este perfil de cliente.

Seu papel como cliente ideal é:
1. Expressar as necessidades, desejos e pontos de dor típicos deste perfil
2. Usar linguagem, tom e terminologia que este cliente usaria
3. Apresentar objeções realistas que este cliente teria
4. Reagir às propostas e abordagens como este cliente reagiria
5. Demonstrar o processo de tomada de decisão deste perfil

Mantenha-se completamente no personagem durante toda a conversa. Suas respostas devem refletir a perspectiva do cliente, não a de um consultor ou especialista. Use a primeira pessoa ("eu preciso", "estou buscando", etc).

Comece a conversa se apresentando brevemente como o cliente ideal, mencionando suas principais necessidades ou desafios atuais.
`;
  }
  
  // Prompt padrão caso o tipo não seja reconhecido
  return `
Você é um assistente de IA especializado em marketing e estratégia empresarial.

${contexto}

Com base nas informações acima sobre o cliente e nos documentos fornecidos, você irá conversar com um usuário que busca orientações.

Mantenha um tom profissional e amigável. Use linguagem clara e direta.

Comece a conversa com uma breve introdução e ofereça ajuda inicial.
`;
}

/**
 * Gera o prompt para resposta a uma mensagem
 * @param {string} contexto - Contexto com informações e documentos
 * @param {string} chatType - Tipo de chat
 * @param {string} message - Mensagem do usuário
 * @param {Array} history - Histórico de mensagens
 * @returns {string} - Prompt formatado
 */
function gerarPromptResposta(contexto, chatType, message, history) {
  // Formatar histórico de mensagens
  let historicoFormatado = '';
  if (history && history.length > 0) {
    historicoFormatado = '# HISTÓRICO DA CONVERSA\n\n';
    
    history.forEach(msg => {
      if (msg.role === 'user') {
        historicoFormatado += `**Usuário:** ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        historicoFormatado += `**Assistente:** ${msg.content}\n\n`;
      }
    });
    
    historicoFormatado += '---\n\n';
  }
  
  // Adicionar mensagem atual
  const mensagemAtual = `# MENSAGEM ATUAL DO USUÁRIO\n\n${message}\n\n`;
  
  if (chatType === 'strategy') {
    return `
Você é um especialista em marketing e estratégia empresarial, com vasto conhecimento em análise de mercado, posicionamento de marca e planejamento estratégico.

${contexto}

${historicoFormatado}

${mensagemAtual}

Com base nas informações sobre o cliente, nos documentos fornecidos e no histórico da conversa, responda à mensagem do usuário.

Seu papel é:
1. Fornecer insights estratégicos baseados nas análises e planos existentes
2. Sugerir abordagens de marketing alinhadas ao perfil do cliente
3. Responder dúvidas sobre estratégias de mercado, posicionamento e planos de ação
4. Oferecer recomendações práticas e acionáveis

Mantenha um tom profissional, estratégico e orientado a resultados. Use linguagem clara e direta, evitando jargões desnecessários. Suas respostas devem ser específicas para o contexto do cliente, não genéricas.
`;
  } else if (chatType === 'client') {
    return `
Você vai assumir o papel do cliente ideal para a empresa descrita abaixo. Você deve personificar o perfil psicológico, necessidades, desejos, objeções e linguagem típica deste cliente ideal.

${contexto}

${historicoFormatado}

${mensagemAtual}

Com base nas informações sobre a empresa, nos documentos fornecidos e no histórico da conversa, responda à mensagem do usuário como se você fosse o cliente ideal desta empresa.

Seu papel como cliente ideal é:
1. Expressar as necessidades, desejos e pontos de dor típicos deste perfil
2. Usar linguagem, tom e terminologia que este cliente usaria
3. Apresentar objeções realistas que este cliente teria
4. Reagir às propostas e abordagens como este cliente reagiria
5. Demonstrar o processo de tomada de decisão deste perfil

Mantenha-se completamente no personagem durante toda a conversa. Suas respostas devem refletir a perspectiva do cliente, não a de um consultor ou especialista. Use a primeira pessoa ("eu preciso", "estou buscando", etc).
`;
  }
  
  // Prompt padrão caso o tipo não seja reconhecido
  return `
Você é um assistente de IA especializado em marketing e estratégia empresarial.

${contexto}

${historicoFormatado}

${mensagemAtual}

Com base nas informações sobre o cliente, nos documentos fornecidos e no histórico da conversa, responda à mensagem do usuário.

Mantenha um tom profissional e amigável. Use linguagem clara e direta.
`;
}

/**
 * Chama a API do Claude via OpenRouter
 * @param {string} prompt - Prompt para o modelo
 * @returns {Promise<string>} - Resposta do modelo
 */
async function chamarClaudeAPI(prompt) {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Chave de API do OpenRouter não configurada');
    }
    
    console.log('🤖 [CHAT] Enviando consulta ao Claude Sonnet...');
    console.log(`📊 [CHAT] Modelo: ${OPENROUTER_CLAUDE_MODEL}`);
    console.log(`📝 [CHAT] Tamanho do prompt: ${prompt.length} caracteres`);
    
    // Tentar com retry em caso de falha
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [CHAT] Tentativa ${attempt}/${maxRetries}`);
        
        const response = await axios.post(
          OPENROUTER_API_URL,
          {
            model: OPENROUTER_CLAUDE_MODEL,
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: 4000,
            temperature: 0.7
          },
          {
            timeout: 120000, // 2 minutos
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://janice.analyzer.app',
              'X-Title': 'Janice - Chat'
            }
          }
        );
        
        console.log('✅ [CHAT] Resposta recebida do Claude Sonnet');
        
        // Validação da resposta
        if (!response.data || !response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
          throw new Error('Estrutura de resposta da API é inválida');
        }
        
        const firstChoice = response.data.choices[0];
        if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
          throw new Error('Conteúdo da mensagem não encontrado na resposta da API');
        }
        
        const content = firstChoice.message.content;
        console.log(`✅ [CHAT] Resposta gerada com sucesso: ${content.length} caracteres`);
        
        return content;
        
      } catch (attemptError) {
        lastError = attemptError;
        console.error(`❌ [CHAT] Tentativa ${attempt} falhou:`, attemptError.message);
        
        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          console.log(`⏳ [CHAT] Aguardando 3 segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
    
  } catch (error) {
    console.error('❌ [CHAT] Erro na consulta ao Claude:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout na geração da resposta. Por favor, tente novamente.');
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
    
    throw new Error(`Falha na geração da resposta: ${error.message}`);
  }
}

module.exports = {
  criarChat,
  gerarMensagemBoasVindas,
  gerarResposta
};
