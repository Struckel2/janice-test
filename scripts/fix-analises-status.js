/**
 * Script para corrigir análises que estão com status emProgresso: true incorretamente
 * 
 * Este script verifica todas as análises no banco de dados e corrige aquelas
 * que estão marcadas como em progresso, mas que já deveriam estar concluídas
 * (por exemplo, se já possuem um PDF gerado).
 */

// Carregar variáveis de ambiente
require('dotenv').config();

// Importar dependências
const mongoose = require('mongoose');
const Analise = require('../server/models/Analise');
const progressService = require('../server/services/progressService');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB');
    fixAnalises();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

/**
 * Função principal para corrigir análises
 */
async function fixAnalises() {
  try {
    console.log('\n====== INICIANDO CORREÇÃO DE ANÁLISES ======\n');
    
    // Buscar todas as análises que estão marcadas como em progresso
    const analises = await Analise.find({ emProgresso: true })
      .populate('cliente', 'nome cnpj');
    
    console.log(`🔍 Encontradas ${analises.length} análises marcadas como em progresso`);
    
    if (analises.length === 0) {
      console.log('✅ Nenhuma análise para corrigir');
      await mongoose.disconnect();
      return;
    }
    
    // Contador de análises corrigidas
    let corrigidas = 0;
    
    // Processar cada análise
    for (const analise of analises) {
      console.log(`\n----- Processando análise ${analise._id} -----`);
      console.log(`CNPJ: ${analise.cnpj}`);
      console.log(`Cliente: ${analise.cliente ? analise.cliente.nome : 'N/A'}`);
      console.log(`Data de criação: ${analise.dataCriacao}`);
      
      // Verificar se a análise já tem conteúdo e PDF (indicando que está concluída)
      const estaConcluida = analise.conteudo && 
                           analise.conteudo !== 'Análise em andamento...' &&
                           analise.pdfUrl;
      
      if (estaConcluida) {
        console.log('🔧 Esta análise parece estar concluída, mas está marcada como em progresso');
        
        // Atualizar a análise para marcar como concluída
        analise.emProgresso = false;
        
        // Se não tiver data de expiração, definir para 30 dias a partir de hoje
        if (!analise.dataExpiracao) {
          const dataExpiracao = new Date();
          dataExpiracao.setDate(dataExpiracao.getDate() + 30);
          analise.dataExpiracao = dataExpiracao;
          console.log(`📅 Definida data de expiração: ${dataExpiracao}`);
        }
        
        // Salvar as alterações
        await analise.save();
        console.log('✅ Análise atualizada com sucesso');
        
        // Criar um processo temporário e marcá-lo como concluído para garantir
        // que o frontend seja notificado corretamente
        if (analise.cliente && analise.cliente._id) {
          const tempProcessId = `temp_fix_${analise._id}`;
          
          // Registrar processo temporário
          progressService.registerActiveProcess('sistema', {
            id: tempProcessId,
            tipo: 'analise',
            titulo: `Análise CNPJ: ${analise.cnpj}`,
            cliente: { _id: analise.cliente._id }
          }, { nome: 'Sistema', email: 'sistema@janice.app' });
          
          // Marcar imediatamente como concluído
          progressService.completeActiveProcess(tempProcessId, {
            progresso: 100,
            resultado: 'Análise CNPJ concluída com sucesso',
            resourceId: analise._id
          });
          
          // Enviar evento de conclusão via SSE
          progressService.sendCompletionEvent(analise.cliente._id, {
            percentage: 100,
            message: 'Análise concluída com sucesso!',
            step: 4,
            stepStatus: 'completed',
            pdfUrl: analise.pdfUrl
          });
          
          console.log('📣 Eventos de conclusão enviados');
        }
        
        corrigidas++;
      } else {
        console.log('⚠️ Esta análise parece estar realmente em progresso ou com erro');
        
        // Se o conteúdo for "Análise em andamento..." mas a análise é antiga (mais de 30 minutos),
        // provavelmente houve algum erro no processo
        const agora = new Date();
        const tempoDecorrido = agora - analise.dataCriacao;
        const minutosDecorridos = tempoDecorrido / (1000 * 60);
        
        if (minutosDecorridos > 30) {
          console.log(`⏰ Análise em progresso há ${minutosDecorridos.toFixed(1)} minutos`);
          console.log('🔧 Marcando como erro por timeout');
          
          analise.emProgresso = false;
          analise.erro = true;
          analise.mensagemErro = 'Timeout: A análise demorou mais que o esperado';
          
          await analise.save();
          console.log('✅ Análise marcada como erro');
          
          corrigidas++;
        }
      }
    }
    
    console.log(`\n====== CORREÇÃO CONCLUÍDA ======`);
    console.log(`✅ ${corrigidas} análises corrigidas de ${analises.length} verificadas`);
    
    // Desconectar do MongoDB
    await mongoose.disconnect();
    console.log('👋 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir análises:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
