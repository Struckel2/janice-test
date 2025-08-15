// ===== MÓDULO DE FUNÇÕES UTILITÁRIAS =====
// Namespace para evitar conflitos globais
window.AppModules = window.AppModules || {};

window.AppModules.Utils = (function() {
  'use strict';
  
// ===== FUNÇÃO PARA REQUISIÇÕES SEGURAS =====
  // Variável para controlar redirecionamentos em cascata
  let redirectingToLogin = false;
  // Contador para evitar loops infinitos de redirecionamento
  let redirectAttempts = 0;
  // Timestamp da última tentativa de redirecionamento
  let lastRedirectTime = 0;
  // Limite máximo de redirecionamentos em um período
  const MAX_REDIRECT_ATTEMPTS = 3;
  // Período de tempo para resetar o contador (5 minutos)
  const REDIRECT_RESET_PERIOD = 5 * 60 * 1000;
  
  async function safeFetch(url, options = {}) {
    try {
      // Verificar se já estamos redirecionando
      if (redirectingToLogin) {
        console.log(`🔄 [DEBUG-FETCH] Ignorando requisição para ${url} porque já estamos redirecionando para login`);
        return null;
      }
      
      // Verificar se excedemos o limite de redirecionamentos
      const currentTime = Date.now();
      if (currentTime - lastRedirectTime > REDIRECT_RESET_PERIOD) {
        // Resetar contador após o período
        redirectAttempts = 0;
      }
      
      if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
        console.error(`❌ [DEBUG-FETCH] Limite de redirecionamentos excedido (${MAX_REDIRECT_ATTEMPTS}). Possível loop de redirecionamento.`);
        // Mostrar mensagem de erro ao usuário
        alert("Erro de autenticação: Muitos redirecionamentos detectados. Por favor, recarregue a página manualmente.");
        return null;
      }
      
      console.log(`🔄 [DEBUG-FETCH] Iniciando requisição para: ${url}`);
      
      // Verificar se é uma rota de planos de ação (sem verificação de auth)
      const isActionPlanRoute = url.includes('/api/planos-acao');
      
      // Garantir que headers corretos sejam enviados para requisições AJAX
      const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // Adicionar header para identificar requisições AJAX
      };
      
      // Mesclar headers padrão com os fornecidos
      const headers = { ...defaultHeaders, ...(options.headers || {}) };
      
      // Se for FormData, remover Content-Type para deixar o browser definir
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin' // Garantir que cookies sejam enviados
      });
      
      console.log(`🔄 [DEBUG-FETCH] Resposta recebida: ${url} - Status: ${response.status}`);
      
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
      console.log(`🔄 [DEBUG-FETCH] Content-Type: ${contentType}`);
      
      // Tratar respostas 401 e 403 explicitamente
      if (response.status === 401 || response.status === 403) {
        console.log(`🔄 [DEBUG-FETCH] Resposta ${response.status} recebida, tratando como erro de autenticação`);
        
        // Verificar se é JSON ou HTML
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error(`❌ [DEBUG-FETCH] Erro de autenticação: ${JSON.stringify(errorData)}`);
          
          // Se tiver um campo redirect, usar esse valor
          if (errorData.redirect) {
            redirectAttempts++;
            lastRedirectTime = Date.now();
            redirectingToLogin = true;
            console.log(`🔄 [DEBUG-FETCH] Redirecionando para ${errorData.redirect}`);
            window.location.href = errorData.redirect;
            return null;
          }
        } else {
          // Se não for JSON, provavelmente é HTML de login
          redirectAttempts++;
          lastRedirectTime = Date.now();
          redirectingToLogin = true;
          console.log('🔄 [DEBUG-FETCH] Redirecionando para /login');
          window.location.href = '/login';
          return null;
        }
        
        // Se chegou aqui, tratar como erro normal
        throw new Error(`Erro de autenticação: ${response.status}`);
      }
      
      // Se a resposta não for JSON, tratar com mais cuidado
      if (!contentType.includes('application/json')) {
        // Se for redirecionamento 302, verificar o header Location
        if (response.status === 302) {
          console.log('🔄 [DEBUG-FETCH] Redirecionamento 302 detectado');
          const location = response.headers.get('location');
          console.log(`🔄 [DEBUG-FETCH] Location header: ${location}`);
          
          // Só redirecionar para login se o location for explicitamente /login
          if (location && location.includes('/login')) {
            redirectAttempts++;
            lastRedirectTime = Date.now();
            redirectingToLogin = true;
            console.log('🔄 [DEBUG-FETCH] Redirecionamento para login detectado');
            window.location.href = '/login';
            return null;
          }
          
          // Caso contrário, tratar como erro normal
          throw new Error(`Redirecionamento para ${location || 'desconhecido'}`);
        }
        
        // Tentar obter o texto da resposta
        const responseText = await response.text();
        
        // Verificar se é uma página HTML de login (com mais critérios)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
          console.log(`🔄 [DEBUG-FETCH] Resposta HTML recebida: ${responseText.substring(0, 100)}...`);
          
          // Verificar se é realmente uma página de login com critérios mais específicos
          const isLoginPage = responseText.includes('<form') && 
                             (responseText.includes('login') || responseText.includes('Login')) &&
                             (responseText.includes('password') || responseText.includes('senha'));
          
          if (isLoginPage) {
            console.log('🔄 [DEBUG-FETCH] Página de login detectada');
            redirectAttempts++;
            lastRedirectTime = Date.now();
            redirectingToLogin = true;
            window.location.href = '/login';
            return null;
          }
        }
        
        // Se não for identificado como página de login, tratar como erro normal
        throw new Error(`Resposta não-JSON: ${responseText.substring(0, 100)}...`);
      }
      
      // Se chegou até aqui, a resposta é JSON válida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
      }
      
      // Processar resposta JSON com tratamento de erro melhorado
      try {
        const jsonData = await response.json();
        console.log(`✅ [DEBUG-FETCH] Dados JSON processados com sucesso: ${url}`);
        return jsonData;
      } catch (parseError) {
        console.error(`❌ [DEBUG-FETCH] Erro ao fazer parse do JSON: ${parseError.message}`);
        
        // Tentar obter o texto da resposta para diagnóstico
        const responseText = await response.clone().text().catch(() => '');
        
        // Verificar se parece HTML de login (com critérios mais específicos)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
          const isLoginPage = responseText.includes('<form') && 
                             (responseText.includes('login') || responseText.includes('Login')) &&
                             (responseText.includes('password') || responseText.includes('senha'));
          
          if (isLoginPage) {
            console.log('🔄 [DEBUG-FETCH] Página de login detectada em resposta JSON inválida');
            redirectAttempts++;
            lastRedirectTime = Date.now();
            redirectingToLogin = true;
            window.location.href = '/login';
            return null;
          }
        }
        
        // Caso contrário, lançar o erro de parsing
        throw new Error(`Erro ao processar resposta JSON: ${parseError.message}`);
      }
      
    } catch (error) {
      console.error(`❌ [DEBUG-FETCH] Erro na requisição para ${url}:`, error.message);
      
      // Para rotas de planos de ação, não redirecionar para login
      if (url.includes('/api/planos-acao')) {
        throw error;
      }
      
      // Verificar se o erro indica problema de autenticação
      const authErrorIndicators = [
        'Sessão expirada',
        'Não autenticado',
        'Unauthorized',
        'Forbidden',
        'Authentication failed',
        'Login required'
      ];
      
      const isAuthError = authErrorIndicators.some(indicator => 
        error.message.toLowerCase().includes(indicator.toLowerCase())
      );
      
      // Verificar se o erro contém HTML de login
      const containsLoginHTML = error.message.includes('<!DOCTYPE') || 
                               error.message.includes('<html>') && 
                               error.message.includes('login');
      
      if (isAuthError || containsLoginHTML) {
        console.log('🔄 [DEBUG-FETCH] Erro de autenticação detectado');
        
        // Verificar se não excedemos o limite de redirecionamentos
        if (redirectAttempts < MAX_REDIRECT_ATTEMPTS) {
          redirectAttempts++;
          lastRedirectTime = Date.now();
          redirectingToLogin = true;
          console.log('🔄 [DEBUG-FETCH] Redirecionando para /login');
          window.location.href = '/login';
          return null;
        } else {
          console.error(`❌ [DEBUG-FETCH] Limite de redirecionamentos excedido (${MAX_REDIRECT_ATTEMPTS})`);
          alert("Erro de autenticação: Muitos redirecionamentos detectados. Por favor, recarregue a página manualmente.");
        }
      }
      
      // Re-lançar o erro para tratamento pelo chamador
      throw error;
    }
  }
  
  // ===== FUNÇÃO PARA SCROLL SUAVE =====
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
  
  // ===== FUNÇÃO PARA MOSTRAR APENAS UMA SEÇÃO =====
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
  
  // ===== FUNÇÃO PARA FORMATAR CNPJ =====
  function formatCnpj(cnpj) {
    if (!cnpj) return '';
    
    // Remover caracteres não numéricos
    const numericCnpj = cnpj.replace(/\D/g, '');
    
    // Aplicar máscara XX.XXX.XXX/XXXX-XX
    return numericCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  
  // ===== FUNÇÃO PARA CONVERTER HEX PARA RGBA =====
  function hexToRgba(hex, alpha) {
    // Remover # se presente
    hex = hex.replace('#', '');
    
    // Converter para RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // ===== FUNÇÃO PARA FORMATAR DURAÇÃO =====
  function formatDuration(seconds) {
    if (!seconds) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
  
  // ===== FUNÇÃO PARA OBTER LABEL DO TIPO =====
  function getTypeLabel(tipoArte) {
    const labels = {
      'logo': 'Logo',
      'post-social': 'Post',
      'banner': 'Banner',
      'landing-page': 'Landing',
      'material-apresentacao': 'Apresentação',
      'ilustracao-conceitual': 'Ilustração',
      'mockup-produto': 'Produto'
    };
    
    return labels[tipoArte] || tipoArte;
  }
  
  // ===== FUNÇÃO PARA OBTER ÍCONE DO TIPO =====
  function getGalleryTypeIcon(tipo) {
    const icons = {
      'logo': 'fas fa-tag',
      'post-social': 'fas fa-mobile-alt',
      'banner': 'fas fa-rectangle-ad',
      'landing-page': 'fas fa-globe',
      'material-apresentacao': 'fas fa-presentation',
      'ilustracao-conceitual': 'fas fa-paint-brush',
      'mockup-produto': 'fas fa-box'
    };
    
    return icons[tipo] || 'fas fa-image';
  }
  
  // ===== FUNÇÃO PARA FORMATAR MARKDOWN =====
  function formatMarkdown(text) {
    if (!text) return '';
    
    // Adicionar classe para estilização
    let formatted = `<div class="markdown-content">${text}</div>`;
    
    // Converter títulos (###)
    formatted = formatted.replace(/### ([^\n]+)/g, '<h4>$1</h4>');
    
    // Converter negrito
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Converter itálico
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Converter listas
    formatted = formatted.replace(/- ([^\n]+)/g, '<li>$1</li>');
    formatted = formatted.replace(/(\<li\>[^\n]+\<\/li\>(\n|$))+/g, '<ul>$&</ul>');
    
    // Converter links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Converter parágrafos
    formatted = formatted.replace(/([^\n]+)(\n|$)/g, function(match, p1) {
      // Evitar adicionar tags <p> em conteúdo que já tem tags HTML
      if (p1.trim().startsWith('<') && p1.trim().endsWith('>')) {
        return match;
      }
      return `<p>${p1}</p>\n`;
    });
    
    return formatted;
  }
  
  // ===== FUNÇÃO PARA FORMATAR MARKDOWN DE PLANOS DE AÇÃO =====
  function formatMarkdownForActionPlan(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Converter títulos
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    
    // Converter negrito e itálico
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Converter listas
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    // Agrupar listas
    formatted = formatted.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    
    // Converter tabelas simples
    const tableRegex = /\|(.+)\|\n\|[-\s|]+\|\n((\|.+\|\n?)+)/g;
    formatted = formatted.replace(tableRegex, (match, header, separator, rows) => {
      const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell);
      const rowsArray = rows.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      let table = '<table><thead><tr>';
      headerCells.forEach(cell => {
        table += `<th>${cell}</th>`;
      });
      table += '</tr></thead><tbody>';
      
      rowsArray.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
          table += `<td>${cell}</td>`;
        });
        table += '</tr>';
      });
      
      table += '</tbody></table>';
      return table;
    });
    
    // Converter parágrafos
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = `<p>${formatted}</p>`;
    
    // Limpar tags vazias
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>(<h[1-6]>)/g, '$1');
    formatted = formatted.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<ul>)/g, '$1');
    formatted = formatted.replace(/(<\/ul>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<table>)/g, '$1');
    formatted = formatted.replace(/(<\/table>)<\/p>/g, '$1');
    
    return formatted;
  }
  
  // ===== EXPORTAR FUNÇÕES PÚBLICAS =====
  return {
    safeFetch: safeFetch,
    scrollToElement: scrollToElement,
    showOnlySection: showOnlySection,
    formatCnpj: formatCnpj,
    hexToRgba: hexToRgba,
    formatDuration: formatDuration,
    getTypeLabel: getTypeLabel,
    getGalleryTypeIcon: getGalleryTypeIcon,
    formatMarkdown: formatMarkdown,
    formatMarkdownForActionPlan: formatMarkdownForActionPlan
  };
})();
