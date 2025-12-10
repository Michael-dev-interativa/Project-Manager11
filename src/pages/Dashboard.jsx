
import React from "react";
import CalendarioPlanejamento from "../components/dashboard/CalendarioPlanejamento";
import AtividadesHojeTable from "@/components/planejamento/AtividadesHojeTable";

export default function DashboardPage(props) {
  return (
    <div className="p-4">
      <CalendarioPlanejamento {...props} />
      <AtividadesHojeTable />
    </div>
  );
}
