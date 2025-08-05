const PDFDocument = require('pdfkit');
const { uploadPDF } = require('../config/cloudinary');

/**
 * Gera um arquivo PDF genérico com o conteúdo fornecido e faz upload para o Cloudinary
 * @param {Object} options - Opções para geração do PDF
 * @param {string} options.filename - Nome do arquivo (sem extensão)
 * @param {string} options.title - Título do documento
 * @param {string} options.content - Conteúdo do documento
 * @param {string} options.folder - Pasta no Cloudinary
 * @returns {string} - URL do PDF no Cloudinary
 */
async function generateGenericPDF(options) {
  const { filename, title, content, folder } = options;
  
  try {
    console.log(`\n----- GERANDO PDF GENÉRICO: ${filename} -----`);
    
    // Cria o documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: title,
        Author: 'Janice Analyzer',
        Subject: 'Documento Gerado pelo Sistema',
        Keywords: 'análise, relatório, documento'
      }
    });
    
    // Criar buffer para armazenar o PDF em memória
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Adiciona conteúdo ao PDF
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown();
    doc.moveDown();
    
    // Adiciona o conteúdo
    doc.fontSize(11).font('Helvetica');
    
    // Processa o texto para identificar títulos e melhorar formatação
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Pular linhas vazias
      if (line === '') {
        doc.moveDown();
        continue;
      }
      
      // Títulos principais (# Título)
      if (line.startsWith('# ')) {
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text(line.substring(2), { align: 'left' });
        doc.moveDown();
      }
      // Subtítulos (## Subtítulo)
      else if (line.startsWith('## ')) {
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text(line.substring(3), { align: 'left' });
        doc.moveDown();
      }
      // Subtítulos nível 3 (### Subtítulo)
      else if (line.startsWith('### ')) {
        doc.fontSize(11).font('Helvetica-Bold').text(line.substring(4), { align: 'left' });
        doc.moveDown();
      }
      // Itens de lista (- Item)
      else if (line.startsWith('- ')) {
        doc.fontSize(11).font('Helvetica').text(`• ${line.substring(2)}`, { align: 'left', indent: 20 });
      }
      // Texto normal
      else {
        doc.fontSize(11).font('Helvetica').text(line, { align: 'left' });
      }
    }
    
    // Finaliza o documento
    doc.end();
    
    // Retorna uma Promise que resolve quando o PDF estiver pronto
    return new Promise(async (resolve, reject) => {
      doc.on('end', async () => {
        try {
          // Combinar todos os buffers em um único buffer
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`PDF gerado em memória (${pdfBuffer.length} bytes)`);
          
          // Fazer upload para o Cloudinary
          console.log(`Fazendo upload do PDF para o Cloudinary na pasta: ${folder}`);
          const uploadResult = await uploadPDF(pdfBuffer, {
            folder: folder,
            public_id: filename,
            format: 'pdf'
          });
          
          console.log(`PDF enviado para Cloudinary com sucesso: ${uploadResult.secure_url}`);
          resolve(uploadResult.secure_url);
        } catch (error) {
          console.error('Erro ao fazer upload do PDF para Cloudinary:', error);
          reject(error);
        }
      });
      
      doc.on('error', (err) => {
        console.error('Erro ao gerar PDF:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error(`Falha ao gerar PDF: ${error.message}`);
  }
}

/**
 * Gera um arquivo PDF com o conteúdo da análise e faz upload para o Cloudinary
 * FUNÇÃO MANTIDA PARA COMPATIBILIDADE COM ANÁLISES EXISTENTES
 * @param {string} cnpj - CNPJ formatado da empresa
 * @param {string} analysis - Texto da análise completa
 * @returns {string} - URL do PDF no Cloudinary
 */
async function generatePDF(cnpj, analysis) {
  // Define o nome do arquivo com o CNPJ e timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `analise_${cnpj.replace(/[^0-9]/g, '')}_${timestamp}`;
  
  // Usar a função genérica com parâmetros específicos para análises
  return generateGenericPDF({
    filename: filename,
    title: `ANÁLISE DE MERCADO - CNPJ ${cnpj}`,
    content: analysis,
    folder: 'janice/analises'
  });
}

module.exports = {
  generatePDF,
  generateGenericPDF
};
