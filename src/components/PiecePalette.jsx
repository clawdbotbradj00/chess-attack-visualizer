import { memo } from 'react'
import { getPieceSymbol, PIECE_TYPES } from '../utils/pieceLogic'
import './PiecePalette.css'

const PiecePalette = memo(function PiecePalette({ 
  onDragStart, 
  onDragEnd,
  showBlackControl,
  setShowBlackControl,
  showWhiteControl,
  setShowWhiteControl
}) {
  const handleDragStart = (e, type, color) => {
    e.dataTransfer.effectAllowed = 'all'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, color }))
    onDragStart({ type, color }, false)
  }

  const pieces = [
    { type: PIECE_TYPES.KING, name: 'King' },
    { type: PIECE_TYPES.QUEEN, name: 'Queen' },
    { type: PIECE_TYPES.ROOK, name: 'Rook' },
    { type: PIECE_TYPES.BISHOP, name: 'Bishop' },
    { type: PIECE_TYPES.KNIGHT, name: 'Knight' },
    { type: PIECE_TYPES.PAWN, name: 'Pawn' },
  ]

  return (
    <div className="piece-palette">
      <h2>Pieces</h2>
      
      <div className="palette-section">
        <h3>Black</h3>
        <label className="control-toggle">
          <input 
            type="checkbox" 
            checked={showBlackControl}
            onChange={e => setShowBlackControl(e.target.checked)}
          />
          Show control
        </label>
        <div className="palette-pieces">
          {pieces.map(({ type, name }) => (
            <div
              key={`black-${type}`}
              className="palette-piece black"
              draggable
              onDragStart={(e) => handleDragStart(e, type, 'black')}
              onDragEnd={onDragEnd}
              title={name}
            >
              {getPieceSymbol(type, 'black')}
            </div>
          ))}
        </div>
      </div>

      <div className="palette-section">
        <h3>White</h3>
        <label className="control-toggle">
          <input 
            type="checkbox" 
            checked={showWhiteControl}
            onChange={e => setShowWhiteControl(e.target.checked)}
          />
          Show control
        </label>
        <div className="palette-pieces">
          {pieces.map(({ type, name }) => (
            <div
              key={`white-${type}`}
              className="palette-piece white"
              draggable
              onDragStart={(e) => handleDragStart(e, type, 'white')}
              onDragEnd={onDragEnd}
              title={name}
            >
              {getPieceSymbol(type, 'white')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default PiecePalette
