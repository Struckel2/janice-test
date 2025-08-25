// actionPlanManager.js
// Gerenciador de Planos de Ação

(function(window) {
    'use strict';
    
    // Elementos específicos para planos de ação
    let newActionPlanBtn;
    let cancelActionPlanBtn;
    let startActionPlanBtn;
    let actionPlanForm;
    let actionPlanTitleInput;
    let availableTranscriptions;
    let availableAnalyses;
    let selectedDocumentsList;
    let actionPlansList;
    let actionPlanTitleDisplay;
    let actionPlanDate;
    let actionPlanDocumentsCount;
    let actionPlanText;
    let exportActionPlanPdfBtn;
    let copyActionPlanBtn;
    let backToClientFromPlanBtn;
    
    // Referências a elementos e funções externas
    let currentClientId;
    let loadingContainer;
    let loadingStatus;
    let progressFill;
    let progressText;
    let progressSteps;
    let clientDetailsPanel;
    let safeFetch;
    let showOnlySection;
    let scrollToElement;
    let updateProgress;
    let showError;
    let resetProgress;
    let activeProcessesManager;
    
    // Estado dos documentos selecionados
    let selectedDocuments = [];
    let currentActionPlanData = null;
    
    // Inicializar elementos DOM e referências
    function initElements() {
        // Elementos específicos para planos de ação
        newActionPlanBtn = document.getElementById('new-action-plan-btn');
        cancelActionPlanBtn = document.getElementById('cancel-action-plan-btn');
        startActionPlanBtn = document.getElementById('start-action-plan-btn');
        actionPlanForm = document.getElementById('action-plan-form');
        actionPlanTitleInput = document.getElementById('action-plan-title');
        availableTranscriptions = document.getElementById('available-transcriptions');
        availableAnalyses = document.getElementById('available-analyses');
        selectedDocumentsList = document.getElementById('selected-documents-list');
        actionPlansList = document.getElementById('action-plans-list');
        actionPlanTitleDisplay = document.getElementById('action-plan-title-display');
        actionPlanDate = document.getElementById('action-plan-date');
        actionPlanDocumentsCount = document.getElementById('action-plan-documents-count');
        actionPlanText = document.getElementById('action-plan-text');
        exportActionPlanPdfBtn = document.getElementById('export-action-plan-pdf');
        copyActionPlanBtn = document.getElementById('copy-action-plan');
        backToClientFromPlanBtn = document.getElementById('back-to-client-from-plan');
        
        // Elementos compartilhados
        loadingContainer = document.getElementById('loading-container');
        loadingStatus = document.getElementById('loading-status');
        progressFill = document.getElementById('progress-fill');
        progressText = document.getElementById('progress-text');
        progressSteps = {
            step1: document.getElementById('step-1'),
            step2: document.getElementById('step-2'),
            step3: document.getElementById('step-3'),
            step4: document.getElementById('step-4')
        };
        clientDetailsPanel = document.getElementById('client-details-panel');
    }
    
    // Função auxiliar para formatar duração
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
    
    // Mostrar formulário de novo plano de ação
    function showActionPlanForm() {
        // Limpar formulário
        actionPlanForm.reset();
        selectedDocuments = [];
        updateSelectedDocumentsList();
        
        // Carregar documentos disponíveis
        loadAvailableDocuments();
        
        // Mostrar apenas o formulário de plano de ação (estado exclusivo)
        showOnlySection('action-plan-container');
        
        // Scroll automático para o formulário
        scrollToElement('action-plan-container');
    }
    
    // Carregar documentos disponíveis (transcrições e análises)
    async function loadAvailableDocuments() {
        if (!currentClientId) return;
        
        try {
            // Carregar transcrições usando safeFetch
            const transcriptions = await safeFetch(`/api/transcricoes/cliente/${currentClientId}`);
            if (transcriptions !== null) {
                // Extrair dados do wrapper da API se presente
                const transcriptionsArray = Array.isArray(transcriptions) ? transcriptions : (transcriptions?.data || []);
                renderAvailableTranscriptions(transcriptionsArray);
            }
            
            // Carregar análises usando safeFetch
            const analyses = await safeFetch(`/api/analises/cliente/${currentClientId}`);
            if (analyses !== null) {
                // Extrair dados do wrapper da API se presente
                const analysesArray = Array.isArray(analyses) ? analyses : (analyses?.data || []);
                renderAvailableAnalyses(analysesArray);
            }
            
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
        }
    }
    
    // Renderizar transcrições disponíveis
    function renderAvailableTranscriptions(transcriptions) {
        if (!transcriptions.length) {
            availableTranscriptions.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma transcrição disponível</p>
                </div>
            `;
            return;
        }
        
        // Filtrar apenas transcrições concluídas
        const completedTranscriptions = transcriptions.filter(t => !t.emProgresso && !t.erro);
        
        if (!completedTranscriptions.length) {
            availableTranscriptions.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma transcrição concluída disponível</p>
                </div>
            `;
            return;
        }
        
        availableTranscriptions.innerHTML = completedTranscriptions.map(transcription => `
            <div class="document-item" data-id="${transcription._id}" data-type="transcription">
                <div class="document-item-content">
                    <div class="document-item-title">${transcription.titulo}</div>
                    <div class="document-item-meta">
                        <span>${new Date(transcription.dataCriacao).toLocaleDateString('pt-BR')}</span>
                        <span>${formatDuration(transcription.duracao)}</span>
                    </div>
                </div>
                <div class="document-item-checkbox"></div>
            </div>
        `).join('');
        
        // Adicionar eventos de clique
        availableTranscriptions.querySelectorAll('.document-item').forEach(item => {
            item.addEventListener('click', () => toggleDocumentSelection(item));
        });
    }
    
    // Renderizar análises disponíveis
    function renderAvailableAnalyses(analyses) {
        if (!analyses.length) {
            availableAnalyses.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma análise disponível</p>
                </div>
            `;
            return;
        }
        
        // Filtrar apenas análises concluídas (mesmo tratamento que as transcrições)
        const completedAnalyses = analyses.filter(a => !a.emProgresso && !a.erro);
        
        if (!completedAnalyses.length) {
            availableAnalyses.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma análise concluída disponível</p>
                </div>
            `;
            return;
        }
        
        availableAnalyses.innerHTML = completedAnalyses.map(analysis => `
            <div class="document-item" data-id="${analysis._id}" data-type="analysis">
                <div class="document-item-content">
                    <div class="document-item-title">Análise de Mercado e Estratégia</div>
                    <div class="document-item-meta">
                        <span>${new Date(analysis.dataCriacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
                <div class="document-item-checkbox"></div>
            </div>
        `).join('');
        
        // Adicionar eventos de clique
        availableAnalyses.querySelectorAll('.document-item').forEach(item => {
            item.addEventListener('click', () => toggleDocumentSelection(item));
        });
    }
    
    // Alternar seleção de documento
    function toggleDocumentSelection(item) {
        const id = item.dataset.id;
        const type = item.dataset.type;
        const title = item.querySelector('.document-item-title').textContent;
        
        // Verificar se já está selecionado
        const existingIndex = selectedDocuments.findIndex(doc => doc.id === id);
        
        if (existingIndex >= 0) {
            // Remover da seleção
            selectedDocuments.splice(existingIndex, 1);
            item.classList.remove('selected');
        } else {
            // Adicionar à seleção
            selectedDocuments.push({ id, type, title });
            item.classList.add('selected');
        }
        
        // Atualizar lista de documentos selecionados
        updateSelectedDocumentsList();
        
        // Atualizar estado do botão de envio
        updateSubmitButtonState();
    }
    
    // Atualizar lista de documentos selecionados
    function updateSelectedDocumentsList() {
        if (!selectedDocuments.length) {
            selectedDocumentsList.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-hand-pointer"></i>
                    <p>Selecione pelo menos um documento acima</p>
                </div>
            `;
            return;
        }
        
        selectedDocumentsList.innerHTML = selectedDocuments.map(doc => `
            <div class="selected-item">
                <div class="selected-item-content">
                    <div class="selected-item-title">${doc.title}</div>
                    <div class="selected-item-type">${doc.type === 'transcription' ? 'Transcrição' : 'Análise'}</div>
                </div>
                <button class="remove-selected-btn" data-id="${doc.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        // Adicionar eventos para remover documentos
        selectedDocumentsList.querySelectorAll('.remove-selected-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                removeDocumentFromSelection(id);
            });
        });
    }
    
    // Remover documento da seleção
    function removeDocumentFromSelection(id) {
        // Remover da lista de selecionados
        selectedDocuments = selectedDocuments.filter(doc => doc.id !== id);
        
        // Remover classe selected do item na lista de disponíveis
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.classList.remove('selected');
        }
        
        // Atualizar listas
        updateSelectedDocumentsList();
        updateSubmitButtonState();
    }
    
    // Atualizar estado do botão de envio
    function updateSubmitButtonState() {
        const hasTitle = actionPlanTitleInput.value.trim().length > 0;
        const hasDocuments = selectedDocuments.length > 0;
        
        startActionPlanBtn.disabled = !(hasTitle && hasDocuments);
    }
    
    // Carregar planos de ação do cliente
    async function loadClientActionPlans(clientId) {
        try {
            const actionPlans = await safeFetch(`/api/planos-acao/${clientId}`);
            
            // Se safeFetch retornou null (redirecionamento), não continuar
            if (actionPlans === null) return;
            
            if (!actionPlans.length) {
                actionPlansList.innerHTML = `
                    <div class="action-plans-list-empty">
                        <i class="fas fa-tasks"></i>
                        <p>Nenhum plano de ação criado</p>
                    </div>
                `;
                return;
            }
            
            // Ordenar por data (mais recente primeiro)
            actionPlans.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
            
            // Renderizar lista
            actionPlansList.innerHTML = actionPlans.map(plan => {
                let statusClass = 'completed';
                let statusText = 'Concluído';
                
                if (plan.emProgresso) {
                    statusClass = 'in-progress';
                    statusText = 'Em progresso';
                } else if (plan.erro) {
                    statusClass = 'error';
                    statusText = 'Erro';
                }
                
                // Calcular total de documentos de forma segura
                const documentosBase = plan.documentosBase || { transcricoes: [], analises: [] };
                const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
                
                return `
                    <div class="action-plan-item ${statusClass}" data-id="${plan._id}">
                        <div class="action-plan-item-content">
                            <div class="action-plan-date">
                                ${new Date(plan.dataCriacao).toLocaleDateString('pt-BR')}
                            </div>
                            <div class="action-plan-title">${plan.titulo}</div>
                            <div class="action-plan-meta">
                                <span><i class="fas fa-file-alt"></i> ${totalDocumentos} documento(s)</span>
                                <span class="action-plan-status ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        <div class="action-plan-item-actions">
                            <button class="delete-action-plan-btn" data-id="${plan._id}" title="Excluir plano de ação">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Adicionar eventos de clique
            actionPlansList.querySelectorAll('.action-plan-item').forEach(item => {
                const content = item.querySelector('.action-plan-item-content');
                content.addEventListener('click', () => {
                    const planId = item.dataset.id;
                    viewActionPlan(planId);
                });
            });
            
            // Adicionar eventos para botões de delete
            actionPlansList.querySelectorAll('.delete-action-plan-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const planId = btn.dataset.id;
                    deleteActionPlan(planId);
                });
            });
            
        } catch (error) {
            console.error('Erro ao carregar planos de ação:', error);
            actionPlansList.innerHTML = `
                <div class="action-plans-list-empty">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erro ao carregar planos de ação. Tente novamente.</p>
                </div>
            `;
        }
    }
    
    // Visualizar plano de ação
    async function viewActionPlan(planId) {
        try {
            const response = await fetch(`/api/planos-acao/plano/${planId}`);
            if (!response.ok) {
                throw new Error('Erro ao carregar plano de ação');
            }
            
            const plan = await response.json();
            currentActionPlanData = plan;
            
            // Preencher dados do plano
            actionPlanTitleDisplay.textContent = plan.titulo;
            actionPlanDate.textContent = new Date(plan.dataCriacao).toLocaleString('pt-BR');
            
            // Calcular total de documentos de forma segura
            const documentosBase = plan.documentosBase || { transcricoes: [], analises: [] };
            const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
            actionPlanDocumentsCount.textContent = `${totalDocumentos} documento(s)`;
            
            // Exibir conteúdo do plano
            actionPlanText.innerHTML = `<div class="markdown-content">${formatMarkdownForActionPlan(plan.conteudo)}</div>`;
            
            // Configurar botões baseado na disponibilidade do PDF
            if (plan.pdfUrl) {
                exportActionPlanPdfBtn.disabled = false;
                exportActionPlanPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Abrir Relatório PDF';
                
                // Criar preview do PDF similar às análises
                const pdfPreview = document.createElement('div');
                pdfPreview.className = 'pdf-preview-section';
                pdfPreview.innerHTML = `
                    <div class="pdf-ready">
                        <div class="pdf-icon">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <h3>Relatório PDF Pronto</h3>
                        <p>Seu plano de ação estratégico foi gerado com sucesso e está pronto para visualização.</p>
                        <button class="open-pdf-btn" onclick="window.open('/api/planos-acao/pdf/${plan._id}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Abrir Relatório PDF
                        </button>
                        <div class="pdf-info">
                            <small><i class="fas fa-info-circle"></i> O PDF será aberto em uma nova aba do navegador</small>
                        </div>
                    </div>
                `;
                
                // Inserir preview após o conteúdo do plano
                actionPlanText.parentNode.insertBefore(pdfPreview, actionPlanText.nextSibling);
            } else {
                exportActionPlanPdfBtn.disabled = true;
                exportActionPlanPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF Indisponível';
                
                // Remover preview anterior se existir
                const existingPreview = document.querySelector('.pdf-preview-section');
                if (existingPreview) {
                    existingPreview.remove();
                }
            }
            
            // Mostrar apenas a seção de resultado do plano de ação
            showOnlySection('action-plan-result-container');
            
            // Scroll automático
            scrollToElement('action-plan-result-container');
            
        } catch (error) {
            console.error('Erro ao visualizar plano de ação:', error);
            alert('Não foi possível carregar o plano de ação. Tente novamente.');
        }
    }
    
    // Formatar markdown específico para planos de ação
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
    
    // Deletar plano de ação
    async function deleteActionPlan(planId) {
        if (!confirm('Tem certeza que deseja excluir este plano de ação? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/planos-acao/plano/${planId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao excluir plano de ação');
            }
            
            // Recarregar lista
            if (currentClientId) {
                loadClientActionPlans(currentClientId);
            }
            
            console.log('✅ Plano de ação excluído com sucesso');
            
        } catch (error) {
            console.error('Erro ao excluir plano de ação:', error);
            alert('Não foi possível excluir o plano de ação. Tente novamente.');
        }
    }
    
    // Submeter formulário de plano de ação
    async function submitActionPlanForm(event) {
        event.preventDefault();
        
        if (!actionPlanTitleInput.value.trim()) {
            alert('O título do plano de ação é obrigatório');
            return;
        }
        
        if (!selectedDocuments.length) {
            alert('Selecione pelo menos um documento');
            return;
        }
        
        try {
            // Registrar processo no painel de processos ativos
            const client = window.currentClients.find(c => c._id === currentClientId);
            const processId = activeProcessesManager.registerProcess(
                'plano-acao', 
                currentClientId, 
                `Plano de Ação: ${actionPlanTitleInput.value.trim()}`
            );
            
            // Mostrar tela de carregamento IMEDIATAMENTE
            showOnlySection('loading-container');
            
            // Adaptar interface para plano de ação
            document.querySelector('.loading-text').textContent = 'Gerando plano de ação estratégico...';
            loadingStatus.textContent = 'Preparando análise dos documentos selecionados...';
            
            // Resetar e configurar progresso específico para planos de ação
            resetProgress();
            setupActionPlanProgressSteps();
            
            // Iniciar simulação de progresso imediatamente
            startActionPlanProgressSimulation();
            
            // Preparar dados - separar por tipo conforme esperado pelo backend
            const transcricaoIds = selectedDocuments
                .filter(doc => doc.type === 'transcription')
                .map(doc => doc.id);
            
            const analiseIds = selectedDocuments
                .filter(doc => doc.type === 'analysis')
                .map(doc => doc.id);
            
            const requestData = {
                titulo: actionPlanTitleInput.value.trim(),
                transcricaoIds,
                analiseIds
            };
            
            // Debug: verificar dados sendo enviados
            console.log('🔍 [DEBUG-PLANO-ACAO] Dados enviados:', requestData);
            
            // Enviar requisição
            const response = await fetch(`/api/planos-acao/${currentClientId}/gerar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar plano de ação');
            }
            
            const plan = await response.json();
            
            // Armazenar ID do plano para monitoramento
            window.currentActionPlanId = plan.planoId;
            
            // Iniciar monitoramento do progresso real
            startActionPlanMonitoring(plan.planoId);
            
        } catch (error) {
            console.error('Erro ao criar plano de ação:', error);
            showError(error.message || 'Ocorreu um erro ao criar o plano de ação.');
        }
    }
    
    // Configurar etapas específicas para planos de ação
    function setupActionPlanProgressSteps() {
        document.getElementById('step-1').querySelector('.step-text').textContent = 'Análise de Documentos';
        document.getElementById('step-2').querySelector('.step-text').textContent = 'Processamento IA';
        document.getElementById('step-3').querySelector('.step-text').textContent = 'Geração de Estratégias';
        document.getElementById('step-4').querySelector('.step-text').textContent = 'Finalização';
    }
    
    // Iniciar simulação de progresso para planos de ação
    function startActionPlanProgressSimulation() {
        // Adicionar informações específicas sobre o processo
        const infoElement = document.createElement('div');
        infoElement.className = 'action-plan-progress-info';
        infoElement.style.cssText = `
            margin: 20px 0;
            padding: 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            border-left: 4px solid #28a745;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        infoElement.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <i class="fas fa-brain" style="color: #28a745; margin-right: 8px;"></i>
                <strong>Processamento Inteligente em Andamento</strong>
            </div>
            <p style="margin: 0; color: #6c757d;">
                Nossa IA está analisando os documentos selecionados para criar um plano de ação estratégico personalizado. 
                Este processo pode levar alguns minutos para garantir a máxima qualidade e relevância.
            </p>
            <div style="margin-top: 10px; padding: 8px; background: #d1ecf1; border-radius: 4px; border: 1px solid #bee5eb;">
                <small style="color: #0c5460;">
                    <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                    <strong>Tempo estimado:</strong> 2-5 minutos dependendo da quantidade de conteúdo a ser analisado.
                </small>
            </div>
        `;
        
        // Inserir após a barra de progresso
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer && !progressContainer.querySelector('.action-plan-progress-info')) {
            progressContainer.appendChild(infoElement);
        }
        
        // Simular progresso inicial mais lento e realista
        const progressSteps = [
            { percentage: 15, message: 'Carregando documentos selecionados...', step: 1, stepStatus: 'active', delay: 1000 },
            { percentage: 35, message: 'Analisando conteúdo com IA...', step: 2, stepStatus: 'active', delay: 2000 },
            { percentage: 60, message: 'Gerando estratégias personalizadas...', step: 3, stepStatus: 'active', delay: 3000 },
            { percentage: 85, message: 'Finalizando plano de ação...', step: 4, stepStatus: 'active', delay: 2000 }
        ];
        
        let currentStep = 0;
        
        function executeNextStep() {
            if (currentStep < progressSteps.length) {
                const step = progressSteps[currentStep];
                updateProgress(step);
                currentStep++;
                
                setTimeout(executeNextStep, step.delay);
            }
            // Não completar automaticamente - aguardar resposta real do servidor
        }
        
        // Iniciar após pequeno delay para dar sensação de início
        setTimeout(executeNextStep, 500);
    }
    
    // Monitorar progresso real do plano de ação
    function startActionPlanMonitoring(planId) {
        // Verificar status a cada 5 segundos
        const checkInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/planos-acao/plano/${planId}`);
                if (!response.ok) {
                    console.error('Erro ao verificar status do plano de ação');
                    return;
                }
                
                const plan = await response.json();
                
                // Se não está mais em progresso
                if (!plan.emProgresso) {
                    clearInterval(checkInterval);
                    
                    if (plan.erro) {
                        // Mostrar erro
                        showError(plan.mensagemErro || 'Erro ao gerar plano de ação');
                    } else {
                        // Completar progresso e mostrar resultado
                        updateProgress({
                            percentage: 100,
                            message: 'Plano de ação concluído com sucesso!',
                            step: 4,
                            stepStatus: 'completed'
                        });
                        
                        // Aguardar 2 segundos antes de mostrar resultado
                        setTimeout(() => {
                            // Recarregar lista de planos de ação
                            loadClientActionPlans(currentClientId);
                            
                            // Mostrar o plano criado automaticamente
                            viewActionPlan(planId);
                        }, 2000);
                    }
                }
                
            } catch (error) {
                console.error('Erro ao monitorar plano de ação:', error);
            }
        }, 5000); // Verificar a cada 5 segundos
        
        // Timeout de segurança (10 minutos)
        setTimeout(() => {
            clearInterval(checkInterval);
            if (document.getElementById('loading-container').style.display !== 'none') {
                showError('Timeout: O plano de ação está demorando mais que o esperado. Verifique a lista de planos de ação em alguns minutos.');
            }
        }, 600000); // 10 minutos
    }
    
    // Configurar eventos para planos de ação
    function setupActionPlanEvents() {
        // Botão de novo plano de ação
        if (newActionPlanBtn) {
            newActionPlanBtn.addEventListener('click', showActionPlanForm);
        }
        
        // Cancelar plano de ação
        if (cancelActionPlanBtn) {
            cancelActionPlanBtn.addEventListener('click', () => {
                actionPlanContainer.style.display = 'none';
                
                if (currentClientId) {
                    clientDetailsPanel.style.display = 'block';
                } else {
                    welcomeContainer.style.display = 'block';
                }
            });
        }
        
        // Submeter formulário
        if (actionPlanForm) {
            actionPlanForm.addEventListener('submit', submitActionPlanForm);
        }
        
        // Monitorar mudanças no título
        if (actionPlanTitleInput) {
            actionPlanTitleInput.addEventListener('input', updateSubmitButtonState);
        }
        
        // Voltar do resultado para detalhes do cliente
        if (backToClientFromPlanBtn) {
            backToClientFromPlanBtn.addEventListener('click', () => {
                actionPlanResultContainer.style.display = 'none';
                clientDetailsPanel.style.display = 'block';
            });
        }
        
        // Copiar plano de ação
        if (copyActionPlanBtn) {
            copyActionPlanBtn.addEventListener('click', () => {
                if (!currentActionPlanData) return;
                
                // Calcular total de documentos de forma segura
                const documentosBase = currentActionPlanData.documentosBase || { transcricoes: [], analises: [] };
                const totalDocumentos = (documentosBase.transcricoes?.length || 0) + (documentosBase.analises?.length || 0);
                
                // Criar lista detalhada dos documentos utilizados
                let documentosInfo = '';
                if (documentosBase.transcricoes?.length > 0) {
                    documentosInfo += `\nTranscrições utilizadas: ${documentosBase.transcricoes.length}`;
                }
                if (documentosBase.analises?.length > 0) {
                    documentosInfo += `\nAnálises utilizadas: ${documentosBase.analises.length}`;
                }
                
                const planContent = `PLANO DE AÇÃO ESTRATÉGICO
${currentActionPlanData.titulo}

Criado em: ${new Date(currentActionPlanData.dataCriacao).toLocaleString('pt-BR')}
Total de documentos base: ${totalDocumentos}${documentosInfo}

${'-'.repeat(50)}

${currentActionPlanData.conteudo}`;
                
                navigator.clipboard.writeText(planContent)
                    .then(() => {
                        const originalText = copyActionPlanBtn.innerHTML;
                        copyActionPlanBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                        
                        setTimeout(() => {
                            copyActionPlanBtn.innerHTML = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Erro ao copiar: ', err);
                    });
            });
        }
        
        // Exportar PDF do plano de ação
        if (exportActionPlanPdfBtn) {
            exportActionPlanPdfBtn.addEventListener('click', () => {
                if (!currentActionPlanData || !currentActionPlanData.pdfUrl) return;
                
                // Abrir PDF em nova aba
                window.open(`/api/planos-acao/pdf/${currentActionPlanData._id}`, '_blank');
            });
        }
    }
    
    // Inicializar módulo
    function init(config) {
        // Armazenar referências a funções e variáveis externas
        currentClientId = config.currentClientId;
        safeFetch = config.safeFetch;
        showOnlySection = config.showOnlySection;
        scrollToElement = config.scrollToElement;
        updateProgress = config.updateProgress;
        showError = config.showError;
        resetProgress = config.resetProgress;
        activeProcessesManager = config.activeProcessesManager;
        
        // Inicializar elementos DOM
        initElements();
        
        // Configurar eventos
        setupActionPlanEvents();
        
        console.log('✅ Módulo de Planos de Ação inicializado');
    }
    
    // API pública do módulo
    const actionPlanManager = {
        init,
        showActionPlanForm,
        loadClientActionPlans,
        viewActionPlan
    };
    
    // Exportar módulo
    window.actionPlanManager = actionPlanManager;
    
})(window);
