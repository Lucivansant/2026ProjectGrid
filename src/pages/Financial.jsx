import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Minus,
  Calendar,
  Filter,
  Trash2,
  Wallet
} from 'lucide-react'

const Financial = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, income, expense
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // New Transaction Form State
  const [newTrans, setNewTrans] = useState({
    type: 'expense', // or income
    category: '', 
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Metrics
  const [metrics, setMetrics] = useState({
     totalIncome: 0,
     totalExpense: 0,
     balance: 0,
     pendingIncome: 0
  })

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
     calculateMetrics()
  }, [transactions])

  const loadTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
       console.error('Error loading transactions:', error)
    } else {
       setTransactions(data || [])
    }
    setLoading(false)
  }

  const calculateMetrics = () => {
     const income = transactions
        .filter(t => t.type === 'income' && t.status !== 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0)
     
     const expense = transactions
        .filter(t => t.type === 'expense') // Expenses usually don't wait for confirmation in this simple model, or maybe they do? adhering to simple flow.
        .reduce((sum, t) => sum + Number(t.amount), 0)

     const pending = transactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount), 0)

     setMetrics({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        pendingIncome: pending
     })
  }

  const handleSave = async (e) => {
     e.preventDefault()
     if (!newTrans.amount || !newTrans.category) return

     const { error } = await supabase.from('transactions').insert({
        ...newTrans,
        status: 'completed', // Manual entry is always completed
        user_id: (await supabase.auth.getUser()).data.user.id
     })

     if (error) {
        alert('Erro ao salvar: ' + error.message)
     } else {
        setIsModalOpen(false)
        setNewTrans({ ...newTrans, description: '', amount: '', category: '' })
        loadTransactions()
     }
  }

  const handleConfirm = async (id) => {
    const { error } = await supabase.from('transactions').update({ status: 'completed' }).eq('id', id)
    if (error) {
       alert('Erro ao confirmar: ' + error.message)
    } else {
       loadTransactions()
    }
  }

  const handleDelete = async (id) => {
     if (!confirm('Deseja excluir este registro?')) return
     await supabase.from('transactions').delete().eq('id', id)
     loadTransactions()
  }

  const filteredTransactions = transactions.filter(t => filter === 'all' ? true : t.type === filter)

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
       
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão Financeira</h1>
            <p className="text-sm text-slate-500 font-medium">Controle de fluxo de caixa e despesas operacionais.</p>
          </div>
          <div className="flex gap-3">
             {metrics.pendingIncome > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">
                      Pendente: R$ {metrics.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </span>
                </div>
             )}
             <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
             >
                <Plus className="w-4 h-4" />
                Novo Lançamento
             </button>
          </div>
       </div>

       {/* Cards de Resumo */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entradas (Confirmadas)</span>
                <div className="p-2 bg-emerald-50 rounded-full text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
             </div>
             <div className="text-2xl font-black text-slate-900 tracking-tight">
                R$ {metrics.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saídas (Mês)</span>
                <div className="p-2 bg-red-50 rounded-full text-red-600"><TrendingDown className="w-4 h-4" /></div>
             </div>
             <div className="text-2xl font-black text-slate-900 tracking-tight">
                R$ {metrics.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </div>
          </div>

          <div className={`p-6 rounded-xl border shadow-sm ${metrics.balance >= 0 ? 'bg-indigo-900 border-indigo-800 text-white' : 'bg-red-900 border-red-800 text-white'}`}>
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Saldo Disponível</span>
                <div className="p-2 bg-white/10 rounded-full text-white"><Wallet className="w-4 h-4" /></div>
             </div>
             <div className="text-2xl font-black tracking-tight">
                R$ {metrics.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </div>
          </div>
       </div>

       {/* Lista de Transações */}
       <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
             <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                   value={filter} 
                   onChange={(e) => setFilter(e.target.value)}
                   className="bg-transparent text-xs font-bold text-slate-600 uppercase tracking-wide border-none outline-hidden cursor-pointer hover:text-indigo-600"
                >
                   <option value="all">Todas as Movimentações</option>
                   <option value="income">Apenas Entradas</option>
                   <option value="expense">Apenas Saídas</option>
                </select>
             </div>
          </div>

          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-slate-100">
                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição / Categoria</th>
                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                   <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs italic">Carregando dados financeiros...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                   <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhuma movimentação registrada.</td></tr>
                ) : (
                   filteredTransactions.map(t => (
                      <tr key={t.id} className={`hover:bg-slate-50/80 transition-colors group ${t.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                         <td className="px-6 py-4 text-xs font-medium text-slate-500 font-mono">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{t.description || 'Sem descrição'}</span>
                                  {t.status === 'pending' && (
                                     <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Pendente</span>
                                  )}
                               </div>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.category}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <span className={`text-xs font-black font-mono ${t.status === 'pending' ? 'text-slate-400' : t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                               {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               {t.status === 'pending' && (
                                  <button onClick={() => handleConfirm(t.id)} className="text-emerald-500 hover:text-emerald-700 transition-colors font-bold text-[10px] uppercase tracking-widest border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50">
                                     Confirmar Recebimento
                                  </button>
                               )}
                               <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))
                )}
             </tbody>
          </table>
       </div>

       {/* Modal de Lançamento */}
       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Novo Lançamento</h3>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     type="button"
                     onClick={() => setNewTrans({...newTrans, type: 'income'})}
                     className={`p-4 rounded border text-xs font-bold uppercase tracking-widest transition-all ${newTrans.type === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                   >
                     Entrada
                   </button>
                   <button 
                     type="button"
                     onClick={() => setNewTrans({...newTrans, type: 'expense'})}
                     className={`p-4 rounded border text-xs font-bold uppercase tracking-widest transition-all ${newTrans.type === 'expense' ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                   >
                     Saída
                   </button>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Valor (R$)</label>
                   <input 
                      required
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={newTrans.amount}
                      onChange={e => setNewTrans({...newTrans, amount: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-mono font-bold text-slate-900 text-lg outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data</label>
                     <input 
                        required
                        type="date" 
                        value={newTrans.date}
                        onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500"
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                     <select 
                        required
                        value={newTrans.category}
                        onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500"
                     >
                        <option value="">Selecione...</option>
                        {newTrans.type === 'income' ? (
                           <>
                              <option value="Serviço">Serviço</option>
                              <option value="Projeto">Projeto</option>
                              <option value="Consultoria">Consultoria</option>
                              <option value="Outros">Outras Receitas</option>
                           </>
                        ) : (
                           <>
                              <option value="Material">Material</option>
                              <option value="Combustível">Combustível</option>
                              <option value="Alimentação">Alimentação</option>
                              <option value="Ajudante">Ajudante</option>
                              <option value="Ferramentas">Ferramentas</option>
                              <option value="Outros">Outros Gastos</option>
                           </>
                        )}
                     </select>
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descrição</label>
                   <input 
                      type="text" 
                      placeholder="Ex: Instalação Dr. Roberto..."
                      value={newTrans.description}
                      onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                   />
                </div>

                <div className="pt-2">
                   <button 
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded font-bold uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-[0.98]"
                   >
                      Confirmar Lançamento
                   </button>
                </div>
             </form>
           </div>
         </div>
       )}
    </div>
  )
}

export default Financial
