import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  FilePlus,
  ArrowRight,
  Calculator as CalcIcon,
  Gauge,
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Printer
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Componente LoadSurvey (Levantamento de Carga)
 * Permite aos usuários listar cargas elétricas e calcular a demanda total.
 * Sugere o dimensionamento do disjuntor com base na norma NBR 5410.
 */
const LoadSurvey = () => {
  // Autenticação e Identificação
  const [user, setUser] = useState(null)
  const [currentSurveyId, setCurrentSurveyId] = useState(null)

  // Estado da Matriz de Carga
  const [loads, setLoads] = useState([]) // Lista de itens de carga (descrição, quantidade, potência, fator de demanda)

  // Parâmetros do Sistema Elétrico
  const [system, setSystem] = useState('single') // monofásico, bifásico, trifásico
  const [voltage, setVoltage] = useState(220)
  const [pf, setPf] = useState(0.92) // Fator de Potência (cos phi)

  // Estado de Persistência e UI
  const [surveys, setSurveys] = useState([]) // Lista de levantamentos históricos
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [saving, setSaving] = useState(false)

  // Valores padrão comerciais de disjuntores (Amperes)
  const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 90, 100, 125, 150, 175, 200, 225, 250]

  /**
   * Configuração Inicial
   * Busca o usuário atual e inicia o carregamento do histórico de levantamentos.
   */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadSurveys(user.id)
    })
  }, [])

  /**
   * Busca levantamentos históricos da tabela 'load_surveys' do Supabase
   */
  const loadSurveys = async (userId) => {
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('load_surveys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (!error) setSurveys(data || [])
    setLoadingHistory(false)
  }

  // --- Funções de Gestão de Carga ---

  const addLoad = () => {
    setLoads([...loads, { description: '', quantity: 1, power_va: 0, demand_factor: 1.0 }])
  }

  const updateLoad = (index, field, value) => {
    const newLoads = [...loads]
    newLoads[index][field] = value
    setLoads(newLoads)
  }

  const deleteLoad = (index) => {
    setLoads(loads.filter((_, i) => i !== index))
  }

  /**
   * calculateTotals
   * Executa os cálculos principais de engenharia para demanda.
   * Calcula VA Total, Watts Totais, Corrente de Demanda e Sugere um Disjuntor.
   */
  const calculateTotals = () => {
    let totalVA = 0
    // Soma de VA * Quantidade * Fator de Demanda para cada carga
    loads.forEach(load => {
      totalVA += (load.power_va || 0) * (load.quantity || 0) * (load.demand_factor || 1)
    })
    
    // Potência Real (W) = Potência Aparente (VA) * Fator de Potência
    const totalW = totalVA * pf
    
    let current = 0
    if (voltage > 0) {
      // O cálculo da corrente depende da configuração de fases do sistema elétrico
      if (system === 'three') current = totalVA / (voltage * Math.sqrt(3))
      else current = totalVA / voltage
    }

    // Encontra o próximo tamanho de disjuntor padrão acima da corrente calculada
    const breaker = standardBreakers.find(b => b >= current) || standardBreakers[standardBreakers.length - 1]
    
    return {
      totalVA: totalVA.toFixed(0),
      totalW: totalW.toFixed(0),
      current: current.toFixed(2),
      breaker: current > 0 ? breaker : '--'
    }
  }

  const totals = calculateTotals()

  /**
   * handleSave
   * Persiste o levantamento atual e seus itens no Supabase.
   * Lida tanto com novos levantamentos quanto com atualizações em existentes.
   */
  const handleSave = async () => {
    if (!user) return alert('Faça login para salvar.')
    if (loads.length === 0) return alert('Adicione pelo menos uma carga.')

    let title = ''
    if (!currentSurveyId) {
      title = prompt('Título do levantamento:', 'Levantamento Residencial')
      if (!title) return
    }

    setSaving(true)
    try {
      const surveyData = {
        user_id: user.id,
        system,
        voltage,
        power_factor: pf,
        total_va: parseFloat(totals.totalVA),
        total_w: parseFloat(totals.totalW),
        total_demand_current: parseFloat(totals.current),
        suggested_breaker: parseInt(totals.breaker) || 0
      }

      if (currentSurveyId) {
        // Atualiza levantamento existente e substitui itens
        await supabase.from('load_surveys').update(surveyData).eq('id', currentSurveyId)
        await supabase.from('load_survey_items').delete().eq('survey_id', currentSurveyId)
        const items = loads.map(l => ({ ...l, survey_id: currentSurveyId, user_id: user.id }))
        await supabase.from('load_survey_items').insert(items)
      } else {
        // Cria novo levantamento e insere itens
        const { data, error } = await supabase.from('load_surveys').insert({ ...surveyData, title }).select().single()
        if (error) throw error
        const items = loads.map(l => ({ ...l, survey_id: data.id, user_id: user.id }))
        await supabase.from('load_survey_items').insert(items)
      }
      
      alert('Salvo com sucesso!')
      loadSurveys(user.id)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * handleLoadSurvey
   * Carrega um levantamento salvo do histórico de volta para a planilha ativa.
   */
  const handleLoadSurvey = async (id) => {
    const { data: survey } = await supabase.from('load_surveys').select('*').eq('id', id).single()
    const { data: items } = await supabase.from('load_survey_items').select('*').eq('survey_id', id)
    
    if (survey) {
      setSystem(survey.system)
      setVoltage(survey.voltage)
      setPf(survey.power_factor)
      setCurrentSurveyId(id)
      // Limpa os itens de seus IDs internos antes de adicionar ao estado local
      setLoads(items.map(({ id, created_at, survey_id, user_id, ...rest }) => rest))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * Exclui um levantamento completo do histórico
   */
  const handleDeleteSurvey = async (id) => {
    if (!confirm('Excluir este levantamento?')) return
    await supabase.from('load_surveys').delete().eq('id', id)
    loadSurveys(user.id)
    if (currentSurveyId === id) handleNew()
  }

  /**
   * handleNew
   * Reseta a planilha ativa para um novo levantamento.
   */
  const handleNew = () => {
    setCurrentSurveyId(null)
    setLoads([])
    setSystem('single')
    setVoltage(220)
    setPf(0.92)
  }

  /**
   * Lógica de Geração de PDF
   * Exporta a matriz de carga e os resultados dos cálculos para um PDF.
   */
  const generatePDF = (id = null) => {
    const doc = new jsPDF()
    const data = calculateTotals()
    
    doc.setFontSize(20)
    doc.text('Levantamento de Carga Elétrica', 15, 20)
    doc.setFontSize(10)
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 195, 20, { align: 'right' })
    
    autoTable(doc, {
      startY: 30,
      head: [['Descrição', 'Qtde', 'Potência (VA)', 'F. Demanda', 'Subtotal (VA)']],
      body: loads.map(l => [
        l.description, 
        l.quantity, 
        l.power_va, 
        l.demand_factor, 
        (l.quantity * l.power_va * l.demand_factor).toFixed(2)
      ]),
      foot: [['', '', '', 'Total Demandado:', data.totalVA + ' VA']]
    })

    doc.text(`Calculado para: ${system.toUpperCase()} ${voltage}V`, 15, doc.lastAutoTable?.finalY + 10)
    doc.text(`Corrente de Demanda: ${data.current} A`, 15, doc.lastAutoTable?.finalY + 15)
    doc.text(`Disjuntor Sugerido: ${data.breaker} A`, 15, doc.lastAutoTable?.finalY + 20)
    
    doc.save('levantamento-carga.pdf')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Coluna Principal */}
      <div className="lg:col-span-2 space-y-10">
        <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Matriz de Cargas</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Cálculo de Demanda Simultânea</p>
            </div>
            <button 
              onClick={addLoad}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Item
            </button>
          </div>

          <div className="p-0">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-3 w-1/2">Descrição da Carga</th>
                      <th className="px-3 py-3 text-center">Qtde</th>
                      <th className="px-3 py-3 text-center">P(VA)</th>
                      <th className="px-3 py-3 text-center">F.D</th>
                      <th className="px-6 py-3 text-right">Ação</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {loads.length === 0 ? (
                      <tr>
                         <td colSpan="5" className="px-6 py-16 text-center">
                            <div className="text-slate-300 mb-2 flex justify-center"><Gauge className="w-10 h-10" /></div>
                            <p className="text-xs text-slate-400 font-medium italic">Nenhuma carga registrada na estação de trabalho.</p>
                            <button onClick={addLoad} className="mt-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">Iniciar Mapeamento</button>
                         </td>
                      </tr>
                   ) : (
                      loads.map((load, i) => (
                         <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3">
                               <input 
                                 type="text" 
                                 value={load.description}
                                 onChange={e => updateLoad(i, 'description', e.target.value)}
                                 className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-hidden text-xs font-bold text-slate-900 transition-all placeholder:text-slate-200" 
                                 placeholder="Identificação da carga..."
                               />
                            </td>
                            <td className="px-3 py-3">
                               <input 
                                 type="number" 
                                 value={load.quantity}
                                 onChange={e => updateLoad(i, 'quantity', Number(e.target.value))}
                                 className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-center outline-hidden focus:border-indigo-400" 
                               />
                            </td>
                            <td className="px-3 py-3">
                               <input 
                                 type="number" 
                                 value={load.power_va}
                                 onChange={e => updateLoad(i, 'power_va', Number(e.target.value))}
                                 className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-center outline-hidden focus:border-indigo-400 font-mono" 
                               />
                            </td>
                            <td className="px-3 py-3">
                               <input 
                                 type="number" 
                                 value={load.demand_factor}
                                 step="0.1"
                                 onChange={e => updateLoad(i, 'demand_factor', Number(e.target.value))}
                                 className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-center outline-hidden focus:border-indigo-400" 
                               />
                            </td>
                            <td className="px-6 py-3 text-right">
                               <button onClick={() => deleteLoad(i)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </td>
                         </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
        </section>

        <section className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Base de Levantamentos</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Histórico de Arquivos Salvos</p>
            </div>
            <button onClick={handleNew} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">
              Novo Lote
            </button>
          </div>
          <div className="p-0">
             <table className="w-full text-left border-collapse font-sans">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-3">Documento</th>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Potência Demandada</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {loadingHistory ? (
                      [1, 2].map(i => <tr key={i} className="animate-pulse"><td colSpan="4" className="px-6 py-4"><div className="h-4 bg-slate-50 rounded"></div></td></tr>)
                   ) : surveys.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhum levantamento em arquivo.</td></tr>
                   ) : (
                      surveys.map((s) => (
                        <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-xs font-bold text-slate-900 tracking-tight">{s.title}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600 font-mono">{s.total_va} VA</td>
                          <td className="px-6 py-4 text-right space-x-4">
                            <button onClick={() => handleLoadSurvey(s.id)} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">Carregar</button>
                            <button onClick={() => handleDeleteSurvey(s.id)} className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Remover</button>
                          </td>
                        </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
        </section>
      </div>

      {/* Coluna de Consolidação */}
      <aside className="space-y-8">
         <section className="bg-slate-50 border border-slate-200 rounded p-8 shadow-xs sticky top-24">
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Consolidação</h3>
               <div className="flex gap-2">
                 <button 
                  onClick={() => generatePDF()} 
                  disabled={loads.length === 0}
                  className="p-2 bg-white border border-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-colors shadow-xs"
                  title="Exportar PDF"
                 >
                   <Printer className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={handleSave} 
                  disabled={loads.length === 0 || saving}
                  className="p-2 bg-indigo-600 text-white border border-indigo-500 rounded hover:bg-indigo-700 transition-all shadow-sm"
                  title="Gravar no Banco"
                 >
                   <Save className="w-4 h-4" />
                 </button>
               </div>
            </div>

            <div className="space-y-8">
               <div className="p-6 bg-white border border-slate-200 rounded shadow-xs overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Activity className="w-12 h-12" /></div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Potência de Demanda</div>
                  <div className="text-4xl font-bold text-slate-900 tracking-tighter font-mono">{totals.totalVA}<span className="text-xl text-slate-300 ml-1">VA</span></div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">≈ {totals.totalW} W Real</div>
               </div>

               <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição</label>
                    <select 
                      value={system} 
                      onChange={e => setSystem(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-400"
                    >
                      <option value="single">C: Monofásico</option>
                      <option value="biphasic">C: Bifásico</option>
                      <option value="three">C: Trifásico</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tensão (V)</label>
                      <input 
                        type="number" 
                        value={voltage} 
                        onChange={e => setVoltage(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fator cosφ</label>
                      <input 
                        type="number" 
                        value={pf} 
                        step="0.01"
                        onChange={e => setPf(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded px-4 py-2 text-xs font-bold text-slate-900 outline-hidden focus:border-indigo-400 font-mono"
                      />
                    </div>
                  </div>
               </div>

               <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center bg-white border border-slate-100 px-5 py-3 rounded shadow-xs">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Corrente Ativa</span>
                     <span className="text-lg font-bold text-slate-900 font-mono">{totals.current} A</span>
                  </div>
                  <div className="bg-slate-900 p-8 rounded shadow-lg text-center group hover:bg-black transition-colors">
                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-300">Proteção Geral</div>
                     <div className="text-5xl font-bold text-white tracking-tighter">{totals.breaker}<span className="text-xl font-black text-slate-500 ml-1">A</span></div>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex items-center gap-3 p-4 border border-indigo-100 rounded bg-indigo-50/20">
               <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
               <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase">
                  Conformidade NBR 5410 • Dimensionamento de Demanda • ProjectGrid
               </p>
            </div>
         </section>
      </aside>
    </div>
  )
}

export default LoadSurvey
