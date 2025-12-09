// Configurações globais
const CONFIG = {
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 1000,
};

// Sistema de logging
const logger = {
  debug: (message, ...args) => {
    if (['debug'].includes(CONFIG.LOG_LEVEL)) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  },
  info: (message, ...args) => {
    if (['debug', 'info'].includes(CONFIG.LOG_LEVEL)) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    if (['debug', 'info', 'warn'].includes(CONFIG.LOG_LEVEL)) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }
};

// ✅ Função delay principal
export const delay = (ms) => {
  logger.debug(`Aguardando ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Alias para delay
export const sleep = delay;

// Função para retry com backoff exponencial
export const retryWithBackoff = async (
  fn,
  maxRetries = CONFIG.DEFAULT_RETRY_ATTEMPTS,
  baseDelay = CONFIG.DEFAULT_RETRY_DELAY,
  operationName = 'Operation'
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`${operationName} - Tentativa ${attempt}/${maxRetries}`);
      const result = await fn();
      logger.info(`${operationName} - Sucesso na tentativa ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      logger.warn(`${operationName} - Falha na tentativa ${attempt}:`, error.message);

      // Se é a última tentativa, não esperar
      if (attempt === maxRetries) {
        break;
      }

      // Calcular delay com backoff exponencial
      const delayTime = baseDelay * Math.pow(2, attempt - 1);
      logger.info(`${operationName} - Aguardando ${delayTime}ms antes da próxima tentativa...`);

      await delay(delayTime);
    }
  }

  logger.error(`${operationName} - Falhou após ${maxRetries} tentativas`);
  throw lastError;
};

// Retry com backoff estendido (mais tentativas / maior baseDelay)
export const retryWithExtendedBackoff = async (
  fn,
  maxRetries = Math.max(CONFIG.DEFAULT_RETRY_ATTEMPTS, 6),
  baseDelay = Math.max(CONFIG.DEFAULT_RETRY_DELAY, 2000),
  operationName = 'ExtendedOperation'
) => {
  console.log('🟡 Entrou no retryWithExtendedBackoff', { fn, maxRetries, baseDelay, operationName });
  return retryWithBackoff(fn, maxRetries, baseDelay, operationName);
};

// Função para debounce
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Função para throttle
export const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Função para timeout de Promise
export const withTimeout = (promise, timeoutMs = CONFIG.DEFAULT_TIMEOUT, errorMessage = 'Operation timed out') => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

// Função para formatar tempo
export const formatDelay = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
};

// Função para delay progressivo
export const progressiveDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const delayTime = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  logger.debug(`Delay progressivo para tentativa ${attempt}: ${formatDelay(delayTime)}`);
  return delayTime;
};

// Exportar configurações e logger para uso externo
export { CONFIG, logger };