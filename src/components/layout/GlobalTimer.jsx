import React, { useContext, useState } from 'react';
import { ActivityTimerContext } from "@/components/contexts/ActivityTimerContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, Square, Hourglass, Pause, Check } from "lucide-react"; // Adicionado Pause e Check
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function GlobalTimer() {
  const { activeExecution, finishExecution, pauseExecution, isFinishing, isPausing } = useContext(ActivityTimerContext); // Obter novas props
  const [showObservacaoModal, setShowObservacaoModal] = useState(false);
  const [observacao, setObservacao] = useState('');

  if (!activeExecution) {
    return null;
  }

  const handleFinish = async () => {
    await finishExecution(observacao);
    setShowObservacaoModal(false);
    setObservacao('');
  };
  
  const handlePause = async () => {
    await pauseExecution(observacao);
    setShowObservacaoModal(false);
    setObservacao('');
  };

  const isProcessing = isFinishing || isPausing;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Card className="p-4 bg-white shadow-2xl rounded-xl border-2 border-blue-500 w-80">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                <Hourglass className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate" title={activeExecution.descritivo}>
                {activeExecution.descritivo}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">
                  Iniciado às {format(new Date(activeExecution.inicio), 'HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                size="icon"
                onClick={() => setShowObservacaoModal(true)}
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-600 rounded-full w-10 h-10 shadow-lg"
                title="Parar Atividade"
              >
                {isProcessing ? (
                  <Hourglass className="w-5 h-5 animate-spin" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <Dialog open={showObservacaoModal} onOpenChange={setShowObservacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parar Atividade</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="observacao">
              Adicionar uma observação (opcional)
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o que foi feito..."
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowObservacaoModal(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePause}
              disabled={isProcessing}
              variant="secondary"
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
            >
              {isPausing ? "Pausando..." : <><Pause className="w-4 h-4 mr-2" /> Pausar</>}
            </Button>
            <Button
              onClick={handleFinish}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinishing ? "Finalizando..." : <><Check className="w-4 h-4 mr-2" /> Finalizar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}