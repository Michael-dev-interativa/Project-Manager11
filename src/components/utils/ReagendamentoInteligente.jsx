
import { format, addDays, parseISO, isValid, startOfDay } from 'date-fns';
import { getNextWorkingDay, isWorkingDay, distribuirHorasPorDias } from './DateCalculator';

// Função para analisar a carga horária por usuário em todos os dias
export const analisarCargaPorUsuario = (planejamentos) => {
  const cargaPorUsuario = {};
  
  planejamentos.forEach(plano => {
    const usuario = plano.executor_principal;
    if (!usuario || !plano.horas_por_dia) return;
    
    if (!cargaPorUsuario[usuario]) {
      cargaPorUsuario[usuario] = {};
    }
    
    Object.entries(plano.horas_por_dia).forEach(([data, horas]) => {
      if (horas > 0) {
        cargaPorUsuario[usuario][data] = (cargaPorUsuario[usuario][data] || 0) + horas;
      }
    });
  });
  
  return cargaPorUsuario;
};

// Função para encontrar o próximo slot disponível para um usuário
export const encontrarProximoSlotDisponivel = (usuario, dataInicio, horasNecessarias, cargaPorUsuario, horasPorDia = 8) => {
  let dataAtual = new Date(dataInicio);
  let horasRestantes = horasNecessarias;
  const distribuicao = {};
  
  while (horasRestantes > 0) {
    // Pular fins de semana
    while (!isWorkingDay(dataAtual)) {
      dataAtual = addDays(dataAtual, 1);
    }
    
    const dayKey = format(dataAtual, 'yyyy-MM-dd');
    const cargaExistente = cargaPorUsuario[usuario]?.[dayKey] || 0;
    const capacidadeDisponivel = Math.max(0, horasPorDia - cargaExistente);
    
    if (capacidadeDisponivel > 0) {
      const horasParaEsseDia = Math.min(horasRestantes, capacidadeDisponivel);
      distribuicao[dayKey] = horasParaEsseDia;
      horasRestantes -= horasParaEsseDia;
      
      // Atualizar a carga para próximas verificações
      if (!cargaPorUsuario[usuario]) cargaPorUsuario[usuario] = {};
      cargaPorUsuario[usuario][dayKey] = (cargaPorUsuario[usuario][dayKey] || 0) + horasParaEsseDia;
    }
    
    dataAtual = addDays(dataAtual, 1);
  }
  
  return {
    distribuicao,
    dataTermino: addDays(dataAtual, -1) // Volta um dia porque incrementou depois do último uso
  };
};

