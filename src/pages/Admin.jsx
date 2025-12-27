import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ShieldAlert, 
  Lock, 
  Users, 
  FileText, 
  MessageSquare, 
  Package, 
  LogOut,
  Star,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Database,
  BarChart3
} from 'lucide-react'

/**
 * Componente Admin
 * Console de gerenciamento interno da aplicação.
 * Recursos: Login, Métricas do Sistema, Rastreamento de Atividade do Usuário, Revisão de Feedback e Gerenciamento de Produtos.
 */
const Admin = () => {
  // Estado de Autenticação
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginData, setLoginData] = useState({ username: '', password: '' })

  // Estado de Métricas do Dashboard e Logs
  const [metrics, setMetrics] = useState({ total_users: 0, total_clients: 0, total_quotes: 0 }) // Estatísticas de alto nível
  const [userMetrics, setUserMetrics] = useState([]) // Métricas por usuário
  const [salesLogs, setSalesLogs] = useState([]) // Logs de Vendas (Kiwify)
  const [feedbacks, setFeedbacks] = useState([]) // Arquivo de feedbacks dos usuários
  
  // Estado de Gerenciamento de Produtos
  const [products, setProducts] = useState([]) // Produtos recomendados para os usuários
  const [editingProduct, setEditingProduct] = useState(null) // ID do produto sendo editado
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'iluminacao',
    image_url: '',
    affiliate_link: '',
    description: ''
  })

  // Estado da Interface (UI)
  const [loading, setLoading] = useState(false)

  /**
   * Verifica sessão de admin existente ao montar
   */
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true'
    if (loggedIn) {
      setIsAdmin(true)
      loadAdminData()
    }
  }, [])

  /**
   * handleLogin
   * Verifica as credenciais em relação à tabela 'admin_users'.
   * Usa sessionStorage para persistência durante a sessão.
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', loginData.username)
      .eq('password', loginData.password)
      .single()

    if (data && !error) {
      sessionStorage.setItem('isAdminLoggedIn', 'true')
      setIsAdmin(true)
      loadAdminData()
    } else {
      alert('Credenciais administrativas inválidas.')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn')
    setIsAdmin(false)
  }

  /**
   * loadAdminData
   * Buscas agregadas para todas as seções do dashboard administrativo.
   * Utiliza funções RPC do Supabase para cálculos de métricas complexas.
   */
  const loadAdminData = async () => {
    // 1. Busca Métricas Globais do Dashboard (Total de Usuários, etc.)
    const { data: m } = await supabase.rpc('get_admin_dashboard_metrics')
    if (m) setMetrics(m)

    // 2. Busca Métricas Detalhadas de Uso do Usuário
    const { data: um } = await supabase.rpc('get_user_metrics')
    if (um) setUserMetrics(um)

    // 3. Busca Todos os Feedbacks dos Usuários
    const { data: fb } = await supabase.rpc('get_all_feedbacks')
    if (fb) setFeedbacks(fb)

    // 4. Busca Logs de Vendas
    const { data: sl } = await supabase
      .from('sales_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (sl) setSalesLogs(sl)

    // 5. Busca Lista de Produtos Recomendados
    const { data: p } = await supabase.from('recommended_products').select('*').order('created_at', { ascending: false })
    if (p) setProducts(p)
  }

  /**
   * handleProductSubmit
   * Lida com a criação ou atualização de registros em 'recommended_products'.
   */
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    let error
    if (editingProduct) {
      // Modo de Atualização
      ({ error } = await supabase.from('recommended_products').update(productForm).eq('id', editingProduct))
    } else {
      // Modo de Criação
      ({ error } = await supabase.from('recommended_products').insert(productForm))
    }

    if (!error) {
      alert('Produto salvo com sucesso!')
      setProductForm({ title: '', category: 'iluminacao', image_url: '', affiliate_link: '', description: '' })
      setEditingProduct(null)
      loadAdminData()
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
    setLoading(false)
  }

  const deleteProduct = async (id) => {
    if (!confirm('Excluir produto?')) return
    await supabase.from('recommended_products').delete().eq('id', id)
    loadAdminData()
  }

  const deleteSalesLog = async (id) => {
    if (!confirm('Tem certeza que deseja apagar este log de auditoria?')) return
    
    setLoading(true)
    const { error } = await supabase.from('sales_logs').delete().eq('id', id)
    
    if (error) {
      alert('Erro ao excluir log: ' + error.message)
    } else {
      loadAdminData()
    }
    setLoading(false)
  }

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`ATENÇÃO: Você está prestes a excluir o usuário ${userEmail}.\n\nIsso apagará TODOS os dados (Projetos, Clientes, etc) e a conta de acesso.\n\nTem certeza absoluta?`)) return

    setLoading(true)
    // Tenta chamar uma função RPC segura (admin_delete_user)
    // O usuário precisará criar essa função no Supabase
    const { error } = await supabase.rpc('admin_delete_user', { user_id: userId })

    if (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário. Verifique se a função "admin_delete_user" existe no Supabase.\n\nDetalhe: ' + error.message)
    } else {
      alert(`Usuário ${userEmail} removido com sucesso.`)
      loadAdminData()
    }
    setLoading(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white p-12 rounded border border-slate-200 w-full max-w-sm space-y-8 shadow-xs">
           <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                 <ShieldAlert className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Acesso Restrito</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Admin Terminal v2.0</p>
           </div>
           
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário Master</label>
                 <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                       required
                       type="text" 
                       value={loginData.username}
                       onChange={e => setLoginData({...loginData, username: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded pl-12 pr-6 py-3 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                    />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chave de Segurança</label>
                 <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                       required
                       type="password" 
                       value={loginData.password}
                       onChange={e => setLoginData({...loginData, password: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded pl-12 pr-6 py-3 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                    />
                 </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
              </button>
           </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* Cabeçalho Admin */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terminal de Controle Mestre</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel Administrativo</h1>
            <p className="text-sm text-slate-500 font-medium">Monitoramento de tráfego, conversão e métricas de sistema.</p>
         </div>
         <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-xs active:scale-95">
            <LogOut className="w-4 h-4" />
            Sair do Terminal
         </button>
      </header>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-200 rounded overflow-hidden shadow-xs">
         {[
           { label: 'USUÁRIOS ATIVOS', value: metrics.total_users, icon: Users },
           { label: 'ATIVOS CRM', value: metrics.total_clients, icon: Database },
           { label: 'CONTRATOS GERADOS', value: metrics.total_quotes, icon: BarChart3 }
         ].map((m, i) => (
           <div key={i} className={`bg-white p-8 ${i !== 2 ? 'sm:border-r border-slate-200' : ''} ${i >= 1 ? 'border-t sm:border-t-0 border-slate-200' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                 <m.icon className="w-4 h-4 text-slate-300" />
              </div>
              <div className="text-4xl font-bold text-slate-900 tracking-tighter">{m.value}</div>
              <div className="text-[9px] font-bold text-emerald-500 uppercase mt-1 tracking-wider">+2.4% vs last cycle</div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         
         {/* Gerenciamento de Recomendações */}
         <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
               <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Catálogo de Indicações</h3>
               <button onClick={() => { setEditingProduct(null); setProductForm({title:'', category: 'iluminacao', image_url: '', affiliate_link: '', description: ''}) }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Plus className="w-4 h-4" />
               </button>
            </div>
            
            <div className="p-8">
               <form onSubmit={handleProductSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Título Comencial</label>
                     <input 
                        required
                        type="text" 
                        value={productForm.title}
                        onChange={e => setProductForm({...productForm, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 transition-all"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classificação</label>
                        <select 
                           value={productForm.category}
                           onChange={e => setProductForm({...productForm, category: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 transition-all"
                        >
                           <option value="iluminacao">Iluminação</option>
                           <option value="tomadas">Tomadas</option>
                           <option value="disjuntores">Proteção</option>
                           <option value="cabos">Condutores</option>
                           <option value="infra">Infraestrutura</option>
                           <option value="outros">Outros</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Imagem Assets</label>
                        <input 
                           required
                           type="url" 
                           value={productForm.image_url}
                           onChange={e => setProductForm({...productForm, image_url: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 transition-all font-mono"
                        />
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Redirecionamento Tracking</label>
                     <input 
                        required
                        type="url" 
                        value={productForm.affiliate_link}
                        onChange={e => setProductForm({...productForm, affiliate_link: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 transition-all font-mono"
                     />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-bold uppercase tracking-widest text-[10px] transition-all shadow-sm"
                  >
                    {editingProduct ? 'ATUALIZAR REGISTRO' : 'CONFIRMAR CADASTRO'}
                  </button>
               </form>

               <div className="mt-12 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Registros Ativos</h4>
                  {products.map(p => (
                     <div key={p.id} className="flex items-center gap-4 bg-white p-3 rounded border border-slate-100 hover:border-indigo-200 transition-all group">
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover bg-slate-50 border border-slate-200" />
                        <div className="flex-1 overflow-hidden">
                           <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{p.category}</div>
                           <h4 className="text-xs font-bold text-slate-900 truncate">{p.title}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                           <button onClick={() => { setEditingProduct(p.id); setProductForm(p) }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                           <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         <div className="space-y-12">
            {/* Hub de Atividade do Usuário */}
            <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
               <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Matriz de Utilização</h3>
               </div>
               <div className="p-0">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           <th className="px-8 py-4">Usuário / Email</th>
                           <th className="px-6 py-4 text-center">Inscritos</th>
                           <th className="px-6 py-4 text-center">Docs</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {userMetrics.map((u, i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-4">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">{u.user_email}</span>
                                    {/* Botão de Excluir Usuário (Invisível até hover) */}
                                    <button 
                                        onClick={() => deleteUser(u.user_id || u.id, u.user_email)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                        title="Excluir Usuário"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600">
                                 {u.client_count}
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600">
                                 {u.quote_count}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </section>

            {/* Histórico de Vendas (Sales Logs) */}
            <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Auditoria de Vendas (Kiwify)</h3>
                  <Activity className="w-4 h-4 text-slate-300" />
               </div>
               <div className="p-0">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           <th className="px-6 py-4">Data</th>
                           <th className="px-6 py-4">Cliente</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Mensagem</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {salesLogs.length === 0 ? (
                           <tr><td colSpan="4" className="p-8 text-center text-[10px] font-bold text-slate-300 uppercase italic">Nenhuma venda registrada ainda.</td></tr>
                        ) : (
                           salesLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500">
                                    {new Date(log.created_at).toLocaleDateString('pt-BR')} <span className="text-slate-300">|</span> {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                 </td>
                                 <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                       <span className="text-xs font-bold text-slate-900">{log.customer_email}</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">{log.customer_name}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide
                                       ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : ''}
                                       ${log.status === 'blocked' ? 'bg-amber-100 text-amber-700' : ''}
                                       ${log.status === 'error' ? 'bg-rose-100 text-rose-700' : ''}
                                    `}>
                                       {log.status === 'success' && ' APROVADO '}
                                       {log.status === 'blocked' && ' BLOQUEADO '}
                                       {log.status === 'error' && ' ERRO '}
                                    </span>
                                 </td>
                                 <td className="px-6 py-3 text-[10px] font-medium text-slate-500">
                                    {log.message}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => deleteSalesLog(log.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                        title="Apagar Log"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </section>

            {/* Arquivo de Feedback do Sistema */}
            <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Log de Feedback</h3>
                  <MessageSquare className="w-4 h-4 text-slate-300" />
               </div>
               <div className="p-0 max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                  {feedbacks.length === 0 ? (
                     <div className="p-12 text-center text-[10px] font-bold text-slate-300 uppercase italic">Aguardando dados de entrada...</div>
                  ) : (
                     feedbacks.map(f => (
                        <div key={f.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-all group">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center font-black text-xs text-indigo-600">
                                    {f.user_email[0].toUpperCase()}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-slate-900">{f.user_email}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-0.5 text-amber-400">
                                 {[1,2,3,4,5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= f.rating ? 'fill-current' : 'text-slate-200'}`} />)}
                              </div>
                           </div>
                           <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-200 pl-4">"{f.feedback_text}"</p>
                        </div>
                     ))
                  )}
               </div>
            </section>
         </div>
      </div>
    </div>
  )
}

export default Admin
