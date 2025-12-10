import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings, BarChart2, Users } from 'lucide-react';

function Item({ to, icon, iconBg, title, subtitle }) {
  const Icon = icon;
  return (
    <Link to={to} className="block">
      <div className="flex items-start gap-3 px-4 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg} text-white flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
    </Link>
  );
}

export default function AcessoRapido() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b bg-white">
        <h3 className="text-lg font-bold text-gray-900">Ações Rápidas</h3>
      </div>
      <div className="p-4 space-y-3">
        <Item
          to="/empreendimentos"
          icon={Plus}
          iconBg="bg-blue-600"
          title="Novo Empreendimento"
          subtitle="Criar um novo projeto"
        />
        <Item
          to="/configuracoes"
          icon={Settings}
          iconBg="bg-purple-600"
          title="Configurações"
          subtitle="Gerenciar disciplinas e atividades"
        />
        <Item
          to="/relatorios"
          icon={BarChart2}
          iconBg="bg-green-600"
          title="Relatórios"
          subtitle="Visualizar relatórios e análises"
        />
        <Item
          to="/usuarios"
          icon={Users}
          iconBg="bg-red-600"
          title="Gerenciar Usuários"
          subtitle="Adicionar ou remover usuários"
        />
      </div>
    </div>
  );
}