// **CORREÇÃO**: Função de reagendamento para otimizar o preenchimento dos dias
export const reagendarComCascata = (todosOsPlanejamentos) => {
  const hoje = new Date();
  const hojeKey = format(hoje, 'yyyy-MM-dd');
  const proximoDiaUtil = getNextWorkingDay(hoje);
  
  console.log('🔄 Iniciando reagendamento inteligente (com otimização de preenchimento)...');
  
  // 1. Identificar atividades atrasadas
  const atividadesAtrasadas = todosOsPlanejamentos.filter(p => {
    if (p.status === 'concluido') return false;
    const targetDate = p.termino_ajustado || p.termino_planejado;
    if (!targetDate) return false;
    try {
      // Considera atrasado se a data de término for anterior a hoje
      return startOfDay(parseISO(targetDate)) < startOfDay(hoje);
    } catch {
      return false;
    }
  });

  // 2. Identificar atividades que estavam planejadas para hoje
  const atividadesDeHojeParaMover = todosOsPlanejamentos.filter(p => 
      p.horas_por_dia?.[hojeKey] > 0 &&
      !atividadesAtrasadas.some(at => at.id === p.id) &&
      p.status !== 'concluido'
  );
  
  const atividadesParaReagendar = [...atividadesAtrasadas, ...atividadesDeHojeParaMover];

  console.log(`📊 Encontradas ${atividadesAtrasadas.length} atividades atrasadas e ${atividadesDeHojeParaMover.length} atividades de hoje para mover.`);
  
  if (atividadesParaReagendar.length === 0) {
    console.log("✅ Nenhuma atividade para reagendar. Finalizando.");
    return { atualizacoes: [], resumo: {} };
  }

  // 3. Analisar carga de trabalho dos planejamentos que NÃO serão movidos
  const planejamentosFixos = todosOsPlanejamentos.filter(p => 
    !atividadesParaReagendar.some(at => at.id === p.id)
  );
  const cargaPorUsuario = analisarCargaPorUsuario(planejamentosFixos);
  
  // 4. Agrupar todas as atividades para reagendar por usuário
  const atividadesAgrupadasPorUsuario = atividadesParaReagendar.reduce((acc, atividade) => {
    const usuario = atividade.executor_principal;
    if (!usuario) return acc;
    if (!acc[usuario]) {
      acc[usuario] = [];
    }
    acc[usuario].push(atividade);
    return acc;
  }, {});
  
  // 5. Processar cada usuário individualmente
  const atualizacoes = [];
  
  Object.entries(atividadesAgrupadasPorUsuario).forEach(([usuario, atividadesDoUsuario]) => {
    console.log(`👤 Processando usuário: ${usuario}`);

    // **NOVA LÓGICA**: Ordenar por data de término original e consolidar horas
    const atividadesOrdenadas = [...atividadesDoUsuario].sort((a, b) => { // Use spread to avoid modifying original array
      const dataA = parseISO(a.termino_planejado || a.inicio_planejado);
      const dataB = parseISO(b.termino_planejado || b.inicio_planejado);
      return dataA - dataB;
    });

    atividadesOrdenadas.forEach(atividade => {
      // Calcular horas necessárias (se for de hoje, só as de hoje; se atrasada, as restantes)
      let horasNecessarias = 0;
      if (atividadesAtrasadas.some(at => at.id === atividade.id)) {
        horasNecessarias = (atividade.tempo_planejado || 0) - (atividade.tempo_real_executado || 0);
      } else { // Atividade de hoje
        horasNecessarias = atividade.horas_por_dia?.[hojeKey] || 0;
      }

      if (horasNecessarias <= 0) return; // Pular se não houver horas a reagendar

      // O ponto de partida é o próximo dia útil, para garantir que as de hoje sejam movidas
      const { distribuicao, dataTermino } = encontrarProximoSlotDisponivel(
        usuario, 
        proximoDiaUtil, 
        horasNecessarias, 
        cargaPorUsuario
      );
      
      const primeiraData = Object.keys(distribuicao)[0];
      atualizacoes.push({
        id: atividade.id,
        executor_principal: usuario,
        dados: {
          horas_por_dia: distribuicao,
          inicio_ajustado: primeiraData,
          termino_ajustado: format(dataTermino, 'yyyy-MM-dd'),
          status: 'nao_iniciado' // Resetar status para não iniciado
        }
      });
    });
  });
  
  console.log(`📋 Preparadas ${atualizacoes.length} atualizações para reagendamento otimizado.`);
  
  return {
    atualizacoes,
    resumo: {
      atividadesReagendadas: atualizacoes.length,
      usuariosAfetados: Object.keys(atividadesAgrupadasPorUsuario).length
    }
  };
};

