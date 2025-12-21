import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  Star,
  ArrowUpRight
} from 'lucide-react'

/**
 * Componente Dashboard
 * Fornece uma visão geral de alto nível das métricas de negócios do usuário, 
 * projetos recentes e um sistema de feedback.
 */
const Dashboard = () => {
  // Estado de Métricas Operacionais
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    pendingQuotes: 0,
    monthlyRevenue: 0,
    approvedProjects: 0
  })

  // Estado de Projetos e Exibição
  const [projects, setProjects] = useState([]) // Projetos aprovados para o mês selecionado
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [displayedDate, setDisplayedDate] = useState(new Date()) // Controla o mês que está sendo visualizado

  // Estado do Sistema de Feedback
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [userPlan, setUserPlan] = useState('free') // free, pro, enterprise

  /**
   * Efeito para recarregar dados quando o mês exibido muda
   */
  useEffect(() => {
    // Carrega o plano do usuário
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.plan) {
        setUserPlan(user.user_metadata.plan)
      }
    })

    loadMetrics()
    loadProjects(displayedDate)
  }, [displayedDate])

  /**
   * loadMetrics
   * Busca dados agregados das tabelas 'clients' e 'quotes' do Supabase.
   * Calcula a receita mensal com base nos orçamentos aprovados.
   */
  const loadMetrics = async () => {
    try {
      // Obtém o total de clientes
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Obtém o total de orçamentos pendentes
      const { count: pendingCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendente')

      // Obtém o total de projetos aprovados
      const { count: approvedCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Aprovado')

      // Calcula a receita para o mês atual
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const { data: revenueData } = await supabase
        .from('quotes')
        .select('total_value')
        .eq('status', 'Aprovado')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)

      const totalRevenue = revenueData?.reduce((sum, q) => sum + (q.total_value || 0), 0) || 0

      // Atualiza o objeto de métricas
      setMetrics({
        totalClients: clientCount || 0,
        pendingQuotes: pendingCount || 0,
        monthlyRevenue: totalRevenue,
        approvedProjects: approvedCount || 0
      })
    } catch (err) {
      console.error('Error loading metrics:', err)
    }
  }

  /**
   * loadProjects
   * Busca a lista detalhada de projetos aprovados para um mês específico.
   */
  const loadProjects = async (date) => {
    setLoadingProjects(true)
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('quotes')
        .select('service_date, total_value, title, clients(name)')
        .eq('status', 'Aprovado')
        .gte('service_date', firstDay)
        .lte('service_date', lastDay)
        .order('service_date', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Manipuladores de Navegação de Mês
  const handlePrevMonth = () => {
    setDisplayedDate(new Date(displayedDate.getFullYear(), displayedDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setDisplayedDate(new Date(displayedDate.getFullYear(), displayedDate.getMonth() + 1, 1))
  }

  /**
   * handleSubmitFeedback
   * Envia as avaliações e comentários do usuário para a tabela 'feedbacks' do Supabase.
   */
  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setFeedbackMsg({ text: 'Selecione uma pontuação.', type: 'error' })
      return
    }

    setSubmittingFeedback(true)
    const { error } = await supabase.from('feedbacks').insert({ rating, feedback_text: feedbackText })
    setSubmittingFeedback(false)

    if (error) {
      setFeedbackMsg({ text: `Erro: ${error.message}`, type: 'error' })
    } else {
      setFeedbackMsg({ text: 'Feedback registrado com sucesso.', type: 'success' })
      setRating(0)
      setFeedbackText('')
      // Limpa a mensagem automaticamente após 5 segundos
      setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 5000)
    }
  }

  const metricCards = [
    { label: 'CLIENTES ATIVOS', value: metrics.totalClients, icon: Users, trend: '+4%' },
    { label: 'PENDÊNCIAS TÉCNICAS', value: metrics.pendingQuotes, icon: Clock, trend: '-2%' },
    { label: 'RECEITA MENSAL', value: metrics.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: DollarSign, trend: '+12%' },
    { label: 'PROJETOS CONCLUÍDOS', value: metrics.approvedProjects, icon: CheckCircle, trend: '0%' },
  ]

  return (
    <div className="space-y-12 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Informações do Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema Operacional • Estação 01</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Visão Geral de Operações</h1>
          <p className="text-sm text-slate-500 font-medium">Monitoramento em tempo real de dimensionamentos e contratos.</p>
        </div>
        <div className="flex items-center gap-3">
           {/* Botões de Exportar LOG e Novo Projeto removidos conforme solicitação */}
        </div>
      </div>

      {/* Grade de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 rounded overflow-hidden shadow-xs">
        {metricCards.map((card, i) => (
          <div key={i} className={`bg-white p-6 ${i !== metricCards.length - 1 ? 'sm:border-r border-slate-200' : ''} ${i >= 2 ? 'border-t sm:border-t-0 border-slate-200' : ''}`}>
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                <card.icon className="w-4 h-4 text-slate-300" />
             </div>
             <div className="flex items-end gap-3">
                <div className="text-2xl font-bold text-slate-900 leading-none">{card.value}</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${card.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : card.trend === '0%' ? 'bg-slate-50 text-slate-400' : 'bg-red-50 text-red-600'}`}>
                   {card.trend}
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Seção Principal de Alimentação/Tabela */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
             <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                Projetos do Período
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{projects.length}</span>
             </h3>
             <div className="flex items-center gap-2">
               <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded transition-all text-slate-400">
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 w-24 text-center">
                 {displayedDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
               </span>
               <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded transition-all text-slate-400">
                 <ChevronRight className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeto</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {loadingProjects ? (
                      [1,2,3,4].map(i => (
                         <tr key={i} className="animate-pulse">
                            <td colSpan="4" className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                         </tr>
                      ))
                   ) : projects.length === 0 ? (
                      <tr>
                         <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs font-medium italic">Nenhum registro para este período.</td>
                      </tr>
                   ) : (
                      projects.map((project, i) => (
                         <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                               <span className="text-xs font-bold text-slate-500">
                                  {new Date(project.service_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 tracking-tight">{project.title}</span>
                                  <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                               </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                               {project.clients?.name || 'Cliente comum'}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className="text-xs font-bold text-slate-900 font-mono">
                                  {Number(project.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                               </span>
                            </td>
                         </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Seção de Contexto da Barra Lateral */}
        <div className="space-y-8">
           <div className="bg-slate-50 border border-slate-200 rounded p-6">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Central de Feedback</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">Avalie o desempenho do console técnico para melhorias contínuas.</p>
              
              {feedbackMsg.text && (
                 <div className={`mb-6 p-4 rounded text-[11px] font-bold border ${
                    feedbackMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                 }`}>
                    {feedbackMsg.text}
                 </div>
              )}

              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                 <div>
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível de Satisfação</span>
                       <span className="text-[10px] font-bold text-indigo-600">{rating > 0 ? `${rating}/5` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       {[1, 2, 3, 4, 5].map((val) => (
                         <button
                           key={val}
                           type="button"
                           onMouseEnter={() => setHoverRating(val)}
                           onMouseLeave={() => setHoverRating(0)}
                           onClick={() => setRating(val)}
                           className="transition-all"
                         >
                           <Star 
                             className={`w-5 h-5 ${
                               (hoverRating || rating) >= val ? 'text-indigo-600 fill-indigo-600' : 'text-slate-300'
                             }`} 
                           />
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Observações Técnicas</label>
                    <textarea 
                       rows="4" 
                       value={feedbackText}
                       onChange={(e) => setFeedbackText(e.target.value)}
                       placeholder="Descreva problemas ou sugestões..." 
                       className="block w-full px-4 py-3 bg-white border border-slate-200 rounded text-xs focus:outline-hidden focus:border-indigo-500 transition-all font-medium placeholder:text-slate-300"
                    ></textarea>
                 </div>

                 <button 
                   type="submit" 
                   disabled={submittingFeedback}
                   className="w-full bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded transition-all shadow-sm disabled:opacity-50"
                 >
                   {submittingFeedback ? 'PROCESSANDO...' : 'REGISTRAR FEEDBACK'}
                 </button>
              </form>
           </div>

           <div className="p-6 border border-indigo-100 bg-indigo-50/30 rounded flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                 <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">
                   {userPlan === 'pro' ? 'Assinatura PRO' : 'Plano Gratuito'}
                 </div>
                 <div className="text-[11px] font-bold text-slate-900 leading-tight">
                   {userPlan === 'pro' ? 'NBR 5410 & Documentação' : 'Funcionalidades Básicas'}
                 </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:bg-white transition-colors">
                 <ArrowUpRight className="w-4 h-4" />
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
