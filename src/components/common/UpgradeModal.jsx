import { X, Zap, Check, Lock, Star } from 'lucide-react'

const UpgradeModal = ({ isOpen, onClose, limitName, currentCount }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-0">
           <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-6">
             <Lock className="w-6 h-6 text-indigo-600" />
           </div>
           
           <h2 className="text-xl font-bold text-slate-900 mb-2">Limite Gratuito Atingido</h2>
           <p className="text-sm text-slate-500 leading-relaxed">
             Você atingiu o limite de <strong className="text-slate-900">{currentCount} {limitName}</strong> do seu plano atual. Para continuar crescendo, migre para o profissional.
           </p>
        </div>

        <div className="p-8 space-y-4">
           <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="bg-white p-1.5 rounded shadow-sm border border-slate-200 shrink-0">
                 <Check className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Criação Ilimitada</span>
           </div>
           
           <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="bg-white p-1.5 rounded shadow-sm border border-slate-200 shrink-0">
                 <Check className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">PDFs Profissionais (White Label)</span>
           </div>

           <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="bg-white p-1.5 rounded shadow-sm border border-slate-200 shrink-0">
                 <Check className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Acesso Prioritário</span>
           </div>
        </div>

        <div className="p-8 pt-0">
           <button 
             onClick={() => window.open('https://projectgrid.com.br/pro', '_blank')} 
             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
           >
             <Star className="w-4 h-4 text-indigo-200 group-hover:text-white transition-colors" />
             Desbloquear ProjectGrid Pro
           </button>
           <p className="text-[10px] text-center text-slate-400 font-medium mt-4">
             Apenas R$ 39,90/mês. Cancele a qualquer momento.
           </p>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
