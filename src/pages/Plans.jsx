import { useState, useEffect } from 'react'
import { Check, X, Star, Zap, Shield, TrendingUp, Clock, FileCheck, ArrowLeft, UserCheck, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Plans = ({ isInternal = false }) => {
  const [userEmail, setUserEmail] = useState('')
  const [userPlan, setUserPlan] = useState('free') // Default to free
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email)
        // Check metadata for plan, fallback to 'free'
        setUserPlan(user.user_metadata?.plan || 'free')
      }
    })
  }, [])

  const handleCheckout = async () => {
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // If not logged in, redirect to login with return intent
      window.location.href = `/login?redirect=/dashboard/plans` // Adjusted for where Plans usually is
      return
    }

    try {
      // 2. Call Edge Function to get Stripe Link
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: 'price_1Qd...', // USER_MUST_UPDATE: Replace with actual Stripe Price ID (e.g., price_1Mc...)
          successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.href}`,
        },
      })

      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }

    } catch (error) {
      console.error('Checkout error:', error)
      alert('Erro ao iniciar pagamento: ' + error.message)
    }
  }

  return (
    <div className={`bg-white min-h-screen font-sans text-slate-900 selection:bg-indigo-50 selection:text-indigo-700 ${isInternal ? '' : ''}`}>
      
      {/* Custom Header for Plans Page - Only show if NOT internal */}
      {!isInternal && (
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                    <Zap className="w-4 h-4 text-white fill-white/10" />
                </div>
                <div className="hidden sm:block">
                    <span className="font-bold text-lg tracking-tight text-slate-900">ProjectGrid</span>
                    <span className="ml-1.5 text-[10px] text-indigo-600 font-bold px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded">PRO</span>
                </div>
            </Link>

            <div>
                <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm border border-indigo-500 active:scale-95 uppercase tracking-widest">
                    Login
                </Link>
            </div>
        </div>
      </header>
      )}

      <main className="max-w-5xl mx-auto px-6 space-y-16 pb-20">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 pt-16 flex flex-col items-center">
          {!isInternal && (
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-2 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
          </Link>
          )}
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
             <Star className="w-3 h-3" />
             Oferta de Lançamento
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Deixe de ser "o eletricista"<br/>e vire <span className="text-indigo-600">uma empresa.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            O ProjectGrid Pro não é um gasto, é a ferramenta que transforma seus orçamentos de "papel de pão" em contratos fechados.
          </p>
        </div>

        {/* Tabela de Preços (Cards) */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
           
           {/* Plano Gratuito */}
           <div className={`bg-white border rounded-2xl p-8 relative ${userPlan === 'free' ? 'border-2 border-slate-900 shadow-xl' : 'border-slate-200'}`}>
              {userPlan === 'free' && (
                <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-lg">
                   Seu Plano Atual
                </div>
              )}
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Iniciante</h3>
              <div className="text-3xl font-black text-slate-900 mb-6">Grátis</div>
              <p className="text-xs text-slate-400 font-medium mb-8 min-h-[40px]">
                 Para quem está começando e fazendo os primeiros serviços pontuais.
              </p>

              <ul className="space-y-4 mb-8">
                 <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">3 Clientes no CRM</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">3 Orçamentos Ativos</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">3 Levantamentos de Carga</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">1 Planta Baixa (Com marca d'água)</span>
                 </li>
                 <li className="flex items-center gap-3 opacity-50">
                    <X className="w-4 h-4 text-slate-300" />
                    <span className="text-sm text-slate-400 line-through">Suporte Prioritário</span>
                 </li>
                 <li className="flex items-center gap-3 opacity-50">
                    <X className="w-4 h-4 text-slate-300" />
                    <span className="text-sm text-slate-400 line-through">PDF White Label (Sem logo)</span>
                 </li>
              </ul>

              {/* Botão para criar conta no plano gratuito */}
              {userPlan === 'free' ? (
                <button disabled className="block w-full text-center bg-slate-100 text-slate-400 py-4 rounded-lg font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                   Seu Plano Atual
                </button>
              ) : (
                 <div className="block w-full text-center py-4 rounded-lg font-bold text-xs uppercase tracking-widest text-slate-400">
                    Plano Básico
                 </div>
              )}
           </div>

           {/* Plano PRO */}
           <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-8 relative shadow-2xl transform md:-translate-y-4 ${userPlan === 'pro' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
           {userPlan === 'pro' && (
                <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-br-lg rounded-tl-lg">
                   Seu Plano Atual
                </div>
              )}
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-lg">
                 Mais Popular
              </div>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">Profissional</h3>
              <div className="flex items-end gap-1 mb-6">
                 <div className="text-4xl font-black text-white">R$ 39,90</div>
                 <div className="text-sm font-bold text-slate-400 mb-1">/mês</div>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-8 min-h-[40px]">
                 Para quem vive de elétrica e não pode perder tempo (nem dinheiro).
              </p>

              <ul className="space-y-4 mb-8">
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                    <span className="text-sm text-white font-bold">Clientes ILIMITADOS</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                    <span className="text-sm text-white font-bold">Orçamentos ILIMITADOS</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-3 h-3" /></div>
                    <span className="text-sm text-white font-bold">Cálculos & Projetos ILIMITADOS</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Star className="w-3 h-3" /></div>
                    <span className="text-sm text-white">PDF Profissional (Sem marca d'água)</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Shield className="w-3 h-3" /></div>
                    <span className="text-sm text-white">Backups Automáticos na Nuvem</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Zap className="w-3 h-3" /></div>
                    <span className="text-sm text-white">Acesso Antecipado a Novas Tools</span>
                 </li>
              </ul>

              {userPlan === 'pro' ? (
                  <button disabled className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest cursor-default flex items-center justify-center gap-2">
                     <Check className="w-4 h-4" />
                     Plano Ativo
                  </button>
              ) : (
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/50 transition-all hover:-translate-y-1 active:scale-[0.98]"
               >
                  Quero Ser Profissional
               </button>
              )}
              <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
                 <Shield className="w-4 h-4" />
                 <p className="text-[11px] font-bold uppercase tracking-wider">
                    Risco Zero: 7 dias de garantia • Cancele quando quiser
                 </p>
              </div>
           </div>
        </div>

        {/* Situações Reais (Storytelling) */}
        <div className="space-y-8 pt-8 border-t border-slate-100">
           <h2 className="text-2xl font-black text-slate-900 text-center tracking-tight">Onde o PRO se paga?</h2>
           
           <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-red-500 mb-4">
                    <Clock className="w-5 h-5" />
                 </div>
                 <h4 className="font-bold text-slate-900 mb-2">No cliente apressado</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">
                    O cliente pede orçamento no WhatsApp. Com o Free, você gasta horas no Excel. Com o PRO, você gera um PDF técnico perfeito em 2 minutos pelo celular.
                 </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-indigo-500 mb-4">
                    <FileCheck className="w-5 h-5" />
                 </div>
                 <h4 className="font-bold text-slate-900 mb-2">Na aprovação difícil</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">
                    Orçamento de "papel" é ignorado. O PDF do ProjectGrid passa autoridade técnica. O cliente vê os cálculos da NBR 5410 e sente confiança para fechar.
                 </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center text-green-500 mb-4">
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <h4 className="font-bold text-slate-900 mb-2">No volume de obras</h4>
                 <p className="text-xs text-slate-500 leading-relaxed">
                    Chegou o 4º cliente do mês? O plano Free te bloqueia. O plano PRO deixa você escalar sem limites. Nunca mais recuse serviços por falta de sistema.
                 </p>
              </div>
           </div>
          {userPlan === 'pro' && (
            <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
               <button 
                 onClick={() => setIsRetentionModalOpen(true)}
                 className="text-slate-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-colors"
               >
                 Gerenciar minha assinatura
               </button>
            </div>
          )}

          {/* Retention Modal */}
          {isRetentionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsRetentionModalOpen(false)}></div>
              <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 p-8 text-center space-y-6">
                 <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                    <UserCheck className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Precisa de ajuda com o Plano?</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                       Para alterações no plano, cancelamentos ou dúvidas sobre cobrança, nossa equipe de <strong>Suporte Premium</strong> está pronta para te atender pessoalmente no WhatsApp.
                    </p>
                 </div>
                 <div className="grid gap-3">
                    <a 
                      href="https://wa.me/5511999999999?text=Olá,%20sou%20cliente%20PRO%20e%20gostaria%20de%20falar%20sobre%20minha%20assinatura." 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                       <MessageCircle className="w-5 h-5" />
                       Falar com Suporte no WhatsApp
                    </a>
                    <button 
                      onClick={() => setIsRetentionModalOpen(false)}
                      className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3.5 rounded-lg transition-all"
                    >
                       Voltar para o App
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

export default Plans
