import React, { useState, useEffect, useContext, useMemo } from "react"
import { ActivityTimerContext } from "@/components/contexts/ActivityTimerContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Zap, Clock, Play, Users, CheckCircle2, XCircle, History } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001/api"

export default function AtividadesRapidasPage() {
  const { user, startExecution, openExecutionModal } = useContext(ActivityTimerContext)
  const [atividadesGenericas, setAtividadesGenericas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [empreendimentos, setEmpreendimentos] = useState([])
  const [execucoes, setExecucoes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [selectedAtividade, setSelectedAtividade] = useState(null)
  const [modalData, setModalData] = useState({
    usuario_ajudado: "none",
    empreendimento_id: "none",
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createNome, setCreateNome] = useState("")

  const isAdmin = useMemo(() => {
    const role = (user?.perfil || user?.tipo || user?.nivel || "").toString().toLowerCase()
    return role === "admin"
  }, [user])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchJSON = async (url) => {
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json()
  }

  const postJSON = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json()
  }

  const loadData = async () => {
    if (!user) return
    setIsLoadingData(true)
    try {
      const [atividadesData, usuariosData, empreendimentosData] = await Promise.all([
        fetchJSON(`${API_BASE}/AtividadeGenerica`),
        fetchJSON(`${API_BASE}/Usuario`),
        fetchJSON(`${API_BASE}/Empreendimento`),
      ])

      // Carrega execuções filtradas pelo backend quando possível
      let execucoesData = []
      const email = (user?.email || '').trim()
      try {
        if (email) {
          execucoesData = await fetchJSON(`${API_BASE}/Execucao?usuario=${encodeURIComponent(email)}&planejamento_id=null`)
        } else {
          execucoesData = await fetchJSON(`${API_BASE}/Execucao`)
        }
      } catch (e) {
        console.warn('[AtividadesRapidas] Fallback: carregando execuções sem filtro via backend:', e.message)
        execucoesData = await fetchJSON(`${API_BASE}/Execucao`)
      }

      // Fallback adicional: se não vier nada filtrado pelo backend, tenta somente planejamento nulo
      if ((!Array.isArray(execucoesData) || execucoesData.length === 0) && email) {
        try {
          const onlyPlanNull = await fetchJSON(`${API_BASE}/Execucao?planejamento_id=null`)
          execucoesData = Array.isArray(onlyPlanNull) ? onlyPlanNull : execucoesData
        } catch (_) { /* ignora */ }
      }

      setAtividadesGenericas(Array.isArray(atividadesData) ? atividadesData : [])
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : [])
      setEmpreendimentos(Array.isArray(empreendimentosData) ? empreendimentosData : [])
      // Filtra execuções sem planejamento; se o e-mail não estiver disponível, não filtra por usuário
      const emailLower = (email || '').toLowerCase()
      const todasExec = Array.isArray(execucoesData) ? execucoesData : []
      const execFiltradas = todasExec
        .filter((e) => {
          const pj = e.planejamento_id
          const semPlanejamento = pj == null || pj === 0 || pj === '0' || pj === ''
          if (!emailLower) return semPlanejamento
          const usuarioOk = ((e.usuario || '').toLowerCase() === emailLower)
          return usuarioOk && semPlanejamento
        })
        .slice(0, 50)

      // Se nada foi filtrado, mas vieram registros, mostra os sem planejamento de todos (para depuração)
      const execDisplay = execFiltradas.length > 0
        ? execFiltradas
        : todasExec.filter((e) => {
          const pj = e.planejamento_id
          return pj == null || pj === 0 || pj === '0' || pj === ''
        }).slice(0, 50)
      console.debug("[AtividadesRapidas] Execuções carregadas:", {
        total: todasExec.length,
        filtradas: execFiltradas.length,
      })
      setExecucoes(execDisplay)
    } catch (error) {
      console.error("[AtividadesRapidas] Erro ao carregar dados:", error)
      alert("Erro ao carregar dados. Recarregue a página.")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleOpenModal = (atividade) => {
    setSelectedAtividade(atividade)
    setModalData({ usuario_ajudado: "none", empreendimento_id: "none" })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedAtividade(null)
    setModalData({ usuario_ajudado: "none", empreendimento_id: "none" })
  }

  const handleCreateAtividade = async () => {
    if (!createNome.trim()) {
      alert("Informe um nome para a atividade")
      return
    }
    setIsLoading(true)
    try {
      await postJSON(`${API_BASE}/AtividadeGenerica`, { nome: createNome.trim() })
      setCreateNome("")
      setShowCreateModal(false)
      await loadData()
      alert("✅ Atividade rápida criada!")
    } catch (error) {
      console.error("❌ Erro ao criar atividade genérica:", error)
      alert("Erro ao criar atividade: " + (error.message || "Tente novamente."))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmStart = async () => {
    if (!selectedAtividade) return
    if (!user || !user.email) {
      alert("É necessário estar logado para iniciar uma atividade rápida.")
      return
    }
    setIsLoading(true)
    try {
      let descritivo = selectedAtividade.nome
      if (modalData.usuario_ajudado && modalData.usuario_ajudado !== "none") {
        const usuarioAjudado = usuarios.find((u) => u.email === modalData.usuario_ajudado)
        descritivo = `Ajudando ${usuarioAjudado?.nome || modalData.usuario_ajudado} - ${descritivo}`
      }
      const payload = {
        usuario: user.email,
        empreendimento_id: modalData.empreendimento_id && modalData.empreendimento_id !== "none" ? Number(modalData.empreendimento_id) : null,
        usuario_ajudado: modalData.usuario_ajudado && modalData.usuario_ajudado !== "none" ? modalData.usuario_ajudado : null,
        status: "em_andamento",
        inicio: new Date().toISOString(),
        termino: null,
        tempo_total: 0,
        atividade_nome: selectedAtividade.nome,
        planejamento_id: null,
        observacao: null,
        descritivo,
      }

      if (typeof startExecution === "function") {
        await startExecution({
          descritivo,
          base_descritivo: selectedAtividade.nome,
          empreendimento_id: payload.empreendimento_id,
          usuario_ajudado: payload.usuario_ajudado,
        })
      } else {
        await postJSON(`${API_BASE}/Execucao`, payload)
      }

      // Abre o ExecucaoModal via ActivityTimerContext, quando disponível
      if (typeof openExecutionModal === "function") {
        openExecutionModal({
          descritivo,
          atividade_nome: payload.atividade_nome,
          empreendimento_id: payload.empreendimento_id,
          usuario: payload.usuario,
          usuario_ajudado: payload.usuario_ajudado,
          status: payload.status,
          inicio: payload.inicio,
          planejamento_id: null,
        })
      }

      alert("✅ Atividade iniciada com sucesso!")
      await loadData()
      handleCloseModal()
    } catch (error) {
      console.error("❌ Erro ao iniciar atividade:", error)
      alert("Erro ao iniciar atividade: " + (error.message || "Tente novamente."))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase()
    if (s.includes('andamento') || s === 'em_andamento' || s === 'em_execucao') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
          <Play className="w-3 h-3 mr-1" />Em andamento
        </Badge>
      )
    }
    if (s.includes('final') || s === 'concluido' || s === 'concluído') {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />Concluído
        </Badge>
      )
    }
    if (s.includes('paus') || s.includes('paral') || s === 'pausado' || s === 'paralisado') {
      return (
        <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 mr-1" />Pausado
        </Badge>
      )
    }
    return <Badge className="bg-gray-100 text-gray-700 border border-gray-200">{status || '—'}</Badge>
  }

  const toTitleCase = (str) => {
    if (!str) return ''
    return String(str)
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const formatTempo = (tempo) => {
    if (tempo === null || tempo === undefined) return "0.00h"
    const value = typeof tempo === "number" ? tempo : Number(tempo) || 0
    return `${value.toFixed(2)}h`
  }

  const formatData = (dataString) => {
    if (!dataString) return "N/A"
    try {
      return format(new Date(dataString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return "Data inválida"
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Carregando...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            Atividades Rápidas
          </h1>
          <p className="text-gray-600">Inicie atividades rapidamente sem precisar planejar.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b border-gray-100 flex items-center justify-between">
              <CardTitle className="text-lg">Atividades Disponíveis</CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  + Nova
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {atividadesGenericas.map((atividade, idx) => (
                    <div
                      key={atividade.id ?? `${atividade.nome}-${idx}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{toTitleCase(atividade.nome)}</h4>
                      </div>
                      <Button onClick={() => handleOpenModal(atividade)} disabled={isLoading} size="sm" className="ml-3 bg-blue-600 hover:bg-blue-700">
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Seu Histórico de Atividades Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {execucoes.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma atividade rápida executada ainda.</p>
                  <p className="text-sm text-gray-400 mt-1">Inicie uma atividade para vê-la aqui!</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {execucoes.map((exec, idx) => (
                      <div key={exec.id ?? `${exec.inicio}-${idx}`} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex-1 mr-2">{toTitleCase(exec.descritivo || exec.atividade_nome || exec.documento_nome || exec.descricao || "Atividade")}</h4>
                          {getStatusBadge(exec.status)}
                        </div>
                        {exec.usuario_ajudado && (
                          <p className="text-sm text-purple-600 mb-2">
                            <Users className="w-3 h-3 inline mr-1" />
                            Ajudando {usuarios.find((u) => u.email === exec.usuario_ajudado)?.nome || exec.usuario_ajudado}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatData(exec.inicio)}
                          </span>
                          {exec.tempo_total && <span className="font-semibold text-blue-600">{formatTempo(exec.tempo_total)}</span>}
                        </div>
                        {exec.observacao && <p className="text-xs text-gray-600 mt-2 italic">{exec.observacao}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogPortal>
          <DialogOverlay className="dialog-overlay" />
          <DialogContent className="dialog-content sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Iniciar: {selectedAtividade?.nome}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="usuario_ajudado">Ajudando alguém? (Opcional)</Label>
                <Select value={modalData.usuario_ajudado} onValueChange={(value) => setModalData((prev) => ({ ...prev, usuario_ajudado: value }))}>
                  <SelectTrigger id="usuario_ajudado">
                    <SelectValue placeholder="Nenhum (atividade pessoal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (atividade pessoal)</SelectItem>
                    {usuarios
                      .filter((u) => u.email !== user?.email)
                      .sort((a, b) => {
                        const nomeA = a.nome || a.email || ""
                        const nomeB = b.nome || b.email || ""
                        return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" })
                      })
                      .map((usuario, idx) => (
                        <SelectItem key={usuario.email ?? usuario.id ?? idx} value={usuario.email}>
                          {usuario.nome || usuario.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="empreendimento_id">Empreendimento (Opcional)</Label>
                <Select value={modalData.empreendimento_id} onValueChange={(value) => setModalData((prev) => ({ ...prev, empreendimento_id: value }))}>
                  <SelectTrigger id="empreendimento_id">
                    <SelectValue placeholder="Nenhum empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum empreendimento</SelectItem>
                    {empreendimentos.map((emp, idx) => (
                      <SelectItem key={emp.id ?? `${emp.nome}-${idx}`} value={String(emp.id)}>
                        {emp.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmStart} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Atividade
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Modal: Nova Atividade Rápida */}
      <Dialog open={isAdmin && showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); setCreateNome("") } }}>
        <DialogPortal>
          <DialogOverlay className="dialog-overlay" />
          <DialogContent className="dialog-content sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Criar nova atividade rápida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="novo_nome">Nome da atividade</Label>
                <Input
                  id="novo_nome"
                  placeholder="Ex.: Reunião rápida, Alinhar pauta, Ligações"
                  value={createNome}
                  onChange={(e) => setCreateNome(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateModal(false); setCreateNome("") }} disabled={isLoading}>Cancelar</Button>
              <Button onClick={handleCreateAtividade} disabled={isLoading || !createNome.trim()} className="bg-green-600 hover:bg-green-700">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
