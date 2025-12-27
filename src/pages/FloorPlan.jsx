import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Rect, Group, Text, Transformer, Path, Arrow, RegularPolygon } from 'react-konva'
import { 
  MousePointer2, 
  PenTool, 
  Square, 
  Type, 
  Eraser,
  Undo,
  Redo,
  Save,
  Grid,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize,
  Lightbulb,
  ToggleLeft,
  Plug,
  Box,
  Cable,
  DoorOpen,
  GalleryVerticalEnd,
  Download,
  Tag,
  Trash2,
  FlipHorizontal,
  Ruler,
  Copy,
  ClipboardPaste,
  FileText,
  X,
  ArrowRight,
  Scissors,
  Folder,
  Check,
  AlertTriangle,
  Plus,
  Crown
} from 'lucide-react'
import { FloorPlanService } from '../lib/floorPlanService'

// Constantes
const GRID_SIZE = 40 // pixels por célula (ex: 40px = 1 metro na escala padrão)
const WALL_WIDTH = 4 // Espessura da parede em pixels
const SNAP_THRESHOLD = 10

/**
 * Componente principal do Editor de Plantas
 */
const FloorPlan = () => {
    // Limits Modal State
    const [limitModalData, setLimitModalData] = useState({ show: false, message: '', isPremium: false })

    // --- Helper: Snap to Grid or Wall Endpoints ---
  const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE
  
  const getSnappedPoint = (x, y, excludeWallId = null) => {
      // 1. Try snapping to other wall endpoints (Vertex Snap)
      // Check both start and end points of all *other* walls
      for (let w of walls) {
          if (excludeWallId && w.id.toString() === excludeWallId.toString()) continue

          // Snap to Start Point of other wall
          if (Math.abs(x - w.x1) < SNAP_THRESHOLD && Math.abs(y - w.y1) < SNAP_THRESHOLD) {
              return { x: w.x1, y: w.y1, snapped: true }
          }
          // Snap to End Point of other wall
          if (Math.abs(x - w.x2) < SNAP_THRESHOLD && Math.abs(y - w.y2) < SNAP_THRESHOLD) {
              return { x: w.x2, y: w.y2, snapped: true }
          }
      }

      // 2. Fallback to Grid Snap (DISABLED per user request)
      return { x, y, snapped: false }
  }
  // --- Estados da Ferramenta ---
  const [tool, setTool] = useState('select') // select, wall, wire, room, dimension, text
  const [showGrid, setShowGrid] = useState(true)
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [pixelsPerMeter, setPixelsPerMeter] = useState(40) // Escala: 40px = 1m
  
  // Estado para tamanho do Stage (Responsivo)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const containerRef = useRef(null) // Ref para o container pai

  // --- Estados do Desenho (Scene Graph) ---
  const [walls, setWalls] = useState([]) // Array de linhas {id, points: [x1,y1,x2,y2], width}
  const [components, setComponents] = useState([]) // Elementos elétricos {id, type, x, y, rotation, properties: {power, circuit, elevation}}
  const [wires, setWires] = useState([]) // Array de cabos {id, startCompId, endCompId}
  const [dimensionsList, setDimensionsList] = useState([]) // Lista de Cotas {id, x1, y1, x2, y2}
  const [labels, setLabels] = useState([]) // Lista de Textos {id, x, y, text, fontSize}
  const [arrows, setArrows] = useState([]) // Lista de Setas {id, points: [x1, y1, x2, y2], color}
  const [selectedId, setSelectedId] = useState(null) // ID do objeto selecionado
  
  // Estado para formulário de propriedades
  const [selectedProps, setSelectedProps] = useState({ power: '', circuit: '', elevation: 'low' })

  // Estado temporário para desenho em construção
  const [newWall, setNewWall] = useState(null) // Wall sendo desenhada atualmente
  const [newRoom, setNewRoom] = useState(null) // Room sendo desenhada atualmente {x1, y1, x2, y2}
  const [newDimension, setNewDimension] = useState(null) // Cota sendo desenhada
  const [newArrow, setNewArrow] = useState(null) // Seta sendo desenhada
  const [calibrationPoints, setCalibrationPoints] = useState([]) // Pontos para calibração [p1, p2]
  const [wiringStartId, setWiringStartId] = useState(null) // ID do componente onde o fio começou
  const [transformText, setTransformText] = useState('') // Texto de transformação (ex: ângulo)
  const [clipboard, setClipboard] = useState(null) // Para Copy/Paste
  const [dragFeedback, setDragFeedback] = useState([]) // Feedback visual de drag {x, y, text}
  const [snapIndicator, setSnapIndicator] = useState(null) // {x, y} para mostrar a cruz ao snappar
  const [showLoadSchedule, setShowLoadSchedule] = useState(false) // Quadro de Cargas

  // Refs
  const stageRef = useRef(null)
  const isDrawing = useRef(false)
  const transformerRef = useRef(null)
  const lastDist = useRef(0)
  const lastCenter = useRef(null)

  // ... existing code ...

  // --- Multi-Touch Pinch Zoom ---
  const handleTouchMoveStage = (e) => {
      // Logic for Pinch Zoom (2 fingers)
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (touch1 && touch2) {
          isDrawing.current = false // Stop drawing if pinching
          e.evt.preventDefault(); // Stop browser zoom

          const dist = Math.sqrt(
              Math.pow(touch2.clientX - touch1.clientX, 2) +
              Math.pow(touch2.clientY - touch1.clientY, 2)
          );

          if (!lastDist.current) {
              lastDist.current = dist;
          }

          const scale = (stageScale * dist) / lastDist.current;
          
          // Limits
          if (scale > 0.2 && scale < 5) {
            setStageScale(scale);
          }
          
          lastDist.current = dist;
      }
  }

  const handleTouchEndStage = () => {
      lastDist.current = 0;
  }

  // Observer para redimensionamento
  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            })
        }
    }

    // Inicial
    updateSize()
    
    // Resize Listener
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // --- Persistência com Supabase ---
  const [currentPlanId, setCurrentPlanId] = useState(null)
  const [currentProjectName, setCurrentProjectName] = useState('Meu Projeto')
  const [saveStatus, setSaveStatus] = useState('idle') // idle, saving, saved, error
  const [projectsList, setProjectsList] = useState([])
  const [showProjectsList, setShowProjectsList] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  
  // Feedback Visual (Toast)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
      setNotification({ show: true, message, type })
      setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }))
      }, 3000)
  }

  // Carrega do Supabase ao iniciar
  useEffect(() => {
    const loadProject = async () => {
        try {
            // Carrega lista de projetos
            const projects = await FloorPlanService.listFloorPlans()
            setProjectsList(projects || [])

            if (!projects || projects.length === 0) {
                // Se não tiver nenhum, FORÇA modal de criação
                setShowNewProjectModal(true)
            } else {
                // Carrega o mais recente (se existir)
                const project = await FloorPlanService.getMostRecentFloorPlan()
                if (project && project.data) {
                    loadProjectData(project.data)
                    setCurrentPlanId(project.id)
                    setCurrentProjectName(project.name || 'Meu Projeto')
                }
            }
        } catch (error) {
            console.error('Erro ao carregar projeto:', error)
        }
    }
    loadProject()
  }, [])

  const loadProjectData = (data) => {
      setWalls(data.walls || [])
      setComponents(data.components || [])
      setWires(data.wires || [])
      setDimensionsList(data.dimensionsList || [])
      setLabels(data.labels || [])
      setArrows(data.arrows || [])
      
      // Limpa seleções e estados temporários
      setSelectedId(null)
      setNewWall(null)
      setNewRoom(null)
  }

  const handleLoadExistingProject = async (projectSummary) => {
       try {
           if (!projectSummary) return
           
           // Limpa o canvas primeiro
           setWalls([])
           setComponents([])
           setWires([])
           setDimensionsList([])
           setLabels([])
           setArrows([])
           
           // Busca o projeto completo (com os dados JSON)
           const fullProject = await FloorPlanService.getFloorPlanById(projectSummary.id)

           if (fullProject && fullProject.data) {
                setTimeout(() => {
                        loadProjectData(fullProject.data)
                        setCurrentPlanId(fullProject.id)
                        setCurrentProjectName(fullProject.name || 'Meu Projeto')
                        setShowProjectsList(false)
                }, 50)
           }
           
       } catch(e) {
           console.error("Erro ao carregar projeto da lista", e)
           alert("Erro ao carregar projeto: " + e.message)
       }
  }

  // Atualiza a lista após salvar (para garantir que nomes/datas estejam atualizados)
  const refreshProjectsList = async () => {
      const projects = await FloorPlanService.listFloorPlans()
      setProjectsList(projects || [])
      return projects || []
  }

  const handleNewProject = async () => {
      // Verifica alterações não salvas
      if (walls.length > 0 || components.length > 0) {
          if (!window.confirm('Deseja criar um novo projeto? As alterações não salvas no atual serão perdidas.')) {
              return
          }
      }
      
      // Checking Plan Limits
      try {
        const { allowed, reason, isPremium } = await FloorPlanService.checkPlanLimits()
        if (!allowed) {
            setLimitModalData({ show: true, message: reason, isPremium })
            return
        }
      } catch (e) {
        console.error("Erro ao verificar limites", e)
      }
      
      // Abre o modal de criação (mesmo do boas-vindas)
      setShowNewProjectModal(true)
  }

  const handleForceCreateProject = async (name) => {
      try {
          // Cria um projeto vazio
          const emptyData = { walls: [], components: [], wires: [], dimensionsList: [], labels: [], arrows: [] }
          const savedProject = await FloorPlanService.saveFloorPlan(emptyData, null, name)
          
          if (savedProject) {
              setCurrentPlanId(savedProject.id)
              setCurrentProjectName(savedProject.name)
              setWalls([])
              setComponents([])
              setWires([])
              setDimensionsList([])
              setLabels([])
              setArrows([])
              
              setShowNewProjectModal(false)
              refreshProjectsList()
              showToast('Novo projeto criado!', 'success')
          }
      } catch (error) {
          alert('Erro ao criar projeto: ' + error.message)
      }
  }

  const handleDeleteProject = async (project) => {
      if (!window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) {
          return
      }

      try {
          await FloorPlanService.deleteFloorPlan(project.id)
          
          showToast('Projeto excluído com sucesso.', 'success')

          // Se o projeto deletado for o atual, limpa a tela
          if (currentPlanId === project.id) {
              setWalls([])
              setComponents([])
              setWires([])
              setDimensionsList([])
              setLabels([])
              setArrows([])
              setCurrentPlanId(null)
              setCurrentProjectName('Novo Projeto')
              setSaveStatus('idle')
          }
          
          // Atualiza a lista e verifica se sobrou algo
          const remainingProjects = await refreshProjectsList()
          
          if (remainingProjects.length === 0) {
              // Se não sobrou nada, FORÇA o modal de novo projeto
              setShowNewProjectModal(true)
          }

      } catch (error) {
          console.error('Erro ao excluir projeto:', error)
          showToast('Erro ao excluir projeto.', 'error')
          alert('Erro ao excluir projeto: ' + error.message)
      }
  }

  // Salva automaticamente a cada 5 segundos se houver mudanças
  // E apenas se já tivermos carregado (ou se o usuário já interagiu)
  useEffect(() => {
    // Evita salvar vazio no boot se não tiver nada
    if (walls.length === 0 && components.length === 0) return 

    // Se NÃO tem ID (projeto novo não salvo manualmente ainda), NÃO auto-salva para não spammar
    if (!currentPlanId) return

    const saveTimer = setTimeout(async () => {
        await handleSave(true) // Passa flag isAutoSave
    }, 5000)
    return () => clearTimeout(saveTimer)
  }, [walls, components, wires, dimensionsList, labels, arrows]) // Remove currentPlanId from dependency to avoid loop if valid

  const handleSave = async (isAutoSave = false) => {
      // Se não tiver nada, não salva
      if (walls.length === 0 && components.length === 0) return

      let name = currentProjectName
      
      // Se for novo projeto (sem ID) e for salvamento MANUAL, pede nome
      if (!currentPlanId && !isAutoSave) {
          const newName = window.prompt("Nome do Projeto:", currentProjectName)
          if (!newName) return // Cancelado
          name = newName
          setCurrentProjectName(name)
      } else if (!currentPlanId && isAutoSave) {
          // Se for auto-save em projeto sem ID, aborta (espera o usuário salvar 1x)
          return
      }

      setSaveStatus('saving')
      try {
          const floorPlanData = { walls, components, wires, dimensionsList, labels, arrows }
          const savedProject = await FloorPlanService.saveFloorPlan(floorPlanData, currentPlanId, name)
          if (savedProject) {
              setCurrentPlanId(savedProject.id)
              setSaveStatus('saved')
              
              if (!isAutoSave) {
                  showToast('Projeto salvo com sucesso!', 'success')
              }

              setTimeout(() => setSaveStatus('idle'), 2000)
              refreshProjectsList()
          }
      } catch (error) {
          console.error('Erro ao salvar:', error)
          setSaveStatus('error')
          
          if (!isAutoSave) {
               // Trata erros específicos apenas no manual para não incomodar
              if (error.message.includes('limite do plano')) {
                  showToast(error.message, 'error')
              } else {
                  showToast('Erro ao salvar!', 'error')
              }
          }
      }
  }

  // --- Copy / Paste Logic ---
  const handleCopy = () => {
        if (!selectedId) return
        // Verifica o tipo
        if (selectedId.toString().startsWith('comp-')) {
            const comp = components.find(c => c.id === selectedId)
            if (comp) setClipboard({ type: 'component', data: comp })
        } else if (selectedId.toString().startsWith('wire-')) {
           // Wires são complexos de copiar isolados
        } else if (selectedId.toString().startsWith('dim-')) {
             const dim = dimensionsList.find(d => d.id === selectedId)
             if (dim) setClipboard({ type: 'dimension', data: dim })
        } else if (selectedId.toString().startsWith('text-')) {
             const txt = labels.find(t => t.id === selectedId)
             if (txt) setClipboard({ type: 'text', data: txt })
        } else {
             // Wall
             const wall = walls.find(w => w.id.toString() === selectedId)
             if (wall) setClipboard({ type: 'wall', data: wall })
        }
  }

  const handlePaste = () => {
        if (!clipboard) return
        
        const offset = 20 // Posição deslocada
        
        if (clipboard.type === 'component') {
            const newComp = {
                ...clipboard.data,
                id: `comp-${Date.now()}`,
                x: clipboard.data.x + offset,
                y: clipboard.data.y + offset
            }
            setComponents(prev => [...prev, newComp])
            setSelectedId(newComp.id)
        } else if (clipboard.type === 'wall') {
            const newWall = {
                ...clipboard.data,
                id: Date.now(),
                x1: clipboard.data.x1 + offset,
                y1: clipboard.data.y1 + offset,
                x2: clipboard.data.x2 + offset,
                y2: clipboard.data.y2 + offset
            }
            setWalls(prev => [...prev, newWall])
            setSelectedId(newWall.id.toString())
        } else if (clipboard.type === 'text') {
             const newText = {
                 ...clipboard.data,
                 id: `text-${Date.now()}`,
                 x: clipboard.data.x + offset,
                 y: clipboard.data.y + offset
             }
             setLabels(prev => [...prev, newText])
             setSelectedId(newText.id)
        }
  }

  // --- Keyboard Shortcuts (Copy/Paste/Delete) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Evita deletar se estiver em inputs
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return
            deleteSelected()
        }

        // Copy (Ctrl+C)
        if (e.ctrlKey && e.key === 'c') {
            handleCopy()
        }

        // Paste (Ctrl+V)
        if (e.ctrlKey && e.key === 'v') {
            handlePaste()
        }

        // ESC Cancel / Switch to Select
        if (e.key === 'Escape') {
            if (isDrawing.current) {
                // Cancel current drawing
                isDrawing.current = false
                setNewWall(null)
                setNewRoom(null)
                setNewDimension(null)
                setNewArrow(null)
                setWiringStartId(null)
            } else {
               // Switch to Select tool
               setTool('select')
               setSelectedId(null)
            }
        }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, clipboard, components, walls])




  const handleExport = () => {
    if (stageRef.current) {
        // 1. Get original image data
        const uri = stageRef.current.toDataURL({
             pixelRatio: 2 // High quality
        })

        // 2. Create a temporary image to draw on
        const img = new Image()
        img.src = uri
        img.onload = () => {
            // 3. Create a canvas to combine image + watermark
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            
            // Draw original image
            ctx.drawImage(img, 0, 0)

            // 4. Draw Watermark Strategy (Viral Loop)
            const text = "Projeto gerado com ProjectGrid.com.br - Versão Gratuita"
            const fontSize = Math.max(12, 16 * (img.width / 1000)) // Responsive font size
            
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)" // Shadow
            ctx.fillText(text, 22, img.height - 18)
            
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)" // White Text
            ctx.fillText(text, 20, img.height - 20)

            // 5. Download the new image
            const link = document.createElement('a')
            link.download = 'planta-baixa-projectgrid.png'
            link.href = canvas.toDataURL()
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
  }

  // --- Funções de Ajuda (Grid) ---
  
  // Gera o fundo de grade infinita
  const renderGrid = () => {
    if (!showGrid) return null
    
    // Calcula a área visível baseada na posição e escala do stage
    // Para simplificar no MVP, desenhamos uma grade fixa grande o suficiente
    // Em produção, isso deve ser virtualizado
    const width = 5000
    const height = 5000
    const lines = []
    
    for (let i = 0; i < width / GRID_SIZE; i++) {
        lines.push(
            <Line
                key={`v-${i}`}
                points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
                stroke="#e2e8f0"
                strokeWidth={1}
            />
        )
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
        lines.push(
            <Line
                key={`h-${j}`}
                points={[0, j * GRID_SIZE, width, j * GRID_SIZE]}
                stroke="#e2e8f0"
                strokeWidth={1}
            />
        )
    }
    return <Group>{lines}</Group>
  }



  // --- Manipuladores de Eventos do Stage ---

  // --- Unified Pointer Events (Mouse, Touch, Pen/Stylus) ---
  
  const handlePointerDown = (e) => {
    // Deselect if clicking on empty stage (unless dragging a node)
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
       setSelectedId(null)
       if (transformerRef.current) transformerRef.current.nodes([])
    }

    // Inicio do desenho
    if (tool === 'wall') {
        const stage = e.target.getStage()
        // Use getRelativePointerPosition to handle Zoom/Pan automatically and correctly
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos) {
            // Apply Snapping (Vertex Only, Grid is disabled in helper)
            const sn = getSnappedPoint(relativePos.x, relativePos.y)
            const x = sn.x
            const y = sn.y
            
            // Set indicator if snapped
            if (sn.snapped) setSnapIndicator({x, y})

            isDrawing.current = true
            setNewWall({
                x1: x, y1: y, x2: x, y2: y
            })
        }
    } else if (tool === 'room') {
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos) {
            // Room Start Snapping
            const sn = getSnappedPoint(relativePos.x, relativePos.y)
            const x = sn.x
            const y = sn.y
            
             // Set indicator if snapped
            if (sn.snapped) setSnapIndicator({x, y})

            isDrawing.current = true
            setNewRoom({
                x1: x, y1: y, x2: x, y2: y
            })
        }
    } else if (tool === 'calibrate') {
        // Calibration Logic: Click 2 points
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos) {
             const newPoints = [...calibrationPoints, relativePos]
             setCalibrationPoints(newPoints)
             
             if (newPoints.length === 2) {
                 // Calculate distance and Prompt
                 const p1 = newPoints[0]
                 const p2 = newPoints[1]
                 const distPixels = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
                 
                 // Small timeout to allow render
                 setTimeout(() => {
                     const userDist = window.prompt(`Distância detectada: ${distPixels.toFixed(2)}px.\nQual a distância real em METROS?`, "1.0")
                     if (userDist && !isNaN(parseFloat(userDist))) {
                         const meters = parseFloat(userDist)
                         if (meters > 0) {
                             const newScale = distPixels / meters // pixels per 1 meter
                             setPixelsPerMeter(newScale)
                             alert(`Escala calibrada! 1 Metro = ${newScale.toFixed(2)} pixels.`)
                         }
                     }
                     // Reset
                     setCalibrationPoints([])
                     setTool('select')
                 }, 100)
             }
        }
    } else if (tool === 'arrow') {
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        if (relativePos) {
              const x = relativePos.x
              const y = relativePos.y
              isDrawing.current = true
              setNewArrow({ x1: x, y1: y, x2: x, y2: y })
        }
    } else if (tool === 'text') {
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos) {
             const newLabel = {
                 id: `text-${Date.now()}`,
                 x: relativePos.x,
                 y: relativePos.y,
                 text: 'Novo Texto',
                 fontSize: 16
             }
             setLabels(prev => [...prev, newLabel])
             setTool('select')
             setSelectedId(newLabel.id)
             
             // Auto edit on create?
             setTimeout(() => {
                 const userText = window.prompt("Digite o texto:", "Novo Texto")
                 if (userText !== null) {
                      setLabels(prev => prev.map(l => l.id === newLabel.id ? { ...l, text: userText } : l))
                 }
             }, 100)
        }
    }
  }

  const handlePointerMove = (e) => {
    // Prevent scrolling on mobile/tablet when drawing
    if (tool === 'wall' && isDrawing.current) {
        e.evt.preventDefault() // Crucial for S Pen / Touch to not scroll page
        
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos && newWall) {
            const snap = getSnappedPoint(relativePos.x, relativePos.y)
            let targetX = snap.x
            let targetY = snap.y
            
            // Set Indicator
            if (snap.snapped) {
                 setSnapIndicator({x: snap.x, y: snap.y})
            } else {
                 setSnapIndicator(null)
            }

            // Apply Angle Snapping ONLY if not snapped to a vertex
            if (!snap.snapped) {
                const dx = targetX - newWall.x1
                const dy = targetY - newWall.y1
                const dist = Math.sqrt(dx*dx + dy*dy)
                
                let angle = Math.atan2(dy, dx) * 180 / Math.PI
                if (angle < 0) angle += 360
                
                // Angles to snap to: 0, 45, 90, 135, 180, 225, 270, 315, 360
                const snapAngles = [0, 90, 180, 270, 360] // Removed diagonals for cleaner orthogonal drawing? User didn't ask, but standard. Use original set if safer.
                // Keeping original set
                const originalSnapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360]
                const ANGLE_THRESHOLD = 5 // Increased slightly

                let snappedAngle = null
                
                for (let a of originalSnapAngles) {
                    if (Math.abs(angle - a) < ANGLE_THRESHOLD || Math.abs(angle - a) > (360 - ANGLE_THRESHOLD)) {
                        // Snap it!
                        const rad = a * Math.PI / 180
                        targetX = newWall.x1 + dist * Math.cos(rad)
                        targetY = newWall.y1 + dist * Math.sin(rad)
                        snappedAngle = a % 360
                        break
                    }
                }
                 setNewWall(prev => ({ 
                    ...prev, 
                    x2: targetX, 
                    y2: targetY,
                    angleText: snappedAngle !== null ? `${snappedAngle}°` : null
                }))
            } else {
                 setNewWall(prev => ({ 
                    ...prev, 
                    x2: targetX, 
                    y2: targetY,
                    angleText: 'Snap'
                }))
            }
        }
    } else if (tool === 'room' && isDrawing.current && newRoom) {
         e.evt.preventDefault()
         const stage = e.target.getStage()
         const relativePos = stage.getRelativePointerPosition()
         
         if (relativePos) {
             const snap = getSnappedPoint(relativePos.x, relativePos.y)
             const x = snap.x
             const y = snap.y

             // Set Indicator
            if (snap.snapped) {
                 setSnapIndicator({x, y})
            } else {
                 setSnapIndicator(null)
            }

             setNewRoom(prev => ({ ...prev, x2: x, y2: y }))
         }
    } else if (tool === 'arrow' && isDrawing.current && newArrow) {
         const stage = e.target.getStage()
         const relativePos = stage.getRelativePointerPosition()
         if (relativePos) {
              setNewArrow(prev => ({
                  ...prev,
                  x2: relativePos.x,
                  y2: relativePos.y
              }))
         }
    }
  }

  const handlePointerUp = () => {
    setSnapIndicator(null)
    if (isDrawing.current) {
        isDrawing.current = false
        if (tool === 'wall' && newWall) {
            if (newWall.x1 !== newWall.x2 || newWall.y1 !== newWall.y2) {
                setWalls(prev => [...prev, { ...newWall, id: Date.now(), width: WALL_WIDTH }])
            }
            setNewWall(null)
        }
        if (tool === 'room' && newRoom) {
             const { x1, y1, x2, y2 } = newRoom
             const w = Math.abs(x2 - x1)
             const h = Math.abs(y2 - y1)
             
             // Min dimensions check (e.g., 0.5m ~ 20px)
             if (w > 10 && h > 10) {
                 const idBase = Date.now()
                 
                 // Normalize coords ensuring top-left to bottom-right order isn't required for Wall logic, 
                 // but good for consistency.
                 const left = Math.min(x1, x2)
                 const right = Math.max(x1, x2)
                 const top = Math.min(y1, y2)
                 const bottom = Math.max(y1, y2)

                 const wallsToAdd = [
                     // Top
                     { id: idBase, x1: left, y1: top, x2: right, y2: top, width: WALL_WIDTH },
                     // Right
                     { id: idBase+1, x1: right, y1: top, x2: right, y2: bottom, width: WALL_WIDTH },
                     // Bottom
                     { id: idBase+2, x1: right, y1: bottom, x2: left, y2: bottom, width: WALL_WIDTH },
                     // Left
                     { id: idBase+3, x1: left, y1: bottom, x2: left, y2: top, width: WALL_WIDTH }
                 ]
                 setWalls(prev => [...prev, ...wallsToAdd])
             }
             setNewRoom(null)
        }
        if (tool === 'arrow' && newArrow) {
             if (newArrow.x1 !== newArrow.x2 || newArrow.y1 !== newArrow.y2) {
                  setArrows(prev => [...prev, { ...newArrow, id: Date.now() }])
             }
             setNewArrow(null)
        }
    }
  }

  const handleWheel = (e) => {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
    }

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    
    // Limites de zoom
    if (newScale < 0.2 || newScale > 5) return

    setStageScale(newScale)
    setStagePos({
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
    })
  }

  const handleZoomIn = () => {
      setStageScale(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
      setStageScale(prev => Math.max(prev / 1.2, 0.2))
  }

  // --- Transformer Selection ---
  useEffect(() => {
    if (transformerRef.current) {
      if (selectedId) {
          const stage = stageRef.current
          const selectedNode = stage.findOne('.' + selectedId)
          if (selectedNode) {
            transformerRef.current.nodes([selectedNode])
            transformerRef.current.getLayer().batchDraw()
          } else {
            transformerRef.current.nodes([])
          }
      } else {
        transformerRef.current.nodes([])
      }
    }
  }, [selectedId, components, walls, wires]) // Updates when objects move/change

  // --- Form Sync (Only on Selection Change) ---
  useEffect(() => {
    if (selectedId) {
        if (selectedId.toString().startsWith('comp-')) {
            const comp = components.find(c => c.id === selectedId)
            if (comp) {
                if (comp.type === 'wireTag') {
                    setSelectedProps({
                        conductors: comp.properties?.conductors || 'FNT',
                        gauge: (comp.properties?.gauge !== undefined && comp.properties?.gauge !== null) ? comp.properties.gauge : '',
                        power: '', circuit: '', elevation: 'low', wireType: 'normal'
                    })
                } else {
                    setSelectedProps({
                        conductors: 'FNT', gauge: '2.5', wireType: 'normal',
                        ...comp.properties
                    })
                }
            }
        } else if (selectedId.toString().startsWith('wire-')) {
             const wire = wires.find(w => w.id === selectedId)
             if (wire) {
                 setSelectedProps(prev => ({
                     ...prev,
                     wireType: wire.type || 'normal',
                     conductors: wire.conductors || 'FNT',
                     gauge: (wire.gauge !== undefined && wire.gauge !== null) ? wire.gauge : ''
                 }))
             }
        }
    }
  }, [selectedId]) // Only re-sync form when SELECTION changes, not every keystroke

  const updateSelectedProperty = (field, value) => {
    if (!selectedId) return

    if (selectedId.toString().startsWith('comp-')) {
        // Atualiza estado local do form
        setSelectedProps(prev => ({ ...prev, [field]: value }))

        // Atualiza no canvas
        setComponents(prev => prev.map(c => {
            if (c.id === selectedId) {
                const newProps = { ...c.properties, [field]: value }
                return { ...c, properties: newProps }
            }
            return c
        }))
    } else if (selectedId.toString().startsWith('wire-')) {
         setSelectedProps(prev => ({ ...prev, [field]: value }))
         setWires(prev => prev.map(w => {
             if (w.id === selectedId) {
                 if (field === 'wireType') return { ...w, type: value }
                 if (field === 'conductors') return { ...w, conductors: value }
                 if (field === 'gauge') return { ...w, gauge: value }
             }
             return w
         }))
    }
  }

  const addComponent = (type) => {
    // Adiciona um componente no centro da visão atual
    // Calcula o centro relativo ao stage
    // Calcula o centro relativo ao stage
    const stage = stageRef.current
    const centerX = (-stagePos.x + (dimensions.width/2)) / stageScale
    const centerY = (-stagePos.y + (dimensions.height/2)) / stageScale

    const newComp = {
        id: `comp-${Date.now()}`,
        type,
        x: centerX,
        y: centerY,
        rotation: 0,
        properties: {
            power: '100W', // Default
            circuit: '1',  // Default
            elevation: 'low', // low (30cm), medium (1.2m), high (2m)
            conductors: 'FNT',
            gauge: type === 'wireTag' ? '' : '2.5',
            arrowTarget: { x: 0, y: 30 }
        }
    }
    setComponents(prev => [...prev, newComp])
    setTool('select')
    setSelectedId(newComp.id)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    
    if (selectedId.toString().startsWith('comp-')) {
        setComponents(prev => prev.filter(c => c.id !== selectedId))
        // Remove fios conectados
        setWires(prev => prev.filter(w => w.startCompId !== selectedId && w.endCompId !== selectedId))
    } else if (selectedId.toString().startsWith('wire-')) {
        setWires(prev => prev.filter(w => w.id !== selectedId))
    } else if (selectedId.toString().startsWith('dim-') || dimensionsList.some(d => d.id === selectedId)) {
        setDimensionsList(prev => prev.filter(d => d.id !== selectedId))
    } else if (selectedId.toString().startsWith('text-')) {
        setLabels(prev => prev.filter(l => l.id !== selectedId))
    } else if (arrows.some(a => a.id === selectedId)) {
        setArrows(prev => prev.filter(a => a.id !== selectedId))
    } else {
        // Assume que é parede (ids numéricos)
        // Nota: IDs de parede são timestamps (números), ids de comp são strings
        // Precisamos garantir conversão correta se for string
        setWalls(prev => prev.filter(w => w.id.toString() !== selectedId))
    }
    setSelectedId(null)
    if (transformerRef.current) transformerRef.current.nodes([])
  }

  const clearCanvas = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o desenho? Isso não pode ser desfeito.')) {
        setWalls([])
        setComponents([])
        setWires([])
        setDimensionsList([])
        setLabels([])
        setSelectedId(null)
        setNewWall(null)
        setWiringStartId(null)
        if (transformerRef.current) transformerRef.current.nodes([])
    }
  }

  // --- Renderização de Símbolos ---
  const renderComponentShape = (comp) => {
    try {
        let shape = null
    const color = '#f59e0b' // Amber/Gold padrão para elétrico

    const props = comp.properties || {}
    const elevation = props.elevation || 'low' // low, medium, high

    // Helper para desenhar triângulo de tomada
    const renderOutletTriangle = (fillType) => {
        // fillType: 'none', 'half', 'full'
        return (
            <Group>
                <Line points={[-12, 10, 0, -14, 12, 10]} stroke={color} strokeWidth={2} closed fill={fillType === 'full' ? color : 'white'} />
                {fillType === 'half' && (
                    <Line points={[-12, 10, 0, -14, 0, 10]} fill={color} closed stroke={color} strokeWidth={0} />
                )}
            </Group>
        )   
    }

    switch (comp.type) {
        case 'outlet': {
            // Tomada: Triângulo (Simples, Dupla, Tripla) + Opção de Interruptor
            // Estilo "Árvore/Haste" ABNT
            const isFloor = comp.properties?.subtype === 'floor'
            const hasSwitch = comp.properties?.hasSwitch || false
            const variant = comp.properties?.variant || 'simple'
            const count = variant === 'triple' ? 3 : variant === 'double' ? 2 : 1
            const elevation = comp.properties?.elevation || 'low' // low/medium/high

            // Haste Principal
            const stemLength = 25
            // Se for de chão, não tem haste alongada, é o quadrado no chão? 
            // Geralmente chão é só o simbolo no local. 
            // Mas vamos manter consistencia: Se floor, haste curta ou sem haste, e quadrado em volta.
            
            const shapeGroup = []
            
            // Desenha a haste
            if (!isFloor) {
                shapeGroup.push(
                    <Line key="stem" points={[0, 0, 0, -stemLength]} stroke={color} strokeWidth={1} />
                )
            }

            // Função para desenhar um triângulo de tomada com preenchimento correto
            const renderOutletTriangle = (yPos, key) => {
                let fillContent = null
                
                // Base: Triângulo de contorno
                const triangleBase = <RegularPolygon sides={3} radius={8} stroke={color} strokeWidth={1.5} rotation={0} fill="white" />
                
                if (elevation === 'high') {
                     // Cheio
                     fillContent = <RegularPolygon sides={3} radius={8} fill={color} stroke={color} rotation={0} />
                } else if (elevation === 'medium') {
                     // Média: Meio Cheio (Metade Direita Pintada)
                     // ABNT: Contorno completo + Metade direita preenchida
                     fillContent = (
                         <Group>
                             {/* Contorno Base */}
                             {triangleBase}
                             {/* Preenchimento da Metade Direita */}
                             {/* Pontos do triângulo (raio 8, rot 0): Top(0,-8), BotRight(6.92, 4), BotLeft(-6.92, 4) */}
                             {/* Dividindo no meio (x=0) */}
                             <Path 
                                data="M 0 -8 L 6.92 4 L 0 4 Z" 
                                fill={color} 
                             />
                             {/* Linha divisória central (opcional, para reforçar) */}
                             <Line points={[0, -8, 0, 4]} stroke={color} strokeWidth={1} />
                         </Group>
                     )
                } else {
                    // Baixa: Vazio
                    fillContent = triangleBase
                }

                return (
                    <Group y={yPos} key={key} rotation={0}>
                        {fillContent}
                    </Group>
                )
            }

            // Empilhar Triângulos
            // Se tiver interruptor, ele fica na ponta (topo), e as tomadas logo abaixo?
            // Ou tomadas na ponta e interruptor do lado?
            // Na imagem referência: Triangulos empilhados ao longo da haste.
            
            // Posição inicial (ponta da haste)
            let currentY = -stemLength
            
            // Se tiver interruptor (Conjugado)
            if (hasSwitch) {
                // Desenha a bola do interruptor na ponta
                shapeGroup.push(
                    <Group key="sw" y={currentY - 10}>
                         <Circle radius={8} stroke={color} strokeWidth={1.5} fill="white" />
                         {/* Letra do comando dentro ou fora? Geralmente fora ou dentro. Vamos por fora pra não poluir */}
                         <Text 
                            text={comp.properties?.command || ''}
                            x={10} 
                            y={-5}
                            fontSize={10} 
                            fontStyle="bold"
                            fill="#0f172a" 
                        />
                    </Group>
                )
                // Desloca um pouco para baixo para começar as tomadas
                currentY += 8 
            }

            // Desenha as tomadas empilhadas
            for(let i=0; i<count; i++) {
                // Espaçamento entre elas
                // Se for 1, fica na ponta (ou logo abaixo do switch).
                // Se forem varias, vão descendo na haste.
                shapeGroup.push(renderOutletTriangle(currentY + (i * 14), `ot-${i}`))
            }

            // Floor Frame
            if (isFloor) {
                 // Moldura retangular em volta de tudo?
                 // Ou só na base? Geralmente envolve os simbolos.
                 const totalH = (count * 14) + (hasSwitch ? 20 : 0) + 10
                 shapeGroup.push(
                     <Rect 
                        key="floor-box"
                        x={-15} 
                        y={currentY - 15} 
                        width={30} 
                        height={totalH} 
                        stroke={color} 
                        strokeWidth={1} 
                     />
                 )
            }

            shape = (
                <Group>
                    {shapeGroup}
                    {/* Texto de Potência/Circuito ao lado */}
                    <Group x={15} y={-stemLength}>
                         <Text 
                            text={comp.properties?.power || ''}
                            fontSize={10} 
                            fontStyle="bold"
                            fill="#64748b" 
                            y={0}
                        />
                         <Text 
                            text={comp.properties?.circuit ? `C.${comp.properties.circuit}` : ''}
                            fontSize={9} 
                            fill="#ef4444" 
                            y={10}
                        />
                    </Group>
                </Group>
            )
            break
        }
        case 'switch': {
            // Interruptor: "Lollipop" Style (Haste + Círculo Dividido)
            const swVariant = comp.properties?.variant || 'simple'
            
            // Stem (Haste)
            const stemLength = 25
            const circleRadius = 8
            
            // Definição das divisões internas
            let divisions = null
            if (swVariant === 'double') {
                // Divisão Vertical (Meio a Meio)
                divisions = <Line points={[0, -circleRadius, 0, circleRadius]} stroke={color} strokeWidth={1} />
            } else if (swVariant === 'triple') {
                // Divisão em Y (Mercedes Style)
                // 0,0 é o centro do círculo
                // Ponto 1: Cima (0, -r)
                // Ponto 2: Baixo Dir (cos(30)*r, sin(30)*r) -> (0.866*r, 0.5*r)
                // Ponto 3: Baixo Esq (-0.866*r, 0.5*r)
                
                const r = circleRadius
                const x1 = 0, y1 = -r
                const x2 = r * Math.sin(Math.PI/3), y2 = r * Math.cos(Math.PI/3)
                const x3 = -r * Math.sin(Math.PI/3), y3 = r * Math.cos(Math.PI/3)

                divisions = (
                    <Group>
                        <Line points={[0, 0, x1, y1]} stroke={color} strokeWidth={1} />
                        <Line points={[0, 0, x2, y2]} stroke={color} strokeWidth={1} />
                        <Line points={[0, 0, x3, y3]} stroke={color} strokeWidth={1} />
                    </Group>
                )
            }

            shape = (
                <Group>
                    {/* Haste */}
                    <Line 
                        points={[0, 0, 0, -stemLength]} 
                        stroke={color} 
                        strokeWidth={1.5} 
                    />
                    
                    {/* Círculo na ponta */}
                    <Group y={-stemLength}>
                         <Circle 
                            radius={circleRadius} 
                            stroke={color} 
                            strokeWidth={1.5} 
                            fill="white" 
                         />
                         {divisions}
                    </Group>

                    {/* Texto (Id / Comando) abaixo do círculo */}
                    <Text 
                        text={comp.properties?.command || ''}
                        x={0}
                        y={-stemLength + circleRadius + 5} 
                        fontSize={10} 
                        fontStyle="bold"
                        fill="#0f172a" 
                        align="center"
                        width={60}
                        offsetX={30}
                    />
                </Group>
            )
            break
        }
        case 'lamp':
            shape = (
                <Group>
                    {/* Círculo Principal Dividido */}
                    <Circle radius={20} stroke="#334155" strokeWidth={2} fill="#fff" />
                    
                    {/* Linha Horizontal (Divisão Potência / Comando) */}
                    <Line points={[-20, 0, 20, 0]} stroke="#334155" strokeWidth={1.5} />
                    
                    {/* Linha Vertical (Divisão Circuito / Tecla) */}
                    <Line points={[0, 0, 0, 20]} stroke="#334155" strokeWidth={1.5} />

                    {/* Potência (Topo) */}
                    <Text 
                        x={0} y={-10} 
                        text={comp.properties?.power || '100'} 
                        fontSize={10} fontStyle="bold" fill="#0f172a" 
                        align="center" verticalAlign="middle" 
                        offsetX={30} offsetY={5} width={60}
                    />

                    {/* Circuito (Inferior Esquerdo) */}
                    <Text 
                        x={-10} y={10} 
                        text={comp.properties?.circuit || '1'} 
                        fontSize={9} fill="#ef4444" 
                        align="center" verticalAlign="middle" 
                        offsetX={5} offsetY={5} width={10}
                    />

                    {/* Tecla/Comando (Inferior Direito) */}
                    <Text 
                        x={10} y={10} 
                        text={comp.properties?.command || 'a'} 
                        fontSize={9} fill="#0f172a" 
                        align="center" verticalAlign="middle" 
                        offsetX={5} offsetY={5} width={10}
                    />
                </Group>
            )
            break
        case 'qgbt':
            // Quadro
            shape = (
                <Group>
                    <Rect width={40} height={20} x={-20} y={-10} stroke={color} strokeWidth={2} fill="white" />
                    <Line points={[-20, -10, 20, 10]} stroke={color} strokeWidth={2} />
                    <Rect width={20} height={20} x={-20} y={-10} fill={color} opacity={0.5} />
                </Group>
            )
            break
        case 'door':
            // Porta via Path para robustez
            // M 0 0 L 0 32 (Batente)
            // M 0 0 L 32 0 (Folha)
            // A 32 32 0 0 1 0 32 (Arco - 0,32 até 32,0? Não, centro em 0,0)
            // Path Arc: M startX startY A rx ry x-axis-rotation large-arc-flag sweep-flag endX endY
            // Start: 32,0. End: 0,32. 
            // Fix: Add White Mask to simulate "opening" in the wall
            shape = (
                <Group>
                     {/* Máscara da Parede (Simula abertura) */}
                     {/* Cobre a linha da parede abaixo da porta. Assumindo parede de 6px width */}
                     <Rect x={-2} y={-4} width={36} height={8} fill="#f8fafc" /> 

                     {/* Batente / Folha */}
                     {/* Folha da porta (vertical se aberta 90 graus) */}
                     <Line points={[0, 0, 0, 32]} stroke="#334155" strokeWidth={4} /> 
                     
                     {/* Linha do vão (opcional, mas ajuda a visualizar o espaço) */}
                     <Line points={[0, 0, 32, 0]} stroke="#334155" strokeWidth={1} dash={[2, 2]} opacity={0.5} /> 

                     {/* Arco do movimento: de 32,0 (fechada) para 0,32 (aberta) */}
                     {/* Se 0,0 é a dobradiça */}
                     <Path data="M 32 0 A 32 32 0 0 1 0 32" stroke="#cbd5e1" strokeWidth={1} dash={[2,2]} />
                     
                     {/* Batente Direito (onde a porta fecha) */}
                     <Rect x={30} y={-3} width={4} height={6} fill="#334155" />
                     {/* Batente Esquerdo (dobradiça) */}
                     <Rect x={-2} y={-3} width={4} height={6} fill="#334155" />
                </Group>
            )
            break
        case 'window':
            // Janela (1.20m = 48px)
            shape = (
                <Group>
                    <Rect width={48} height={10} x={-24} y={-5} stroke="#334155" strokeWidth={1} fill="white" />
                    <Line points={[-24, 0, 24, 0]} stroke="#94a3b8" strokeWidth={1} />
                </Group>
            )
            break       

        case 'shaft':
            // Shaft / Corte na Parede
            // Retângulo Branco (Máscara) + Linhas Vermelhas nas pontas
            const shaftWidth = props.width || 30 // Largura do corte (cm)
            const wPx = shaftWidth // 1px = 1cm na escala atual do componente (ou ajuste conforme necessário)
            // Nota: Componentes como Janela usam 48px para 1.20m? (48 * 2.5 = 120). Escala do projeto é 40px=1m?
            // Ajustar escala visual se necessário. No floorplan, 1m = 40px (GRID_SIZE).
            // Se width=30cm -> 12px.
            
            // Vamos usar props.width como pixels por enquanto ou converter?
            // Janela: width={48} (1.2m). 48px.
            // Então 1px = 2.5cm.
            // Se shaftWidth (cm) = 30. Pixels = 30 / 2.5 = 12.
            
            // Mas talvez seja mais fácil usar coordenadas diretas.
            // Vamos assumir um padrão visual fixo ou editável.
            // Default 30cm (12px) de largura, e altura da parede (aprox 10-15px).
            
            shape = (
                <Group>
                    {/* Máscara Branca (Maior que a parede para cobrir bem) */}
                    <Rect 
                        width={props.pixelWidth || 20} 
                        height={16} 
                        x={-(props.pixelWidth || 20)/2} 
                        y={-8} 
                        fill="white" 
                        stroke="transparent"
                    />
                    
                    {/* Linhas de Limite (Vermelho) */}
                    <Line 
                        points={[-(props.pixelWidth || 20)/2, -8, -(props.pixelWidth || 20)/2, 8]} 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                    />
                    <Line 
                        points={[(props.pixelWidth || 20)/2, -8, (props.pixelWidth || 20)/2, 8]} 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                    />
                    
                    {/* Label opcional 'SHAFT' ou vazio */}
                </Group>
            )
            break

        case 'wireTag': {
             // Tag de fio com Leader Line (Haste dobrável)
             const props = comp.properties || {}
             // x,y = Ponta da seta (no eletroduto)
             // props.tagOffset = Posição do corpo da tag relativa à ponta
             // props.tagOffset = Posição do corpo da tag relativa à ponta
             
             const tagOffset = comp.properties?.tagOffset || { x: 30, y: -30 }
             const type = String(props.conductors || 'FNT') // Safety string cast
             
             // Calcula ângulo da seta (aponta para o anchor 0,0 vindo do offset)
             // Vector: Anchor(0,0) - Offset(dx, dy) = (-dx, -dy)
             const angleRad = Math.atan2(-tagOffset.y, -tagOffset.x)
             const angleDeg = angleRad * 180 / Math.PI

             const renderMarks = () => {
                const marks = [] 
                const spacing = 6
                const list = type.split('')
                
                const totalWidth = Math.max(20, (list.length) * spacing) // Largura mínima
                const startX = 0 // Agora relativo ao offset

                // Linha de Base (Tag Horizontal) começa no offset
                marks.push(
                    <Line key="base-wire" points={[startX, 0, startX + totalWidth + 10, 0]} stroke="#94a3b8" strokeWidth={1} />
                )

                list.forEach((char, i) => {
                    const lx = startX + (i * spacing) + (spacing/2) + 5 // +5 padding
                    
                    if (char === 'F') { // Fase = Vermelho
                        marks.push(<Line key={`f-${i}`} points={[lx, -8, lx, 8]} stroke="#ef4444" strokeWidth={2} />)
                    }
                    else if (char === 'N') { // Neutro = Azul
                        marks.push(
                            <Group key={`n-${i}`}>
                                <Line points={[lx, -8, lx, 8]} stroke="#3b82f6" strokeWidth={2} />
                                <Line points={[lx, -8, lx - 4, -8]} stroke="#3b82f6" strokeWidth={2} />
                            </Group>
                        )
                    }
                    else if (char === 'T') { // Terra = Verde
                        marks.push(
                            <Group key={`t-${i}`}>
                                <Line points={[lx, -8, lx, 8]} stroke="#22c55e" strokeWidth={2} />
                                <Line points={[lx - 4, -8, lx + 4, -8]} stroke="#22c55e" strokeWidth={2} />
                            </Group>
                        )
                    }
                    else if (char === 'R') { // Retorno = Amarelo
                         marks.push(<Line key={`r-${i}`} points={[lx, 0, lx, 8]} stroke="#eab308" strokeWidth={2} />)
                    }
                })
                return marks
             }

             shape = (
                 <Group>
                     {/* 1. Seta na Ponta (0,0) - Apontando para o anchor */}
                     <RegularPolygon 
                        sides={3} 
                        radius={4} 
                        x={0} 
                        y={0} 
                        rotation={angleDeg + 90} // Ajuste para apontar corretamente
                        fill="#64748b" 
                     />
                     
                     {/* 2. Leader Line (Do anchor até o offset) */}
                     <Line 
                        points={[0, 0, tagOffset.x, tagOffset.y]} 
                        stroke="#94a3b8" 
                        strokeWidth={1} 
                     />

                     {/* 3. Corpo da Tag (No offset) */}
                     <Group x={tagOffset.x} y={tagOffset.y}> 
                        <Rect x={-5} y={-15} width={60} height={30} fill="transparent" />
                        {renderMarks()}
                        
                        {/* Texto Combinado */}
                        {props.circuit ? (
                            <Group>
                                <Text 
                                    y={-25} x={0}
                                    text={`${props.circuit}`}
                                    fontSize={10} fontStyle="bold" fill="#ef4444" 
                                    align="right" width={30} offsetX={30}
                                />
                                <Text 
                                    y={-25} x={4}
                                    text={`#${props.gauge || '?'}`}
                                    fontSize={10} fill="#64748b" 
                                    align="left" width={70} offsetX={0}
                                />
                            </Group>
                        ) : (
                            <Text 
                                y={-25} x={0}
                                text={`#${props.gauge || '?'}`}
                                fontSize={10} fill="#64748b" 
                                align="center" width={70} offsetX={35}
                            />
                        )}
                     </Group>

                     {/* 4. Handle de Controle da Tag (Só se selecionado) */}
                     {selectedId === comp.id && tool === 'select' && (
                         <Circle
                            x={tagOffset.x}
                            y={tagOffset.y}
                            radius={6}
                            fill="#f59e0b"
                            stroke="white"
                            strokeWidth={1}
                             draggable
                            onDragMove={(e) => {
                                // Evita propagação para o grupo pai
                                e.cancelBubble = true
                            }}
                            onDragEnd={(e) => {
                                e.cancelBubble = true
                                const node = e.target
                                // Posição relativa ao grupo pai
                                const newX = node.x()
                                const newY = node.y()
                                
                                setComponents(prev => prev.map(c => 
                                    c.id === comp.id ? { ...c, properties: { ...c.properties, tagOffset: { x: newX, y: newY } } } : c
                                ))
                                node.position({ x: newX, y: newY })
                            }}
                         />
                     )}
                 </Group>
             )
             break;
        }
        default:
            return null
    }

    return (
        <Group
            key={comp.id}
            id={comp.id}
            name={comp.id}
            x={comp.x}
            y={comp.y}
            rotation={comp.rotation}
            draggable={tool === 'select'}
            onClick={() => {
                if (tool === 'select') {
                    setSelectedId(comp.id)
                } else if (tool === 'wire') {
                    if (wiringStartId === null) {
                        setWiringStartId(comp.id)
                    } else {
                        if (wiringStartId !== comp.id) {
                            const newWire = {
                                id: `wire-${Date.now()}`,
                                startCompId: wiringStartId,
                                endCompId: comp.id,
                                controlOffset: { x: 0, y: 0 }, // Offset manual do ponto de controle
                                type: 'normal',
                                conductors: 'FNT', // Padrão
                                gauge: '1.5' // Padrão
                            }
                            setWires(prev => [...prev, newWire])
                            setWiringStartId(null)
                        }
                    }
                }
            }}
            onTap={() => {
                if (tool === 'select') {
                    setSelectedId(comp.id)
                } else if (tool === 'wire') {
                    if (wiringStartId === null) {
                        setWiringStartId(comp.id)
                    } else {
                        if (wiringStartId !== comp.id) {
                            const newWire = {
                                id: `wire-${Date.now()}`,
                                startCompId: wiringStartId,
                                endCompId: comp.id,
                                controlOffset: { x: 0, y: 0 }, // Offset manual do ponto de controle
                                type: 'normal',
                                conductors: 'FNT', // Padrão
                                gauge: '1.5' // Padrão
                            }
                            setWires(prev => [...prev, newWire])
                            setWiringStartId(null)
                        }
                    }
                }
            }}
            onDragEnd={(e) => {
                const node = e.target
                const newX = node.x()
                const newY = node.y()
                node.position({ x: newX, y: newY })
                setComponents(prev => prev.map(c => 
                    c.id === comp.id ? { ...c, x: newX, y: newY, rotation: node.rotation() } : c
                ))
            }}
            onTransformEnd={(e) => {
                const node = e.target
                const newScaleX = node.scaleX()
                const newScaleY = node.scaleY()
                const newRotation = node.rotation()
                const newX = node.x()
                const newY = node.y()
                
                // Atualiza o estado com as novas transformações
                setComponents(prev => prev.map(c => 
                    c.id === comp.id ? { 
                        ...c, 
                        x: newX, 
                        y: newY, 
                        rotation: newRotation,
                        scaleX: newScaleX,
                        scaleY: newScaleY
                    } : c
                ))
            }}
            scaleX={comp.scaleX || comp.properties?.flipX || 1}
            scaleY={comp.scaleY || 1}
        >
            {shape}
            {/* Texto de Propriedades (Potência e Circuito) */}
            {[''].includes(comp.type) && (
                <Group>
                </Group>
            )}

            {/* Marcador de Fio */}
            {tool === 'wire' && wiringStartId === comp.id && (
                <Circle radius={25} stroke="#6366f1" strokeWidth={2} dash={[5, 5]} />
            )}
        </Group>
    )
    } catch (error) {
        console.error("Erro renderizando componente:", comp, error)
        return null
    }
  }

  // --- Função para Calcular Quadro de Cargas (NBR 5410) ---
  const calculateLoadSchedule = () => {
      const schedule = {}
      
      // Tabela de Capacidade de Corrente (Ampacidade) - NBR 5410
      // Método de Instalação B1 (Eletroduto embutido em alvenaria), condutores de cobre, isolação PVC 70°C
      // 2 condutores carregados (F+N ou F+F)
      const ampacityTable = [
          { section: 1.5, iz: 17.5 },
          { section: 2.5, iz: 24.0 },
          { section: 4.0, iz: 32.0 },
          { section: 6.0, iz: 41.0 },
          { section: 10.0, iz: 57.0 },
          { section: 16.0, iz: 76.0 },
          { section: 25.0, iz: 101.0 }
      ]

      // Disjuntores Padrão (DIN)
      const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100]

      components.forEach(comp => {
          if (comp.type !== 'lamp' && comp.type !== 'outlet') return

          const circuit = comp.properties?.circuit || '?'
          if (!schedule[circuit]) {
              schedule[circuit] = {
                  id: circuit,
                  description: new Set(),
                  voltage: 220, // Tensão (V)
                  totalVA: 0,
                  totalW: 0,
                  scheme: 'F+N+T',
                  factor: 1.0,
                  fca: 0.70, // Fator de Correção de Agrupamento (FCA) - Ex: 3 circuitos no eletroduto
                  minSection: 0
              }
          }

          // Potência
          const power = parseInt(comp.properties?.power || (comp.type === 'lamp' ? 100 : 127))
          
          let factor = 1.0
          if (comp.type === 'lamp') {
              schedule[circuit].description.add('Iluminação')
              schedule[circuit].scheme = 'F+N' // Ilum é F+N+T mas simplificado F+N no diagrama unifilar as vezes
              schedule[circuit].minSection = Math.max(schedule[circuit].minSection, 1.5) // NBR 5410: Min 1.5 para iluminação
          } else if (comp.type === 'outlet') {
               schedule[circuit].description.add('Tomadas')
               factor = 0.8 // Fator de Potência típico para TUGs
               schedule[circuit].scheme = 'F+N+T'
               schedule[circuit].minSection = Math.max(schedule[circuit].minSection, 2.5) // NBR 5410: Min 2.5 para força
          }

          schedule[circuit].totalVA += power
          schedule[circuit].totalW += (power * factor)
          schedule[circuit].factor = factor 
      })

      return Object.values(schedule).sort((a,b) => {
          if(a.id === '?') return 1;
          if(b.id === '?') return -1;
          return parseInt(a.id) - parseInt(b.id);
      }).map(row => {
          // 1. Corrente de Projeto (Ib)
          const Ib = row.totalVA / row.voltage

          const isOutletCircuit = Array.from(row.description).some(d => d.includes('Tomadas'))
          const minBreakerIn = isOutletCircuit ? 16 : 10

          // 2. Determinar Cabo (Seção)
          // Critério A: Iz' = Iz * FCA >= Ib (Suportar a Carga)
          // Critério B: Iz' = Iz * FCA >= minBreakerIn (Suportar o Disjuntor Mínimo)
          // Logo: Iz >= max(Ib, minBreakerIn) / FCA
          
          const requiredIzVal = Math.max(Ib, minBreakerIn)
          const requiredIzRaw = requiredIzVal / row.fca
          
          let selectedCable = ampacityTable.find(c => c.iz >= requiredIzRaw && c.section >= row.minSection)
          
          // Se não encontrou (carga muito alta), pega o maior
          if (!selectedCable) selectedCable = ampacityTable[ampacityTable.length - 1]

          const Iz = selectedCable.iz
          const Iz_corrected = Iz * row.fca
          const section = selectedCable.section

          // 3. Selecionar Disjuntor (In)
          // Condição 1: In >= Ib
          // Condição 2: In <= Iz_corrected (Proteção do cabo contra sobrecarga)
          // Condição 3: In >= minBreakerIn (Restrição do Usuário)
          
          let breaker = standardBreakers.find(In => In >= Ib && In <= Iz_corrected && In >= minBreakerIn)
          
          let status = 'OK'
          if (!breaker) {
              // Tentativas de diagnóstico de erro
              if (Ib > Iz_corrected) {
                   status = 'ERRO: Carga > Cabo (Upsize Failure)'
              } else if (minBreakerIn > Iz_corrected) {
                   // Caso raro (se o cabo maximo nao aguentar 16A corrigido, mas cabo 25mm aguenta muito mais)
                   status = 'ERRO: Cabo não suporta Disj Mín'
              } else {
                   // Carga ok, Cabo ok, mas sem disjuntor padrão no intervalo?
                   // Ex: Ib=45, Iz'=48. Break=?? (40<45, 50>48). Sem breaker.
                   status = 'ALERTA: Ajuste Fino Nec.'
              }
              
              // Fallback visual
              breaker = 0 
          }

          return {
              ...row,
              description: Array.from(row.description).join(' e '),
              Ib: Ib.toFixed(2), // Corrente calculada
              totalW: Math.round(row.totalW), // Arredondar W
              breaker: breaker,
              diam: section,
              status: status
          }
      })
  }


  // --- Renderização ---

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100 relative" style={{ touchAction: 'none' }}>
      
      {/* Barra de Ferramentas Superior (Horizontal) */}
      <div className="absolute left-6 top-4 z-10 flex flex-wrap gap-1 bg-white p-1 rounded-lg shadow-lg border border-slate-200 max-w-[calc(100%-3rem)] items-center">
        {/* Zoom Controls */}
        <ToolButton 
            active={false} 
            onClick={handleNewProject} 
            icon={Plus} 
            tooltip="Novo Projeto (+)" 
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={handleZoomIn} 
            icon={ZoomIn} 
            tooltip="Zoom In (+)" 
        />
        <ToolButton 
            active={false} 
            onClick={handleZoomOut} 
            icon={ZoomOut} 
            tooltip="Zoom Out (-)" 
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={tool === 'select'} 
            onClick={() => setTool('select')} 
            icon={MousePointer2} 
            tooltip="Selecionar (V)" 
        />
        <ToolButton 
            active={tool === 'text'} 
            onClick={() => setTool('text')} 
            icon={Type} 
            tooltip="Texto (T)" 
        />
        <ToolButton 
            active={tool === 'arrow'} 
            onClick={() => setTool('arrow')} 
            icon={ArrowRight} 
            tooltip="Seta" 
        />
        <ToolButton 
            active={tool === 'wall'} 
            onClick={() => setTool('wall')} 
            icon={PenTool} 
            tooltip="Parede (W)" 
        />
        <ToolButton 
            active={tool === 'room'} 
            onClick={() => setTool('room')} 
            icon={Square} 
            tooltip="Cômodo (R)" 
        />
        <ToolButton 
            active={tool === 'wire'} 
            onClick={() => setTool('wire')} 
            icon={Cable} 
            tooltip="Fiação (C)" 
        />
        <ToolButton 
            active={false} 
            onClick={() => addComponent('wireTag')} 
            icon={Tag} 
            tooltip="Adicionar Etiqueta de Fio" 
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={() => addComponent('outlet')} 
            icon={Plug} 
            tooltip="Adicionar Tomada" 
        />
        <ToolButton 
            active={false} 
            onClick={() => addComponent('switch')} 
            icon={ToggleLeft} 
            tooltip="Adicionar Interruptor" 
        />
        <ToolButton 
            active={false} 
            onClick={() => addComponent('lamp')} 
            icon={Lightbulb} 
            tooltip="Adicionar Lâmpada" 
        />
        <ToolButton 
            active={false} 
            onClick={() => addComponent('qgbt')} 
            icon={Box} 
            tooltip="Adicionar QGBT" 
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={() => addComponent('door')} 
            icon={DoorOpen} 
            tooltip="Adicionar Porta" 
        />
         <ToolButton 
            active={false} 
            onClick={() => addComponent('window')} 
            icon={GalleryVerticalEnd} 
            tooltip="Adicionar Janela" 
        />
         <ToolButton 
            active={false} 
            onClick={() => addComponent('shaft')} 
            icon={Scissors} 
            tooltip="Adicionar Shaft / Corte" 
        />

        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={showLoadSchedule} 
            onClick={() => setShowLoadSchedule(!showLoadSchedule)} 
            icon={FileText} 
            tooltip="Quadro de Cargas" 
        />

        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={tool === 'calibrate'} 
            onClick={() => {
                setTool(tool === 'calibrate' ? 'select' : 'calibrate')
                setCalibrationPoints([])
            }} 
            icon={Square} 
            tooltip="Calibrar Escala (Régua)" 
            className="text-amber-600 bg-amber-50 hover:bg-amber-100"
        />
        <ToolButton 
            active={false} 
            onClick={() => {}} 
            icon={Grid} 
            activeState={showGrid}
            onClickCustom={() => setShowGrid(!showGrid)}
            tooltip="Grade (G)" 
        />
        <ToolButton 
            active={false} 
            onClick={deleteSelected} 
            icon={Eraser} 
            tooltip="Excluir Seleção (Del)" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
        />
        <ToolButton 
            active={false} 
            onClick={clearCanvas} 
            icon={Trash2} 
            tooltip="Limpar Tudo" 
            className="text-red-700 hover:text-red-800 hover:bg-red-100"
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={handleCopy} 
            icon={Copy} 
            tooltip="Copiar (Ctrl+C)" 
            disabled={!selectedId}
            className={!selectedId ? "opacity-50 cursor-not-allowed" : ""}
        />
        <ToolButton 
            active={false} 
            onClick={handlePaste} 
            icon={ClipboardPaste} 
            tooltip="Colar (Ctrl+V)" 
            disabled={!clipboard}
            className={!clipboard ? "opacity-50 cursor-not-allowed" : ""}
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={handleExport} 
            icon={Download} 
            tooltip="Exportar Imagem" 
        />
        <div className="w-px bg-slate-200 mx-1 self-stretch"></div>
        <ToolButton 
            active={false} 
            onClick={() => handleSave(false)} 
            icon={Save} 
            tooltip="Salvar Agora" 
            className={
                saveStatus === 'saved' ? "text-emerald-600 bg-emerald-50" :
                saveStatus === 'error' ? "text-red-600 bg-red-50" :
                saveStatus === 'saving' ? "text-indigo-600 animate-pulse" :
                ""
            }
        />
      </div>

       <div className="flex-1 cursor-crosshair bg-slate-50 relative overflow-hidden" ref={containerRef}>
         <Stage 
            width={dimensions.width} 
            height={dimensions.height} 
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchMove={handleTouchMoveStage}
            onTouchEnd={handleTouchEndStage}
            onWheel={handleWheel}
            ref={stageRef}
            draggable={tool === 'select'}
         >
            <Layer>
                {renderGrid()}
                
                {/* Wall Joints (Vertices) */}
                {walls.map(wall => (
                    <Group key={`j-${wall.id}`}>
                        <Circle 
                            x={wall.x1} y={wall.y1} 
                            radius={(wall.width || WALL_WIDTH) / 2} 
                            fill={selectedId === wall.id.toString() ? "#4f46e5" : "#334155"} 
                        />
                        <Circle 
                            x={wall.x2} y={wall.y2} 
                            radius={(wall.width || WALL_WIDTH) / 2} 
                            fill={selectedId === wall.id.toString() ? "#4f46e5" : "#334155"} 
                        />
                    </Group>
                ))}

                {/* Paredes Desenhadas com Medidas */}
                {walls.map((wall) => {
                    // Calcula centro e comprimento
                    const cx = (wall.x1 + wall.x2) / 2
                    const cy = (wall.y1 + wall.y2) / 2
                    // Comprimento em metros (px / pixelsPerMeter)
                    const lenPixels = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2))
                    const lenMeters = (lenPixels / pixelsPerMeter).toFixed(2)

                    // Ângulo da parede para rotacionar o texto
                    const dx = wall.x2 - wall.x1
                    const dy = wall.y2 - wall.y1
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI

                    return (
                        <Group 
                            key={wall.id}
                            draggable={tool === 'select'}
                            onDragStart={() => {
                                setDragFeedback([])
                            }}
                            onDragMove={(e) => {
                                const node = e.target
                                const dx = node.x()
                                const dy = node.y()
                                
                                const newFeedback = []
                                const tolerance = 20

                                // Calculate angle for connected walls
                                walls.forEach(w => {
                                    if (w.id === wall.id) return // Skip self (or show self angle too?)

                                    let wx1 = w.x1
                                    let wy1 = w.y1
                                    let wx2 = w.x2
                                    let wy2 = w.y2
                                    let modified = false

                                    // Check connections (simulating the move)
                                    // Start Point of W connected to Wall
                                    if (Math.abs(w.x1 - wall.x1) < tolerance && Math.abs(w.y1 - wall.y1) < tolerance) {
                                        wx1 += dx; wy1 += dy; modified = true;
                                    } else if (Math.abs(w.x1 - wall.x2) < tolerance && Math.abs(w.y1 - wall.y2) < tolerance) {
                                        wx1 += dx; wy1 += dy; modified = true;
                                    }

                                    // End Point of W connected to Wall
                                    if (Math.abs(w.x2 - wall.x1) < tolerance && Math.abs(w.y2 - wall.y1) < tolerance) {
                                        wx2 += dx; wy2 += dy; modified = true;
                                    } else if (Math.abs(w.x2 - wall.x2) < tolerance && Math.abs(w.y2 - wall.y2) < tolerance) {
                                        wx2 += dx; wy2 += dy; modified = true;
                                    }

                                    if (modified) {
                                        // Calculate angle
                                        const dX = wx2 - wx1
                                        const dY = wy2 - wy1
                                        let angle = Math.atan2(dY, dX) * 180 / Math.PI
                                        if (angle < 0) angle += 360
                                        
                                        // Position for text (midpoint)
                                        const mx = (wx1 + wx2) / 2
                                        const my = (wy1 + wy2) / 2
                                        
                                        newFeedback.push({
                                            x: mx,
                                            y: my,
                                            text: `${angle.toFixed(1)}°`
                                        })
                                    }
                                })
                                setDragFeedback(newFeedback)
                            }}
                            onDragEnd={(e) => {
                                const node = e.target
                                const dx = node.x()
                                const dy = node.y()
                                
                                setDragFeedback([])
                                
                                // Reset position so we can drive by state
                                node.position({ x: 0, y: 0 })

                                if (dx === 0 && dy === 0) return

                                // 1. Update the Dragged Wall
                                const newX1 = wall.x1 + dx
                                const newY1 = wall.y1 + dy
                                const newX2 = wall.x2 + dx
                                const newY2 = wall.y2 + dy

                                // 2. Update Connected Walls
                                const tolerance = 20 // Increased tolerance for easier snapping
                                
                                setWalls(prevWalls => {
                                    return prevWalls.map(w => {
                                        if (w.id === wall.id) {
                                            return { ...w, x1: newX1, y1: newY1, x2: newX2, y2: newY2 }
                                        }

                                        let wx1 = w.x1
                                        let wy1 = w.y1
                                        let wx2 = w.x2
                                        let wy2 = w.y2
                                        let modified = false

                                        // Check Start Point connection to Dragged Wall Start
                                        if (Math.abs(w.x1 - wall.x1) < tolerance && Math.abs(w.y1 - wall.y1) < tolerance) {
                                            wx1 += dx; wy1 += dy; modified = true;
                                        } 
                                        // Check Start Point connection to Dragged Wall End
                                        else if (Math.abs(w.x1 - wall.x2) < tolerance && Math.abs(w.y1 - wall.y2) < tolerance) {
                                            wx1 += dx; wy1 += dy; modified = true;
                                        }

                                        // Check End Point connection to Dragged Wall Start
                                        if (Math.abs(w.x2 - wall.x1) < tolerance && Math.abs(w.y2 - wall.y1) < tolerance) {
                                            wx2 += dx; wy2 += dy; modified = true;
                                        }
                                        // Check End Point connection to Dragged Wall End
                                        else if (Math.abs(w.x2 - wall.x2) < tolerance && Math.abs(w.y2 - wall.y2) < tolerance) {
                                            wx2 += dx; wy2 += dy; modified = true;
                                        }

                                        return modified ? { ...w, x1: wx1, y1: wy1, x2: wx2, y2: wy2 } : w
                                    })
                                })

                                // 3. Update Components on the Wall
                                const distToSegment = (px, py, x1, y1, x2, y2) => {
                                    const l2 = (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
                                    if (l2 === 0) return Math.sqrt((px-x1)*(px-x1) + (py-y1)*(py-y1));
                                    let t = ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / l2;
                                    t = Math.max(0, Math.min(1, t));
                                    const projx = x1 + t * (x2-x1);
                                    const projy = y1 + t * (y2-y1);
                                    return Math.sqrt((px-projx)*(px-projx) + (py-projy)*(py-projy));
                                }
                                
                                setComponents(prevComps => prevComps.map(c => {
                                    if (distToSegment(c.x, c.y, wall.x1, wall.y1, wall.x2, wall.y2) < 10) {
                                        return { ...c, x: c.x + dx, y: c.y + dy }
                                    }
                                    return c
                                }))
                            }}
                        >
                            <Line
                                id={wall.id.toString()}
                                points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                                stroke={selectedId === wall.id.toString() ? "#4f46e5" : "#334155"}
                                strokeWidth={wall.width || WALL_WIDTH}
                                lineCap="square"
                                onClick={() => {
                                    if (tool === 'select') setSelectedId(wall.id.toString())
                                }}
                                onTap={() => {
                                    if (tool === 'select') setSelectedId(wall.id.toString())
                                }}
                                onMouseEnter={(e) => {
                                    if (tool === 'select') {
                                        const container = e.target.getStage().container();
                                        container.style.cursor = "move";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    const container = e.target.getStage().container();
                                    container.style.cursor = "default";
                                }}
                            />
                            {/* Texto de Medida */}
                            <Text 
                                x={cx} 
                                y={cy} 
                                text={`${lenMeters}m`} 
                                fontSize={10} 
                                fill="#94a3b8" 
                                align="center" 
                                rotation={angle}
                                offsetY={-10} // Empurra para "cima" da linha (lado)
                                offsetX={15} // Centraliza mais ou menos
                                listening={false}
                            />
                        </Group>
                    )
                })}

                {/* Fiação (Wires) */}
                {wires.map((wire) => {
                    const startComp = components.find(c => c.id === wire.startCompId)
                    const endComp = components.find(c => c.id === wire.endCompId)
                    
                    if (!startComp || !endComp) return null

                    // Ponto médio da reta
                    const midX = (startComp.x + endComp.x) / 2
                    const midY = (startComp.y + endComp.y) / 2
                    
                    // Vetor normal para curvatura padrão
                    const dx = endComp.x - startComp.x
                    const dy = endComp.y - startComp.y
                    const dist = Math.sqrt(dx*dx + dy*dy)
                    
                    // Default curve: Perpendicular
                    // (-dy, dx)
                    let defaultControlX = midX - (dy * 0.2)
                    let defaultControlY = midY + (dx * 0.2)

                    // Se tiver offset manual, soma ao padrão (ou substitui? Vamos somar ao midpoint para simplificar o drag)
                    // Melhor: Control Point absoluto ou relativo? Relativo ao Midpoint permite que o fio acompanhe o movimento dos componentes.
                    // Vamos usar: ControlPoint = Midpoint + DefaultVector + UserOffset
                    
                    // Se o wire.controlOffset não existir (legado), inicie
                    const offset = wire.controlOffset || { x: 0, y: 0 }
                    
                    const cpX = defaultControlX + offset.x
                    const cpY = defaultControlY + offset.y

                    const isSelected = selectedId === wire.id
                    const isUnderground = wire.type === 'underground'
                    
                    // --- Renderização de Condutores ---
                    // Ponto t=0.5 na curva quadrática
                    // B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
                    // t=0.5 => 0.25*P0 + 0.5*P1 + 0.25*P2
                    const t = 0.5
                    const curveMidX = (1-t)*(1-t)*startComp.x + 2*(1-t)*t*cpX + t*t*endComp.x
                    const curveMidY = (1-t)*(1-t)*startComp.y + 2*(1-t)*t*cpY + t*t*endComp.y


                    return (
                        <Group key={wire.id}>
                            <Path
                                data={`M ${startComp.x} ${startComp.y} Q ${cpX} ${cpY} ${endComp.x} ${endComp.y}`}
                                stroke="transparent"
                                strokeWidth={12} // Área de clique maior
                                onClick={() => {
                                    if (tool === 'select') setSelectedId(wire.id)
                                }}
                                onTap={() => {
                                    if (tool === 'select') setSelectedId(wire.id)
                                }}
                                onMouseEnter={(e) => {
                                    const container = e.target.getStage().container();
                                    container.style.cursor = "pointer";
                                }}
                                onMouseLeave={(e) => {
                                    const container = e.target.getStage().container();
                                    container.style.cursor = "default";
                                }}
                            />
                            <Path
                                data={`M ${startComp.x} ${startComp.y} Q ${cpX} ${cpY} ${endComp.x} ${endComp.y}`}
                                stroke={isSelected ? "#ef4444" : "#f59e0b"}
                                strokeWidth={2}
                                lineCap="round"
                                lineJoin="round"
                                dash={isUnderground ? [5, 5] : []}
                                listening={false} 
                            />
                            
                            {/* Handle de Controle (só aparece se selecionado) */}
                            {isSelected && tool === 'select' && (
                                <Circle
                                    x={cpX}
                                    y={cpY}
                                    radius={6}
                                    fill="#ef4444"
                                    draggable
                                    onDragMove={(e) => {
                                        // Atualiza SOMENTE o visual enquanto arrasta? Ou atualiza o estado?
                                        // Vamos atualizar o estado.
                                    }}
                                    onDragEnd={(e) => {
                                        const node = e.target
                                        // Calcula novo offset
                                        // cpX_new = defaultControlX + offset_new
                                        // offset_new = cpX_new - defaultControlX
                                        const newOffsetX = node.x() - defaultControlX
                                        const newOffsetY = node.y() - defaultControlY
                                        
                                        // Atualiza wires
                                        setWires(prev => prev.map(w => 
                                            w.id === wire.id ? { ...w, controlOffset: { x: newOffsetX, y: newOffsetY } } : w
                                        ))
                                    }}
                                />
                            )}
                        </Group>
                    )
                })}

                {/* Componentes Elétricos */}
                {components.map(renderComponentShape)}

                {/* Transformer (Gizmo de Seleção) */}
                <Transformer
                    ref={transformerRef}