// **NOVA**: Função para consolidar atividades fragmentadas de um usuário
export const consolidarAtividadesUsuario = (planejamentosUsuario, horasPorDia = 8) => {
  console.log(`🔧 Consolidando ${planejamentosUsuario.length} atividades do usuário...`);
  
  // Agrupar todas as horas por data para este usuário
  const cargaTotalPorDia = {};
  const atividadesPorDia = {}; // Para mapear datas de volta para as atividades
  
  planejamentosUsuario.forEach(plano => {
    // Check if plano.horas_por_dia exists and is an object
    if (!plano.horas_por_dia || typeof plano.horas_por_dia !== 'object') return;
    
    Object.entries(plano.horas_por_dia).forEach(([data, horas]) => {
      // Ensure 'horas' is a number and greater than 0
      if (typeof horas === 'number' && horas > 0) {
        cargaTotalPorDia[data] = (cargaTotalPorDia[data] || 0) + horas;
        if (!atividadesPorDia[data]) atividadesPorDia[data] = [];
        atividadesPorDia[data].push({ plano, horas });
      }
    });
  });
  
  // Identificar dias com carga baixa que podem ser consolidados
  const diasParaConsolidar = Object.entries(cargaTotalPorDia)
    .filter(([data, carga]) => carga < horasPorDia * 0.7 && carga > 0) // Dias com menos de 70% da capacidade e com alguma carga
    .map(([data]) => data)
    .sort(); 
  
  if (diasParaConsolidar.length === 0) {
    console.log('✅ Nenhuma consolidação necessária para este usuário.');
    return [];
  }
  
  console.log(`📊 Encontrados ${diasParaConsolidar.length} dias com carga baixa para consolidar.`);
  
  const atualizacoes = [];
  const novaDistribuicaoTemporariaPorPlano = {}; // Stores the *new* horas_por_dia for each affected plan
  
  // Coletar todas as horas que precisam ser redistribuídas
  let horasParaRedistribuir = 0;
  const atividadesAfetadas = new Map(); // Use Map to store unique plans directly
  
  diasParaConsolidar.forEach(data => {
    const atividadesDoDia = atividadesPorDia[data] || [];
    atividadesDoDia.forEach(({ plano, horas }) => {
      horasParaRedistribuir += horas;
      atividadesAfetadas.set(plano.id, plano); // Store the plan object
      
      // Initialize or get the existing distribution for this plan
      if (!novaDistribuicaoTemporariaPorPlano[plano.id]) {
        novaDistribuicaoTemporariaPorPlano[plano.id] = { ...plano.horas_por_dia };
      }
      // Remove the fragmented hour for this day
      delete novaDistribuicaoTemporariaPorPlano[plano.id][data];
    });
  });

  if (horasParaRedistribuir <= 0) {
    console.log('⚠️ Horas para redistribuir são zero ou negativas. Nenhuma consolidação real ocorrerá.');
    return [];
  }
  
  // Redistribuir as horas de forma mais eficiente
  // Encontrar o melhor ponto de partida (próximo dia útil a partir de hoje)
  const dataInicioDistribuicao = getNextWorkingDay(new Date());
  
  // Let's create a *temporary* `cargaPorUsuario` object reflecting only this user's current load
  const usuarioId = planejamentosUsuario[0]?.executor_principal || 'temp_user'; 
  const cargaParaSlotFinder = { [usuarioId]: { ...cargaTotalPorDia } }; 
  
  // Before calling `encontrarProximoSlotDisponivel`, we need to adjust `cargaParaSlotFinder`
  // by removing the hours that we are about to redistribute.
  diasParaConsolidar.forEach(data => {
    delete cargaParaSlotFinder[usuarioId][data]; 
  });

  const { distribuicao } = encontrarProximoSlotDisponivel(
    usuarioId, 
    dataInicioDistribuicao, 
    horasParaRedistribuir, 
    cargaParaSlotFinder, 
    horasPorDia
  );
    
  // Calculate the sum of *fragmented* hours per activity, and use that for proportion.
  const horasTotalFragmentadasPorAtividade = new Map();
  diasParaConsolidar.forEach(data => {
    const actividadesDoDia = atividadesPorDia[data] || [];
    actividadesDoDia.forEach(({ plano, horas }) => {
        horasTotalFragmentadasPorAtividade.set(plano.id, (horasTotalFragmentadasPorAtividade.get(plano.id) || 0) + horas);
    });
  });

  const totalHorasFragmentadasGeral = Array.from(horasTotalFragmentadasPorAtividade.values()).reduce((sum, h) => sum + h, 0);

  if (totalHorasFragmentadasGeral === 0 && horasParaRedistribuir > 0) {
      console.warn("No total fragmented hours to distribute for this user, but horasParaRedistribuir > 0. This indicates a logic error in identifying fragmented hours.");
      return [];
  }

  const atividadesArray = Array.from(atividadesAfetadas.values()); 

  atividadesArray.forEach(plano => {
    const horasFragmentadasDestePlano = horasTotalFragmentadasPorAtividade.get(plano.id) || 0;
    if (horasFragmentadasDestePlano === 0) {
      return; 
    }

    const proporcao = horasFragmentadasDestePlano / totalHorasFragmentadasGeral; 
    
    const novaDistribuicaoAlocada = {};
    Object.entries(distribuicao).forEach(([data, horas]) => {
      const horasParaAtividade = horas * proporcao;
      if (horasParaAtividade >= 0.1) { // Only allocate if significant (e.g., at least 6 minutes)
        novaDistribuicaoAlocada[data] = Math.round(horasParaAtividade * 10) / 10;
      }
    });
    
    // Merge with hours not affected by the consolidation (i.e., those not on diasParaConsolidar)
    const distribuicaoFinal = { 
        ...(novaDistribuicaoTemporariaPorPlano[plano.id] || {}), 
        ...novaDistribuicaoAlocada 
    };
    
    // Clean up any days with 0 or near-zero hours after consolidation
    Object.keys(distribuicaoFinal).forEach(data => {
        if (distribuicaoFinal[data] <= 0.05) { 
            delete distribuicaoFinal[data];
        }
    });

    const datasOrdenadas = Object.keys(distribuicaoFinal).sort();
    let novoInicio = null;
    let novoTermino = null;

    if (datasOrdenadas.length > 0) {
        novoInicio = datasOrdenadas[0];
        novoTermino = datasOrdenadas[datasOrdenadas.length - 1];
    } else {
        // If, after consolidation, an activity has no hours allocated
        console.warn(`Plano ${plano.id} resulted in no hours after consolidation.`);
    }
      
    atualizacoes.push({
      id: plano.id,
      dados: {
        horas_por_dia: distribuicaoFinal,
        inicio_ajustado: novoInicio,
        termino_ajustado: novoTermino
      }
    });
  });
  
  console.log(`🎯 Consolidação resultou em ${atualizacoes.length} atualizações para este usuário.`);
  return atualizacoes;
};

