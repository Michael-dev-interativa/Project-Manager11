const LayoutComponent = ({ children, currentPageName }) => {
  const location = useLocation();
  const { user, isLoading } = useContext(ActivityTimerContext);

  const getNavigationItems = (userRole) => {
    const allItems = [
      { title: "Início", url: createPageUrl("Dashboard"), icon: Home, roles: ['admin', 'lider', 'user'] },
      { title: "Empreendimentos", url: createPageUrl("Empreendimentos"), icon: Building2, roles: ['admin', 'lider'] },
      { title: "Planejamento", url: createPageUrl("SeletorPlanejamento"), icon: Calendar, roles: ['admin', 'lider'] },
      { title: "Relatórios", url: createPageUrl("Relatorios"), icon: BarChart3, roles: ['admin'] },
      { title: "Atividades Rápidas", url: createPageUrl("AtividadesRapidas"), icon: Zap, roles: ['admin', 'lider', 'user'] },
      { title: "Usuários", url: createPageUrl("Usuarios"), icon: Users, roles: ['admin', 'lider'] },
      { title: "Configurações", url: createPageUrl("Configuracoes"), icon: Settings, roles: ['admin', 'lider'] }
    ];

    const effectiveUserRole = userRole || 'user';
    return allItems.filter(item => item.roles.includes(effectiveUserRole));
  };

  const navigationItems = isLoading ? [] : getNavigationItems(user?.role);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-100 p-6">
            <div className="flex flex-col items-center justify-center gap-2">
              <img src={LOGO_URL} alt="Project Control Logo" className="h-20 w-auto" />
              <strong className="text-gray-800 text-sm">Gestão de Projetos</strong>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                {user?.role === 'user' ? 'Menu Principal' : 'Navegação Principal'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {user?.full_name || user?.email || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === 'user' ? 'Colaborador' : 
                   user?.role === 'admin' ? 'Administrador' :
                   user?.role === 'lider' ? 'Líder' : 'Project Control'}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors" />
              <h1 className="text-xl font-semibold text-gray-900">Project Control</h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        <GlobalTimer />
      </div>
    </SidebarProvider>
  );
};

export default function Layout({ children, currentPageName }) {
  return (
    <ActivityTimerProvider>
      <LayoutComponent currentPageName={currentPageName}>
        {children}
      </LayoutComponent>
    </ActivityTimerProvider>
  );
}