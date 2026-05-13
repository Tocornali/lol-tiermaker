import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLatestVersion, getChampions, getChampionIconUrl, Champion } from './services/riot'

interface Project {
  id: string
  name: string
  tiers: TierData
}

const DEFAULT_PROJECT_ID = 'default'
const TIERS_CONFIG = [
  { id: 'S', name: 'S', colorClass: 'bg-[var(--color-tier-s)]' },
  { id: 'A', name: 'A', colorClass: 'bg-[var(--color-tier-a)]' },
  { id: 'B', name: 'B', colorClass: 'bg-[var(--color-tier-b)]' },
  { id: 'C', name: 'C', colorClass: 'bg-[var(--color-tier-c)]' },
  { id: 'D', name: 'D', colorClass: 'bg-[var(--color-tier-d)]' }
]

type TierData = Record<string, Champion[]>

const ChampionIcon = ({ 
  champion, 
  version, 
  isDragging, 
  onDragStart, 
  onDragEnd, 
  onDragOver,
  isOver,
  dropSide, // 'left' o 'right'
  size = "h-16 w-16" 
}: { 
  champion: Champion, 
  version: string, 
  isDragging: string | null, 
  onDragStart: (e: React.DragEvent, id: string) => void,
  onDragEnd: () => void,
  onDragOver: (e: React.DragEvent) => void,
  isOver: boolean,
  dropSide: 'left' | 'right' | null,
  size?: string
}) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, champion.id)}
    onDragEnd={onDragEnd}
    onDragOver={onDragOver}
    className={`relative ${size} cursor-grab active:cursor-grabbing rounded border transition-all duration-200 hover:scale-110 hover:z-10 ${
      isDragging === champion.id ? 'opacity-20 scale-90 border-turquoise-500' : 'border-graphite-800 shadow-sm'
    } ${
      isOver && dropSide === 'left' ? 'border-l-4 border-l-turquoise-500 pl-1 -translate-x-1' : ''
    } ${
      isOver && dropSide === 'right' ? 'border-r-4 border-r-turquoise-500 pr-1 translate-x-1' : ''
    }`}
    title={champion.name}
  >
    <img
      src={getChampionIconUrl(version, champion.id)}
      alt={champion.name}
      className="h-full w-full object-cover rounded"
      draggable={false}
    />
  </div>
)

