import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  UserPlus, 
  Trash2, 
  X, 
  Search,
  MessageCircle,
  Mail,
  MoreVertical,
  AlertCircle,
  Phone,
  ChevronRight,
  Filter,
  Activity
} from 'lucide-react'
import UpgradeModal from '../components/common/UpgradeModal'

/**
 * Componente Clients (Clientes)
 * Gerencia o banco de dados de clientes, incluindo informações de contato e notas técnicas.
 * Lida com operações CRUD através do Supabase e impõe um limite de clientes.
 */
const Clients = () => {
  // Estado de Autenticação e Dados
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([]) // Lista de todos os clientes
  const [loading, setLoading] = useState(true)

  // Estado da Interface (UI)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', contact: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Constante para limitar o número de clientes por usuário
  const CLIENT_LIMIT = 3

  /**
   * Configuração Inicial
   * Busca o usuário atual e inicia o carregamento dos dados dos clientes.
   */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadClients(user.id)
    })
  }, [])

  /**
   * Carrega clientes da tabela 'clients' do Supabase
   */
  const loadClients = async (userId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    
    if (!error) setClients(data || [])
    setLoading(false)
  }

  /**
   * Adiciona um novo registro de cliente ao Supabase
   */
  const handleAddClient = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!newClient.name.trim()) return alert('Nome é obrigatório')

    // Verificação do limite de registros
    if (clients.length >= CLIENT_LIMIT) {
      setIsUpgradeModalOpen(true)
      return
    }

    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      ...newClient
    })

    if (!error) {
      // Reseta o formulário e fecha o modal em caso de sucesso
      setNewClient({ name: '', contact: '', notes: '' })
      setIsModalOpen(false)
      loadClients(user.id)
    } else {
      alert('Erro ao salvar: ' + error.message)
    }
    setSaving(false)
  }

  /**
   * Remove um registro de cliente do Supabase
   */
  const handleDeleteClient = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) loadClients(user.id)
  }

  /**
   * Propriedade computada: Lista filtrada de clientes com base no termo de busca
   */
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenAddModal = () => {
    if (clients.length >= CLIENT_LIMIT) {
      setIsUpgradeModalOpen(true)
    } else {
      setIsModalOpen(true)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base de Dados • CRM Ativo</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Clientes</h1>
          <p className="text-sm text-slate-500 font-medium">Diretório centralizado de contatos e registros técnicos.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Novo
        </button>
      </div>

      {/* Contêiner Principal */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Filtros e Estatísticas da Tabela */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar por nome, email ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded pl-11 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-300"
              />
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className={`w-2.5 h-2.5 rounded-full ${clients.length >= CLIENT_LIMIT ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{clients.length} / {CLIENT_LIMIT} slots</span>
              </div>
              <button className="flex items-center gap-2 p-2 text-slate-400 hover:text-slate-900 transition-colors">
                 <Filter className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase">Filtros</span>
              </button>
           </div>
        </div>

        {/* Grade de Dados Técnicos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50/50">
                <th className="px-8 py-4">Identificação</th>
                <th className="px-8 py-4">Canais de Contato</th>
                <th className="px-8 py-4">Logs e Observações</th>
                <th className="px-8 py-4 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1,2,3,4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-8 py-6"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                     <div className="text-slate-200 mb-4 flex justify-center"><Users className="w-12 h-12" /></div>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">A base de dados retornou consulta vazia.</p>
                     <button onClick={handleOpenAddModal} className="mt-4 text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">Adicionar Entrada</button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xs font-black group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                             {client.name[0].toUpperCase()}
                          </div>
                          <div>
                             <div className="text-xs font-bold text-slate-900 tracking-tight">{client.name}</div>
                             <div className="text-[9px] font-bold text-slate-400 uppercase">Residencial / Comercial</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-600 font-mono">{client.contact || 'N/A'}</span>
                          {client.contact && (
                             <div className="flex gap-3">
                                <a href={`mailto:${client.contact}`} className="text-slate-300 hover:text-indigo-600 transition-colors">
                                   <Mail className="w-3.5 h-3.5" />
                                </a>
                                <a href={`https://wa.me/${client.contact.replace(/\D/g,'')}`} className="text-slate-300 hover:text-emerald-500 transition-colors">
                                   <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a href={`tel:${client.contact}`} className="text-slate-300 hover:text-slate-600 transition-colors">
                                   <Phone className="w-3.5 h-3.5" />
                                </a>
                             </div>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[11px] text-slate-400 font-medium max-w-xs truncate leading-relaxed">
                          {client.notes || '—'}
                       </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><Activity className="w-4 h-4" /></button>
                          <button 
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aviso de Capacidade */}
      {clients.length >= CLIENT_LIMIT && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setIsUpgradeModalOpen(true)}>
           <div className="flex items-center gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                Plano Básico: Limite de {CLIENT_LIMIT} clientes atingido. Clique para liberar acesso ilimitado.
              </p>
           </div>
           <ChevronRight className="w-4 h-4 text-amber-400" />
        </div>
      )}

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        limitName="clientes"
        currentCount={clients.length}
      />

      {/* Modal de Registro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Registro de Novo Ativo</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all">
                  <X className="w-4 h-4" />
               </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-8 space-y-6">
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome do Cliente</label>
                  <input 
                    required
                    type="text" 
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Identificação nominal..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
               </div>
               
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal de Contato</label>
                  <input 
                    type="text" 
                    value={newClient.contact}
                    onChange={e => setNewClient({...newClient, contact: e.target.value})}
                    placeholder="Email ou Telefone/WhatsApp..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-mono"
                  />
               </div>

               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas Técnicas</label>
                  <textarea 
                    rows="4"
                    value={newClient.notes}
                    onChange={e => setNewClient({...newClient, notes: e.target.value})}
                    placeholder="Histórico, endereço ou especificações..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 font-bold text-xs text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
               </div>

               <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white py-4 rounded font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-[0.98]"
               >
                  {saving ? 'PROCESSANDO REGISTRO...' : 'SALVAR NO CRM'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clients

