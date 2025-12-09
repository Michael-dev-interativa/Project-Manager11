import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, User } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export default function Header({ setSidebarOpen }) {
  const user = useUser();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
      <div className="flex items-center justify-between h-16 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md">
            <User className="h-5 w-5 text-gray-700" />
            <div className="flex flex-col text-xs text-left">
              <span className="font-semibold text-gray-800">{user?.nome}</span>
              <span className="text-gray-500">{user?.papel}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}