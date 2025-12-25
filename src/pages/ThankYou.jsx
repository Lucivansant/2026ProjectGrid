import { Link } from 'react-router-dom'
import { CheckCircle, Mail, ArrowRight, Shield } from 'lucide-react'

/**
 * Página ThankYou (Obrigado)
 * Exibida após a compra na Kiwify.
 * Instrui o usuário a verificar o e-mail para acessar a conta.
 */
const ThankYou = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 inset-x-0 h-96 bg-indigo-50/50 -skew-y-3 origin-top-left -z-10"></div>
      
      <div className="w-full max-w-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden">
            {/* Confetti overlay effect could go here */}
            
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500 delay-150">
                <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Compra Confirmada!</h1>
            
            <p className="text-slate-500 mb-10 leading-relaxed">
                Parabéns pela decisão de profissionalizar seu trabalho.<br/>
                Sua conta <strong>PRO</strong> já foi ativada no sistema.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-10 text-left space-y-4">
                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
                        <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Tudo Pronto!</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Seu pagamento foi confirmado. Se você já tem senha, basta acessar. Se é novo, verifique seu e-mail.
                        </p>
                    </div>
                </div>
                
                <div className="h-px bg-slate-200"></div>

                <div className="flex items-start gap-4">
                     <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
                        <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Acesso Liberado</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Seus limites de clientes e orçamentos já foram removidos.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <Link to="/login" className="block w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98]">
                    Acessar Plataforma
                </Link>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Não recebeu? Verifique a caixa de SPAM
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}

export default ThankYou
