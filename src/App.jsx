import { useState, useCallback, useEffect, useRef } from 'react'
import ChessBoard from './components/ChessBoard'
import PiecePalette from './components/PiecePalette'
import { calculateAllAttacks, calculateAttacksWithDepth, PIECE_COLORS } from './utils/pieceLogic'
import './App.css'

// Parse URL params to set initial pieces and settings
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const piecesParam = params.get('pieces')
  const distinctParam = params.get('distinct')
  const depthParam = params.get('depth')
  
  let board = null
  let nextIndex = 0
  
  if (piecesParam) {
    board = Array(8).fill(null).map(() => Array(8).fill(null))
    const pieceMap = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
    const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }

    let pieceIndex = 0
    piecesParam.split(',').forEach(piece => {
      piece = piece.trim()
      if (piece.length < 3) return
      
      const pieceLetter = piece[0]
      const file = piece[1].toLowerCase()
      const rank = piece[2]
      
      const type = pieceMap[pieceLetter.toLowerCase()]
      const color = pieceLetter === pieceLetter.toUpperCase() ? 'white' : 'black'
      const col = files[file]
      const row = 8 - parseInt(rank)
      
      if (type && col !== undefined && row >= 0 && row < 8) {
        board[row][col] = { type, color, pieceIndex: pieceIndex++ }
      }
    })
    nextIndex = pieceIndex
  }

  return { 
    board, 
    nextIndex,
    distinct: distinctParam === '1' || distinctParam === 'true',
    depth: depthParam ? parseInt(depthParam) : 1
  }
}

// Expose global API for programmatic control
if (typeof window !== 'undefined') {
  window.ChessViz = {
    setPieces: null,
    clearBoard: null,
  }
}

// Create standard chess starting position
function createStartingBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null))
  let idx = 0
  
  const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
  // Black pieces (rank 8 = row 0)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRow[col], color: 'black', pieceIndex: idx++ }
  }
  // Black pawns (rank 7 = row 1)
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black', pieceIndex: idx++ }
  }
  // White pawns (rank 2 = row 6)
  for (let col = 0; col < 8; col++) {
    board[6][col] = { type: 'pawn', color: 'white', pieceIndex: idx++ }
  }
  // White pieces (rank 1 = row 7)
  for (let col = 0; col < 8; col++) {
    board[7][col] = { type: backRow[col], color: 'white', pieceIndex: idx++ }
  }
  
  return { board, nextIndex: idx }
}

