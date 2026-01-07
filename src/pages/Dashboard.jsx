
import React from "react";
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import CalendarioPlanejamento from "../components/dashboard/CalendarioPlanejamento";
import AtividadesHojeTable from "@/components/planejamento/AtividadesHojeTable";
import AcessoRapido from "@/components/planejamento/AcessoRapido";

export default function DashboardPage(props) {
  const navigate = useNavigate();
  return (
    <div className="p-4 space-y-6">
      <CalendarioPlanejamento {...props} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AtividadesHojeTable />
        </div>
        <div className="lg:col-span-1">
          <AcessoRapido />
        </div>
      </div>
    </div>
  );
}
