// Função utilitária para distribuir horas de uma atividade entre vários dias
// dias: array de datas (YYYY-MM-DD)
// totalHoras: número total de horas da atividade
// Retorna um objeto { 'YYYY-MM-DD': horas }
export function distribuirHorasPorDia(dias, totalHoras) {
  if (!Array.isArray(dias) || dias.length === 0 || !totalHoras || totalHoras <= 0) return {};
  const horasPorDia = Math.floor(totalHoras / dias.length);
  const resto = totalHoras % dias.length;
  const resultado = {};
  dias.forEach((dia, idx) => {
    resultado[dia] = horasPorDia + (idx < resto ? 1 : 0);
  });
  return resultado;
}
