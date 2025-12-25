import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

/**
 * Página UpdatePassword
 * Permite que o usuário defina uma nova senha.
 * Usada no fluxo de "Esqueci minha senha" e no fluxo de "Convite" (Kiwify).
 */
const UpdatePassword = () => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica se o usuário tem uma sessão válida (o link do email já faz o login automaticamente)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMessage({ 
          text: 'Link inválido ou expirado. Por favor, solicite um novo link.', 
          type: 'error' 
        })
      }
    })
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    if (password.length < 6) {
      setMessage({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setMessage({ text: 'Senha definida com sucesso! Redirecionando...', type: 'success' })
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (error) {
      setMessage({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 text-center space-y-4 bg-slate-50 border-b border-slate-100">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 transform rotate-3">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Definir Senha de Acesso</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Segurança da Conta</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {message.text && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 text-xs font-bold border ${
                            message.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nova Senha</label>
                            <input 
                                required
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 font-bold text-slate-900 outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                            />
                            <p className="text-[10px] text-slate-400 font-medium pl-1">Mínimo de 6 caracteres</p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || message.type === 'error'}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest py-4 rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : 'Confirmar e Acessar'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            </div>
            
            <p className="text-center mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Protegido por criptografia Supabase Auth
            </p>
        </div>
    </div>
  )
}

export default UpdatePassword
