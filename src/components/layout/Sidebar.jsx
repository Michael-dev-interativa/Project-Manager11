import React from 'react';
import { useUser } from '@/components/contexts/UserContext';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  BarChart3,
  Activity,
  Settings,
  FileText,
  X
} from 'lucide-react';
import { createPageUrl } from '../../utils';

const navigation = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Empreendimentos', href: createPageUrl('Empreendimentos'), icon: Building2 },
  { name: 'Planejamento', href: createPageUrl('SeletorPlanejamento'), icon: CalendarDays },
  { name: 'Ata de Planejamento', href: createPageUrl('AtaPlanejamento'), icon: FileText },
  { name: 'Relatórios', href: createPageUrl('Relatorios'), icon: BarChart3 },
  { name: 'Atividades Rápidas', href: '/atividades-rapidas', icon: Activity },
  { name: 'Usuários', href: createPageUrl('Usuarios'), icon: Users },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const user = useUser();

  const SidebarContent = () => (
    <div className="w-64 bg-white shadow-lg min-h-screen border-r border-gray-200 relative">
      {/* Logo da Empresa */}
      <div className="p-6 text-center border-b border-gray-200">
        <div className="mb-3">
          <img
            src="/LogoInt.png"
            alt="Logo Interativa"
            className="w-20 h-20 mx-auto object-contain"
          />
        </div>
        <div className="text-sm font-bold text-gray-800 tracking-wide">
          Interativa
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Gestão de Projetos
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 lg:hidden"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navegação Principal */}
      <div className="p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          NAVEGAÇÃO PRINCIPAL
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href === '/' && location.pathname === '/') ||
              (item.name === 'Planejamento' && (location.pathname.includes('/planejamento') || location.pathname.includes('/seletor-planejamento')));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors text-sm ${isActive
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                onClick={onClose}
              >
                <item.icon
                  className={classNames(
                    isActive ? 'text-blue-600' : 'text-gray-500',
                    'flex-shrink-0 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer do Usuário */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.nome ? user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">{user?.nome || 'Usuário'}</div>
            <div className="text-xs text-gray-500">{user?.papel || 'Perfil'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
}