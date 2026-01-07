import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

export default function CalendarioLayout() {
  const location = useLocation();
  return (
    <div className="p-4 space-y-6">
      {/* Barra de navegação fixa */}
      <div className="flex items-center gap-4 p-3 mb-4 bg-white border border-gray-200 rounded-xl">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${location.pathname === "/" ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"}`}
        >
          Calendário
        </Link>
        <Link
          to="/curva-s"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${location.pathname === "/curva-s" ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"}`}
        >
          Curva S
        </Link>
        <Link
          to="/alocacao-equipe"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${location.pathname === "/alocacao-equipe" ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"}`}
        >
          Alocação Equipe
        </Link>
      </div>
      {/* Conteúdo da rota filha */}
      <Outlet />
    </div>
  );
}
