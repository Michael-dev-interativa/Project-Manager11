import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Função de formatação de data
export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Função de formatação de moeda
export function formatCurrency(value) {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}