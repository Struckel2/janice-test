document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  
  // ===== IMPORTAÇÃO DOS MÓDULOS =====
  const Utils = window.AppModules.Utils;
  const Progress = window.AppModules.Progress;
  const Auth = window.AppModules.Auth;
  const Clients = window.AppModules.Clients;
  const Analysis = window.AppModules.Analysis;
  const Transcriptions = window.AppModules.Transcriptions;
  const ActionPlans = window.AppModules.ActionPlans;
  const Mockups = window.AppModules.Mockups;
  const Gallery = window.AppModules.Gallery;
  const ImageEditor = window.AppModules.ImageEditor;
  const ArtisticStyle = window.AppModules.ArtisticStyle;
  const ActiveProcesses = window.AppModules.ActiveProcesses;
  
  // ===== VARIÁVEIS DE ESTADO GLOBAL =====
  window.currentClientId = null;
  window.currentUser = null;
  
  // ===== FUNÇÃO UTILITÁRIA PARA REQUISIÇÕES SEGURAS =====
  
  // Função para fazer requisições de forma segura, tratando redirects de autenticação
  async function safeFetch(url, options = {}) {
    try {
      // Verificar se é uma rota de planos de ação (sem verificação de auth)
      const isActionPlanRoute = url.includes('/api/planos-acao');
      
      // Garantir que headers corretos sejam enviados para requisições AJAX
      const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Mesclar headers padrão com os fornecidos
      const headers = { ...defaultHeaders, ...(options.headers || {}) };
      
      // Se for FormData, remover Content-Type para deixar o browser definir
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Para rotas de planos de ação, não verificar autenticação
      if (isActionPlanRoute) {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Erro HTTP ${response.status}` }));
          throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
        }
        return await response.json();
      }
      
      // Verificar o tipo de conteúdo da resposta (apenas para outras rotas)
      const contentType = response.headers.get('content-type') || '';
      
      // Se a resposta não for JSON, pode ser um redirect de autenticação
      if (!contentType.includes('application/json')) {
        // Verificar se é um redirect de autenticação
        if (response.status === 302 || response.status === 401) {
          console.log('🔄 Redirecionamento de autenticação detectado, redirecionando para login...');
          window.location.href = '/login';
          return null;
        }
        
        // Se for outro tipo de erro, tentar obter texto da resposta
        const responseText = await response.text();
        
        // Se a resposta contém HTML (provavelmente página de erro)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
          throw new Error('Sessão expirada. Redirecionando para login...');
        }
        
        // Caso contrário, usar o texto como mensagem de erro
        throw new Error(responseText || `Erro HTTP ${response.status}`);
      }
      
      // Se chegou até aqui, a resposta é JSON válida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // Para rotas de planos de ação, não redirecionar para login
      if (url.includes('/api/planos-acao')) {
        throw error;
      }
      
      // Se o erro menciona sessão expirada, redirecionar para login
      if (error.message.includes('Sessão expirada') || error.message.includes('Unexpected token')) {
        console.log('🔄 Erro de parsing JSON detectado, redirecionando para login...');
        window.location.href = '/login';
        return null;
      }
      
      // Re-lançar outros erros
      throw error;
    }
  }
  
  // ===== FUNÇÃO UTILITÁRIA PARA SCROLL AUTOMÁTICO =====
  
  // Função para fazer scroll suave para um elemento
  function scrollToElement(elementId, behavior = 'smooth', block = 'start') {
    const element = document.getElementById(elementId);
    if (element) {
      // Pequeno delay para garantir que o elemento esteja visível
      setTimeout(() => {
        element.scrollIntoView({ 
          behavior: behavior, 
          block: block,
          inline: 'nearest'
        });
      }, 100);
    }
  }
  
  // ===== GERENCIAMENTO DE ESTADO DAS SEÇÕES =====
  
  // Função para mostrar apenas uma seção por vez (estado exclusivo)
  function showOnlySection(targetSectionId) {
    // Lista de todas as seções principais que devem ser mutuamente exclusivas
    const allSections = [
      'welcome-container',
      'analysis-container', 
      'transcription-container',
      'transcription-result-container',
      'action-plan-container',
      'action-plan-result-container',
      'result-container',
      'loading-container',
      'error-container'
    ];
    
    // Esconder todas as seções usando classes CSS
    allSections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.add('hidden');
      }
    });
    
    // Mostrar apenas a seção alvo usando classes CSS
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
  }
  
  // ===== FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL =====
  
  // Função principal de inicialização
  function init() {
    console.log('🚀 Inicializando aplicação...');
    
    // Verificar autenticação
    Auth.checkAuthentication();
    
    // Inicializar gerenciador de processos ativos
    const activeProcessesManager = new ActiveProcesses.ActiveProcessesManager();
    window.activeProcessesManager = activeProcessesManager;
    
    // Inicializar módulos
    Clients.init();
    Analysis.init();
    Transcriptions.init();
    ActionPlans.init();
    Mockups.init();
    Gallery.init();
    ImageEditor.init();
    ArtisticStyle.init();
    
    // Configurar abas
    setupClientTabs();
    
    // Mostrar tela de boas-vindas
    showOnlySection('welcome-container');
    
    console.log('✅ Aplicação inicializada com sucesso!');
  }
  
  // ===== FUNÇÕES PARA GERENCIAMENTO DE ABAS =====
  
  // Configurar abas de cliente (análises/transcrições/etc)
  function setupClientTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remover classe active de todos os botões e conteúdos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adicionar classe active ao botão clicado
        button.classList.add('active');
        
        // Mostrar conteúdo correspondente
        const tabName = button.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Disparar evento de mudança de aba
        document.dispatchEvent(new CustomEvent('tab-changed', {
          detail: { tabId: tabName }
        }));
      });
    });
  }
  
  // ===== INICIALIZAÇÃO DA APLICAÇÃO =====
  
  // Adicionar listener para o evento de autenticação bem-sucedida
  document.addEventListener('auth-success', (event) => {
    console.log('🔄 Evento auth-success recebido, carregando clientes...');
    
    // Pequeno atraso para garantir que todos os módulos estejam inicializados
    setTimeout(() => {
      // Carregar clientes após autenticação bem-sucedida
      if (Clients && typeof Clients.loadClients === 'function') {
        console.log('🔄 Carregando lista de clientes após autenticação...');
        Clients.loadClients().then(clients => {
          console.log(`✅ ${clients?.length || 0} clientes carregados com sucesso`);
        }).catch(error => {
          console.error('❌ Erro ao carregar clientes após autenticação:', error);
        });
      } else {
        console.error('❌ Módulo Clients não disponível ou método loadClients não encontrado');
      }
    }, 500);
  });
  
  // Inicializar a aplicação
  init();
});
