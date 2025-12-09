import React, { createContext, useContext, useState } from "react";

const ExecucaoContext = createContext();

export function ExecucaoProvider({ children }) {
  const [modalExecucao, setModalExecucao] = useState(null);

  return (
    <ExecucaoContext.Provider value={{ modalExecucao, setModalExecucao }}>
      {children}
    </ExecucaoContext.Provider>
  );
}

export function useExecucaoModal() {
  return useContext(ExecucaoContext);
}
