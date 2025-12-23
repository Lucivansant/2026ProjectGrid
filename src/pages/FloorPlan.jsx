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
  Ruler
} from 'lucide-react'

// Constantes
const GRID_SIZE = 40 // pixels por célula (ex: 40px = 1 metro na escala padrão)
const SNAP_THRESHOLD = 10

/**
 * Componente principal do Editor de Plantas
 */
const FloorPlan = () => {
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

      // 2. Fallback to Grid Snap
      return { x: snapToGrid(x), y: snapToGrid(y), snapped: false }
  }
  // --- Estados da Ferramenta ---
  const [tool, setTool] = useState('select') // select, wall, wire, room, dimension
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
  const [selectedId, setSelectedId] = useState(null) // ID do objeto selecionado
  
  // Estado para formulário de propriedades
  const [selectedProps, setSelectedProps] = useState({ power: '', circuit: '', elevation: 'low' })

  // Estado temporário para desenho em construção
  const [newWall, setNewWall] = useState(null) // Wall sendo desenhada atualmente
  const [newDimension, setNewDimension] = useState(null) // Cota sendo desenhada
  const [calibrationPoints, setCalibrationPoints] = useState([]) // Pontos para calibração [p1, p2]
  const [wiringStartId, setWiringStartId] = useState(null) // ID do componente onde o fio começou
  const [transformText, setTransformText] = useState('') // Texto de transformação (ex: ângulo)
  const [clipboard, setClipboard] = useState(null) // Para Copy/Paste

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

  // Carrega do LocalStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('projectgrid_floorplan')
    if (saved) {
        try {
            const data = JSON.parse(saved)
            if (data.walls) setWalls(data.walls)
            if (data.components) setComponents(data.components)
            if (data.wires) setWires(data.wires)
        } catch (e) {
            console.error('Erro ao carregar projeto:', e)
        }
    }
  }, [])

  // Salva automaticamente a cada 5 segundos se houver mudanças
  useEffect(() => {
    const saveTimer = setInterval(() => {
        saveProject()
    }, 5000)
    return () => clearInterval(saveTimer)
  }, [walls, components])

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
            if (!selectedId) return
            // Verifica o tipo
            if (selectedId.toString().startsWith('comp-')) {
                const comp = components.find(c => c.id === selectedId)
                if (comp) setClipboard({ type: 'component', data: comp })
            } else if (selectedId.toString().startsWith('wire-')) {
               // Wires são complexos de copiar isolados (dependem de comps), 
               // por simplicidade vamos ignorar ou copiar só propriedades?
               // Vamos ignorar wires por enquanto no copy/paste MVP
            } else {
                // Wall
                const wall = walls.find(w => w.id.toString() === selectedId)
                if (wall) setClipboard({ type: 'wall', data: wall })
            }
        }

        // Paste (Ctrl+V)
        if (e.ctrlKey && e.key === 'v') {
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
            }
        }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, clipboard, components, walls])


  const saveProject = () => {
    const data = { walls, components, wires }
    localStorage.setItem('projectgrid_floorplan', JSON.stringify(data))
    // Opcional: Feedback visual de salvamento?
  }

  const handleExport = () => {
    if (stageRef.current) {
        const uri = stageRef.current.toDataURL({
             pixelRatio: 2 // Alta qualidade
        })
        const link = document.createElement('a')
        link.download = 'planta-baixa-eletrica.png'
        link.href = uri
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
            const x = relativePos.x
            const y = relativePos.y
            
            isDrawing.current = true
            setNewWall({
                x1: x, y1: y, x2: x, y2: y
            })
        }
    } else if (tool === 'dimension') {
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos) {
            const x = relativePos.x
            const y = relativePos.y
            
            isDrawing.current = true
            setNewDimension({
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
    }
  }

  const handlePointerMove = (e) => {
    // Prevent scrolling on mobile/tablet when drawing
    if (tool === 'wall' && isDrawing.current) {
        e.evt.preventDefault() // Crucial for S Pen / Touch to not scroll page
        
        const stage = e.target.getStage()
        const relativePos = stage.getRelativePointerPosition()
        
        if (relativePos && newWall) {
            const x = relativePos.x
            const y = relativePos.y

            // Free Draw (No Grid Snap)
            let targetX = x
            let targetY = y
            
            // Angle Snapping (Esquadro)
            // Lógica: Se o ângulo atual estiver próximo de 0, 90, 180, 270 ou 45, snap.
            const dx = x - newWall.x1
            const dy = y - newWall.y1
            const dist = Math.sqrt(dx*dx + dy*dy)
            
            let angle = Math.atan2(dy, dx) * 180 / Math.PI
            if (angle < 0) angle += 360
            
            // Angles to snap to: 0, 45, 90, 135, 180, 225, 270, 315, 360
            const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360]
            const ANGLE_THRESHOLD = 3 // graus
            
            let snappedAngle = null
            
            for (let a of snapAngles) {
                if (Math.abs(angle - a) < ANGLE_THRESHOLD || Math.abs(angle - a) > (360 - ANGLE_THRESHOLD)) {
                    // Snap it!
                    // Recalcula targetX/Y baseado na distancia e angulo snapado
                    const rad = a * Math.PI / 180
                    targetX = newWall.x1 + dist * Math.cos(rad)
                    targetY = newWall.y1 + dist * Math.sin(rad)
                    snappedAngle = a % 360
                    break
                }
            }

            // Ortogonal "Forçado" se muito próximo? Não, o snap angle já cuida disso.

            setNewWall(prev => ({ 
                ...prev, 
                x2: targetX, 
                y2: targetY,
                angleText: snappedAngle !== null ? `${snappedAngle}°` : null
            }))
        }
    } else if (tool === 'dimension' && isDrawing.current) {
         const stage = e.target.getStage()
         const relativePos = stage.getRelativePointerPosition()
        
         if (relativePos && newDimension) {
             setNewDimension(prev => ({
                 ...prev,
                 x2: relativePos.x,
                 y2: relativePos.y
             }))
         }
    }
  }

  const handlePointerUp = () => {
    if (isDrawing.current) {
        isDrawing.current = false
        if (tool === 'wall' && newWall) {
            if (newWall.x1 !== newWall.x2 || newWall.y1 !== newWall.y2) {
                setWalls(prev => [...prev, { ...newWall, id: Date.now(), width: 6 }])
            }
            setNewWall(null)
        } else if (tool === 'dimension' && newDimension) {
             // Validate min length
             const dist = Math.sqrt(Math.pow(newDimension.x2 - newDimension.x1, 2) + Math.pow(newDimension.y2 - newDimension.y1, 2))
             if (dist > 5) { // Min 5 pixels
                 setDimensionsList(prev => [...prev, { ...newDimension, id: Date.now() }])
             }
             setNewDimension(null)
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
        setSelectedId(null)
        setNewWall(null)
        setWiringStartId(null)
        if (transformerRef.current) transformerRef.current.nodes([])
    }
  }

  // --- Renderização de Símbolos ---
  const renderComponentShape = (comp) => {
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
                        offsetX={10} offsetY={5} width={20}
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
        case 'wireTag': {
             // Renderização de Etiqueta Simples (Sem Seta)
             const props = comp.properties || {}
             const isSelected = selectedId === comp.id

             // Helper de Símbolos
             const renderMarks = () => {
                const type = String(props.conductors || 'FNT')
                const marks = [] 
                const spacing = 6
                const list = type.split('')
                
                const totalWidth = Math.max(20, (list.length) * spacing) // Largura mínima
                const startX = -totalWidth / 2

                // Linha de Base (Fio) + Seta
                // O fio passa por trás dos marcas
                marks.push(
                    <Group key="base-wire">
                        {/* Linha do fio */}
                        <Line points={[startX - 5, 0, startX + totalWidth + 10, 0]} stroke="#94a3b8" strokeWidth={1} />
                        {/* Seta na ponta direita */}
                        <RegularPolygon 
                            sides={3} 
                            radius={4} 
                            x={startX + totalWidth + 10} 
                            y={0} 
                            rotation={90} 
                            fill="#94a3b8" 
                        />
                    </Group>
                )

                list.forEach((char, i) => {
                    const lx = startX + (i * spacing) + (spacing/2)
                    // Cores fixas solicitadas (se selecionado, talvez manter highlight? 
                    // Melhor manter as cores reais sempre, e usar o highlight no container ou box)
                    // O usuario pediu cores especificas.
                    
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
                     {/* Corpo da Tag */}
                     <Group> 
                        <Rect x={-20} y={-10} width={40} height={20} fill="transparent" /> 
                        {renderMarks()}
                        <Text 
                            y={-25}
                            x={0}
                            text={`#${props.gauge || '?'}`}
                            fontSize={10}
                            fill="#64748b"
                            align="center"
                            width={60}
                            offsetX={30}
                        />
                         {/* Número do Circuito (Ex: 1) */}
                         <Text 
                            y={15}
                            x={0}
                            text={props.circuit ? `${props.circuit}` : ''}
                            fontSize={10}
                            fontStyle="bold"
                            fill="#ef4444"
                            align="center"
                            width={60}
                            offsetX={30}
                        />
                     </Group>
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
  }


  // --- Renderização ---

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100 relative" style={{ touchAction: 'none' }}>
      
      {/* Barra de Ferramentas Esquerda (Compacta) */}
      <div className="absolute left-2 top-4 z-10 flex flex-col gap-1 bg-white p-1 rounded-lg shadow-lg border border-slate-200">
        {/* Zoom Controls */}
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
        <div className="h-px bg-slate-200 my-1"></div>
        <ToolButton 
            active={tool === 'select'} 
            onClick={() => setTool('select')} 
            icon={MousePointer2} 
            tooltip="Selecionar (V)" 
        />
        <ToolButton 
            active={tool === 'wall'} 
            onClick={() => setTool('wall')} 
            icon={PenTool} 
            tooltip="Parede (W)" 
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
        <div className="h-px bg-slate-200 my-1"></div>
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
        <div className="h-px bg-slate-200 my-1"></div>
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
            active={tool === 'dimension'} 
            onClick={() => setTool('dimension')} 
            icon={Ruler} 
            tooltip="Fita Métrica (Cotas)" 
        />
        <div className="h-px bg-slate-200 my-1"></div>
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
        <div className="h-px bg-slate-200 my-1"></div>
        <ToolButton 
            active={false} 
            onClick={handleExport} 
            icon={Download} 
            tooltip="Exportar Imagem" 
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
                            radius={(wall.width || 6) / 2} 
                            fill={selectedId === wall.id.toString() ? "#4f46e5" : "#334155"} 
                        />
                        <Circle 
                            x={wall.x2} y={wall.y2} 
                            radius={(wall.width || 6) / 2} 
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
                        <Group key={wall.id}>
                            <Line
                                id={wall.id.toString()}
                                points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                                stroke={selectedId === wall.id.toString() ? "#4f46e5" : "#334155"}
                                strokeWidth={wall.width || 6}
                                lineCap="square"
                                onClick={() => {
                                    if (tool === 'select') setSelectedId(wall.id.toString())
                                }}
                                onTap={() => {
                                    if (tool === 'select') setSelectedId(wall.id.toString())
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

                {/* Parede Temporária (Ghost) */}

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
                            <Line 
                                points={[d.x1, d.y1, d.x2, d.y2]} 
                                stroke="#f59e0b" 
                                strokeWidth={1} 
                                dash={[4, 4]} 
                            />
                            {/* Tips */}
                            <Circle x={d.x1} y={d.y1} radius={2} fill="#f59e0b" />
                            <Circle x={d.x2} y={d.y2} radius={2} fill="#f59e0b" />
                            
                            {/* Label Background for Readability */}
                            <Rect 
                                x={cx - 20} 
                                y={cy - 8} 
                                width={40} 
                                height={16} 
                                fill="white" 
                                opacity={0.8} 
                                cornerRadius={4}
                            />
                            <Text 
                                x={cx} 
                                y={cy} 
                                text={`${lenMeters}m`} 
                                fontSize={10} 
                                fontStyle="bold"
                                fill="#b45309" // Amber 700
                                align="center" 
                                offsetX={20}
                                offsetY={5}
                            />
                             {/* Delete Button for Dimension (Only if Selected logic exists, skipping for simplified MVP) */}
                             {/* Clicking on dimension to select/delete could be added later */}
                        </Group>
                    )
                })}

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
                 // Calculate screen position
                 const screenX = comp.x * stageScale + stagePos.x
                 const screenY = comp.y * stageScale + stagePos.y
                 
                 return (
                     <div 
                        className="absolute bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-indigo-100 flex flex-col gap-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            left: screenX + 30, // Offset to right
                            top: screenY - 50   // Offset to top
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
        <div className="absolute left-2 bottom-4 w-64 bg-white p-4 rounded-lg shadow-lg border border-slate-200">
           {/* Painel Padrão (Estatísticas) */}
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Resumo</h3>
           <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2 rounded text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Paredes</div>
                 <div className="text-lg font-bold text-slate-900">{walls.length}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Pontos</div>
                 <div className="text-lg font-bold text-slate-900">{components.length}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Zoom</div>
                 <div className="text-lg font-bold text-slate-900">{Math.round(stageScale * 100)}%</div>
              </div>
              <div className="col-span-2 bg-emerald-50 p-2 rounded text-center border border-emerald-100">
                 <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-[10px] uppercase">
                     <Save className="w-3 h-3" />
                     Salvo automático
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