// **NOVA**: Função principal para consolidar todo o projeto
export const consolidarProjeto = (todosOsPlanejamentos) => {
  console.log('🚀 Iniciando consolidação do projeto...');
  
  // Agrupar por usuário
  const planejamentosPorUsuario = todosOsPlanejamentos.reduce((acc, plano) => {
    const usuario = plano.executor_principal;
    if (!usuario) return acc; 
    
    if (!acc[usuario]) acc[usuario] = [];
    acc[usuario].push(plano);
    return acc;
  }, {});
  
  // Consolidar cada usuário
  const todasAtualizacoes = [];
  
  Object.entries(planejamentosPorUsuario).forEach(([usuario, planejamentos]) => {
    console.log(`👤 Consolidando planejamentos do usuário: ${usuario}`);
    const atualizacoesUsuario = consolidarAtividadesUsuario(planejamentos);
    todasAtualizacoes.push(...atualizacoesUsuario);
  });
  
  console.log(`✅ Consolidação concluída: ${todasAtualizacoes.length} atividades para atualizar.`);
  
  return {
    atualizacoes: todasAtualizacoes,
    resumo: {
      totalConsolidadas: todasAtualizacoes.length,
      usuariosAfetados: Object.keys(planejamentosPorUsuario).length
    }
  };
};

// Função para detectar e resolver conflitos de carga horária
export const detectarConflitos = (cargaPorUsuario, limitePorDia = 8) => {
  const conflitos = [];
  
  Object.entries(cargaPorUsuario).forEach(([usuario, cargaDias]) => {
    Object.entries(cargaDias).forEach(([data, carga]) => {
      if (carga > limitePorDia) {
        conflitos.push({
          usuario,
          data,
          cargaAtual: carga,
          excesso: carga - limitePorDia
        });
      }
    });
  });
  
  return conflitos;
};
