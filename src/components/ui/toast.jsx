import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

let showToastGlobal = null;

export const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Registrar função global
    window.showToast = (message, type = 'info', duration = 4000) => {
      const id = Date.now();
      const newToast = { id, message, type, duration };
      
      setToasts(prev => [...prev, newToast]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    };

    showToastGlobal = window.showToast;

    return () => {
      window.showToast = null;
      showToastGlobal = null;
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg max-w-md ${getStyles(toast.type)}`}
          >
            {getIcon(toast.type)}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const showToast = (message, type = 'info', duration = 4000) => {
  if (showToastGlobal) {
    showToastGlobal(message, type, duration);
  }
};