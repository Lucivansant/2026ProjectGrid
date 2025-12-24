import { X, Check, Lock, Star, TrendingUp } from 'lucide-react'

const UpgradeModal = ({ isOpen, onClose, limitName, currentCount }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-0">
           <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-amber-100">
             <Lock className="w-6 h-6 text-amber-500" />
           </div>
           
           <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Período de Teste Finalizado</h2>
           <p className="text-sm text-slate-500 leading-relaxed">
             Você utilizou o limite de <strong className="text-slate-900">{currentCount} {limitName}</strong> para conhecer a plataforma. Se a ferramenta foi útil até aqui, imagine o impacto dela sem restrições no seu dia a dia. Chegou a hora de ter uma suíte profissional completa.
           </p>
        </div>

        <div className="p-8 space-y-4">
           <div className="flex items-start gap-4">
              <div className="bg-green-50 p-1.5 rounded-full mt-0.5 shrink-0">
                 <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-0.5">Sem teto de ganhos</h4>
                 <p className="text-xs text-slate-500">Nunca mais recuse um cliente ou deixe de enviar um orçamento por falta de espaço no sistema.</p>
              </div>
           </div>
           
           <div className="flex items-start gap-4">
              <div className="bg-indigo-50 p-1.5 rounded-full mt-0.5 shrink-0">
                 <Star className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div>
                 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-0.5">Autoridade Imediata</h4>
                 <p className="text-xs text-slate-500">Envie propostas limpas, sem marcas d'água, que transmitem confiança para o cliente assinar.</p>
              </div>
           </div>
        </div>

        <div className="p-8 pt-0 bg-slate-50 border-t border-slate-100">
           <div className="text-center mb-6 pt-6">
              <div className="inline-block bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full mb-2 uppercase tracking-wide">
                 Retorno Garantido
              </div>
              <p className="text-xs text-slate-500 mb-1">Um único serviço aprovado já paga sua assinatura anual.</p>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                R$ 39,90
                <span className="text-sm font-bold text-slate-400 ml-1">/mês</span>
              </div>
           </div>

           <button 
             onClick={() => window.open('https://projectgrid.com.br/pro', '_blank')} 
             className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
           >
             <Lock className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
             Destravar Meu Crescimento
           </button>
           <p className="text-[10px] text-center text-slate-400 font-medium mt-4">
             Risco Zero: Cancele com 1 clique se não lucrar mais.
           </p>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
