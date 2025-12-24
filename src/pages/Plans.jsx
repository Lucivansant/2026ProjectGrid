import { Check, X, Star, Zap, Shield, TrendingUp, Clock, FileCheck } from 'lucide-react'

const Plans = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-8">
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
         <div className="bg-white border border-slate-200 rounded-2xl p-8 relative">
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

            <button disabled className="w-full bg-slate-100 text-slate-400 py-4 rounded-lg font-bold text-xs uppercase tracking-widest cursor-not-allowed">
               Seu Plano Atual
            </button>
         </div>

         {/* Plano PRO */}
         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative shadow-2xl transform md:-translate-y-4">
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

            <button 
               onClick={() => window.open('https://projectgrid.com.br/pro', '_blank')}
               className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/50 transition-all hover:-translate-y-1 active:scale-[0.98]"
            >
               Quero Ser Profissional
            </button>
            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
               <Shield className="w-4 h-4" />
               <p className="text-[11px] font-bold uppercase tracking-wider">
                  Risco Zero: 7 dias de garantia • Cancele quando quiser
               </p>
            </div>
         </div>
      </div>

      {/* Situações Reais (Storytelling) */}
      <div className="space-y-8 pt-8">
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
      </div>

    </div>
  )
}

export default Plans
