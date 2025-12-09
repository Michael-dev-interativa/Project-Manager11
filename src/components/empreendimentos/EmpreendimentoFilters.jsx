import React from 'react';
import { Search, Filter } from 'lucide-react';

const EmpreendimentoFilters = ({ filters, onFiltersChange }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empreendimentos..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por status */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os status</option>
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default EmpreendimentoFilters;