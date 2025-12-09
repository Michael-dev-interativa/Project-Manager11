import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CalendarDays,
  FileText,
  BarChart3,
  Settings,
  Activity
} from 'lucide-react';
import { createPageUrl } from '@/utils';

const navigationItems = [
  {
    name: 'Dashboard',
    href: createPageUrl('Dashboard'),
    icon: LayoutDashboard,
    current: false
  },
  {
    name: 'Usuários',
    href: createPageUrl('Usuarios'),
    icon: Users,
    current: false
  },
  {
    name: 'Empreendimentos',
    href: createPageUrl('Empreendimentos'),
    icon: Building2,
    current: false
  },
  {
    name: 'Planejamento',
    href: createPageUrl('SeletorPlanejamento'),
    icon: CalendarDays,
    current: false
  },
  {
    name: 'Relatórios',
    href: createPageUrl('Relatorios'),
    icon: BarChart3,
    current: false
  },
  {
    name: 'Análise Concepção',
    href: createPageUrl('AnaliseConcepcaoPlanejamento'),
    icon: Activity,
    current: false
  }
];

export default function SidebarNav() {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigationItems.map((item) => {
        const isActive = location.pathname.includes(item.href) || 
          (item.name === 'Dashboard' && location.pathname === '/');
        
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`
              group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
              ${isActive 
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            <item.icon
              className={`
                mr-3 flex-shrink-0 h-5 w-5 transition-colors
                ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-300'}
              `}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}