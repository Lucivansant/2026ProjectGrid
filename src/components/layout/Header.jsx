import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Componente Header (Cabeçalho)
 * Exibido no topo das páginas públicas (landing pages).
 * Apresenta links de navegação e botões de Chamada para Ação (CTA) para Login e Cadastro.
 */
const Header = () => {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
              <Zap className="w-4 h-4 text-white fill-white/10" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg tracking-tight text-slate-900">ProjectGrid</span>
              <span className="ml-1.5 text-[10px] text-indigo-600 font-bold px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded">PRO</span>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          <a href="#features" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
            Funcionalidades
          </a>
          <a href="#testimonials" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
            Comunidade
          </a>
        </nav>

        <div className="flex items-center gap-5">
          <Link to="/login" className="hidden sm:block text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
            Login
          </Link>
          <Link to="/login?action=signup" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm border border-indigo-500 active:scale-95 uppercase tracking-widest">
            Criar Conta Free
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