function App() {
  const urlState = parseUrlParams()
  const defaultState = createStartingBoard()
  const initialState = urlState?.board ? urlState : defaultState
  
  const [board, setBoard] = useState(() => initialState.board)
  const nextPieceIndex = useRef(initialState.nextIndex)
  
  const [draggedPiece, setDraggedPiece] = useState(null)
  const [showAttackCounts, setShowAttackCounts] = useState(false)
  const [distinctMode, setDistinctMode] = useState(initialState?.distinct ?? false)
  const [coverageDepth, setCoverageDepth] = useState(initialState?.depth || 1)
  const [selectedOnly, setSelectedOnly] = useState(true)
  const [selectedPieces, setSelectedPieces] = useState(new Set())
  const [lowContrast, setLowContrast] = useState(false)
  const [showWhiteControl, setShowWhiteControl] = useState(true)
  const [showBlackControl, setShowBlackControl] = useState(true)

  // Calculate attacks with depth support
  const attacks = coverageDepth > 1 
    ? calculateAttacksWithDepth(board, coverageDepth)
    : calculateAllAttacks(board)

  const handleDragStart = useCallback((piece, fromBoard = false, row = null, col = null) => {
    setDraggedPiece({ ...piece, fromBoard, row, col })
  }, [])

  const handleDrop = useCallback((row, col) => {
    if (!draggedPiece) return

    // For new pieces from palette, capture the index before incrementing
    const isNewPiece = !draggedPiece.fromBoard
    const newPieceIndex = isNewPiece ? nextPieceIndex.current : null
    
    setBoard(prev => {
      const newBoard = prev.map(r => [...r])
      
      if (draggedPiece.fromBoard && draggedPiece.row !== null) {
        const existingPiece = prev[draggedPiece.row][draggedPiece.col]
        newBoard[draggedPiece.row][draggedPiece.col] = null
        newBoard[row][col] = { 
          type: draggedPiece.type, 
          color: draggedPiece.color,
          pieceIndex: existingPiece?.pieceIndex ?? nextPieceIndex.current++
        }
        // Auto-select moved piece
        if (existingPiece?.pieceIndex !== undefined) {
          setTimeout(() => {
            setSelectedPieces(p => {
              const n = new Set(p)
              n.add(existingPiece.pieceIndex)
              return n
            })
          }, 0)
        }
      } else {
        const idx = nextPieceIndex.current++
        newBoard[row][col] = { 
          type: draggedPiece.type, 
          color: draggedPiece.color,
          pieceIndex: idx
        }
        // Auto-select new piece
        setTimeout(() => {
          setSelectedPieces(p => {
            const n = new Set(p)
            n.add(idx)
            return n
          })
        }, 0)
      }
      return newBoard
    })
    
    setDraggedPiece(null)
  }, [draggedPiece])

  const handleDragEnd = useCallback(() => {
    setDraggedPiece(null)
  }, [])

  const handleRemovePiece = useCallback((row, col) => {
    setBoard(prev => {
      const newBoard = prev.map(r => [...r])
      newBoard[row][col] = null
      return newBoard
    })
  }, [])

  const handleClearBoard = useCallback(() => {
    setBoard(Array(8).fill(null).map(() => Array(8).fill(null)))
    nextPieceIndex.current = 0
    setSelectedPieces(new Set())
  }, [])

  const handleToggleSelection = useCallback((pieceIndex) => {
    setSelectedPieces(prev => {
      const next = new Set(prev)
      if (next.has(pieceIndex)) {
        next.delete(pieceIndex)
      } else {
        next.add(pieceIndex)
      }
      return next
    })
  }, [])

  const handleSetupBoard = useCallback(() => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null))
    let idx = 0
    
    // Black pieces (rank 8 = row 0)
    const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
    for (let col = 0; col < 8; col++) {
      newBoard[0][col] = { type: backRow[col], color: 'black', pieceIndex: idx++ }
    }
    // Black pawns (rank 7 = row 1)
    for (let col = 0; col < 8; col++) {
      newBoard[1][col] = { type: 'pawn', color: 'black', pieceIndex: idx++ }
    }
    // White pawns (rank 2 = row 6)
    for (let col = 0; col < 8; col++) {
      newBoard[6][col] = { type: 'pawn', color: 'white', pieceIndex: idx++ }
    }
    // White pieces (rank 1 = row 7)
    for (let col = 0; col < 8; col++) {
      newBoard[7][col] = { type: backRow[col], color: 'white', pieceIndex: idx++ }
    }
    
    nextPieceIndex.current = idx
    setBoard(newBoard)
  }, [])

  // Expose global API
  useEffect(() => {
    const pieceMap = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
    const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }
    
    window.ChessViz = {
      setPieces: (piecesStr) => {
        const newBoard = Array(8).fill(null).map(() => Array(8).fill(null))
        let idx = 0
        piecesStr.split(',').forEach(piece => {
          piece = piece.trim()
          if (piece.length < 3) return
          const pieceLetter = piece[0]
          const file = piece[1].toLowerCase()
          const rank = piece[2]
          const type = pieceMap[pieceLetter.toLowerCase()]
          const color = pieceLetter === pieceLetter.toUpperCase() ? 'white' : 'black'
          const col = files[file]
          const row = 8 - parseInt(rank)
          if (type && col !== undefined && row >= 0 && row < 8) {
            newBoard[row][col] = { type, color, pieceIndex: idx++ }
          }
        })
        nextPieceIndex.current = idx
        setBoard(newBoard)
      },
      addPiece: (type, square, color = 'white') => {
        const typeMap = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' }
        const col = files[square[0].toLowerCase()]
        const row = 8 - parseInt(square[1])
        if (col !== undefined && row >= 0 && row < 8) {
          setBoard(prev => {
            const newBoard = prev.map(r => [...r])
            newBoard[row][col] = { 
              type: typeMap[type.toUpperCase()] || type.toLowerCase(), 
              color,
              pieceIndex: nextPieceIndex.current++
            }
            return newBoard
          })
        }
      },
      clearBoard: () => {
        setBoard(Array(8).fill(null).map(() => Array(8).fill(null)))
        nextPieceIndex.current = 0
      },
      getBoard: () => board,
      setDistinctMode: (v) => setDistinctMode(v),
      setCoverageDepth: (v) => setCoverageDepth(v),
    }
  }, [board])

  const handleDropOutside = useCallback(() => {
    if (draggedPiece?.fromBoard && draggedPiece.row !== null) {
      handleRemovePiece(draggedPiece.row, draggedPiece.col)
    }
    setDraggedPiece(null)
  }, [draggedPiece, handleRemovePiece])

  return (
    <div className="app" onDragOver={e => e.preventDefault()} onDrop={handleDropOutside}>
      <header className="header">
        <h1>♟️ Chess Attack Visualizer</h1>
        <p>Drag pieces onto the board to see their attack patterns</p>
      </header>
      
      <main className="main-content">
        <PiecePalette 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          showBlackControl={showBlackControl}
          setShowBlackControl={setShowBlackControl}
          showWhiteControl={showWhiteControl}
          setShowWhiteControl={setShowWhiteControl}
        />
        
        <div className="board-container">
          <ChessBoard 
            board={board}
            attacks={attacks}
            showAttackCounts={showAttackCounts}
            distinctMode={distinctMode}
            coverageDepth={coverageDepth}
            selectedOnly={selectedOnly}
            selectedPieces={selectedPieces}
            lowContrast={lowContrast}
            showWhiteControl={showWhiteControl}
            showBlackControl={showBlackControl}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onRemovePiece={handleRemovePiece}
            onToggleSelection={handleToggleSelection}
          />
          
          <div className="controls">
            <button className="setup-btn" onClick={handleSetupBoard}>
              ♟️ Setup Board
            </button>
            <button className="clear-btn" onClick={handleClearBoard}>
              🗑️ Clear Board
            </button>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={showAttackCounts}
                onChange={e => setShowAttackCounts(e.target.checked)}
              />
              Show attack counts
            </label>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={distinctMode}
                onChange={e => setDistinctMode(e.target.checked)}
              />
              Show distinct coverage
            </label>
            <label className="toggle-label" title="Ctrl+click pieces to select/deselect">
              <input 
                type="checkbox" 
                checked={selectedOnly}
                onChange={e => setSelectedOnly(e.target.checked)}
              />
              Selected pieces only
            </label>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={lowContrast}
                onChange={e => setLowContrast(e.target.checked)}
              />
              Low contrast board
            </label>
          </div>
          
          <div className="depth-control">
            <label className="slider-label">
              Coverage Depth: <strong>{coverageDepth}</strong>
              <span className="depth-hint">
                {coverageDepth === 1 && '(current positions)'}
                {coverageDepth === 2 && '(+ 1 move ahead)'}
                {coverageDepth === 3 && '(+ 2 moves ahead)'}
              </span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="3" 
              value={coverageDepth}
              onChange={e => setCoverageDepth(parseInt(e.target.value))}
              className="depth-slider"
            />
            <div className="slider-labels">
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
          </div>
        </div>

        <div className="legend">
          <h3>Legend</h3>
          {distinctMode ? (
            <div className="legend-items">
              {PIECE_COLORS.slice(0, 4).map((color, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-color" style={{background: color}}></span>
                  <span>Piece {i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="legend-items heat-legend">
              <div className="legend-item">
                <span className="legend-color" style={{background: '#8B3A4C'}}></span>
                <span>1 attacker</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{background: '#6B2A3C'}}></span>
                <span>2 attackers</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{background: '#4B0A1C'}}></span>
                <span>3+ attackers</span>
              </div>
            </div>
          )}
          {coverageDepth > 1 && (
            <div className="depth-legend">
              <p>Depth indicators:</p>
              <div className="legend-item">
                <span className="depth-demo solid"></span>
                <span>Current</span>
              </div>
              <div className="legend-item">
                <span className="depth-demo dashed"></span>
                <span>+1 move</span>
              </div>
              {coverageDepth > 2 && (
                <div className="legend-item">
                  <span className="depth-demo dotted"></span>
                  <span>+2 moves</span>
                </div>
              )}
            </div>
          )}
          <div className="instructions">
            <p><strong>Drag</strong> pieces from palette to board</p>
            <p><strong>Right-click</strong> or drag off to remove</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
