import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Zap, 
  Trash2, 
  RotateCcw, 
  Info,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Activity,
  ShieldCheck,
  ArrowRight
} from 'lucide-react'
import { 
  NBR5410_TABLE_36_CAPACITY, 
  STANDARD_BREAKERS, 
  METHOD_TO_COLUMN_INDEX, 
  STANDARD_SIZES 
} from '../lib/electricalData'
import UpgradeModal from '../components/common/UpgradeModal'

/**
 * Componente Calculator (Calculadora)
 * Realiza o dimensionamento de circuitos elétricos de acordo com a norma NBR 5410.
 * Considera a capacidade de condução de corrente, queda de tensão e coordenação de proteção.
 */
const Calculator = () => {
  // Estado de Autenticação
  // Estado de Autenticação
  const [user, setUser] = useState(null)
  const [userPlan, setUserPlan] = useState('free')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const CALCULATION_LIMIT = 3

  // Estado do Formulário de Entrada
  const [formData, setFormData] = useState({
    system: 'single', // single, biphasic, three
    voltage: 220,
    material: 'copper',
    circuitType: 'power', // iluminação ou força (tomadas)
    power: 1000, // Watts
    length: 30, // metros
    method: 'B1', // Método de instalação (NBR 5410 Tabela 33)
    pf: 0.92, // Fator de Potência
    fct: 1.00, // Fator de correção de temperatura
    fca: 1.00, // Fator de correção de agrupamento
    vd: 3 // Porcentagem máxima permitida de queda de tensão
  })

  // Estado de Resultados e Logs
  const [result, setResult] = useState(null) // Contém os resultados calculados
  const [history, setHistory] = useState([]) // Cálculos recentes do usuário
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [calculating, setCalculating] = useState(false)

  /**
   * Configuração Inicial
   * Busca a sessão do usuário e carrega o histórico de cálculos.
   */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        setUserPlan(user.user_metadata?.plan || 'free')
        loadHistory(user.id)
      }
    })
  }, [])

  /**
   * Busca os últimos 10 cálculos da tabela 'calculations'
   */
  const loadHistory = async (userId) => {
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!error) setHistory(data || [])
    setLoadingHistory(false)
  }

  // --- Funções Auxiliares para Dimensionamento Elétrico ---

  /**
   * Encontra a seção mínima do cabo baseada APENAS na capacidade de condução de corrente (Iz).
   */
  const findSectionByCurrent = (Iz, method, numConductors, material) => {
    const columnIndexBase = METHOD_TO_COLUMN_INDEX[method]
    if (columnIndexBase === undefined) return null

    // Determina se são 2 ou 3 condutores carregados
    const columnIndex = columnIndexBase + (numConductors === 3 ? 1 : 0)
    // O alumínio tem um fator de capacidade menor comparado ao cobre na lógica desta implementação
    const aluminumFactor = material === 'aluminum' ? 0.78 : 1.0

    for (const sectionStr of STANDARD_SIZES) {
      const capacities = NBR5410_TABLE_36_CAPACITY[sectionStr]
      const capacity = capacities[columnIndex]
      if (capacity === null || capacity === undefined) continue
      if (capacity * aluminumFactor >= Iz) return parseFloat(sectionStr)
    }
    return null
  }

  /**
   * Recupera a capacidade em Amperes para uma seção de cabo e método específicos.
   */
  const getCableCapacity = (section, method, numConductors, material) => {
    const sectionStr = String(section)
    if (!NBR5410_TABLE_36_CAPACITY[sectionStr]) return 0
    const columnIndexBase = METHOD_TO_COLUMN_INDEX[method]
    const columnIndex = columnIndexBase + (numConductors === 3 ? 1 : 0)
    const baseCapacity = NBR5410_TABLE_36_CAPACITY[sectionStr][columnIndex]
    return (baseCapacity || 0) * (material === 'aluminum' ? 0.78 : 1.0)
  }

  /**
   * Encontra um disjuntor padrão (In) dada a corrente de projeto (Ib) e a capacidade do cabo (Iz).
   * Regra de Coordenação: Ib <= In <= Iz
   */
  const findBreaker = (Ib, Iz, circuitType) => {
    const minPractical = circuitType === 'lighting' ? 10 : 16
    let suitable = STANDARD_BREAKERS.find(In => In >= Ib)
    if (suitable && suitable < minPractical) suitable = minPractical
    return (suitable && suitable <= Iz) ? suitable : null
  }

  /**
   * handleCalculate
   * O motor principal de dimensionamento. Passos:
   * 1. Calcular Ib (Corrente do Circuito).
   * 2. Aplicar fatores de correção para encontrar Iz_necessário.
   * 3. Encontrar a seção baseada na Capacidade.
   * 4. Encontrar a seção baseada na Queda de Tensão (ΔV%).
   * 5. Combinar com o disjuntor e validar a coordenação.
   */
  const handleCalculate = async () => {
    // Verificação de Limite Gratuito
    if (userPlan !== 'pro' && history.length >= CALCULATION_LIMIT) {
      setIsModalOpen(true)
      return
    }

    setCalculating(true)
    const { system, voltage, power, pf, length, vd, method, material, fct, fca, circuitType } = formData
    
    // 1. Corrente de Projeto (Ib)
    let Ib = 0
    if (system === 'three') Ib = power / (Math.sqrt(3) * voltage * pf)
    else Ib = power / (voltage * pf)

    // 2. Iz Necessário (Considerando os fatores de correção)
    const Iz = Ib / (fct * fca)
    const numConductors = system === 'three' ? 3 : 2
    
    // 3. Seção pela Capacidade (Iz)
    const S_iz = findSectionByCurrent(Iz, method, numConductors, material)

    if (!S_iz) {
      alert('Nenhum cabo padrão suporta esta corrente.')
      setCalculating(false)
      return
    }

    // 4. Seção pela Queda de Tensão (ΔV)
    // Resistividade: Cobre = 0.0225 ohm.mm2/m, Alumínio = 0.036
    const rho = material === 'copper' ? 0.0225 : 0.036
    const dV_limit = (vd / 100) * voltage
    let S_vd = 0
    if (system === 'three') S_vd = (Math.sqrt(3) * rho * length * Ib) / dV_limit
    else S_vd = (2 * rho * length * Ib) / dV_limit

    const S_vd_standard = STANDARD_SIZES.find(s => s >= S_vd) || STANDARD_SIZES[STANDARD_SIZES.length - 1]
    
    // 5. Comparação Final (S_iz vs S_vd vs mínimos da NBR)
    const minGauge = circuitType === 'lighting' ? 1.5 : 2.5
    const final_S = Math.max(S_iz, S_vd_standard, minGauge)

    // 6. Validação e Seleção do Disjuntor
    const Iz_final = getCableCapacity(final_S, method, numConductors, material) * fct * fca
    const In = findBreaker(Ib, Iz_final, circuitType)

    // Calcula a porcentagem de queda de tensão final real
    const final_dV_percent = ( (system === 'three' ? (Math.sqrt(3) * rho * length * Ib) : (2 * rho * length * Ib)) / final_S / voltage ) * 100

    const calcResult = {
      Ib: Ib.toFixed(2),
      Iz: Iz.toFixed(2),
      suggestion: final_S,
      breaker: In,
      Iz_final: Iz_final.toFixed(2),
      vd_final: final_dV_percent.toFixed(2),
      check_ok: Ib < In && In < Iz_final, // Verificação da regra
      minGauge,
      S_iz,
      S_vd: S_vd.toFixed(2)
    }

    setResult(calcResult)

    // Salva no histórico se o usuário estiver logado
    if (user) {
      await supabase.from('calculations').insert({
        user_id: user.id,
        tipo_uso: circuitType,
        tipo_circuito: system,
        tensao: voltage,
        potencia: power,
        corrente: Ib.toFixed(2),
        comprimento: length,
        material: material,
        queda_tensao: vd,
        secao_minima: S_vd.toFixed(2),
        cabo_sugerido: String(final_S)
      })
      loadHistory(user.id)
    }
    setCalculating(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir este cálculo?')) return
    await supabase.from('calculations').delete().eq('id', id)
    loadHistory(user.id)
  }

  const handleReset = () => {
    setFormData({
      system: 'single',
      voltage: 220,
      material: 'copper',
      circuitType: 'power',
      power: 1000,
      length: 30,
      method: 'B1',
      pf: 0.92,
      fct: 1.00,
      fca: 1.00,
      vd: 3
    })
    setResult(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Coluna da Esquerda: Formulário de Entrada */}
      <div className="lg:col-span-2 space-y-8">
        <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Dimensionamento Técnico</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Referência: NBR 5410:2004</p>
            </div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Grupo: Fonte Elétrica */}
            <div className="space-y-6">
               <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest pb-2 border-b border-slate-100">Parâmetros da Fonte</h3>
               
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sistema de Corrente</label>
                  <select 
                   value={formData.system} 
                   onChange={e => setFormData({...formData, system: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="single">Monofásico (Fase + Neutro)</option>
                    <option value="biphasic">Bifásico (Fase + Fase)</option>
                    <option value="three">Trifásico (3 Fases)</option>
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tensão (V)</label>
                     <input 
                      type="number" 
                      value={formData.voltage}
                      onChange={e => setFormData({...formData, voltage: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white" 
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Material</label>
                     <select 
                      value={formData.material}
                      onChange={e => setFormData({...formData, material: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                     >
                       <option value="copper">Cobre</option>
                       <option value="aluminum">Alumínio</option>
                     </select>
                  </div>
               </div>
            </div>

            {/* Grupo: Carga & Circuito */}
            <div className="space-y-6">
               <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest pb-2 border-b border-slate-100">Especificações da Carga</h3>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potência (W)</label>
                    <input 
                      type="number" 
                      value={formData.power}
                      onChange={e => setFormData({...formData, power: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distância (m)</label>
                    <input 
                      type="number" 
                      value={formData.length}
                      onChange={e => setFormData({...formData, length: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white" 
                    />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de Instalação</label>
                  <select 
                   value={formData.method}
                   onChange={e => setFormData({...formData, method: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="B1">B1: Eletroduto em alvenaria</option>
                    <option value="B2">B2: Eletroduto aparente</option>
                    <option value="A1">A1: Cabo unipolar em eletroduto</option>
                    <option value="A2">A2: Cabo multipolar em eletroduto</option>
                    <option value="C">C: Cabo multipolar sobre parede</option>
                    <option value="D">D: Eletroduto enterrado</option>
                  </select>
               </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 mt-2">
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Circuito</label>
                  <select 
                    value={formData.circuitType}
                    onChange={e => setFormData({...formData, circuitType: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="power">Tomadas (TUG/TUE)</option>
                    <option value="lighting">Iluminação</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admitância (ΔV%)</label>
                  <input 
                    type="number" 
                    value={formData.vd}
                    onChange={e => setFormData({...formData, vd: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 font-bold text-xs text-slate-900 transition-all outline-hidden focus:border-indigo-500 focus:bg-white" 
                  />
               </div>
               <div className="flex items-end">
                  <button 
                   onClick={handleCalculate}
                   disabled={calculating}
                   className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {calculating ? 'Processando...' : (
                      <>
                        <Activity className="w-4 h-4" />
                        Gerar Dimensionamento
                      </>
                    )}
                  </button>
               </div>
            </div>
          </div>
        </section>

        {result && (
          <section className="bg-white rounded border border-indigo-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
             <div className="p-6 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="w-5 h-5 text-indigo-600" />
                   <h3 className="font-bold text-sm text-indigo-900 uppercase tracking-widest">Relatório de Conformidade</h3>
                </div>
                {result.check_ok ? (
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-3 py-1 rounded border border-emerald-200">Aprovado NBR</span>
                ) : (
                  <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-3 py-1 rounded border border-red-200">Não Conforme</span>
                )}
             </div>
             
             <div className="p-10 grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seção do Condutor</div>
                        <div className="text-5xl font-bold text-slate-900 tracking-tighter">{result.suggestion}<span className="text-xl font-bold text-slate-400 ml-1">mm²</span></div>
                      </div>
                   </div>

                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Proteção Nominal (In)</div>
                        <div className="text-5xl font-bold text-slate-900 tracking-tighter">{result.breaker || 'N/A'}<span className="text-xl font-bold text-slate-400 ml-1">A</span></div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 rounded border border-slate-200 p-8 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Dados Calculados</h4>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Corrente de Projeto (Ib)</span>
                      <span className="font-bold text-slate-900 font-mono">{result.Ib} A</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Capacidade do Cabo (Iz)</span>
                      <span className="font-bold text-slate-900 font-mono">{result.Iz_final} A</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Queda de Tensão Final</span>
                      <span className={`font-bold font-mono ${Number(result.vd_final) > formData.vd ? 'text-red-500' : 'text-emerald-600'}`}>
                        {result.vd_final}%
                      </span>
                   </div>
                   <div className="mt-6 pt-4 border-t border-slate-200">
                      <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed text-center italic">Calculado via Console v2.0 • ProjectGrid Technical</p>
                   </div>
                </div>
             </div>
          </section>
        )}
      </div>

      {/* Coluna da Direita: Histórico & Alertas */}
      <aside className="space-y-8">
        <section className="bg-slate-50 border border-slate-200 rounded p-6 shadow-xs">
           <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2 flex items-center justify-between">
              LOG DE CÁLCULOS
              <Activity className="w-3 h-3 text-slate-400" />
           </h3>
           
           <div className="space-y-3">
             {loadingHistory ? (
                [1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-slate-100 animate-pulse rounded"></div>)
             ) : history.length === 0 ? (
               <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded">
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhum registro</p>
               </div>
             ) : (
               history.map((it) => (
                 <div key={it.id} className="p-4 bg-white border border-slate-200 rounded hover:border-indigo-400 hover:shadow-xs transition-all group relative">
                    <button 
                      onClick={() => handleDelete(it.id)} 
                      disabled={userPlan !== 'pro' && history.length >= CALCULATION_LIMIT}
                      className={`absolute top-3 right-3 transition-all ${userPlan !== 'pro' && history.length >= CALCULATION_LIMIT ? 'text-slate-200 cursor-not-allowed opacity-100' : 'text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(it.created_at).toLocaleDateString('pt-BR')}</div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {it.cabo_sugerido} mm²
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1 leading-none">
                       {it.corrente}A • {it.comprimento}m • {it.tipo_uso === 'lighting' ? 'ILUM.' : 'TOM.'}
                    </div>
                 </div>
               ))
             )}
           </div>

           <div className="mt-10 p-4 bg-white border border-indigo-100 rounded flex gap-3">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase">
                As ferramentas são para fins informativos. Projetos devem ser validados por profissional qualificado.
              </p>
           </div>
        </section>

        <div className="p-6 bg-slate-900 rounded text-white group cursor-pointer hover:bg-black transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-white/10 rounded">
                  <ShieldCheck className="w-4 h-4" />
               </div>
               <ArrowRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-400">Suporte Técnico</h4>
            <p className="text-xs font-bold leading-tight">Consultar tabelas NBR 5410 completas</p>
        </div>
      </aside>


      <UpgradeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        limitName="Cálculos" 
        currentCount={CALCULATION_LIMIT} 
      />
    </div>
  )
}

export default Calculator