function App(): React.JSX.Element {
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID)
  
  // Valor derivado: Proyecto actual basado en el ID activo
  const activeProject = allProjects.find(p => p.id === activeProjectId)
  const tiers = activeProject?.tiers || { S: [], A: [], B: [], C: [], D: [], Pool: [] }

  const [version, setVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [draggedOverTier, setDraggedOverTier] = useState<string | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const isLoaded = useRef(false)

  // Efecto de auto-guardado
  useEffect(() => {
    if (isLoaded.current && !loading && allProjects.length > 0) {
      window.api.saveTierList(allProjects).catch((err) => {
        console.error('Error en el auto-guardado:', err)
      })
    }
  }, [allProjects, loading])

  // Carga inicial
  useEffect(() => {
    const loadData = async () => {
      try {
        const latestVersion = await getLatestVersion()
        setVersion(latestVersion)
        const championsMap = await getChampions(latestVersion)
        const allChampions = Object.values(championsMap)

        const savedProjects = await window.api.loadTierList()

        if (savedProjects && Array.isArray(savedProjects) && savedProjects.length > 0) {
          const cleanedProjects = savedProjects.map((proj: Project) => {
            const assignedIds = new Set<string>()
            const cleanTiers: TierData = { S: [], A: [], B: [], C: [], D: [], Pool: [] }
            
            TIERS_CONFIG.forEach(tier => {
              const list = proj.tiers[tier.id] || []
              const uniqueList: Champion[] = []
              list.forEach(c => {
                if (!assignedIds.has(c.id)) {
                  assignedIds.add(c.id)
                  uniqueList.push(c)
                }
              })
              cleanTiers[tier.id] = uniqueList
            })

            cleanTiers.Pool = allChampions
              .filter(c => !assignedIds.has(c.id))
              .sort((a, b) => a.name.localeCompare(b.name))

            return { ...proj, tiers: cleanTiers }
          })

          setAllProjects(cleanedProjects)
          setActiveProjectId(cleanedProjects[0].id)
        } else {
          // Proyecto Inicial por defecto si el archivo está vacío
          const initialProject: Project = {
            id: DEFAULT_PROJECT_ID,
            name: 'Tier List #1',
            tiers: { 
              S: [], A: [], B: [], C: [], D: [], 
              Pool: [...allChampions].sort((a, b) => a.name.localeCompare(b.name)) 
            }
          }
          setAllProjects([initialProject])
          setActiveProjectId(DEFAULT_PROJECT_ID)
        }
        
        isLoaded.current = true
        setLoading(false)
      } catch (error) {
        console.error("APP_LOAD_ERROR:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const addProject = () => {
    const newId = Date.now().toString()
    const allBaseChampions = allProjects.length > 0 
      ? [...Object.values(allProjects[0].tiers).flat()]
          .sort((a, b) => a.id.localeCompare(b.id))
          .filter((c, i, self) => self.findIndex(t => t.id === c.id) === i)
          .sort((a, b) => a.name.localeCompare(b.name))
      : []

    const newProject: Project = {
      id: newId,
      name: `Tier List #${allProjects.length + 1}`,
      tiers: { S: [], A: [], B: [], C: [], D: [], Pool: allBaseChampions }
    }
    setAllProjects(prev => [...prev, newProject])
    setActiveProjectId(newId)
  }

  const deleteProject = (id: string) => {
    if (allProjects.length <= 1) return 
    
    const indexToRemove = allProjects.findIndex(p => p.id === id)
    const filtered = allProjects.filter(p => p.id !== id)
    
    setAllProjects(filtered)
    
    if (activeProjectId === id) {
      // Intentar ir a la izquierda, si no al nuevo 0
      const nextIndex = Math.max(0, indexToRemove - 1)
      setActiveProjectId(filtered[nextIndex].id)
    }
  }

  const renameProject = (id: string, newName: string) => {
    setAllProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))
  }

  const moveChampion = (championId: string, targetTier: string, targetIndex?: number | null) => {
    setAllProjects((prev) => {
      return prev.map(proj => {
        if (proj.id !== activeProjectId) return proj
        
        const currentTiers = proj.tiers
        let sourceTierId = ''
        let championToMove: Champion | undefined

        for (const tierId in currentTiers) {
          const found = currentTiers[tierId].find((c) => c.id === championId)
          if (found) {
            sourceTierId = tierId
            championToMove = found
            break
          }
        }

        if (!championToMove) return proj

        const newTiers = { ...currentTiers }
        
        if (sourceTierId === targetTier) {
          // Si es el Pool y no hay posición, no hacemos nada (mantiene posición)
          // Si es un Tier y no hay posición, lo mandamos al final (comportamiento solicitado)
          if (targetTier === 'Pool' && (targetIndex === undefined || targetIndex === null)) {
            return proj
          }
          
          const listWithout = currentTiers[sourceTierId].filter(c => c.id !== championId)
          const finalIndex = (targetIndex !== undefined && targetIndex !== null) ? targetIndex : listWithout.length
          listWithout.splice(finalIndex, 0, championToMove)
          newTiers[sourceTierId] = listWithout
        } else {
          newTiers[sourceTierId] = currentTiers[sourceTierId].filter(c => c.id !== championId)
          const finalIndex = (targetIndex !== undefined && targetIndex !== null) ? targetIndex : newTiers[targetTier].length
          const newList = [...newTiers[targetTier]]
          newList.splice(finalIndex, 0, championToMove)
          newTiers[targetTier] = newList
        }

        return { ...proj, tiers: newTiers }
      })
    })
  }

  const handleDragStart = (e: React.DragEvent, championId: string) => {
    e.dataTransfer.setData('championId', championId)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(championId)
  }

  const handleDragEnd = () => {
    setIsDragging(null)
    setDraggedOverTier(null)
    setDraggedOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, targetTierId: string) => {
    e.preventDefault()
    const championId = e.dataTransfer.getData('championId')
    
    if (championId) {
      // Calcular índice final basado en el lado del drop
      let targetIdx: number | undefined = undefined
      if (draggedOverIndex !== null) {
        targetIdx = draggedOverIndex + (dropSide === 'right' ? 1 : 0)
      }
      moveChampion(championId, targetTierId, targetIdx)
    }
    
    setDraggedOverTier(null)
    setDraggedOverIndex(null)
    setIsDragging(null)
  }

  const handleDragOver = (e: React.DragEvent, tierId: string, index?: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (tierId !== draggedOverTier) setDraggedOverTier(tierId)
    
    if (index !== undefined) {
      // Calcular si estamos en la mitad izquierda o derecha del icono
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const isRightHalf = x > rect.width / 2
      
      if (index !== draggedOverIndex) setDraggedOverIndex(index)
      setDropSide(isRightHalf ? 'right' : 'left')
    } else {
      // Si estamos sobre el fondo, se añade al final
      if (draggedOverIndex !== null) setDraggedOverIndex(null)
      setDropSide(null)
    }
  }

  const handleDragEnter = (e: React.DragEvent, tierId: string) => {
    e.preventDefault()
    setDraggedOverTier(tierId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Solo quitar el highlight si salimos realmente del contenedor, no de sus hijos
    // Pero para simplificar en este layout:
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDraggedOverTier(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-graphite-950 text-white font-sans">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-turquoise-500 border-t-transparent mx-auto shadow-[0_0_15px_rgba(32,178,170,0.5)]"></div>
          <p className="text-sm font-bold tracking-widest uppercase animate-pulse text-turquoise-300">Sincronizando con Riot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-graphite-950 text-white overflow-hidden font-sans select-none rounded-2xl border border-graphite-800/50 shadow-2xl">
      {/* Barra de Título Customizada (Frameless) */}
      <div className="flex items-center justify-between bg-graphite-900/80 backdrop-blur-md border-b border-graphite-800 h-10 select-none">
        {/* Área Arrastrable */}
        <div 
          className="flex-1 h-full flex items-center px-4" 
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-turquoise-500 shadow-[0_0_8px_rgba(32,178,170,0.8)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-gray-400">LoL TierMaker - Champion Rankings</span>
          </div>
        </div>

        {/* Botones de Control (No arrastrables) */}
        <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button 
            onClick={() => window.api.minimize()} 
            className="group px-4 flex items-center justify-center hover:bg-graphite-800 transition-all active:bg-graphite-700 cursor-pointer"
            title="Minimizar"
          >
            <div className="w-3.5 h-[1.5px] bg-gray-400 group-hover:bg-white transition-colors rounded-full active:scale-90"></div>
          </button>
          
          <button 
            onClick={() => window.api.maximize()} 
            className="group px-4 flex items-center justify-center hover:bg-graphite-800 transition-all active:bg-graphite-700 cursor-pointer"
            title="Maximizar"
          >
            <div className="w-3 h-3 border-2 border-gray-400 group-hover:border-white transition-all rounded-sm active:scale-90"></div>
          </button>
          
          <button 
            onClick={() => window.api.close()} 
            className="group px-4 flex items-center justify-center hover:bg-red-500/90 transition-all active:bg-red-600 cursor-pointer"
            title="Cerrar"
          >
            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors active:scale-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Barra de Proyectos (Tabs) */}
      <div className="flex items-center bg-graphite-900/50 border-b border-graphite-800 px-4 h-11 backdrop-blur-sm overflow-hidden">
        <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar h-full">
          <AnimatePresence mode="popLayout">
            {allProjects.map((project) => (
              <motion.div 
                key={project.id}
                layout
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={() => setActiveProjectId(project.id)}
                className={`group relative flex items-center gap-2 pl-6 pr-16 h-full cursor-pointer border-b-2 transition-all duration-200 min-w-[150px] max-w-[260px] active:scale-95 ${
                  activeProjectId === project.id 
                    ? 'border-turquoise-500 bg-turquoise-500/5 text-turquoise-500' 
                    : 'border-transparent text-gray-500 hover:text-turquoise-300 hover:border-turquoise-500/30 hover:bg-turquoise-500/5'
                }`}
              >
                {editingProjectId === project.id ? (
                  <input
                    autoFocus
                    className="bg-graphite-950/50 border-none text-[11px] font-bold text-turquoise-300 focus:outline-none w-full truncate"
                    value={project.name}
                    onChange={(e) => renameProject(project.id, e.target.value)}
                    onBlur={() => setEditingProjectId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingProjectId(null)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-[11px] font-bold tracking-wide truncate">{project.name}</span>
                )}

                <div className={`absolute right-2 flex items-center gap-2 transition-all duration-200 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 ${
                  editingProjectId === project.id ? 'invisible pointer-events-none' : ''
                }`}>
                  {/* Botón Editar */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingProjectId(project.id); }}
                    className="p-1 hover:bg-turquoise-500/20 rounded transition-all cursor-pointer"
                    title="Renombrar"
                  >
                    <svg className="w-3.5 h-3.5 text-turquoise-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  
                  {/* Botón Eliminar */}
                  {allProjects.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                      className="p-1 hover:bg-red-500/20 rounded transition-all cursor-pointer"
                      title="Eliminar Tier List"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <button 
            onClick={addProject}
            className="p-2 text-gray-600 hover:text-turquoise-500 transition-colors shrink-0 cursor-pointer"
            title="Nueva Tier List"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {TIERS_CONFIG.map((tier) => (
          <div
            key={tier.id}
            className={`flex min-h-[90px] rounded-lg border transition-all duration-200 ${
              draggedOverTier === tier.id 
                ? 'border-turquoise-500 bg-turquoise-500/10 scale-[1.01] shadow-[0_0_20px_rgba(32,178,170,0.1)]' 
                : 'border-graphite-800/50 bg-graphite-900/20'
            } backdrop-blur-sm`}
            onDragOver={(e) => handleDragOver(e, tier.id)}
            onDragEnter={(e) => handleDragEnter(e, tier.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tier.id)}
          >
            <div className={`flex w-20 items-center justify-center text-4xl font-black text-gray-950 shadow-inner ${tier.colorClass} rounded-l-lg`}>
              {tier.name}
            </div>
            
            <div 
              className="flex flex-1 flex-wrap items-center content-center gap-0.5 p-1.5 min-h-[90px]"
              onDragOver={(e) => handleDragOver(e, tier.id)}
            >
              {tiers[tier.id].map((champion, idx) => (
                <ChampionIcon
                  key={champion.id}
                  champion={champion}
                  version={version}
                  isDragging={isDragging}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    handleDragOver(e, tier.id, idx);
                  }}
                  isOver={draggedOverTier === tier.id && draggedOverIndex === idx}
                  dropSide={draggedOverTier === tier.id && draggedOverIndex === idx ? dropSide : null}
                />
              ))}
              {tiers[tier.id].length === 0 && (
                <div className="flex-1 flex items-center justify-center text-[10px] text-gray-800 uppercase tracking-widest font-bold">
                  Arrastra aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div 
        className={`h-[30%] border-t transition-colors duration-200 ${
          draggedOverTier === 'Pool' ? 'border-turquoise-500 bg-turquoise-900/20' : 'border-graphite-800 bg-graphite-900/90'
        } p-4 shadow-2xl backdrop-blur-xl flex flex-col`}
        onDragOver={(e) => handleDragOver(e, 'Pool')}
        onDragEnter={(e) => handleDragEnter(e, 'Pool')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'Pool')}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Campeones</h2>
          </div>

          <div className="flex flex-1 max-w-md items-center gap-2 px-3 py-1 bg-graphite-950/50 border border-graphite-800 rounded-full focus-within:border-turquoise-500/50 hover:border-graphite-600 hover:bg-graphite-900/80 transition-all">
            <svg className="w-3 h-3 text-graphite-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              placeholder="Buscar campeón..."
              className="bg-transparent border-none text-[11px] text-graphite-300 focus:outline-none w-full placeholder:text-graphite-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1 w-24 bg-graphite-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-turquoise-500/50 transition-all duration-500" 
              style={{ width: `${(tiers.Pool.length / (Object.values(tiers).flat().length)) * 100}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-mono text-graphite-600">{tiers.Pool.length}</span>
        </div>
      </div>
        
        <div 
          className="flex-1 flex flex-wrap content-start justify-center gap-0.5 overflow-y-auto pb-12 pr-1 custom-scrollbar"
          onDragOver={(e) => handleDragOver(e, 'Pool')}
        >
          {tiers.Pool
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((champion, idx) => (
              <ChampionIcon
                key={champion.id}
                champion={champion}
                version={version}
                isDragging={isDragging}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.stopPropagation();
                  handleDragOver(e, 'Pool', idx);
                }}
                isOver={draggedOverTier === 'Pool' && draggedOverIndex === idx}
                dropSide={draggedOverTier === 'Pool' && draggedOverIndex === idx ? dropSide : null}
                size="h-12 w-12"
              />
            ))}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  )
}


export default App
