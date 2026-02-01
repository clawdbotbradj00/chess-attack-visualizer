// Piece types
export const PIECE_TYPES = {
  KING: 'king',
  QUEEN: 'queen',
  ROOK: 'rook',
  BISHOP: 'bishop',
  KNIGHT: 'knight',
  PAWN: 'pawn',
}

// Unicode chess symbols - using filled symbols for both, CSS colors them
const PIECE_SYMBOLS = {
  white: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
}

// Colors for pieces (cycle through these)
export const PIECE_COLORS = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

// Heat map colors - darker = more attackers
export const HEAT_COLORS = [
  '#4a1a24', // 0 attackers (won't be used)
  '#8B3A4C', // 1 attacker - light maroon
  '#6B2A3C', // 2 attackers - medium maroon  
  '#5B1A2C', // 3 attackers - dark maroon
  '#4B0A1C', // 4+ attackers - very dark maroon
]

export function getPieceSymbol(type, color) {
  return PIECE_SYMBOLS[color]?.[type] || '?'
}

// Check if position is on the board
function isOnBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

// Get all squares attacked by a piece at a given position
// board parameter is optional - if provided, blocking is calculated
export function getAttackedSquares(piece, row, col, board = null) {
  const attacked = []
  
  switch (piece.type) {
    case PIECE_TYPES.KING:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = row + dr
          const nc = col + dc
          if (isOnBoard(nr, nc)) {
            attacked.push([nr, nc])
          }
        }
      }
      break

    case PIECE_TYPES.QUEEN:
      attacked.push(...getSlidingAttacks(row, col, [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ], board))
      break

    case PIECE_TYPES.ROOK:
      attacked.push(...getSlidingAttacks(row, col, [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ], board))
      break

    case PIECE_TYPES.BISHOP:
      attacked.push(...getSlidingAttacks(row, col, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ], board))
      break

    case PIECE_TYPES.KNIGHT:
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ]
      for (const [dr, dc] of knightMoves) {
        const nr = row + dr
        const nc = col + dc
        if (isOnBoard(nr, nc)) {
          attacked.push([nr, nc])
        }
      }
      break

    case PIECE_TYPES.PAWN:
      const direction = piece.color === 'white' ? -1 : 1
      const pawnAttacks = [
        [direction, -1],
        [direction, 1],
      ]
      for (const [dr, dc] of pawnAttacks) {
        const nr = row + dr
        const nc = col + dc
        if (isOnBoard(nr, nc)) {
          attacked.push([nr, nc])
        }
      }
      break

    default:
      break
  }
  
  return attacked
}

function getSlidingAttacks(row, col, directions, board = null) {
  const attacked = []
  
  for (const [dr, dc] of directions) {
    let nr = row + dr
    let nc = col + dc
    
    while (isOnBoard(nr, nc)) {
      attacked.push([nr, nc])
      // If there's a board and this square has a piece, stop sliding
      if (board && board[nr][nc]) {
        break
      }
      nr += dr
      nc += dc
    }
  }
  
  return attacked
}

// Calculate all attacks from all pieces on the board
// Returns an 8x8 array where each cell contains array of attacker IDs (pieceIndex)
export function calculateAllAttacks(board) {
  // Initialize attacks as empty arrays
  const attacks = Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => [])
  )
  
  // Collect all pieces with their positions and assigned indices
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (!piece) continue
      
      const idx = piece.pieceIndex ?? 0
      
      // Get all squares this piece attacks (passing board for blocking calculation)
      const attackedSquares = getAttackedSquares(piece, row, col, board)
      
      // Add this piece's index to each attacked square
      for (const [ar, ac] of attackedSquares) {
        attacks[ar][ac].push(idx)
      }
    }
  }
  
  return attacks
}

// Calculate attacks with depth (secondary, tertiary coverage)
// depth 1 = current, depth 2 = if pieces moved to attack squares, etc.
export function calculateAttacksWithDepth(board, maxDepth = 1) {
  // Initialize: each cell contains { depth1: [], depth2: [], ... }
  const attacks = Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => ({
      depth1: [],
      depth2: [],
      depth3: [],
    }))
  )
  
  // Collect all pieces with their positions
  const pieces = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece) {
        pieces.push({ piece, row, col, idx: piece.pieceIndex ?? 0 })
      }
    }
  }
  
  // Depth 1: Current attacks (with blocking)
  for (const { piece, row, col, idx } of pieces) {
    const attackedSquares = getAttackedSquares(piece, row, col, board)
    for (const [ar, ac] of attackedSquares) {
      attacks[ar][ac].depth1.push(idx)
    }
  }
  
  if (maxDepth < 2) return attacks
  
  // Depth 2: If piece moves to any of its attack squares, what else could it hit?
  // Note: For depth 2+, we don't calculate blocking since the board state would change
  for (const { piece, row, col, idx } of pieces) {
    const currentAttacks = getAttackedSquares(piece, row, col, board)
    
    for (const [moveRow, moveCol] of currentAttacks) {
      // From this potential position, where could the piece attack?
      // Don't pass board here since we're hypothetically moving
      const futureAttacks = getAttackedSquares(piece, moveRow, moveCol)
      
      for (const [ar, ac] of futureAttacks) {
        // Skip squares already in depth1 for this piece
        if (!attacks[ar][ac].depth1.includes(idx) && 
            !attacks[ar][ac].depth2.includes(idx)) {
          attacks[ar][ac].depth2.push(idx)
        }
      }
    }
  }
  
  if (maxDepth < 3) return attacks
  
  // Depth 3: One more level deep
  for (const { piece, row, col, idx } of pieces) {
    const currentAttacks = getAttackedSquares(piece, row, col, board)
    
    for (const [moveRow1, moveCol1] of currentAttacks) {
      const level2Attacks = getAttackedSquares(piece, moveRow1, moveCol1)
      
      for (const [moveRow2, moveCol2] of level2Attacks) {
        const level3Attacks = getAttackedSquares(piece, moveRow2, moveCol2)
        
        for (const [ar, ac] of level3Attacks) {
          if (!attacks[ar][ac].depth1.includes(idx) && 
              !attacks[ar][ac].depth2.includes(idx) &&
              !attacks[ar][ac].depth3.includes(idx)) {
            attacks[ar][ac].depth3.push(idx)
          }
        }
      }
    }
  }
  
  return attacks
}

// Legacy function for backward compatibility - returns counts
export function calculateAttackCounts(board) {
  const attacks = calculateAllAttacks(board)
  return attacks.map(row => row.map(attackers => attackers.length))
}
