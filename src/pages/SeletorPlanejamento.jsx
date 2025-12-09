import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, ArrowRight } from 'lucide-react';
import { Empreendimento } from "@/entities/all";
import { useNavigate } from 'react-router-dom';

export default function SeletorPlanejamento() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmpreendimentos();
  }, []);

  const loadEmpreendimentos = async () => {
    setLoading(true);
    try {
      const data = await Empreendimento.list();
      setEmpreendimentos(data);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmpreendimento = (empreendimento) => {
    navigate(`/planejamento?id=${empreendimento.id}`);
  };

  if (loading) {
    return (
      <div className="h-full">
        <div className="p-6 md:p-8 h-full">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">Carregando empreendimentos...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="p-6 md:p-8 h-full">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Selecionar Empreendimento</h1>
                <p className="text-gray-600 mt-1">
                  Escolha um empreendimento para acessar o planejamento de atividades
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Empreendimentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empreendimentos.map((empreendimento) => (
              <Card 
                key={empreendimento.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectEmpreendimento(empreendimento)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {empreendimento.nome}
                  </CardTitle>
                  <CardDescription>
                    Cliente: {empreendimento.cliente || 'Não informado'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Status: {empreendimento.status || 'Ativo'}
                    </div>
                    <Button size="sm" className="flex items-center gap-2">
                      Acessar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mensagem se não houver empreendimentos */}
          {empreendimentos.length === 0 && (
            <Card className="flex-1">
              <CardContent className="flex flex-col items-center justify-center h-full text-center">
                <Building2 className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum empreendimento encontrado
                </h3>
                <p className="text-gray-600 max-w-md">
                  Não há empreendimentos cadastrados no sistema no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
