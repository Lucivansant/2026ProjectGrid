import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  FilePlus, 
  Trash2, 
  FileText, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  PlusCircle,
  Zap,
  Lamp,
  Shield,
  Search,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Printer
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { REFERENCE_SERVICES } from '../lib/referencePrices'

/**
 * Componente Budgets (Orçamentos)
 * Gerencia a criação, listagem e exportação de orçamentos de serviços.
 * Inclui um catálogo de serviços, um construtor de orçamentos e geração de PDF.
 */
const Budgets = () => {
  // Estado de Autenticação e Dados
  const [user, setUser] = useState(null)
  const [budgets, setBudgets] = useState([]) // Lista de orçamentos existentes
  const [clients, setClients] = useState([]) // Lista de clientes para seleção
  const [loading, setLoading] = useState(true)

  // Estado da Interface (UI)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [builderItems, setBuilderItems] = useState([]) // Itens temporários sendo adicionados a um novo orçamento
  const [expandedCategory, setExpandedCategory] = useState(null) // Controla o acordeão de categorias no catálogo
  const [newBudget, setNewBudget] = useState({
    client_id: '',
    title: '',
    total_value: 0,
    service_date: new Date().toISOString().split('T')[0],
    service_duration_hours: 8
  })
  const [saving, setSaving] = useState(false)

  // Configuração para os selos de status
  const statusStyles = {
    'Pendente': { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, border: 'border-amber-100' },
    'Aprovado': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, border: 'border-emerald-100' },
    'Recusado': { bg: 'bg-rose-50', text: 'text-rose-700', icon: XCircle, border: 'border-rose-100' },
  }

  /**
   * Configuração Inicial
   * Busca o usuário atual e inicia o carregamento de dados se autenticado.
   */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        loadBudgets(user.id)
        loadClients(user.id)
      }
    })
  }, [])

  /**
   * Carrega orçamentos da tabela 'quotes' do Supabase
   */
  const loadBudgets = async (userId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .select('*, clients(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (!error) setBudgets(data || [])
    setLoading(false)
  }

  /**
   * Carrega clientes disponíveis da tabela 'clients' do Supabase
   */
  const loadClients = async (userId) => {
    const { data } = await supabase.from('clients').select('id, name').eq('user_id', userId).order('name')
    setClients(data || [])
  }

  /**
   * Adiciona um serviço à lista temporária do construtor
   */
  const addToBuilder = (service) => {
    setBuilderItems([...builderItems, { ...service, id: Date.now() }])
  }

  /**
   * Remove um serviço da lista temporária do construtor
   */
  const removeFromBuilder = (id) => {
    setBuilderItems(builderItems.filter(item => item.id !== id))
  }

  // Calcula o valor total acumulado dos itens no construtor
  const totalBuilderValue = builderItems.reduce((acc, item) => acc + item.price, 0)

  /**
   * Prepara o modal com valores padrão baseados nos itens do construtor
   */
  const handleUseBuilder = () => {
    const title = builderItems.length > 0 
      ? `Orçamento: ${builderItems[0].name}${builderItems.length > 1 ? '...' : ''}`
      : ''
    setNewBudget({
      ...newBudget,
      title,
      total_value: totalBuilderValue
    })
    setIsModalOpen(true)
  }

  /**
   * Salva o orçamento e seus itens individuais no Supabase
   */
  const handleSaveBudget = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!newBudget.client_id) return alert('Selecione um cliente')

    setSaving(true)
    try {
      // 1. Insere o registro principal do orçamento
      const { data: budget, error: bError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          ...newBudget,
          description: generateDescription()
        })
        .select()
        .single()

      if (bError) throw bError

      // 2. Insere itens individuais vinculados ao orçamento
      if (builderItems.length > 0) {
        const items = builderItems.map(item => ({
          quote_id: budget.id,
          user_id: user.id,
          service_name: item.name,
          price: item.price
        }))
        await supabase.from('quote_items').insert(items)
      }

      // Reseta a UI e recarrega a lista
      setIsModalOpen(false)
      setBuilderItems([])
      loadBudgets(user.id)
      alert('Orçamento criado com sucesso!')
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Gera uma descrição em texto para o orçamento baseada nos itens selecionados
   */
  const generateDescription = () => {
    const itemsList = builderItems.map(i => `- ${i.name}`).join('\n')
    return `Olá! Segue a proposta detalhada para os serviços solicitados:\n\nServiços inclusos:\n${itemsList}\n\nValor total (mão de obra): ${totalBuilderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\nTodos os serviços seguem a norma NBR 5410.`
  }

  /**
   * Atualiza o status de um orçamento existente (ex: para 'Aprovado')
   */
  const updateStatus = async (id, status) => {
    await supabase.from('quotes').update({ status }).eq('id', id)
    loadBudgets(user.id)
  }

  /**
   * Exclui um registro de orçamento do Supabase
   */
  const deleteBudget = async (id) => {
    if (!confirm('Excluir orçamento permanentemente?')) return
    await supabase.from('quotes').delete().eq('id', id)
    loadBudgets(user.id)
  }

  /**
   * Lógica de Geração de PDF
   * Cria um documento PDF profissional usando jsPDF e jspdf-autotable.
   */
  const generatePDF = async (budget) => {
    // 1. Busca itens individuais para o PDF
    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', budget.id)
    const doc = new jsPDF()
    
    // Estilo do Cabeçalho
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text('ProjectGrid', 20, 25)
    doc.setFontSize(10)
    doc.text('ORÇAMENTO DE SERVIÇOS ELÉTRICOS', 190, 25, { align: 'right' })

    // Informações do Cliente
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE:', 20, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(budget.clients?.name || '---', 20, 62)

    doc.setFont('helvetica', 'bold')
    doc.text('DATA:', 140, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(budget.created_at).toLocaleDateString('pt-BR'), 140, 62)

    doc.line(20, 70, 190, 70)

    // Tabela de Orçamento
    const tableData = items?.map((it, i) => [i + 1, it.service_name, it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]) || []
    autoTable(doc, {
      startY: 80,
      head: [['Item', 'Descrição do Serviço', 'Valor']],
      body: tableData,
      foot: [['', 'VALOR TOTAL:', budget.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    })

    // Observações
    const finalY = doc.lastAutoTable?.finalY || 150
    doc.setFontSize(10)
    doc.text('Observações:', 20, finalY + 15)
    const splitText = doc.splitTextToSize(budget.description, 170)
    doc.text(splitText, 20, finalY + 22)

    // Baixar PDF
    doc.save(`Orcamento_${budget.clients?.name}.pdf`)
  }

  const getIcon = (iconName) => {
    switch(iconName) {
      case 'Lamp': return Lamp
      case 'Zap': return Zap
      case 'Shield': return Shield
      default: return Plus
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Coluna de Serviços e Histórico */}
      <div className="lg:col-span-8 space-y-10">
        <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Catálogo de Referência</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Médias Parametrizadas de Mercado</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {REFERENCE_SERVICES.map((cat, idx) => {
              const Icon = getIcon(cat.icon)
              const isOpen = expandedCategory === idx
              return (
                <div key={idx} className="border border-slate-100 rounded overflow-hidden">
                  <button 
                    onClick={() => setExpandedCategory(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-slate-100 flex items-center justify-center text-indigo-600 bg-slate-50">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{cat.category}</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                  </button>
                  {isOpen && (
                    <div className="p-2 space-y-1 bg-slate-50/30">
                      {cat.services.map((s, sIdx) => (
                        <div key={sIdx} className="group flex items-center justify-between p-3 rounded hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer" onClick={() => addToBuilder(s)}>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{s.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{s.range}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-900 font-mono">R$ {s.price.toFixed(2)}</span>
                            <PlusCircle className="w-4 h-4 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Controle de Orçamentos</h3>
          </div>
          <div className="p-0">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-3">Cliente / Meta</th>
                      <th className="px-6 py-3 text-center">Valor</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {loading ? (
                      [1,2].map(i => <tr key={i} className="animate-pulse"><td colSpan="4" className="px-6 py-5"><div className="h-4 bg-slate-50 rounded"></div></td></tr>)
                   ) : budgets.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhum registro de orçamento em arquivo.</td></tr>
                   ) : (
                      budgets.map(b => {
                        const style = statusStyles[b.status] || statusStyles['Pendente']
                        const StatusIcon = style.icon
                        return (
                          <tr key={b.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900 tracking-tight">{b.clients?.name || '---'}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{b.title}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-900">
                               R$ {b.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-5 text-center">
                               <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${style.bg} ${style.text} ${style.border}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">{b.status}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                               <div className="flex items-center justify-end gap-3">
                                  <select 
                                    value={b.status}
                                    onChange={(e) => updateStatus(b.id, e.target.value)}
                                    className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 outline-hidden bg-white focus:border-indigo-400"
                                  >
                                    {Object.keys(statusStyles).map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <button onClick={() => generatePDF(b)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors" title="Exportar Log"><Printer className="w-4 h-4" /></button>
                                  <button onClick={() => deleteBudget(b.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                               </div>
                            </td>
                          </tr>
                        )
                      })
                   )}
                </tbody>
             </table>
          </div>
        </section>
      </div>

      {/* Barra Lateral do Construtor */}
      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded border border-slate-800 p-8 text-white shadow-xl sticky top-24 overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ClipboardList className="w-16 h-16" /></div>
          
          <div className="relative flex flex-col h-full">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-8 border-b border-white/5 pb-4">Construtor de Proposta</h3>

            <div className="flex-1 space-y-3 min-h-[250px]">
              {builderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
                  <Search className="w-6 h-6 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed">Adicione comandos<br/>pelo catálogo técnico</p>
                </div>
              ) : (
                builderItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded hover:bg-white/10 transition-colors group/item">
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[10px] font-bold truncate pr-4 text-white uppercase tracking-tight">{item.name}</span>
                       <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">Un: R$ {item.price.toFixed(0)}</span>
                    </div>
                    <button onClick={() => removeFromBuilder(item.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex justify-between items-end mb-8">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em]">Valor Consolidado</span>
                <span className="text-3xl font-bold tracking-tighter">R$ {totalBuilderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <button 
                onClick={handleUseBuilder}
                disabled={builderItems.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded font-black uppercase tracking-[0.1em] text-[10px] shadow-lg transition-all active:scale-[0.98] disabled:opacity-20"
              >
                Gerar Orçamento Técnico
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Finalização de Registro</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente Associado</label>
                  <select 
                    required
                    value={newBudget.client_id}
                    onChange={e => setNewBudget({...newBudget, client_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione na base de clientes...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Título do Projeto</label>
                  <input 
                    required
                    type="text"
                    value={newBudget.title}
                    onChange={e => setNewBudget({...newBudget, title: e.target.value})}
                    placeholder="Ex: Instalação Padrão Residencial"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Liquidado (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newBudget.total_value}
                      onChange={e => setNewBudget({...newBudget, total_value: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Estimado (h)</label>
                    <input 
                      required
                      type="number"
                      step="0.5"
                      value={newBudget.service_duration_hours}
                      onChange={e => setNewBudget({...newBudget, service_duration_hours: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white py-4 rounded font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-[0.98]"
              >
                {saving ? 'PROCESSANDO REGISTRO...' : 'SALVAR NO SISTEMA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Budgets
