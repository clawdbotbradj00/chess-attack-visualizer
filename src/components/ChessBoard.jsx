import { memo } from 'react'
import { getPieceSymbol, PIECE_COLORS, HEAT_COLORS } from '../utils/pieceLogic'
import './ChessBoard.css'

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

// Component to render the attack indicator with color segments (distinct mode)
function AttackIndicator({ attackers }) {
  if (!attackers || attackers.length === 0) return null
  
  const size = 20 // Size of the indicator square
  const colors = attackers.map(idx => PIECE_COLORS[idx % PIECE_COLORS.length])
  
  if (colors.length === 1) {
    // Single attacker - solid color
    return (
      <div 
        className="attack-indicator"
        style={{
          width: size,
          height: size,
          backgroundColor: colors[0],
        }}
      />
    )
  }
  
  if (colors.length === 2) {
    // Two attackers - split diagonally
    return (
      <div 
        className="attack-indicator"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
        }}
      />
    )
  }
  
  // 3+ attackers - use conic gradient for pie-chart style
  const segments = colors.map((color, i) => {
    const start = (i / colors.length) * 360
    const end = ((i + 1) / colors.length) * 360
    return `${color} ${start}deg ${end}deg`
  }).join(', ')
  
  return (
    <div 
      className="attack-indicator"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${segments})`,
        borderRadius: '2px',
      }}
    />
  )
}

// Get heat map background color based on attack count
function getHeatColor(count) {
  if (count === 0) return null
  const idx = Math.min(count, HEAT_COLORS.length - 1)
  return HEAT_COLORS[idx]
}

// Get depth-based opacity/color
function getDepthStyle(depth) {
  switch(depth) {
    case 1: return { opacity: 1, border: 'none' }
    case 2: return { opacity: 0.5, border: '2px dashed rgba(255,255,255,0.3)' }
    case 3: return { opacity: 0.25, border: '2px dotted rgba(255,255,255,0.2)' }
    default: return { opacity: 1, border: 'none' }
  }
}

const ChessBoard = memo(function ChessBoard({ 
  board, 
  attacks, 
  showAttackCounts,
  distinctMode = true,
  coverageDepth = 1,
  selectedOnly = false,
  selectedPieces = new Set(),
  lowContrast = false,
  onDragStart, 
  onDrop, 
  onDragEnd,
  onRemovePiece,
  onToggleSelection
}) {
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, row, col) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop(row, col)
  }

  const handleDragStart = (e, piece, row, col) => {
    e.dataTransfer.effectAllowed = 'all'
    e.dataTransfer.setData('text/plain', JSON.stringify(piece))
    onDragStart(piece, true, row, col)
  }

  const handleContextMenu = (e, row, col) => {
    e.preventDefault()
    if (board[row][col]) {
      onRemovePiece(row, col)
    }
  }

  const handlePieceClick = (e, piece) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      if (piece.pieceIndex !== undefined && onToggleSelection) {
        onToggleSelection(piece.pieceIndex)
      }
    }
  }

  // Get piece color for border indicator
  const getPieceColor = (piece) => {
    if (!piece || piece.pieceIndex === undefined) return null
    return PIECE_COLORS[piece.pieceIndex % PIECE_COLORS.length]
  }

  // Filter by selection if enabled
  const filterBySelection = (indices) => {
    if (!selectedOnly) return indices
    if (selectedPieces.size === 0) return []
    return indices.filter(idx => selectedPieces.has(idx))
  }

  // Get attackers and defenders for a square across depths
  const getSquareInfo = (rowIdx, colIdx) => {
    const cell = attacks[rowIdx]?.[colIdx]
    if (!cell) return { attackers: [], defenders: [], byDepth: {} }
    
    // Handle old array format (backwards compat)
    if (Array.isArray(cell)) {
      const filtered = filterBySelection(cell)
      return { attackers: filtered, defenders: [], byDepth: { 1: { attackers: filtered, defenders: [] } } }
    }
    
    // Handle new format with attackers/defenders (non-depth)
    if (cell.attackers && !cell.depth1) {
      const attackers = filterBySelection(cell.attackers || [])
      const defenders = filterBySelection(cell.defenders || [])
      return { attackers, defenders, byDepth: { 1: { attackers, defenders } } }
    }
    
    // New format with depth
    const byDepth = {}
    let allAttackers = []
    let allDefenders = []
    
    if (cell.depth1) {
      const attackers = filterBySelection(cell.depth1.attackers || [])
      const defenders = filterBySelection(cell.depth1.defenders || [])
      byDepth[1] = { attackers, defenders }
      allAttackers = [...allAttackers, ...attackers]
      allDefenders = [...allDefenders, ...defenders]
    }
    if (cell.depth2 && coverageDepth >= 2) {
      const attackers = filterBySelection(cell.depth2.attackers || [])
      byDepth[2] = { attackers, defenders: [] }
      allAttackers = [...allAttackers, ...attackers]
    }
    if (cell.depth3 && coverageDepth >= 3) {
      const attackers = filterBySelection(cell.depth3.attackers || [])
      byDepth[3] = { attackers, defenders: [] }
      allAttackers = [...allAttackers, ...attackers]
    }
    
    return { attackers: allAttackers, defenders: allDefenders, byDepth }
  }

  return (
    <div className="chess-board-wrapper">
      {/* File labels (top) */}
      <div className="file-labels top">
        <div className="corner-spacer"></div>
        {files.map(f => <div key={f} className="file-label">{f}</div>)}
        <div className="corner-spacer"></div>
      </div>

      <div className="board-with-ranks">
        {/* Rank labels (left) */}
        <div className="rank-labels">
          {ranks.map(r => <div key={r} className="rank-label">{r}</div>)}
        </div>

        {/* The board */}
        <div className="chess-board">
          {board.map((row, rowIdx) => (
            row.map((piece, colIdx) => {
              const isLight = (rowIdx + colIdx) % 2 === 0
              const { attackers, defenders, byDepth } = getSquareInfo(rowIdx, colIdx)
              const hasAttackers = attackers.length > 0
              const hasDefenders = defenders.length > 0
              const pieceColor = getPieceColor(piece)
              
              // For heat map mode
              const depth1Attackers = byDepth[1]?.attackers?.length || 0
              const depth2Attackers = byDepth[2]?.attackers?.length || 0
              const depth3Attackers = byDepth[3]?.attackers?.length || 0
              const totalAttackers = depth1Attackers + depth2Attackers + depth3Attackers
              
              // Heat map background color (only for depth 1 attackers in heat mode)
              const heatBgColor = !distinctMode && depth1Attackers > 0 
                ? getHeatColor(depth1Attackers) 
                : null
              
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`square ${isLight ? 'light' : 'dark'} ${piece ? 'has-piece' : ''} ${hasAttackers ? 'attacked' : ''} ${lowContrast ? 'low-contrast' : ''}`}
                  style={heatBgColor ? { backgroundColor: heatBgColor } : undefined}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, rowIdx, colIdx)}
                  onContextMenu={(e) => handleContextMenu(e, rowIdx, colIdx)}
                >
                  {/* Depth 2 overlay (dashed border) */}
                  {depth2Count > 0 && (
                    <div 
                      className="depth-overlay depth-2"
                      style={{
                        backgroundColor: distinctMode ? 'transparent' : `${HEAT_COLORS[Math.min(depth2Count, 4)]}80`,
                      }}
                    />
                  )}
                  
                  {/* Depth 3 overlay (dotted border) */}
                  {depth3Count > 0 && (
                    <div 
                      className="depth-overlay depth-3"
                      style={{
                        backgroundColor: distinctMode ? 'transparent' : `${HEAT_COLORS[Math.min(depth3Count, 4)]}40`,
                      }}
                    />
                  )}
                  
                  {piece && (
                    <div
                      className={`piece ${piece.color} ${selectedPieces.has(piece.pieceIndex) ? 'selected' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, piece, rowIdx, colIdx)}
                      onDragEnd={onDragEnd}
                      onClick={(e) => handlePieceClick(e, piece)}
                    >
                      {getPieceSymbol(piece.type, piece.color)}
                      <span 
                        className="piece-color-dot"
                        style={{ backgroundColor: pieceColor }}
                      />
                    </div>
                  )}
                  
                  {/* Distinct mode: show colored indicator for attackers */}
                  {distinctMode && depth1Attackers > 0 && (
                    <AttackIndicator attackers={byDepth[1]?.attackers} />
                  )}
                  
                  {/* Depth 2 indicator (smaller, lighter) */}
                  {distinctMode && depth2Attackers > 0 && !depth1Attackers && (
                    <div className="depth-indicator depth-2-indicator">
                      <AttackIndicator attackers={byDepth[2]?.attackers} />
                    </div>
                  )}
                  
                  {/* Defender indicator - shield style */}
                  {hasDefenders && (
                    <div className="defender-indicator" title={`Defended ${defenders.length}x`}>
                      🛡️
                      {defenders.length > 1 && <span className="defender-count">{defenders.length}</span>}
                    </div>
                  )}
                  
                  {showAttackCounts && totalAttackers > 0 && (
                    <div className="attack-count">{totalAttackers}</div>
                  )}
                </div>
              )
            })
          ))}
        </div>

        {/* Rank labels (right) */}
        <div className="rank-labels">
          {ranks.map(r => <div key={r} className="rank-label">{r}</div>)}
        </div>
      </div>

      {/* File labels (bottom) */}
      <div className="file-labels bottom">
        <div className="corner-spacer"></div>
        {files.map(f => <div key={f} className="file-label">{f}</div>)}
        <div className="corner-spacer"></div>
      </div>
    </div>
  )
})

export default ChessBoard
