import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  Zap, 
  LayoutDashboard, 
  Calculator, 
  FileText, 
  Users, 
  LogOut,
  Menu,
  X,
  Gauge,
  ChevronLeft,
  Search,
  Settings,
  Ruler,
  DollarSign
} from 'lucide-react'

/**
 * Componente AppLayout
 * A estrutura principal para a aplicação autenticada.
 * Inclui a barra lateral de navegação (desktop/mobile), barra superior e a área de visualização principal.
 */
const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // --- Estado ---
  const [user, setUser] = useState(null) // Usuário autenticado atual
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Alternância da barra lateral (Desktop)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // Alternância do menu móvel (Mobile)

  /**
   * Busca as informações do usuário ao montar para exibir na seção de perfil.
   */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  /**
   * Finaliza a sessão do usuário e redireciona para a página inicial (landing page).
   */
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Configuração dos links de navegação principal
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Dimensionamento', icon: Calculator, path: '/calculator' },
    { label: 'Levantamento', icon: Gauge, path: '/load-survey' },
    { label: 'Projetos 2D', icon: Ruler, path: '/floor-plan' },
    { label: 'Orçamentos', icon: FileText, path: '/budgets' },
    { label: 'Financeiro', icon: DollarSign, path: '/financial' },
    { label: 'Clientes', icon: Users, path: '/clients' },
  ]

  return (
    <div className="min-h-screen bg-white flex text-slate-900 font-sans selection:bg-indigo-50 selection:text-indigo-700">
      
      {/* Barra Lateral - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 bg-slate-50 border-r border-slate-200 transition-all duration-300 hidden lg:flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200 mb-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white/10" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <span className="font-bold text-sm tracking-tight text-slate-900">ProjectGrid</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all group"
           >
             <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-red-500" />
             {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Sair</span>}
           </button>
        </div>

        {/* Botão de Alternância (Toggle) */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Contêiner Principal */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        
        {/* Barra Superior */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-6">
           <div className="flex items-center gap-4 lg:hidden">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-500">
                 <Menu className="w-6 h-6" />
              </button>
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
                 <Zap className="w-4 h-4 text-white" />
              </div>
           </div>

           <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded px-3 py-1.5 w-96 group focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/20 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input type="text" placeholder="Pesquisar projetos, clientes..." className="bg-transparent border-none outline-hidden text-xs text-slate-600 w-full font-medium" />
              <span className="text-[10px] font-bold text-slate-300 border border-slate-200 px-1 rounded bg-white">⌘K</span>
           </div>

           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
                 {/* Ícone de sino de notificação removido conforme solicitação */}
                 <Link to="/settings" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded block">
                    <Settings className="w-4 h-4" />
                 </Link>
              </div>

              <div className="flex items-center gap-3 pl-2">
                 <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-bold text-slate-900 leading-none mb-0.5">{user?.email?.split('@')[0]}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Status: Online</div>
                 </div>
                 <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
                    {user?.email?.[0].toUpperCase()}
                 </div>
              </div>
           </div>
        </header>

        {/* Área de Visualização (Viewport) */}
        <main className="flex-1 p-6 lg:p-10 bg-white">
           <Outlet />
        </main>
      </div>

      {/* Painel do Menu Móvel (Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed top-0 left-0 w-72 h-full bg-white shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg">ProjectGrid</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold uppercase tracking-widest transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppLayout
