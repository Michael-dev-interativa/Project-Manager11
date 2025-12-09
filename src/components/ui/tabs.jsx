import React, { useState, createContext, useContext } from 'react';

const TabsContext = createContext();

export const Tabs = ({ children, defaultValue, value, onValueChange, className = '' }) => {
  const [activeTab, setActiveTab] = useState(value || defaultValue);

  const handleValueChange = (newValue) => {
    setActiveTab(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }) => (
  <div className={`flex space-x-1 bg-gray-100 p-1 rounded-lg ${className}`}>
    {children}
  </div>
);

export const TabsTrigger = ({ children, value, className = '' }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value, className = '' }) => {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) return null;

  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};