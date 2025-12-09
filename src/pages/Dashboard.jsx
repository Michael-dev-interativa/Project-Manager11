
import React from "react";
import CalendarioPlanejamento from "../components/dashboard/CalendarioPlanejamento";

export default function DashboardPage(props) {
  return (
    <div className="p-4">
      <CalendarioPlanejamento {...props} />
    </div>
  );
}
