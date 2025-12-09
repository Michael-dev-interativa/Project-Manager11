export const retryWithBackoff = async (fn, retries = 3, delayMs = 2000, context = 'default') => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // **MELHORADO**: Detectar mais tipos de erro de rede e rate limit
      const isNetworkError = 
        String(error.message).includes("429") || 
        String(error.message).includes("Rate limit") ||
        String(error.message).includes("500") ||
        String(error.message).includes("502") ||
        String(error.message).includes("503") ||
        String(error.message).includes("504") ||
        String(error.message).includes("Network Error") ||
        String(error.message).includes("Failed to fetch") ||
        String(error.message).includes("timeout") ||
        String(error.message).includes("ReplicaSetNoPrimary") ||
        error.name === 'NetworkError' ||
        error.code === 'NETWORK_ERROR';
      
      const isRateLimit = String(error.message).includes("429") || String(error.message).includes("Rate limit");
      
      if (i === retries - 1 || !isNetworkError) {
        console.error(`❌ [${context}] Tentativa final falhou ou erro não recuperável:`, error.message);
        throw error;
      }
      
      // **MELHORADO**: Backoff mais agressivo para rate limit
      let backoffDelay;
      
      if (isRateLimit) {
        // Para rate limit, usar delays muito maiores e mais aleatórios
        backoffDelay = Math.min(30000, delayMs * Math.pow(3, i) + Math.random() * 5000); // Até 30 segundos
        console.warn(`🚫 [${context}] Rate limit atingido na tentativa ${i + 1}/${retries}. Aguardando ${Math.round(backoffDelay/1000)}s antes da próxima tentativa...`);
      } else {
        // Para outros erros de rede, usar backoff normal
        backoffDelay = delayMs * Math.pow(1.5, i) + Math.random() * 1000;
        console.warn(`⚠️ [${context}] Tentativa ${i + 1}/${retries} falhou (${error.message}). Nova tentativa em ${Math.round(backoffDelay/1000)}s...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

// **NOVO**: Função com backoff estendido para operações críticas
export const retryWithExtendedBackoff = async (fn, context = 'default') => {
  const maxRetries = 5;
  const baseDelay = 3000; // 3 segundos iniciais
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isNetworkError = 
        String(error.message).includes("429") || 
        String(error.message).includes("Rate limit") ||
        String(error.message).includes("500") ||
        String(error.message).includes("502") ||
        String(error.message).includes("503") ||
        String(error.message).includes("504") ||
        String(error.message).includes("Network Error") ||
        String(error.message).includes("Failed to fetch") ||
        String(error.message).includes("timeout") ||
        String(error.message).includes("ReplicaSetNoPrimary") ||
        error.name === 'NetworkError' ||
        error.code === 'NETWORK_ERROR';
      
      const isRateLimit = String(error.message).includes("429") || String(error.message).includes("Rate limit");
      
      if (i === maxRetries - 1 || !isNetworkError) {
        console.error(`❌ [${context}] Tentativa final com backoff estendido falhou:`, error.message);
        throw error;
      }
      
      // Backoff muito agressivo para operações críticas
      let backoffDelay;
      
      if (isRateLimit) {
        // Para rate limit, usar delays exponenciais muito grandes
        backoffDelay = Math.min(60000, baseDelay * Math.pow(4, i) + Math.random() * 10000); // Até 60 segundos
        console.warn(`🚫 [${context}] Rate limit (backoff estendido) na tentativa ${i + 1}/${maxRetries}. Aguardando ${Math.round(backoffDelay/1000)}s...`);
      } else {
        // Para outros erros, usar backoff estendido
        backoffDelay = baseDelay * Math.pow(2, i) + Math.random() * 2000;
        console.warn(`⚠️ [${context}] Tentativa ${i + 1}/${maxRetries} (backoff estendido) falhou. Nova tentativa em ${Math.round(backoffDelay/1000)}s...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));