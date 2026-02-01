import { memo } from 'react'
import { getPieceSymbol, PIECE_COLORS, HEAT_COLORS, pieceColorMap } from '../utils/pieceLogic'
import './ChessBoard.css'

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

// Component to render the attack indicator with color segments (distinct mode)
// attackers is array of {idx, color} objects
function AttackIndicator({ attackers }) {
  if (!attackers || attackers.length === 0) return null
  
  const size = 20 // Size of the indicator square
  const colors = attackers.map(a => PIECE_COLORS[a.idx % PIECE_COLORS.length])
  
  // Check if all attackers are black - apply desaturation and opacity
  const allBlack = attackers.every(a => a.color === 'black')
  
  const style = {
    width: size,
    height: size,
    ...(allBlack && { 
      opacity: 0.3, 
      filter: 'saturate(0.3)' 
    })
  }
  
  if (colors.length === 1) {
    // Single attacker - solid color
    return (
      <div 
        className="attack-indicator"
        style={{
          ...style,
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
          ...style,
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
        ...style,
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
  // items is array of {idx, color} objects
  const filterBySelection = (items) => {
    if (!items) return []
    if (!selectedOnly) return items
    if (selectedPieces.size === 0) return []
    return items.filter(item => selectedPieces.has(item.idx))
  }

  // Get raw (unfiltered) attackers for contested calculation
  const getRawAttackers = (rowIdx, colIdx) => {
    const cell = attacks[rowIdx]?.[colIdx]
    if (!cell) return []
    
    if (Array.isArray(cell)) {
      return cell.map(idx => ({ idx, color: 'white' }))
    }
    
    if (cell.attackers && !cell.depth1) {
      return cell.attackers || []
    }
    
    // New format with depth - get depth1 attackers
    return cell.depth1?.attackers || []
  }

  // Get attackers and defenders for a square across depths
  const getSquareInfo = (rowIdx, colIdx) => {
    const cell = attacks[rowIdx]?.[colIdx]
    if (!cell) return { attackers: [], defenders: [], byDepth: {}, rawAttackers: [] }
    
    // Get raw attackers for contested calculation (unfiltered)
    const rawAttackers = getRawAttackers(rowIdx, colIdx)
    
    // Handle old array format (backwards compat) - convert to new format
    if (Array.isArray(cell)) {
      const filtered = cell.filter(idx => !selectedOnly || selectedPieces.size === 0 || selectedPieces.has(idx))
        .map(idx => ({ idx, color: 'white' })) // assume white for old format
      return { attackers: filtered, defenders: [], byDepth: { 1: { attackers: filtered, defenders: [] } }, rawAttackers }
    }
    
    // Handle new format with attackers/defenders (non-depth)
    if (cell.attackers && !cell.depth1) {
      const attackers = filterBySelection(cell.attackers)
      const defenders = filterBySelection(cell.defenders)
      return { attackers, defenders, byDepth: { 1: { attackers, defenders } }, rawAttackers }
    }
    
    // New format with depth
    const byDepth = {}
    let allAttackers = []
    let allDefenders = []
    
    if (cell.depth1) {
      const attackers = filterBySelection(cell.depth1.attackers)
      const defenders = filterBySelection(cell.depth1.defenders)
      byDepth[1] = { attackers, defenders }
      allAttackers = [...allAttackers, ...attackers]
      allDefenders = [...allDefenders, ...defenders]
    }
    if (cell.depth2 && coverageDepth >= 2) {
      const attackers = filterBySelection(cell.depth2.attackers)
      byDepth[2] = { attackers, defenders: [] }
      allAttackers = [...allAttackers, ...attackers]
    }
    if (cell.depth3 && coverageDepth >= 3) {
      const attackers = filterBySelection(cell.depth3.attackers)
      byDepth[3] = { attackers, defenders: [] }
      allAttackers = [...allAttackers, ...attackers]
    }
    
    return { attackers: allAttackers, defenders: allDefenders, byDepth, rawAttackers }
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
              const { attackers, defenders, byDepth, rawAttackers } = getSquareInfo(rowIdx, colIdx)
              const hasAttackers = attackers.length > 0
              const hasDefenders = defenders.length > 0
              const pieceColor = getPieceColor(piece)
              
              // For heat map mode
              const depth1AttackersList = byDepth[1]?.attackers || []
              const depth1Attackers = depth1AttackersList.length
              const depth2Attackers = byDepth[2]?.attackers?.length || 0
              const depth3Attackers = byDepth[3]?.attackers?.length || 0
              const totalAttackers = depth1Attackers + depth2Attackers + depth3Attackers
              
              // Count white and black attackers from RAW (unfiltered) data for contested
              const rawWhiteAttackers = rawAttackers.filter(a => a.color === 'white').length
              const rawBlackAttackers = rawAttackers.filter(a => a.color === 'black').length
              const isContested = rawWhiteAttackers > 0 && rawBlackAttackers > 0
              
              // Check if all depth1 attackers are black
              const allDepth1Black = depth1Attackers > 0 && depth1AttackersList.every(a => a.color === 'black')
              
              // Heat map background color (only for depth 1 attackers in heat mode)
              const heatBgColor = !distinctMode && depth1Attackers > 0 
                ? getHeatColor(depth1Attackers) 
                : null
              
              // Style for square - apply opacity/desaturation for black pieces in heat mode
              const squareStyle = {
                ...(heatBgColor && { backgroundColor: heatBgColor }),
                ...(heatBgColor && allDepth1Black && {
                  opacity: 0.3,
                  filter: 'saturate(0.3)'
                }),
                ...(isContested && {
                  outline: '3px dashed #fbbf24',
                  outlineOffset: '-3px'
                })
              }
              const hasSquareStyle = heatBgColor || isContested
              
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`square ${isLight ? 'light' : 'dark'} ${piece ? 'has-piece' : ''} ${hasAttackers ? 'attacked' : ''} ${lowContrast ? 'low-contrast' : ''} ${isContested ? 'contested' : ''}`}
                  style={hasSquareStyle ? squareStyle : undefined}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, rowIdx, colIdx)}
                  onContextMenu={(e) => handleContextMenu(e, rowIdx, colIdx)}
                >
                  {/* Depth 2 overlay (dashed border) */}
                  {depth2Attackers > 0 && (
                    <div 
                      className="depth-overlay depth-2"
                      style={{
                        backgroundColor: distinctMode ? 'transparent' : `${HEAT_COLORS[Math.min(depth2Attackers, 4)]}80`,
                      }}
                    />
                  )}
                  
                  {/* Depth 3 overlay (dotted border) */}
                  {depth3Attackers > 0 && (
                    <div 
                      className="depth-overlay depth-3"
                      style={{
                        backgroundColor: distinctMode ? 'transparent' : `${HEAT_COLORS[Math.min(depth3Attackers, 4)]}40`,
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
                  
                  {/* Contested square indicators - always show from raw data */}
                  {isContested && (
                    <>
                      <div className="contested-count top">{rawBlackAttackers}</div>
                      <div className="contested-count bottom">{rawWhiteAttackers}</div>
                    </>
                  )}
                  
                  {showAttackCounts && totalAttackers > 0 && !isContested && (
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
