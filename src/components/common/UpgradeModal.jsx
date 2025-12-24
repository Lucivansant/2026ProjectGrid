import { X, Zap, Check } from 'lucide-react'

const UpgradeModal = ({ isOpen, onClose, limitName, currentCount }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Promocional */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-lg ring-1 ring-white/40">
              <Zap className="w-6 h-6 text-yellow-300 fill-current" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Limite Gratuito Atingido</h2>
            <p className="text-indigo-100 font-medium text-sm max-w-md mx-auto">
              Você atingiu o limite de {currentCount} {limitName} do plano básico. Destrave seu potencial profissional agora mesmo.
            </p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo (Comparativo) */}
        <div className="p-8 grid md:grid-cols-2 gap-8">
          {/* Lado Esquerdo: O que ele perdeu */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Plano Gratuito</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-400 opacity-60">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium line-through">Clientes Ilimitados</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 opacity-60">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium line-through">Orçamentos Ilimitados</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 opacity-60">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium line-through">Projetos 2D Ilimitados</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 opacity-60">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium line-through">PDF sem Marca D'água</span>
              </li>
            </ul>
          </div>

          {/* Lado Direito: O que ele ganha */}
          <div className="space-y-6">
             <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">No ProjectGrid PRO 🚀</h3>
             <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-900">
                <div className="p-1 rounded bg-indigo-100 text-indigo-600"><Check className="w-3.5 h-3.5" /></div>
                <span className="text-sm font-bold">Tudo Ilimitado</span>
              </li>
              <li className="flex items-center gap-3 text-slate-900">
                <div className="p-1 rounded bg-indigo-100 text-indigo-600"><Check className="w-3.5 h-3.5" /></div>
                <span className="text-sm font-bold">Backups na Nuvem</span>
              </li>
              <li className="flex items-center gap-3 text-slate-900">
                <div className="p-1 rounded bg-indigo-100 text-indigo-600"><Check className="w-3.5 h-3.5" /></div>
                <span className="text-sm font-bold">Suporte Prioritário</span>
              </li>
              <li className="flex items-center gap-3 text-slate-900">
                <div className="p-1 rounded bg-indigo-100 text-indigo-600"><Check className="w-3.5 h-3.5" /></div>
                <span className="text-sm font-bold">PDF Profissional (White Label)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col items-center justify-center gap-4">
           <button 
             onClick={() => window.open('https://projectgrid.com.br/pro', '_blank')} // Link placeholder para Kiwify
             className="w-full md:w-auto bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
           >
             <Zap className="w-5 h-5 text-yellow-500" />
             Quero Ser Profissional
           </button>
           <p className="text-[10px] text-slate-400 font-medium">
             Investimento de apenas <span className="text-slate-900 font-bold">R$ 39,90/mês</span>. Cancele quando quiser.
           </p>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
