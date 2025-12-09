import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Edit, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

const statusColors = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-800"
};

const statusLabels = {
  ativo: "Ativo",
  inativo: "Inativo"
};

export default function UsuarioCard({ usuario, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden min-w-[340px] max-w-[380px] w-full flex flex-col justify-center min-h-[145px]">
        <CardContent className="pt-3 pb-3 px-4 h-full flex flex-col justify-between">
          <div className="relative">
            {/* Badge status no topo direito */}
            {usuario.status && (
              <span className={`absolute right-0 top-0 mt-1 mr-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[usuario.status]}`}>{statusLabels[usuario.status]}</span>
            )}
            <div className="flex items-center gap-3 w-full">
              <div className="w-[48px] h-[36px] flex items-center justify-center" style={{ background: 'rgba(33, 150, 243, 0.10)', borderRadius: '50%' }}>
                <User className="w-7 h-7 text-[#2563eb]" />
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900 leading-tight">{usuario.nome}</h3>
                </div>
                {usuario.cargo && (
                  <p className="text-xs text-gray-500 leading-tight">{usuario.cargo}</p>
                )}
              </div>
            </div>
            <div className="space-y-1 mt-2 mb-2 w-full">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm break-all">{usuario.email}</span>
              </div>
              {usuario.departamento && (
                <div className="text-xs text-gray-500">Depto: {usuario.departamento}</div>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(usuario)}
              className="flex-1 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(usuario)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
              style={{ boxShadow: 'none' }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}