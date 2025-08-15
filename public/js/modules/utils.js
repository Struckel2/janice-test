// ===== MÓDULO DE FUNÇÕES UTILITÁRIAS =====
// Namespace para evitar conflitos globais
window.AppModules = window.AppModules || {};

window.AppModules.Utils = (function() {
  'use strict';
  
  // ===== FUNÇÃO PARA REQUISIÇÕES SEGURAS =====
  // Variável para controlar redirecionamentos em cascata
  let redirectingToLogin = false;
  
  async function safeFetch(url, options = {}) {
    try {
      // Se já estamos redirecionando, não fazer mais requisições
      if (redirectingToLogin) {
        console.log(`🔄 [DEBUG-FETCH] Ignorando requisição para ${url} porque já estamos redirecionando para login`);
        return null;
      }
      
      console.log(`🔄 [DEBUG-FETCH] Iniciando requisição para: ${url}`);
      
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
      
      // Se a resposta não for JSON, pode ser um redirect de autenticação
      if (!contentType.includes('application/json')) {
        // Verificar se é um redirect de autenticação explícito (401 Unauthorized)
        if (response.status === 401) {
          console.log('🔄 [DEBUG-FETCH] Resposta 401 Unauthorized, redirecionando para login...');
          redirectingToLogin = true;
          window.location.href = '/login';
          return null;
        }
        
        // Se for redirecionamento 302, não redirecionar automaticamente para login
        if (response.status === 302) {
          console.log('🔄 [DEBUG-FETCH] Redirecionamento 302 detectado, mas não redirecionando automaticamente');
          const location = response.headers.get('location');
          console.log(`🔄 [DEBUG-FETCH] Location header: ${location}`);
          
          // Só redirecionar para login se o location for explicitamente /login
          if (location && location.includes('/login')) {
            console.log('🔄 [DEBUG-FETCH] Redirecionamento para login detectado, redirecionando...');
            redirectingToLogin = true;
            window.location.href = '/login';
            return null;
          }
          
          // Caso contrário, tratar como erro normal
          throw new Error(`Redirecionamento para ${location || 'desconhecido'}`);
        }
        
        // Se for outro tipo de erro, tentar obter texto da resposta
        const responseText = await response.text();
        console.log(`🔄 [DEBUG-FETCH] Resposta não-JSON recebida: ${responseText.substring(0, 100)}...`);
        
        // Se a resposta contém HTML de login, então redirecionar
        if ((responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) && 
            (responseText.includes('login') || responseText.includes('Login'))) {
          console.log('🔄 [DEBUG-FETCH] Página de login detectada, redirecionando...');
          redirectingToLogin = true;
          window.location.href = '/login';
          return null;
        }
        
        // Caso contrário, usar o texto como mensagem de erro
        throw new Error(responseText || `Erro HTTP ${response.status}`);
      }
      
      // Se chegou até aqui, a resposta é JSON válida
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
      }
      
      // Tentar fazer o parse do JSON com tratamento de erro melhorado
      try {
        // Clonar a resposta para poder lê-la duas vezes (para debug e para uso)
        const clonedResponse = response.clone();
        
        // Ler o texto da resposta para debug
        const responseText = await clonedResponse.text();
        console.log(`🔄 [DEBUG-FETCH] Resposta JSON recebida: ${responseText.substring(0, 100)}...`);
        
        // Verificar se a resposta começa com caracteres estranhos (como 'a<!DOCTYPE')
        // e contém elementos de página de login
        if ((responseText.trim().startsWith('a<!DOCTYPE') || 
             responseText.trim().startsWith('<!DOCTYPE') || 
             responseText.trim().startsWith('<html>')) && 
            (responseText.includes('login') || responseText.includes('Login'))) {
          console.log('🔄 [DEBUG-FETCH] Página de login detectada em vez de JSON, redirecionando...');
          redirectingToLogin = true;
          window.location.href = '/login';
          return null;
        }
        
        // Fazer o parse do JSON
        const jsonData = JSON.parse(responseText);
        console.log(`✅ [DEBUG-FETCH] Dados JSON processados com sucesso: ${url}`);
        return jsonData;
      } catch (parseError) {
        console.error(`❌ [DEBUG-FETCH] Erro ao fazer parse do JSON: ${parseError.message}`);
        
        // Só redirecionar para login se o erro for de parsing JSON e a resposta parecer HTML de login
        if (parseError.message.includes('Unexpected token') && 
            (parseError.message.includes('<!DOCTYPE') || 
             parseError.message.includes('<html>') || 
             parseError.message.includes('login') || 
             parseError.message.includes('Login'))) {
          console.log('🔄 [DEBUG-FETCH] Erro de parsing com HTML de login detectado, redirecionando...');
          redirectingToLogin = true;
          window.location.href = '/login';
          return null;
        }
        
        // Caso contrário, lançar o erro normalmente
        throw parseError;
      }
      
    } catch (error) {
      console.error(`❌ [DEBUG-FETCH] Erro na requisição para ${url}:`, error.message);
      
      // Para rotas de planos de ação, não redirecionar para login
      if (url.includes('/api/planos-acao')) {
        throw error;
      }
      
      // Se o erro menciona sessão expirada ou contém elementos de página de login, redirecionar
      if (error.message.includes('Sessão expirada') || 
          (error.message.includes('Unexpected token') && 
           (error.message.includes('<!DOCTYPE') || 
            error.message.includes('<html>')) && 
           (error.message.includes('login') || 
            error.message.includes('Login')))) {
        console.log('🔄 [DEBUG-FETCH] Erro com página de login detectado, redirecionando...');
        redirectingToLogin = true;
        window.location.href = '/login';
        return null;
      }
      
      // Re-lançar outros erros
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
