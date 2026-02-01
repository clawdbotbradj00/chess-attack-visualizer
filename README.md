# Chess Attack Visualizer

A lightweight React app for visualizing chess piece attack patterns.

## Features

- **Empty board start** - Board starts empty, add pieces as needed
- **Piece palette** - All chess pieces (King, Queen, Rook, Bishop, Knight, Pawn) in both colors
- **Drag & drop** - Drag pieces from palette onto the board
- **Attack visualization** - Red overlay shows all squares attacked by pieces
- **Attack counts** - Shows how many pieces attack each square
- **Remove pieces** - Right-click or drag off the board to remove
- **Clear board** - Button to reset the board

## Attack Logic

Each piece type has its own attack pattern:
- **King**: All 8 adjacent squares
- **Queen**: All horizontal, vertical, and diagonal lines (rook + bishop)
- **Rook**: All horizontal and vertical lines
- **Bishop**: All diagonal lines
- **Knight**: L-shaped moves (2+1 squares)
- **Pawn**: Diagonal captures (direction based on color)

## Usage

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- Vite + React
- No external chess libraries - custom attack logic
- Pure CSS (no frameworks)
- Responsive design

## Controls

- **Drag** pieces from the palette onto the board
- **Drag** pieces on the board to move them
- **Right-click** a piece to remove it
- **Drag off** the board to remove a piece
- Toggle attack count display with the checkbox