// ... (omitting duplicate props for clearer diff)
                />

                {/* Live Rotation Tooltip */}
                {transformText && selectedId && transformerRef.current && (() => {
                     const node = transformerRef.current.getNode()
                     if (!node) return null
                     return (
                         <Text 
                            x={node.x()}
                            y={node.y() - 40}
                            text={transformText}
                            fontSize={14}
                            fontStyle="bold"
                            fill="#4f46e5"
                            align="center"
                            offsetX={10}
                         />
                     )
                })()}

                {/* Drag Feedback (Angles) */}
                {dragFeedback.map((fb, i) => (
                    <Text
                        key={`df-${i}`}
                        x={fb.x}
                        y={fb.y}
                        text={fb.text}
                        fontSize={14}
                        fontStyle="bold"
                        fill="#4f46e5"
                        align="center"
                        offsetX={20}
                        offsetY={20}
                        padding={4}
                        listening={false}
                    />
                ))}

                {/* Snap Indicator (Crosshair) */}
                {snapIndicator && (
                    <Group x={snapIndicator.x} y={snapIndicator.y}>
                        <Line points={[-15, 0, 15, 0]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} listening={false} />
                        <Line points={[0, -15, 0, 15]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} listening={false} />
                        <Circle radius={4} stroke="#ef4444" strokeWidth={1} fill="transparent" listening={false} />
                    </Group>
                )}

                {/* Parede Temporária (Ghost) */}
                {newWall && (
                    <Group>
                        <Line
                            points={[newWall.x1, newWall.y1, newWall.x2, newWall.y2]}
                            stroke="#6366f1"
                            strokeWidth={6}
                            opacity={0.6}
                            lineCap="square"
                            dash={[20, 10]}
                        />
                        {/* Texto rotacionado para acompanhar a parede em construção */}
                        <Text 
                            x={(newWall.x1 + newWall.x2) / 2} 
                            y={(newWall.y1 + newWall.y2) / 2} 
                            text={`${(Math.sqrt(Math.pow(newWall.x2 - newWall.x1, 2) + Math.pow(newWall.y2 - newWall.y1, 2)) / GRID_SIZE).toFixed(2)}m`} 
                            fontSize={12} 
                            fontStyle="bold"
                            fill="#4338ca" 
                            align="center"
                            rotation={Math.atan2(newWall.y2 - newWall.y1, newWall.x2 - newWall.x1) * 180 / Math.PI} 
                            offsetY={-60} // Mais alto para não ficar embaixo do dedo
                            offsetX={20} 
                        />
                        {/* Indicador de Ângulo (Esquadro) */}
                        {newWall.angleText && (
                             <Text 
                                x={newWall.x1} 
                                y={newWall.y1} 
                                text={newWall.angleText} 
                                fontSize={11} 
                                fontStyle="bold"
                                fill="#059669" 
                                align="center"
                                offsetY={-60} // Mais alto para não ficar embaixo do dedo
                            />
                        )}
                        
                        {/* Crosshair (Mira de Precisão no Mobile) */}
                        <Group x={newWall.x2} y={newWall.y2}>
                             <Line points={[-40, 0, 40, 0]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} />
                             <Line points={[0, -40, 0, 40]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} />
                             <Circle radius={3} stroke="#ef4444" strokeWidth={1} />
                        </Group>
                    </Group>
                )}

                {/* Ghost Room */}
                {newRoom && (
                    <Group>
                        <Rect
                            x={Math.min(newRoom.x1, newRoom.x2)}
                            y={Math.min(newRoom.y1, newRoom.y2)}
                            width={Math.abs(newRoom.x2 - newRoom.x1)}
                            height={Math.abs(newRoom.y2 - newRoom.y1)}
                            stroke="#6366f1"
                            strokeWidth={2}
                            dash={[10, 5]}
                            fill="rgba(99, 102, 241, 0.1)"
                        />
                        <Text 
                            x={(newRoom.x1 + newRoom.x2) / 2} 
                            y={(newRoom.y1 + newRoom.y2) / 2} 
                            text={`${(Math.abs(newRoom.x2 - newRoom.x1) / GRID_SIZE).toFixed(2)}m x ${(Math.abs(newRoom.y2 - newRoom.y1) / GRID_SIZE).toFixed(2)}m`}
                            fontSize={12} 
                            fontStyle="bold"
                            fill="#4338ca" 
                            align="center"
                            offsetX={40}
                            offsetY={10}
                        />
                    </Group>
                )}

                {/* Handles de Redimensionamento de Parede (Só aparece se uma parede estiver selecionada) */}
                {(() => {
                    const selectedWall = walls.find(w => w.id.toString() === selectedId)
                    if (selectedWall && tool === 'select') {
                        return (
                            <Group>
                                {/* Start Point Handle */}
                                <Circle 
                                    x={selectedWall.x1} 
                                    y={selectedWall.y1} 
                                    radius={5} 
                                    fill="#fff" 
                                    stroke="#4f46e5"
                                    strokeWidth={2}
                                    draggable
                                    onDragMove={(e) => {
                                        const { x, y } = e.target.position()
                                        // Snap logic
                                        const snapped = getSnappedPoint(x, y, selectedWall.id)
                                        const sx = snapped.x
                                        const sy = snapped.y
                                        
                                        setWalls(prev => prev.map(w => {
                                            if (w.id.toString() === selectedId) {
                                                return { ...w, x1: sx, y1: sy }
                                            }
                                            return w
                                        }))
                                        e.target.position({ x: sx, y: sy })
                                    }}
                                />
                                {/* End Point Handle */}
                                <Circle 
                                    x={selectedWall.x2} 
                                    y={selectedWall.y2} 
                                    radius={5} 
                                    fill="#fff" 
                                    stroke="#4f46e5"
                                    strokeWidth={2}
                                    draggable
                                    onDragMove={(e) => {
                                        const { x, y } = e.target.position()
                                        // Snap to Wall or Grid
                                        const snapped = getSnappedPoint(x, y, selectedWall.id)
                                        const sx = snapped.x
                                        const sy = snapped.y
                                        
                                        // Update visual state (React State > Konva Node Position)
                                        setWalls(prev => prev.map(w => {
                                            if (w.id.toString() === selectedId) {
                                                return { ...w, x2: sx, y2: sy }
                                            }
                                            return w
                                        }))
                                        e.target.position({ x: sx, y: sy })
                                    }}
                                />
                            </Group>
                        )
                    }

                    return null
                })()}

                {/* Dimensions */}
                {dimensionsList.map(d => {
                    const cx = (d.x1 + d.x2) / 2
                    const cy = (d.y1 + d.y2) / 2
                    const lenPixels = Math.sqrt(Math.pow(d.x2 - d.x1, 2) + Math.pow(d.y2 - d.y1, 2))
                    const lenMeters = (lenPixels / pixelsPerMeter).toFixed(2)
                    const angle = Math.atan2(d.y2 - d.y1, d.x2 - d.x1) * 180 / Math.PI
                    
                    return (
                        <Group key={d.id}>
                            {/* Hit Area (Invisible wider line for easier clicking) */}
                            <Line 
                                points={[d.x1, d.y1, d.x2, d.y2]} 
                                stroke="transparent" 
                                strokeWidth={10} 
                                onClick={() => tool === 'select' && setSelectedId(d.id)}
                                onTap={() => tool === 'select' && setSelectedId(d.id)}
                                onMouseEnter={(e) => {
                                    const container = e.target.getStage().container();
                                    container.style.cursor = tool === 'select' ? 'pointer' : 'default';
                                }}
                                onMouseLeave={(e) => {
                                    const container = e.target.getStage().container();
                                    container.style.cursor = 'default';
                                }}
                            />
                            {/* Visible Line */}
                            <Line 
                                points={[d.x1, d.y1, d.x2, d.y2]} 
                                stroke={selectedId === d.id ? "#ef4444" : "#f59e0b"} 
                                strokeWidth={selectedId === d.id ? 2 : 1} 
                                dash={[4, 4]} 
                                listening={false} // Pass events to hit area
                            />
                            {/* Tips */}
                            <Circle x={d.x1} y={d.y1} radius={3} fill={selectedId === d.id ? "#ef4444" : "#f59e0b"} listening={false} />
                            <Circle x={d.x2} y={d.y2} radius={3} fill={selectedId === d.id ? "#ef4444" : "#f59e0b"} listening={false} />
                            
                            {/* Label Background for Readability */}
                            <Rect 
                                x={cx - 20} 
                                y={cy - 8} 
                                width={40} 
                                height={16} 
                                fill="white" 
                                opacity={0.8} 
                                cornerRadius={4}
                                onClick={() => tool === 'select' && setSelectedId(d.id)}
                                onTap={() => tool === 'select' && setSelectedId(d.id)}
                            />
                            <Text 
                                x={cx} 
                                y={cy} 
                                text={`${lenMeters}m`} 
                                fontSize={10} 
                                fontStyle="bold"
                                fill={selectedId === d.id ? "#ef4444" : "#b45309"}
                                align="center" 
                                offsetX={20}
                                offsetY={5}
                                onClick={() => tool === 'select' && setSelectedId(d.id)}
                                onTap={() => tool === 'select' && setSelectedId(d.id)}
                            />
                        </Group>
                    )
                })}

                {/* Text Labels */}
                {labels.map((label) => (
                    <Text
                        key={label.id}
                        id={label.id}
                        x={label.x}
                        y={label.y}
                        text={label.text}
                        fontSize={label.fontSize || 16}
                        fill={selectedId === label.id ? "#ef4444" : "#0f172a"}
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(label.id)}
                        onTap={() => tool === 'select' && setSelectedId(label.id)}
                        onDblClick={() => {
                             const newText = window.prompt("Editar texto:", label.text)
                             if (newText !== null) {
                                  setLabels(prev => prev.map(l => l.id === label.id ? { ...l, text: newText } : l))
                             }
                        }}
                        onDblTap={() => {
                             const newText = window.prompt("Editar texto:", label.text)
                             if (newText !== null) {
                                  setLabels(prev => prev.map(l => l.id === label.id ? { ...l, text: newText } : l))
                             }
                        }}
                        onDragEnd={(e) => {
                            setLabels(prev => prev.map(l => l.id === label.id ? { ...l, x: e.target.x(), y: e.target.y() } : l))
                        }}
                    />
                ))}

                {/* Setas */}
                {arrows.map((arrow) => (
                    <Arrow
                        key={arrow.id}
                        points={[arrow.x1, arrow.y1, arrow.x2, arrow.y2]}
                        pointerLength={5}
                        pointerWidth={5}
                        fill={selectedId === arrow.id ? "#ef4444" : "#475569"}
                        stroke={selectedId === arrow.id ? "#ef4444" : "#475569"}
                        strokeWidth={1.5}
                        hitStrokeWidth={10} // Easier to select even if thin
                        draggable={tool === 'select'}
                        onClick={() => tool === 'select' && setSelectedId(arrow.id)}
                        onTap={() => tool === 'select' && setSelectedId(arrow.id)}
                        onDragEnd={(e) => {
                            const node = e.target
                            const dx = node.x()
                            const dy = node.y()
                            setArrows(prev => prev.map(a => 
                                a.id === arrow.id 
                                ? { ...a, x1: a.x1 + dx, y1: a.y1 + dy, x2: a.x2 + dx, y2: a.y2 + dy }
                                : a
                            ))
                            node.position({ x: 0, y: 0 })
                        }}
                    />
                ))}
                 {newArrow && (
                    <Arrow
                        points={[newArrow.x1, newArrow.y1, newArrow.x2, newArrow.y2]}
                        pointerLength={5}
                        pointerWidth={5}
                        fill="#6366f1"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                        opacity={0.6}
                    />
                )}

                {/* New Dimension Preview */}
                {newDimension && (() => {
                    const cx = (newDimension.x1 + newDimension.x2) / 2
                    const cy = (newDimension.y1 + newDimension.y2) / 2
                    const lenPixels = Math.sqrt(Math.pow(newDimension.x2 - newDimension.x1, 2) + Math.pow(newDimension.y2 - newDimension.y1, 2))
                    const lenMeters = (lenPixels / pixelsPerMeter).toFixed(2)
                    
                    return (
                        <Group>
                            <Line 
                                points={[newDimension.x1, newDimension.y1, newDimension.x2, newDimension.y2]} 
                                stroke="#f59e0b" 
                                strokeWidth={1} 
                                dash={[4, 4]} 
                            />
                            <Text 
                                x={cx} 
                                y={cy - 15} 
                                text={`${lenMeters}m`} 
                                fontSize={10} 
                                fontStyle="bold"
                                fill="#b45309" 
                                align="center" 
                                offsetX={15}
                            />
                        </Group>
                    )
                })()}

                {/* Calibration Points Render */}
                {calibrationPoints.map((p, i) => (
                    <Group key={`cal-${i}`}>
                        <Circle x={p.x} y={p.y} radius={6} stroke="#ef4444" strokeWidth={2} fill="white" />
                        <Circle x={p.x} y={p.y} radius={2} fill="#ef4444" />
                        {i > 0 && (
                            <Line 
                                points={[calibrationPoints[0].x, calibrationPoints[0].y, p.x, p.y]}
                                stroke="#ef4444"
                                strokeWidth={1}
                                dash={[2, 2]}
                            />
                        )}
                    </Group>
                ))}

            </Layer>
         </Stage>

         {/* Floating Properties Card (Overlays the Canvas) */}
         {selectedId && selectedId.toString().startsWith('comp-') && (() => {
             const comp = components.find(c => c.id === selectedId)
             // Only for specific types
             if (comp && ['outlet', 'lamp', 'switch', 'wireTag'].includes(comp.type)) {
                 // Calculate screen position with offset support
                 const offsetX = (comp.type === 'wireTag' ? (comp.properties?.tagOffset?.x || 30) : 0)
                 const offsetY = (comp.type === 'wireTag' ? (comp.properties?.tagOffset?.y || -30) : 0)
                 
                 const screenX = (comp.x + offsetX) * stageScale + stagePos.x
                 const screenY = (comp.y + offsetY) * stageScale + stagePos.y
                 
                 return (
                     <div 
                        className="absolute bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-indigo-100 flex flex-col gap-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            left: screenX + 50, // More offset to right
                            top: screenY - 80   // More offset to top
                        }}
                     >
                        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-indigo-50">
                             <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                             <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                {comp.type === 'outlet' ? 'Tomada' : 
                                 comp.type === 'lamp' ? 'Iluminação' : 
                                 comp.type === 'switch' ? 'Interruptor' : 'Etiqueta de Fio'}
                             </span>
                        </div>

                        {/* Power Input (Hide for Switch and WireTag) */}
                        {!['switch', 'wireTag'].includes(comp.type) && (
                            <div className="flex items-center gap-2">
                                 <Zap className="w-3 h-3 text-slate-400" />
                                 <input 
                                    type="text" 
                                    value={selectedProps.power || ''}
                                    onChange={(e) => updateSelectedProperty('power', e.target.value)}
                                    className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                    placeholder="Potência (Ex: 100W)"
                                    autoFocus
                                 />
                            </div>
                        )}


                        <div className="flex items-center gap-2">
                             <Box className="w-3 h-3 text-slate-400" />
                             <input 
                                type="text" 
                                value={selectedProps.circuit || ''}
                                onChange={(e) => updateSelectedProperty('circuit', e.target.value)}
                                className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                placeholder="Circuito (Ex: 1)"
                             />
                        </div>


                        {/* Elevation Select (Hide for WireTag) */}
                        {comp.type !== 'wireTag' && (
                        <div className="flex items-center gap-2">
                             <GalleryVerticalEnd className="w-3 h-3 text-slate-400" />
                             <select
                                value={selectedProps.elevation || 'low'}
                                onChange={(e) => updateSelectedProperty('elevation', e.target.value)}
                                className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                             >
                                <option value="low">Baixa (30cm)</option>
                                <option value="medium">Média (1.20m)</option>
                                <option value="high">Alta (2.00m)</option>
                             </select>
                        </div>
                        )}

                        {/* Variant Select (Simple, Double, Triple) */}
                        {['outlet', 'switch'].includes(comp.type) && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-3 text-center">x</span>
                                <select
                                    value={selectedProps.variant || 'simple'}
                                    onChange={(e) => updateSelectedProperty('variant', e.target.value)}
                                    className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                >
                                    <option value="simple">Simples</option>
                                    <option value="double">Dupla</option>
                                    <option value="triple">Tripla</option>
                                </select>
                            </div>
                        )}

                        {/* Floor Checkbox (Outlet Only) */}
                        {comp.type === 'outlet' && (
                             <div className="flex flex-col gap-1 pt-1">
                                 <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="floor-chk"
                                        checked={selectedProps.subtype === 'floor'}
                                        onChange={(e) => updateSelectedProperty('subtype', e.target.checked ? 'floor' : 'wall')}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="floor-chk" className="text-[10px] font-bold text-slate-500">De Chão</label>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="switch-chk"
                                        checked={selectedProps.hasSwitch || false}
                                        onChange={(e) => updateSelectedProperty('hasSwitch', e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="switch-chk" className="text-[10px] font-bold text-slate-500">Com Interruptor</label>
                                 </div>
                             </div>
                        )}

                        {/* Command/Switch Key Input (Lamps, Switches AND Outlets with Switch) */}
                        {(['lamp', 'switch'].includes(comp.type) || (comp.type === 'outlet' && selectedProps.hasSwitch)) && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-3 text-center">Id</span>
                                <input 
                                    type="text" 
                                    value={selectedProps.command || ''}
                                    onChange={(e) => updateSelectedProperty('command', e.target.value)}
                                    className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                    placeholder="Tecla (Ex: a)"
                                />
                            </div>
                        )}

                        {/* WireTag Specifics: Conductors & Gauge */}
                        {comp.type === 'wireTag' && (
                            <>
                                <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-slate-400 w-3 text-center">F</span>
                                     <select
                                        value={selectedProps.conductors || 'FNT'}
                                        onChange={(e) => updateSelectedProperty('conductors', e.target.value)}
                                        className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                     >
                                        <option value="F">Fase (F)</option>
                                        <option value="FN">Fase + Neutro (FN)</option>
                                        <option value="FNT">F+N+Terra (FNT)</option>
                                        <option value="FF">Duas Fases (FF)</option>
                                        <option value="FFT">2F + Terra (FFT)</option>
                                        <option value="FR">Fase + Retorno (FR)</option>
                                        <option value="R">Retorno (R)</option>
                                     </select>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-slate-400 w-3 text-center">mm</span>
                                     <input 
                                        type="text" 
                                        value={selectedProps.gauge || ''}
                                        onChange={(e) => updateSelectedProperty('gauge', e.target.value)}
                                        className="flex-1 text-xs p-1 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none"
                                        placeholder="Bitola (Ex: 1.5)"
                                     />
                                </div>
                            </>
                        )}
                     </div>
                 )
             }
             return null
         })()}

       </div>

       {/* Painel de Propriedades (Formulário) */}
       {selectedId ? (
           <div className="absolute right-4 top-4 w-64 bg-white p-4 rounded-lg shadow-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Propriedades
              </h3>
              
              {/* Wall Properties */}
               {!selectedId.toString().startsWith('comp-') && !selectedId.toString().startsWith('wire-') && (
                  (() => {
                      const wall = walls.find(w => w.id.toString() === selectedId)
                      if (!wall) return null
                      const dx = wall.x2 - wall.x1
                      const dy = wall.y2 - wall.y1
                      const currentLen = Math.sqrt(dx*dx + dy*dy) / GRID_SIZE
                      
                      return (
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Comprimento (m)</label>
                            <input 
                                type="number" 
                                value={currentLen.toFixed(2)} 
                                step="0.1"
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                                onChange={(e) => {
                                    const newLen = parseFloat(e.target.value)
                                    if (isNaN(newLen) || newLen <= 0) return
                                    
                                    const angle = Math.atan2(dy, dx)
                                    const newX2 = wall.x1 + (newLen * GRID_SIZE * Math.cos(angle))
                                    const newY2 = wall.y1 + (newLen * GRID_SIZE * Math.sin(angle))
                                    
                                    setWalls(prev => prev.map(w => w.id === wall.id ? { ...w, x2: newX2, y2: newY2 } : w))
                                }}
                            />
                            <p className="text-[10px] text-slate-400">Edite para ajustar o tamanho.</p>
                        </div>
                      )
                  })()
               )}

              {selectedId.toString().startsWith('comp-') && (
              <div className="flex flex-col gap-3">
                  {/* Se for wireTag, mostra propriedades de fiação */}
                  {components.find(c => c.id === selectedId)?.type === 'wireTag' ? (
                     <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Condutores</label>
                            <select
                                value={selectedProps.conductors || 'FNT'}
                                onChange={(e) => updateSelectedProperty('conductors', e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                            >
                                <option value="F">Fase (F)</option>
                                <option value="FN">Fase + Neutro (FN)</option>
                                <option value="FNT">Fase + Neutro + Terra (FNT)</option>
                                <option value="FF">Duas Fases (FF)</option>
                                <option value="FFT">Duas Fases + Terra (FFT)</option>
                                <option value="FFN">Duas Fases + Neutro (FFN)</option>
                                <option value="FFNT">Duas Fases + Neutro + Terra (FFNT)</option>
                                <option value="FFFT">Três Fases + Terra (FFFT)</option>
                                <option value="FFFNT">Três Fases + Neutro + Terra (FFFNT)</option>
                                <option value="R">Retorno (R)</option>
                                <option value="FR">Fase + Retorno (FR)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bitola (mm²)</label>
                            <input 
                                type="text" 
                                value={selectedProps.gauge || ''}
                                onChange={(e) => updateSelectedProperty('gauge', e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                                placeholder="Ex: 2.5"
                            />
                        </div>
                     </>
                  ) : (
                     <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Potência (W)</label>
                            <input 
                                type="text" 
                                value={selectedProps.power || ''}
                                onChange={(e) => updateSelectedProperty('power', e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                                placeholder="Ex: 100W"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Circuito</label>
                            <input 
                                type="text" 
                                value={selectedProps.circuit || ''}
                                onChange={(e) => updateSelectedProperty('circuit', e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                                placeholder="Ex: 1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Altura (Elevação)</label>
                            <select
                                value={selectedProps.elevation || 'low'}
                                onChange={(e) => updateSelectedProperty('elevation', e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                            >
                                <option value="low">Baixa (30cm)</option>
                                <option value="medium">Média (1.20m)</option>
                                <option value="high">Alta (2.00m)</option>
                            </select>
                        </div>
                     </>
                  )}
              </div>
              )}

              {selectedId.toString().startsWith('wire-') && (
                <div className="flex flex-col gap-3">
                  {/* Opções de fio (Type) apenas, já que conductors/gauge foram para tags */}
                  <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de instalação</label>
                       <select
                           value={selectedProps.wireType || 'normal'}
                           onChange={(e) => updateSelectedProperty('wireType', e.target.value)}
                           className="w-full text-xs p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                       >
                           <option value="normal">Teto/Parede (Linha Contínua)</option>
                           <option value="underground">Subterrâneo/Piso (Pontilhado)</option>
                       </select>
                   </div>
                   {/* Removed Conductors/Gauge inputs from Wire properties */}
                </div>
              )}

             {/* Botão de Espelhar (Flip) para Portas */}
             {components.find(c => c.id === selectedId)?.type === 'door' && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <button 
                        onClick={() => updateSelectedProperty('flipX', (selectedProps.flipX || 1) * -1)}
                        className="w-full py-1.5 px-3 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 flex items-center justify-center gap-2"
                    >
                        <FlipHorizontal className="w-3 h-3" /> Espelhar Porta
                    </button>
                </div>
             )}

              <div className="mt-4 pt-4 border-t border-slate-100">
                    <button onClick={deleteSelected} className="w-full py-1.5 px-3 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 flex items-center justify-center gap-2">
                        <Eraser className="w-3 h-3" /> Excluir Item
                    </button>
              </div>
           </div>
       ) : (
        <div className="absolute left-6 top-24 w-64 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 z-20">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                     <Folder className="w-3 h-3" /> Projetos Salvos
                 </h3>
                 <span className="text-[10px] text-slate-400 font-bold">{projectsList.length} PROJETOS</span>
            </div>
            
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {projectsList.length === 0 && (
                    <div className="text-xs text-slate-400 italic text-center py-2">Nenhum projeto salvo.</div>
                )}
                
                {projectsList.map(p => (
                    <div key={p.id} className={`flex items-center justify-between group p-2 rounded transition-colors ${currentPlanId === p.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                        <button
                            onClick={() => handleLoadExistingProject(p)}
                            className={`text-left text-xs flex-1 truncate ${currentPlanId === p.id ? 'text-indigo-700 font-bold' : 'text-slate-600'}`}
                            title={p.name || 'Sem nome'}
                        >
                            {p.name || `Projeto ${new Date(p.created_at).toLocaleDateString()}`}
                        </button>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {currentPlanId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1" />}
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProject(p)
                                }}
                                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded"
                                title="Excluir Projeto"
                             >
                                 <Trash2 className="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
       )}

       {/* Modal de Criação Obrigatória de Primeiro Projeto */}
       {showNewProjectModal && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
                   <div className="flex flex-col gap-4 text-center">
                       <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                           <Folder className="w-8 h-8 text-indigo-600" />
                       </div>
                       <div>
                           <h2 className="text-xl font-bold text-slate-800">Bem-vindo ao ProjectGrid!</h2>
                           <p className="text-sm text-slate-500 mt-1">Para começar, precisamos criar seu primeiro projeto.</p>
                       </div>
                       
                       <div className="text-left mt-2">
                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome do Projeto</label>
                           <input 
                                type="text" 
                                placeholder="Minha Residência"
                                className="w-full p-3 border border-slate-300 rounded focus:border-indigo-500 outline-none text-sm font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        handleForceCreateProject(e.target.value.trim())
                                    }
                                }}
                                id="first-project-name"
                           />
                       </div>

                       <button 
                            onClick={() => {
                                const input = document.getElementById('first-project-name')
                                if (input && input.value.trim()) {
                                    handleForceCreateProject(input.value.trim())
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                       >
                           Criar e Começar <ArrowRight className="w-4 h-4" />
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Load Schedule Modal */}
        {showLoadSchedule && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl border border-slate-300 z-50 p-4 max-h-[80vh] overflow-y-auto w-[90%] max-w-5xl">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-slate-700 uppercase flex items-center gap-2">
                         <FileText className="w-5 h-5" /> Quadro de Cargas (NBR 5410)
                     </h3>
                     <button onClick={() => setShowLoadSchedule(false)} className="text-slate-400 hover:text-red-500">
                         <X className="w-5 h-5" />
                     </button>
                </div>
                
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider">
                            <th className="p-2 border border-slate-200">Circuito</th>
                            <th className="p-2 border border-slate-200">Descrição</th>
                            <th className="p-2 border border-slate-200">Esquema</th>
                            <th className="p-2 border border-slate-200">Tensão (V)</th>
                            <th className="p-2 border border-slate-200">Potência (W)</th>
                            <th className="p-2 border border-slate-200">Ib (A)</th>
                            <th className="p-2 border border-slate-200">Disjuntor (A)</th>
                            <th className="p-2 border border-slate-200">Seção (mm²)</th>
                             <th className="p-2 border border-slate-200">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculateLoadSchedule().map(row => (
                            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2 border border-slate-200 font-bold text-center">{row.id}</td>
                                <td className="p-2 border border-slate-200">{row.description}</td>
                                <td className="p-2 border border-slate-200">{row.scheme}</td>
                                <td className="p-2 border border-slate-200">{row.voltage}</td>
                                <td className="p-2 border border-slate-200">{row.totalW}</td>
                                <td className="p-2 border border-slate-200">{row.Ib}</td>
                                <td className="p-2 border border-slate-200 font-bold text-indigo-600">{row.breaker} A</td>
                                <td className="p-2 border border-slate-200 font-bold text-emerald-600">{row.diam} mm²</td>
                                <td className={`p-2 border border-slate-200 font-bold ${row.status === 'OK' ? 'text-emerald-500' : 'text-red-500'}`}>{row.status}</td>
                            </tr>
                        ))}
                        {calculateLoadSchedule().length === 0 && (
                            <tr>
                                <td colSpan="9" className="p-4 text-center text-slate-400 italic">
                                    Nenhum circuito encontrado. Adicione componentes e defina os circuitos.
                                </td>
                            </tr>
                        )}
                        </tbody>
                        <tfoot className="font-bold bg-slate-100">
                             <tr>
                                <td colSpan="4" className="px-3 py-2 border border-slate-300 text-right">TOTAL</td>
                                <td className="px-3 py-2 border border-slate-300 text-center">
                                    {calculateLoadSchedule().reduce((acc, r) => acc + r.totalVA, 0)}
                                </td>
                                <td className="px-3 py-2 border border-slate-300 text-center">
                                    {calculateLoadSchedule().reduce((acc, r) => acc + r.totalW, 0)}
                                </td>
                                <td colSpan="6" className="border border-slate-300"></td>
                             </tr>
                        </tfoot>
                    </table>
            </div>
        )}

        {/* Floating Notification Toast */}
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-500 z-[100] ${notification.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <div className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border ${
                notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 
                notification.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 
                'bg-slate-800 border-slate-700 text-white'
            }`}>
               {notification.type === 'success' && <div className="bg-white/20 p-1 rounded-full"><Check className="w-4 h-4" /></div>}
               {notification.type === 'error' && <div className="bg-white/20 p-1 rounded-full"><AlertTriangle className="w-4 h-4" /></div>}
               <span className="font-medium text-sm">{notification.message}</span>
            </div>
        </div>

        {/* Limit Reached Modal */}
        {limitModalData.show && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-center">
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <Crown className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Limite Atingido!</h3>
                        <p className="text-indigo-100 text-sm">Você atingiu o limite do seu plano atual.</p>
                    </div>
                    <div className="p-6">
                        <p className="text-slate-600 text-center mb-6 leading-relaxed">
                            {limitModalData.message} <br/>
                            Faça um upgrade para criar projetos ilimitados e desbloquear todos os recursos!
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    // Redirecionamento simulado (ou usar navigate se houver router)
                                    window.location.href = '/plans.html' // Assumindo rota de planos
                                    // Se for SPA: navigate('/plans')
                                }}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                            >
                                <Crown className="w-5 h-5" /> Fazer Upgrade Agora
                            </button>
                            <button 
                                onClick={() => setLimitModalData({ ...limitModalData, show: false })}
                                className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Talvez depois
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  )
}

// Subcomponente de Botão de Ferramenta
const ToolButton = ({ active, onClick, icon: Icon, tooltip, activeState, onClickCustom }) => {
    const handleClick = onClickCustom || onClick
    const isActive = active || activeState
    
    return (
        <button 
            onClick={handleClick}
            className={`p-1.5 rounded transition-all relative group ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'
            }`}
            title={tooltip}
        >
            <Icon className="w-5 h-5" />
            
            {/* Tooltip Hover */}
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {tooltip}
            </span>
        </button>
    )
}

export default FloorPlan
