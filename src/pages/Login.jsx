import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Componente Login
 * Lida com a autenticação do usuário, incluindo os modos de Login e Cadastro.
 * Alterna os modos com base no estado ou parâmetros de consulta da URL.
 */
const Login = () => {
  // --- Gerenciamento de Estado ---
  const [isLoginMode, setIsLoginMode] = useState(true) // Alterna entre Login e Cadastro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' }) // Alertas de feedback (sucesso/erro)
  
  const location = useLocation()
  const navigate = useNavigate()

  /**
   * Inicialização de Modo
   * Verifica por '?action=signup' na URL para acionar automaticamente o modo de cadastro.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('action') === 'signup') {
      setIsLoginMode(false)
    }
  }, [location])

  /**
   * handleToggleMode
   * Alterna manualmente entre os formulários de Login e Cadastro.
   */
  const handleToggleMode = (e) => {
    e.preventDefault()
    setIsLoginMode(!isLoginMode)
    setMessage({ text: '', type: '' })
  }

  /**
   * handleSubmit
   * Processa o envio do formulário usando Supabase Auth.
   * Se Login: navega para /dashboard em caso de sucesso.
   * Se Cadastro: solicita ao usuário que verifique o e-mail em caso de sucesso.
   */
  /**
   * Verifica se o usuário já existe usando RPC público (workaround)
   */
  const checkUserExists = async (emailToCheck) => {
    try {
      const { data } = await supabase.rpc('get_user_metrics')
      if (data && Array.isArray(data)) {
        const userExists = data.some(u => u.user_email === emailToCheck)
        return userExists
      }
    } catch (err) {
      console.warn('RPC check ignored:', err)
    }
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      if (isLoginMode) {
        // Faz login de um usuário existente
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/dashboard')
      } else {
        // Antes de registrar, verifica existência (Pre-Check)
        const exists = await checkUserExists(email)
        if (exists) {
           throw new Error('User already registered')
        }

        // Registra um novo usuário
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            data: { plan: 'free' },
            emailRedirectTo: `${window.location.origin}/login`
          }
        })
        if (error) throw error
        setMessage({ text: 'Verifique seu e-mail para confirmar o cadastro!', type: 'success' })
      }
    } catch (error) {
      // Exibe erros de autenticação (ex: credenciais inválidas, usuário já existe)
      // Tradução de erros comuns do Supabase
      let customMessage = error.message
      if (error.message.includes('User already registered')) {
        customMessage = 'Este e-mail já está cadastrado. Por favor, faça login.'
      } else if (error.message.includes('Invalid login credentials')) {
        customMessage = 'E-mail ou senha incorretos.'
      } else if (error.message.includes('Password should be at least')) {
        customMessage = 'A senha deve ter pelo menos 6 caracteres.'
      }
      
      setMessage({ text: customMessage, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen relative flex flex-col items-center justify-center p-6">
      {/* Padrão de Fundo */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-size-[32px_32px]"></div>
      </div>

      <div className="absolute top-0 left-0 p-8 z-20">
        <Link to="/" className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xl text-slate-900 leading-tight">ProjectGrid</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Console de Engenharia</div>
            </div>
          </Link>
        </div>

        {/* Card de Login Minimalista */}
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isLoginMode ? 'Acesse sua área' : 'Comece sua jornada'}
          </h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">
            {isLoginMode ? 'Entre com suas credenciais técnicas.' : 'Crie seu ambiente de trabalho profissional.'}
          </p>

          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-3 pl-11 pr-4 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium text-sm"
                  placeholder="exemplo@empresa.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chave de Acesso</label>
                {isLoginMode && (
                  <button type="button" className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-widest">Esqueceu?</button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-3 pl-11 pr-4 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 group transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-indigo-500 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLoginMode ? 'Entrar no Sistema' : 'Confirmar Registro'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-xs font-medium">
              {isLoginMode ? 'Ainda não possui uma estação?' : 'Já possui credenciais técnicas?'}
              <button 
                onClick={handleToggleMode}
                className="ml-2 text-indigo-600 hover:text-indigo-700 font-bold tracking-tight"
              >
                {isLoginMode ? 'Cadastre-se agora' : 'Faça login'}
              </button>
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-gray-500 font-medium">
          &copy; {new Date().getFullYear()} ProjectGrid. Segurança garantida por Supabase.
        </p>
      </div>
    </div>
  )
}

export default Login
