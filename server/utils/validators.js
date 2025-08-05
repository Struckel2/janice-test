/**
 * Funções de validação para o sistema
 */

/**
 * Valida um CNPJ brasileiro
 * @param {string} cnpj - CNPJ para validar, pode estar formatado ou apenas com números
 * @returns {boolean} - true se válido, false se inválido
 */
function validateCNPJ(cnpj) {
  console.log('[DEBUG] validateCNPJ - Valor recebido:', cnpj, typeof cnpj);
  
  // Verificar se o CNPJ existe
  if (!cnpj) {
    console.log('[DEBUG] validateCNPJ - CNPJ é undefined ou null');
    return false;
  }
  
  // Remover caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  // Verificar se o CNPJ tem 14 dígitos
  if (cnpj.length !== 14) {
    console.log('[DEBUG] validateCNPJ - CNPJ não tem 14 dígitos:', cnpj.length);
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 2;
  
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let digito = 11 - (soma % 11);
  if (digito > 9) {
    digito = 0;
  }
  
  if (parseInt(cnpj.charAt(12)) !== digito) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  peso = 2;
  
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  digito = 11 - (soma % 11);
  if (digito > 9) {
    digito = 0;
  }
  
  if (parseInt(cnpj.charAt(13)) !== digito) {
    return false;
  }
  
  console.log('[DEBUG] validateCNPJ - CNPJ válido:', cnpj);
  return true;
}

/**
 * Valida um e-mail
 * @param {string} email - E-mail para validar
 * @returns {boolean} - true se válido, false se inválido
 */
function validateEmail(email) {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
}

/**
 * Valida uma senha
 * @param {string} password - Senha para validar
 * @returns {object} - Resultado da validação: {valid: boolean, message: string}
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { 
      valid: false, 
      message: 'A senha deve ter pelo menos 8 caracteres' 
    };
  }
  
  // Verificar se a senha tem pelo menos um número
  if (!/\d/.test(password)) {
    return { 
      valid: false, 
      message: 'A senha deve conter pelo menos um número' 
    };
  }
  
  // Verificar se a senha tem pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) {
    return { 
      valid: false, 
      message: 'A senha deve conter pelo menos uma letra maiúscula' 
    };
  }
  
  // Verificar se a senha tem pelo menos uma letra minúscula
  if (!/[a-z]/.test(password)) {
    return { 
      valid: false, 
      message: 'A senha deve conter pelo menos uma letra minúscula' 
    };
  }
  
  return { valid: true, message: 'Senha válida' };
}

module.exports = {
  validateCNPJ,
  validateEmail,
  validatePassword
};
