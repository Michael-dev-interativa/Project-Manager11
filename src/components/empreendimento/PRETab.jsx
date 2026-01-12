
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Printer, Save, FileText, Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { Empreendimento, ItemPRE } from "@/entities/all";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { retryWithBackoff } from "@/components/utils/apiUtils";


const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/577f93874_logo_Interativa_versao_final_sem_fundo_0002.png";

const STATUS_COLORS = {
  "Em andamento": "bg-yellow-200",
  "Pendente": "bg-red-300",
  "Concluído": "bg-green-200",
  "Cancelado": "bg-red-200"
};

const printStyles = `
@media print {
  @page {
    size: A4 landscape;
    margin: 5mm;
  }
  
  .no-print {
    display: none !important;
  }
  
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    font-size: 8pt;
  }
  
  table {
    page-break-inside: auto;
    width: 100%;
    border-collapse: collapse;
  }
  
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  thead {
    display: table-header-group;
  }
  
  td, th {
    font-size: 7pt !important;
    padding: 1mm !important;
    line-height: 1.2;
    vertical-align: top;
  }
  
  textarea, input {
    font-size: 7pt !important;
    padding: 0 !important;
    line-height: 1.2 !important;
  }
  
  /* Ajustar larguras das colunas */
  table td:nth-child(1) { width: 4%; }   /* Item */
  table td:nth-child(2) { width: 7%; }   /* Data */
  table td:nth-child(3) { width: 8%; }   /* De */
  table td:nth-child(4) { width: 12%; }  /* Descritiva */
  table td:nth-child(5) { width: 8%; }   /* Localização */
  table td:nth-child(6) { width: 18%; }  /* Assunto */
  table td:nth-child(7) { width: 20%; }  /* Comentário */
  table td:nth-child(8) { width: 8%; }   /* Status */
  table td:nth-child(9) { width: 15%; }  /* Resposta */
  
  /* Quebrar palavras longas */
  td {
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
  }
}
`;


export default function PRETab({ empreendimentoId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [headerData, setHeaderData] = useState({
    cliente: '',
    obra: '',
    descricao: '',
    data: format(new Date(), 'dd/MM/yyyy'),
    rev: '',
    arquivo: ''
  });

  useEffect(() => {
    if (empreendimentoId) {
      loadEmpreendimentoInfo(empreendimentoId);
      loadItems(empreendimentoId);
    } else {
      setItems([]);
    }
  }, [empreendimentoId]);

  const loadEmpreendimentoInfo = async (empId) => {
    try {
      const emp = await Empreendimento.get(empId);
      setHeaderData(prev => ({
        ...prev,
        cliente: emp?.cliente || '',
        obra: emp?.nome || ''
      }));
    } catch (error) {
      // Se não conseguir carregar, mantém headerData padrão
    }
  };

  const normalizeDate = (value) => {
    if (!value) return '';
    try {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const d = typeof value === 'string' ? parseISO(value) : new Date(value);
      if (isValidDate(d)) return format(d, 'yyyy-MM-dd');
    } catch (_) { }
    return '';
  };

  const loadItems = async (empId) => {
    setIsLoading(true);
    try {
      const itemsList = await retryWithBackoff(
        () => ItemPRE.filter({ empreendimento_id: empId }),
        3, 2000,
        'PRE-Items'
      );
      const normalized = (itemsList || []).map((it) => ({
        ...it,
        data: normalizeDate(it.data)
      }));
      const sortedItems = normalized.sort((a, b) => {
        const parseItem = (str) => {
          const parts = String(str).split('.');
          return parts.map(p => parseInt(p) || 0);
        };
        const partsA = parseItem(a.item);
        const partsB = parseItem(b.item);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const numA = partsA[i] || 0;
          const numB = partsB[i] || 0;
          if (numA !== numB) return numA - numB;
        }
        return 0;
      });
      setItems(sortedItems);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      // Não apaga o estado atual em caso de falha de backend
      // Mantém itens já exibidos para evitar "sumir" após salvar
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      empreendimento_id: empreendimentoId,
      item: String(items.length + 1),
      data: format(new Date(), 'yyyy-MM-dd'),
      de: '',
      descritiva: '',
      localizacao: '',
      assunto: '',
      comentario: '',
      status: 'Em andamento',
      resposta: '',
      imagens: [],
      isNew: true
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    // Autosave após adicionar
    setTimeout(() => {
      handleSave && handleSave();
    }, 0);
  };

  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteItem = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm('Deseja excluir este item?')) return;

    try {
      if (!id.toString().startsWith('temp-')) {
        await retryWithBackoff(() => ItemPRE.delete(id), 3, 2000, `PRE-Delete-${id}`);
      }
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Erro ao excluir item.');
    }
  };

  const handleUploadImage = async (itemId, file) => {
    try {
      // Se o item ainda não existe no banco, anexamos localmente como dataURL
      if (String(itemId).startsWith('temp-')) {
        const toDataUrl = (f) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        const dataUrl = await toDataUrl(file);
        setItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, imagens: [...(item.imagens || []), dataUrl] }
            : item
        ));
        return;
      }

      // Para itens já persistidos, envia para o backend
      const form = new FormData();
      form.append('image', file);

      const resp = await fetch(`/api/PRE/${itemId}/imagens`, {
        method: 'POST',
        body: form
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Falha no upload');
      }
      const data = await resp.json();
      const novasImagens = data?.imagens || [];
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, imagens: novasImagens }
          : item
      ));
    } catch (e) {
      console.error('Upload de imagem falhou:', e);
      alert('Erro ao enviar imagem. Tente novamente.');
    }
  };

  const handleRemoveImage = (itemId, imageUrl) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, imagens: (item.imagens || []).filter(url => url !== imageUrl) }
        : item
    ));
  };

  const handleSave = async () => {
    if (!empreendimentoId) {
      alert('Empreendimento não definido.');
      return;
    }

    setIsSaving(true);
    try {
      const savedItems = [];

      for (const item of items) {
        const itemData = {
          empreendimento_id: empreendimentoId,
          item: item.item,
          data: item.data,
          de: item.de,
          descritiva: item.descritiva,
          localizacao: item.localizacao,
          assunto: item.assunto,
          comentario: item.comentario,
          status: item.status || '',
          resposta: item.resposta,
          imagens: item.imagens || []
        };

        if (item.isNew || item.id.toString().startsWith('temp-')) {
          const created = await retryWithBackoff(() => ItemPRE.create(itemData), 3, 2000, 'PRE-Create');
          savedItems.push(created);
        } else {
          const updated = await retryWithBackoff(() => ItemPRE.update(item.id, itemData), 3, 2000, `PRE-Update-${item.id}`);
          savedItems.push(updated);
        }
      }

      const normalized = savedItems.map((it) => ({
        ...it,
        data: normalizeDate(it.data)
      }));
      const sortedSavedItems = normalized.sort((a, b) => {
        const parseItem = (str) => {
          const parts = String(str).split('.');
          return parts.map(p => parseInt(p) || 0);
        };
        const partsA = parseItem(a.item);
        const partsB = parseItem(b.item);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const numA = partsA[i] || 0;
          const numB = partsB[i] || 0;
          if (numA !== numB) return numA - numB;
        }
        return 0;
      });
      if (sortedSavedItems.length > 0) setItems(sortedSavedItems);
      alert('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="p-6 bg-gray-50 min-h-screen print:p-0 print:bg-white">
        {/* Barra de Ações */}
        <div className="mb-4 flex justify-between items-center no-print">
          <h1 className="text-2xl font-bold text-gray-800">PRE - Emails, ATA e Documentos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </div>
        </div>
        <div className="bg-white border border-gray-400 shadow-lg">
          {/* Cabeçalho */}
          <div className="border-b-2 border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Interativa" className="h-16" />
            </div>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold text-gray-800">Emails, ATA e Documentos</h2>
            </div>
            <div className="text-right text-sm space-y-1">
              <div>{headerData.data}</div>
              <div className="flex items-center gap-1">
                <span>Rev:</span>
                <Input
                  value={headerData.rev}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, rev: e.target.value }))}
                  className="h-6 w-20 text-xs print:border-none print:bg-transparent"
                />
              </div>
              <div className="flex items-center gap-1">
                <span>Arquivo:</span>
                <Input
                  value={headerData.arquivo || ''}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, arquivo: e.target.value }))}
                  className="h-6 w-20 text-xs print:border-none print:bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Info do Cliente */}
          <div className="border-b border-gray-400 p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Cliente:</label>
              <Input
                value={headerData.cliente}
                onChange={(e) => setHeaderData(prev => ({ ...prev, cliente: e.target.value }))}
                className="mt-1 print:border-none print:bg-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Descrição:</label>
              <Input
                value={headerData.descricao}
                onChange={(e) => setHeaderData(prev => ({ ...prev, descricao: e.target.value }))}
                className="mt-1 print:border-none print:bg-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Obra:</label>
              <Input
                value={headerData.obra}
                onChange={(e) => setHeaderData(prev => ({ ...prev, obra: e.target.value }))}
                className="mt-1 print:border-none print:bg-transparent"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-400 p-3 w-[4%]">Item</th>
                  <th className="border border-gray-400 p-3 w-[7%]">Data</th>
                  <th className="border border-gray-400 p-3 w-[8%]">De</th>
                  <th className="border border-gray-400 p-3 w-[12%]">Descritiva</th>
                  <th className="border border-gray-400 p-3 w-[8%]">Localização</th>
                  <th className="border border-gray-400 p-3 w-[16%]">Assunto</th>
                  <th className="border border-gray-400 p-3 w-[13%]">Comentário</th>
                  <th className="border border-gray-400 p-3 w-[8%]">Status</th>
                  <th className="border border-gray-400 p-3 w-[12%]">Resposta</th>
                  <th className="border border-gray-400 p-3 w-[6%]">Imagens</th>
                  <th className="border border-gray-400 p-3 w-[6%] no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center p-8 text-gray-500">
                      Nenhum item cadastrado. Clique em "Adicionar Item" para começar.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 align-top">
                      <td className="border border-gray-300 p-2 text-center align-middle">
                        <Input
                          value={item.item}
                          onChange={(e) => handleUpdateItem(item.id, 'item', e.target.value)}
                          className="h-10 text-sm text-center font-medium print:border-none print:bg-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 p-2 align-middle">
                        <Input
                          type="date"
                          value={item.data}
                          onChange={(e) => handleUpdateItem(item.id, 'data', e.target.value)}
                          className="h-10 text-sm print:border-none print:bg-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.de}
                          onChange={(e) => handleUpdateItem(item.id, 'de', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-y"
                          rows={8}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.descritiva}
                          onChange={(e) => handleUpdateItem(item.id, 'descritiva', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-y"
                          rows={5}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.localizacao}
                          onChange={(e) => handleUpdateItem(item.id, 'localizacao', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-none"
                          rows={3}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.assunto}
                          onChange={(e) => handleUpdateItem(item.id, 'assunto', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-y"
                          rows={5}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.comentario}
                          onChange={(e) => handleUpdateItem(item.id, 'comentario', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-y"
                          rows={10}
                        />
                      </td>
                      <td className={`border border-gray-300 p-2 align-middle ${STATUS_COLORS[item.status] || ''}`}>
                        <Select
                          value={item.status}
                          onValueChange={(value) => handleUpdateItem(item.id, 'status', value)}
                        >
                          <SelectTrigger className="h-10 text-sm print:border-none print:bg-transparent">
                            <SelectValue placeholder="Sem status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Sem status</SelectItem>
                            <SelectItem value="Em andamento">Em andamento</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Concluído">Concluído</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={item.resposta}
                          onChange={(e) => handleUpdateItem(item.id, 'resposta', e.target.value)}
                          className="w-full text-sm print:border-none print:bg-transparent resize-y"
                          rows={5}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-2">
                          <label className="no-print">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(item.id, file);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={(e) => e.currentTarget.previousElementSibling.click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Anexar
                            </Button>
                          </label>
                          {(item.imagens || []).map((imgUrl, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={imgUrl}
                                alt={`Imagem ${idx + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <button
                                onClick={() => handleRemoveImage(item.id, imgUrl)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2 text-center align-middle no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
