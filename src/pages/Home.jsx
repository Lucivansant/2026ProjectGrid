import { useState, useEffect } from 'react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { Zap, Calculator, FileText, BarChart3, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, LayoutDashboard, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Componente Home
 * Esta é a página inicial da aplicação ProjectGrid.
 * Apresenta uma seção hero com efeito de digitação, grade de recursos, prova social e chamadas para ação.
 */
const Home = () => {
  // Estado para o efeito de digitação na seção Hero
  const [typewriterText, setTypewriterText] = useState('')
  const fullText = "Trabalho técnico. Resultados profissionais."
  // isDeleting rastreia se o efeito está removendo caracteres no momento
  const [isDeleting, setIsDeleting] = useState(false)
  // index rastreia a posição atual do caractere no fullText
  const [index, setIndex] = useState(0)

  /**
   * Lógica do Efeito de Digitação
   * Gerencia a digitação e exclusão sequencial do texto na seção hero.
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isDeleting && index < fullText.length) {
        // Adicionando caracteres
        setTypewriterText(prev => prev + fullText[index])
        setIndex(prev => prev + 1)
      } else if (isDeleting && index > 0) {
        // Removendo caracteres
        setTypewriterText(prev => prev.slice(0, -1))
        setIndex(prev => prev - 1)
      } else if (!isDeleting && index === fullText.length) {
        // Pausa antes de iniciar a exclusão
        setTimeout(() => setIsDeleting(true), 3000)
      } else if (isDeleting && index === 0) {
        // Reinicia o ciclo de digitação
        setIsDeleting(false)
      }
    }, isDeleting ? 40 : 80) // Exclusão mais rápida que a digitação
    return () => clearTimeout(timeout)
  }, [index, isDeleting])

  /**
   * Animação de Revelação ao Rolar (Scroll Reveal)
   * Usa IntersectionObserver para disparar animações quando os elementos entram na visualização.
   */
  useEffect(() => {
    const revealElements = document.querySelectorAll('.scroll-reveal')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, { threshold: 0.1 })
    revealElements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-white text-slate-900 font-sans min-h-screen flex flex-col selection:bg-indigo-50 selection:text-indigo-700">
      <Header />

      <main className="grow">
        {/* Seção Hero Técnica */}
        <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-32 border-b border-slate-100 overflow-hidden">
          {/* Fundo de Grade Técnica */}
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-size-[32px_32px]"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="scroll-reveal transition-all duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 mb-6">
                <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Versão 2.4 — Estável</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-[1.2] tracking-tight mb-6">
                {typewriterText}<span className="text-indigo-600">_</span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-xl mb-10 leading-relaxed font-medium">
                Software de engenharia simplificado para eletricistas. Dimensionamento preciso pela <span className="text-slate-900 font-semibold underline decoration-indigo-200">NBR 5410</span> e gestão técnica de projetos em uma interface limpa.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login?action=signup" className="px-6 py-3 bg-indigo-600 rounded-lg font-bold text-white hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm border border-indigo-500">
                  Criar conta profissional <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="px-6 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center">
                  Documentação Técnica
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> NBR 5410</div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Data Safe</div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Export PDF</div>
              </div>
            </div>

            {/* Pré-visualização Estruturada da Interface (UI) */}
            <div className="relative scroll-reveal transition-all duration-700 delay-200 lg:block hidden">
               <div className="bg-slate-50 rounded-xl border border-slate-200 p-1.5 shadow-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-linear-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
                  <img 
                    src={`${import.meta.env.BASE_URL}dashboard-preview.png`} 
                    alt="ProjectGrid Dashboard" 
                    className="rounded-lg shadow-sm w-full h-auto border border-slate-100"
                  />
               </div>
               
               {/* Sobreposição Decorativa de Terminal */}
               <div className="absolute -bottom-6 -right-6 w-48 bg-slate-900 rounded-lg p-3 shadow-xl border border-slate-800 font-mono text-[9px] text-emerald-400">
                  <div className="flex gap-1 mb-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                  </div>
                  <div className="opacity-70 text-slate-500">// Dimensionamento Auto</div>
                  <div>Ib: 32.5A</div>
                  <div>Condutor: 6.0mm²</div>
                  <div>Queda: 1.2% <span className="text-emerald-500">✓</span></div>
               </div>
            </div>
          </div>
        </section>



        {/* 
          Seção de Recursos (Features) 
          Exibe os principais benefícios e ferramentas da aplicação 
        */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 scroll-reveal transition-all duration-700">
              <h2 className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-3">Modular & Escalável</h2>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Recursos Projetados para Engenharia.</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-1 border-t border-l border-slate-100">
              {[
                { 
                  icon: Calculator, 
                  title: 'Cálculos de Queda de Tensão', 
                  desc: 'Algoritmos validados pela NBR 5410 contemplando todos os métodos de instalação e tipos de condutores.' 
                },
                { 
                  icon: FileText, 
                  title: 'Relatórios Técnicos', 
                  desc: 'Gere documentação limpa em PDF para seus clientes, com detalhamento de circuitos e justificativas técnicas.' 
                },
                { 
                  icon: BarChart3, 
                  title: 'Gestão de Orçamentos', 
                  desc: 'Módulo de precificação integrado com prazos e status de aprovação. Controle sistêmico do seu faturamento.' 
                },
                { 
                  icon: CheckCircle2, 
                  title: 'Padronização de Projetos', 
                  desc: 'Mantenha todos os seus projetos sob o mesmo padrão técnico, facilitando correções e manutenções futuras.' 
                },
                { 
                  icon: ShieldCheck, 
                  title: 'Arquivado em Nuvem', 
                  desc: 'Seus dados técnicos sempre disponíveis e sincronizados de forma segura em todos os seus dispositivos.' 
                },
                { 
                  icon: ArrowRight, 
                  title: 'Fluxo de Trabalho', 
                  desc: 'Interface otimizada para mínima fricção. Do levantamento de carga à proposta final em fluxo contínuo.' 
                }
              ].map((f, i) => (
                <div key={i} className="p-8 border-r border-b border-slate-100 hover:bg-slate-50 transition-colors group scroll-reveal" style={{ transitionDelay: `${i * 50}ms` }}>
                  <div className="w-10 h-10 rounded border border-slate-200 flex items-center justify-center mb-6 bg-white shrink-0">
                    <f.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 
          Seção Nova Funcionalidade: Editor Visual
          Destaque para a capacidade de criar projetos no navegador
        */}
        <section className="py-24 bg-slate-900 overflow-hidden relative border-y border-slate-800">
          {/* Fundo abstrato de grade */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-size-[24px_24px]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 scroll-reveal text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Nova Funcionalidade</span>
                </div>
                
                <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                  Projetos Elétricos <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">Diretamente no Navegador.</span>
                </h2>
                
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                  Abandone softwares pesados e complexos. Com o novo editor visual do ProjectGrid, você desenha plantas, posiciona pontos e define circuitos em uma interface fluida e intuitiva. Tudo na nuvem, acessível de qualquer lugar.
                </p>

                <ul className="space-y-4 mb-10">
                  {[
                    "Desenho de plantas baixas intuitivo",
                    "Posicionamento de tomadas e interruptores (drag & drop)",
                    "Passagem de fiação automática e manual",
                    "Exportação para PDF profissional"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link to="/login?action=signup" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-lg font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20">
                  Experimentar o Editor Visual <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="lg:w-1/2 scroll-reveal delay-200">
                 {/* Representação Abstrata do Editor (Mockup Escuro) */}
                 <div className="rounded-xl bg-slate-800 border border-slate-700 p-2 shadow-2xl relative">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 aspect-video relative group">
                       {/* Toolbar */}
                       <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm">
                               {i === 1 ? <Search className="w-4 h-4" /> : 
                                i === 2 ? <LayoutDashboard className="w-4 h-4" /> :
                                i === 3 ? <Zap className="w-4 h-4" /> :
                                <FileText className="w-4 h-4" />}
                            </div>
                          ))}
                       </div>

                       {/* Grid & Content */}
                       <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[20px_20px]"></div>
                       
                       {/* Floorplan Elements Mockup */}
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-slate-700 rounded-sm">
                          <div className="absolute top-0 right-0 w-1/3 h-1/2 border-l-2 border-b-2 border-slate-700"></div>
                          
                          {/* Pontos de luz/tomada */}
                          <div className="absolute top-1/3 left-0 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                          <div className="absolute bottom-1/3 right-0 translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-slate-900"></div>

                          {/* Fiação simulada */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible opacity-60">
                             <path d="M -6 50 Q 150 50, 150 100" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
                             <path d="M 150 100 Q 200 100, 306 130" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
                          </svg>

                          {/* Tooltip simulado */}
                          <div className="absolute top-1/2 left-1/2 mt-4 ml-4 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 p-2 rounded shadow-lg">
                             <div className="font-bold text-indigo-400">Ponto de Luz</div>
                             <div>Potência: 100W</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* 
          Seção de Prova Social 
          Exibe depoimentos e estatísticas de uso 
        */}
        <section className="py-20 bg-slate-50/50 border-y border-slate-100">
           <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                 <div className="max-w-md">
                    <div className="flex gap-1 mb-4">
                       {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 bg-indigo-600 rounded-sm"></div>)}
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2 italic">"A precisão técnica do ProjectGrid me permite focar na execução enquanto o software cuida da norma."</h4>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">— Eng. Roberto Mendes, Consultoria Elétrica</p>
                 </div>
                 <div className="grid grid-cols-2 gap-8 lg:gap-16">
                    <div className="text-center">
                       <div className="text-3xl font-bold text-slate-900">2.4k+</div>
                       <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Usuários Ativos</div>
                    </div>
                    <div className="text-center">
                       <div className="text-3xl font-bold text-slate-900">158k</div>
                       <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cálculos/Mês</div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* 
          Seção Deep Dive: 3 Funcionalidades Principais
          Descrição persuasiva das ferramentas críticas para conversão
        */}
        <section className="py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
             <div className="text-center mb-20 max-w-3xl mx-auto scroll-reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 mb-4">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Por que escolher o ProjectGrid?</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 tracking-tight">Menos tempo em planilhas.<br/>Mais engenharia de verdade.</h2>
                <p className="text-lg text-slate-500 leading-relaxed">Desenvolvemos ferramentas que entendem a realidade do projetista elétrico. Focamos em eliminar a repetição para que você foque na inteligência do projeto.</p>
             </div>

             <div className="space-y-24">
                {/* Feature 1: Automação de Cálculos */}
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                   <div className="lg:w-1/2 scroll-reveal order-2 lg:order-1">
                      <div className="relative rounded-2xl bg-slate-50 border border-slate-200 aspect-video flex items-center justify-center overflow-hidden shadow-lg group">
                         <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-size-[24px_24px] opacity-40"></div>
                         
                         {/* Card flutuante simulando cálculo */}
                         <div className="w-64 bg-white rounded-lg shadow-xl border border-slate-100 p-4 relative z-10 transform group-hover:-translate-y-2 transition-transform duration-500">
                            <div className="flex justify-between items-center mb-3">
                               <div className="text-xs font-bold text-slate-400 uppercase">Circuito 1 - Chuveiro</div>
                               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            </div>
                            <div className="space-y-2">
                               <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Corrente Proj.</span>
                                  <span className="font-mono font-bold text-slate-900">32.0A</span>
                               </div>
                               <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Condutor</span>
                                  <span className="font-mono font-bold text-indigo-600">6.0mm²</span>
                               </div>
                               <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                  <div className="h-full bg-emerald-500 w-[92%]"></div>
                               </div>
                               <div className="text-[10px] text-right text-emerald-600 font-bold pt-1">Critério Queda de Tensão OK</div>
                            </div>
                         </div>
                             
                         {/* Elementos decorativos de fundo */}
                         <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      </div>
                   </div>
                   <div className="lg:w-1/2 scroll-reveal text-left order-1 lg:order-2">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
                         <Calculator className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">Cálculos Automatizados e Seguros.</h3>
                      <p className="text-slate-600 mb-6 leading-relaxed">
                         Esqueça o risco de erros humanos em planilhas complexas. O ProjectGrid aplica rigorosamente os critérios da <strong className="text-slate-900">NBR 5410</strong> para dimensionamento de condutores, proteção e eletrodutos.
                      </p>
                      <ul className="space-y-3">
                         {[
                            "Dimensionamento automático por capacidade de corrente",
                            "Verificação instantânea de queda de tensão",
                            "Ajuste automático por agrupamento e temperatura",
                            "Memória de cálculo detalhada para auditoria"
                         ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                               <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                               {item}
                            </li>
                         ))}
                      </ul>
                   </div>
                </div>

                {/* Feature 2: Orçamentos */}
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                   <div className="lg:w-1/2 scroll-reveal">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
                         <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">Propostas que Fecham Negócios.</h3>
                      <p className="text-slate-600 mb-6 leading-relaxed">
                         Não envie apenas um preço. Gere propostas comerciais visualmente impactantes que justificam seu valor. Detalhe escopo, materiais e prazos em um documento PDF profissional com sua marca.
                      </p>
                      <ul className="space-y-3">
                         {[
                            "Geração de PDF com capa e índice automático e logo",
                            "Lista de materiais quantificada automaticamente",
                            "Separação clara entre mão de obra e materiais",
                            "Histórico de versões e revisões do orçamento"
                         ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                               <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                               {item}
                            </li>
                         ))}
                      </ul>
                   </div>
                   <div className="lg:w-1/2 scroll-reveal">
                      <div className="relative rounded-2xl bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center overflow-hidden shadow-2xl group">
                         {/* Simulação de documento PDF */}
                         <div className="w-[60%] h-[110%] bg-white transform rotate-6 translate-y-8 rounded shadow-2xl p-6 group-hover:rotate-0 group-hover:translate-y-4 transition-all duration-700 ease-out">
                            <div className="w-12 h-12 bg-indigo-600 rounded-lg mb-6 opacity-20"></div>
                            <div className="w-3/4 h-4 bg-slate-200 rounded mb-3"></div>
                            <div className="w-1/2 h-4 bg-slate-200 rounded mb-8"></div>
                            
                            <div className="space-y-3 border-t border-slate-100 pt-6">
                               <div className="flex justify-between">
                                  <div className="w-1/3 h-2 bg-slate-100 rounded"></div>
                                  <div className="w-10 h-2 bg-slate-100 rounded"></div>
                               </div>
                               <div className="flex justify-between">
                                  <div className="w-1/2 h-2 bg-slate-100 rounded"></div>
                                  <div className="w-10 h-2 bg-slate-100 rounded"></div>
                               </div>
                               <div className="flex justify-between">
                                  <div className="w-1/4 h-2 bg-slate-100 rounded"></div>
                                  <div className="w-10 h-2 bg-slate-100 rounded"></div>
                               </div>
                            </div>

                            <div className="absolute bottom-6 right-6 w-20 h-20 bg-indigo-600 rounded-full opacity-10 blur-xl"></div>
                            <div className="mt-12 w-full h-10 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 font-bold text-xs uppercase tracking-wider">
                                Orçamento Aprovado
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Feature 3: Gestão */}
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                   <div className="lg:w-1/2 scroll-reveal order-2 lg:order-1">
                      <div className="relative rounded-2xl bg-slate-50 border border-slate-200 aspect-video flex items-center justify-center overflow-hidden shadow-sm group">
                          {/* Grid de Cards de Clientes */}
                          <div className="grid grid-cols-2 gap-4 scale-90 opacity-80 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
                             {[1,2,3,4].map(i => (
                                <div key={i} className="w-32 h-24 bg-white rounded-lg border border-slate-100 p-3 shadow-sm flex flex-col justify-between">
                                   <div className="flex justify-between items-start">
                                      <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                                      <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                   </div>
                                   <div className="w-3/4 h-2 bg-slate-100 rounded"></div>
                                </div>
                             ))}
                          </div>
                      </div>
                   </div>
                   <div className="lg:w-1/2 scroll-reveal text-left order-1 lg:order-2">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
                         <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">Gestão Total do Escritório.</h3>
                      <p className="text-slate-600 mb-6 leading-relaxed">
                         Centralize seus dados. Do cadastro do cliente ao histórico de obras, mantenha tudo organizado em um só lugar. Aumente a eficiência da sua equipe e nunca mais perca o contato de um lead.
                      </p>
                      <ul className="space-y-3">
                         {[
                            "Base de dados centralizada e segura na nuvem",
                            "Status de projetos em tempo real (Kanban)",
                            "Histórico completo de interações com o cliente",
                            "Acesso rápido a projetos antigos para consulta"
                         ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
                               <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                               {item}
                            </li>
                         ))}
                      </ul>
                   </div>
                </div>

             </div>
          </div>
        </section>

        {/* 
          Seção de Chamada para Ação (CTA) 
          Incentiva os usuários a se cadastrar ou entrar em contato para planos empresariais 
        */}
        <section id="pricing" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto text-center scroll-reveal">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 mb-8 shadow-sm">
               <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Flexibilidade Total</span>
             </div>
             
             <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
               Pronto para profissionalizar seus projetos?
             </h2>
             <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
               Descubra como o ProjectGrid pode escalar sua produtividade. Temos planos flexíveis desenhados para cada etapa da sua jornada profissional.
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link to="/plans" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group">
                 Conhecer Planos e Preços 
                 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Link>
               <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center">
                 Falar com Consultor
               </Link>
             </div>

             <div className="mt-12 pt-10 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {[
                   "Sem fidelidade", 
                   "Teste Gratuito", 
                   "Setup Instantâneo", 
                   "Suporte Humanizado"
                ].map((item, i) => (
                   <div key={i} className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500/80" />
                      {item}
                   </div>
                ))}
             </div>
          </div>
        </section>
      </main>

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        .scroll-reveal {
          opacity: 0;
          transform: translateY(15px);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}} />
    </div>
  )
}

export default Home
