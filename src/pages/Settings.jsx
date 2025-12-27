import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, User, LifeBuoy, Shield, Lock, Eye, EyeOff, MessageCircle, Crown } from 'lucide-react'

const Settings = () => {
  const [user, setUser] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user?.email) {
          fetchTempPassword(user.email)
      }
    })
  }, [])

  const fetchTempPassword = async (email) => {
      const { data, error } = await supabase
        .from('payment_temp_access')
        .select('temp_password')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (data && data.temp_password) {
          setTempPassword(data.temp_password)
      }
  }

  const currentPlan = user?.user_metadata?.plan === 'pro' ? 'PRO' : 'FREE'

  return (
    <div className="space-y-8">
       {/* Header */}
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Configurações</h1>
            <p className="text-sm font-medium text-slate-500">Gerencie sua conta e obtenha suporte.</p>
          </div>
       </div>

       <div className="grid md:grid-cols-2 gap-8">
          {/* Cartão de Perfil */}
          <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                   <User className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Perfil de Usuário</h2>
                   <p className="text-xs text-slate-500 font-bold">Credenciais de Acesso</p>
                </div>
             </div>

             <div className="space-y-6">
                
                {/* PLANO ATUAL */}
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Plano Atual</label>
                   <div className={`flex items-center gap-3 p-3 border rounded text-sm font-black tracking-widest ${
                       currentPlan === 'PRO' 
                       ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                       : 'bg-slate-50 border-slate-200 text-slate-500'
                   }`}>
                      <Crown className={`w-4 h-4 ${currentPlan === 'PRO' ? 'fill-indigo-700' : ''}`} />
                      {currentPlan}
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Registrado</label>
                   <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-slate-900 font-mono">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {user?.email || 'Carregando...'}
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                   <div className="relative flex items-center">
                       <div className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900 font-mono">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span className={showPassword ? "" : "blur-[2px] select-none"}>
                              {tempPassword ? (showPassword ? tempPassword : "••••••••••••") : (showPassword ? "Oculta (Criptografada)" : "••••••••••••")}
                          </span>
                       </div>
                       <button 
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-3 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                         title={showPassword ? "Ocultar" : "Mostrar"}
                       >
                           {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                       </button>
                   </div>
                   {!tempPassword && (
                       <p className="text-[10px] text-slate-400 mt-1 pl-1">
                           Sua senha é criptografada e não pode ser exibida. 
                           <a href="/update-password" className="text-indigo-600 hover:underline ml-1">Redefinir?</a>
                       </p>
                   )}
                   {tempPassword && (
                       <p className="text-[10px] text-emerald-600 mt-1 pl-1 font-bold">
                           Senha provisória disponível.
                       </p>
                   )}
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ID da Conta</label>
                   <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-500 font-mono">
                      <Shield className="w-4 h-4 text-slate-400" />
                      {user?.id || '...'}
                   </div>
                </div>
             </div>
          </section>

          {/* Cartão de Suporte */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-white relative overflow-hidden">
             {/* Background Pattern */}
             <div className="absolute top-0 right-0 p-12 opacity-5">
                <LifeBuoy className="w-64 h-64" />
             </div>

             <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <MessageCircle className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Central de Suporte</h2>
                      <p className="text-xs text-white/50 font-bold">Precisa de ajuda com o sistema?</p>
                   </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-8">
                   Nossa equipe técnica especializada está pronta para tirar suas dúvidas sobre dimensionamentos, levantamentos ou uso da plataforma através do WhatsApp.
                </p>

                <div className="space-y-4">
                   <a 
                     href="https://wa.me/5567996960056" 
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                   >
                     <MessageCircle className="w-4 h-4" />
                     Chamar no WhatsApp
                   </a>
                   <p className="text-center text-[10px] text-white/30 uppercase tracking-widest">
                      Atendimento Humanizado
                   </p>
                </div>
             </div>
          </section>
       </div>
    </div>
  )
}

export default Settings
