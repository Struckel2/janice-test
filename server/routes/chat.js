const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Cliente = require('../models/Cliente');
const Analise = require('../models/Analise');
const PlanoAcao = require('../models/PlanoAcao');
const chatService = require('../services/chatService');
const auth = require('../middleware/auth');

/**
 * Rotas para funcionalidade de chat
 */

/**
 * @route   POST /api/chat
 * @desc    Criar um novo chat
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { clienteId, tipo, analiseIds, planoAcaoIds } = req.body;
    
    // Validar dados
    if (!clienteId || !tipo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cliente e tipo de chat são obrigatórios' 
      });
    }
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Verificar se o tipo é válido
    if (!['strategy', 'client'].includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de chat inválido. Use "strategy" ou "client"' 
      });
    }
    
    // Verificar se há pelo menos um documento selecionado
    if ((!analiseIds || analiseIds.length === 0) && (!planoAcaoIds || planoAcaoIds.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selecione pelo menos uma análise ou plano de ação' 
      });
    }
    
    // Criar chat
    const novoChat = await chatService.criarChat({
      clienteId,
      usuarioId: req.usuario.id,
      tipo,
      analiseIds,
      planoAcaoIds
    });
    
    // Salvar chat
    await novoChat.save();
    
    res.status(201).json({
      success: true,
      data: novoChat,
      message: 'Chat criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao criar chat' 
    });
  }
});

/**
 * @route   GET /api/chat/cliente/:clienteId
 * @desc    Obter chats de um cliente
 * @access  Private
 */
router.get('/cliente/:clienteId', auth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Obter chats do cliente
    const chats = await Chat.obterChatsCliente(clienteId);
    
    res.json({
      success: true,
      data: chats,
      count: chats.length
    });
    
  } catch (error) {
    console.error('Erro ao obter chats do cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao obter chats do cliente' 
    });
  }
});

/**
 * @route   GET /api/chat/:id
 * @desc    Obter um chat específico
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obter chat
    const chat = await Chat.obterChatPorId(id);
    
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat não encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: chat
    });
    
  } catch (error) {
    console.error('Erro ao obter chat:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao obter chat' 
    });
  }
});

/**
 * @route   POST /api/chat/welcome
 * @desc    Gerar mensagem de boas-vindas para o chat
 * @access  Private
 */
router.post('/welcome', auth, async (req, res) => {
  try {
    const { clienteId, chatType, documentIds } = req.body;
    
    // Validar dados
    if (!clienteId || !chatType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cliente e tipo de chat são obrigatórios' 
      });
    }
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Verificar se o tipo é válido
    if (!['strategy', 'client'].includes(chatType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de chat inválido. Use "strategy" ou "client"' 
      });
    }
    
    // Verificar se há documentos selecionados
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selecione pelo menos um documento' 
      });
    }
    
    // Gerar mensagem de boas-vindas
    const mensagem = await chatService.gerarMensagemBoasVindas({
      clienteId,
      chatType,
      documentIds
    });
    
    res.json({
      success: true,
      message: mensagem
    });
    
  } catch (error) {
    console.error('Erro ao gerar mensagem de boas-vindas:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao gerar mensagem de boas-vindas' 
    });
  }
});

/**
 * @route   POST /api/chat/message
 * @desc    Gerar resposta para uma mensagem
 * @access  Private
 */
router.post('/message', auth, async (req, res) => {
  try {
    const { clienteId, chatType, message, documentIds, history } = req.body;
    
    // Validar dados
    if (!clienteId || !chatType || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cliente, tipo de chat e mensagem são obrigatórios' 
      });
    }
    
    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente não encontrado' 
      });
    }
    
    // Verificar se o tipo é válido
    if (!['strategy', 'client'].includes(chatType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de chat inválido. Use "strategy" ou "client"' 
      });
    }
    
    // Verificar se há documentos selecionados
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selecione pelo menos um documento' 
      });
    }
    
    // Gerar resposta
    const resposta = await chatService.gerarResposta({
      clienteId,
      chatType,
      message,
      documentIds,
      history: history || []
    });
    
    res.json({
      success: true,
      message: resposta
    });
    
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao gerar resposta' 
    });
  }
});

/**
 * @route   POST /api/chat/:id/message
 * @desc    Adicionar mensagem a um chat existente
 * @access  Private
 */
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;
    
    // Validar dados
    if (!role || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Papel e conteúdo da mensagem são obrigatórios' 
      });
    }
    
    // Verificar se o papel é válido
    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Papel inválido. Use "user", "assistant" ou "system"' 
      });
    }
    
    // Obter chat
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat não encontrado' 
      });
    }
    
    // Adicionar mensagem
    await chat.adicionarMensagem(role, content);
    
    res.json({
      success: true,
      data: chat,
      message: 'Mensagem adicionada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao adicionar mensagem' 
    });
  }
});

/**
 * @route   DELETE /api/chat/:id
 * @desc    Desativar um chat (exclusão lógica)
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obter chat
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat não encontrado' 
      });
    }
    
    // Desativar chat (exclusão lógica)
    chat.ativo = false;
    await chat.save();
    
    res.json({
      success: true,
      message: 'Chat desativado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao desativar chat:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao desativar chat' 
    });
  }
});

module.exports = router;
