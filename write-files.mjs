import { writeFileSync } from "fs";

const appJsx = `import { useState, useRef } from 'react'
import './App.css'

const INITIAL_ITEMS = [
  { id: 1, x: 80,  y: 80,  color: '#FF6B6B', label: 'Box A' },
  { id: 2, x: 260, y: 110, color: '#4ECDC4', label: 'Box B' },
  { id: 3, x: 450, y: 70,  color: '#45B7D1', label: 'Box C' },
  { id: 4, x: 130, y: 260, color: '#96CEB4', label: 'Box D' },
  { id: 5, x: 350, y: 290, color: '#FFEAA7', label: 'Box E' },
  { id: 6, x: 560, y: 190, color: '#DDA0DD', label: 'Box F' },
  { id: 7, x: 490, y: 370, color: '#FDCB6E', label: 'Box G' },
  { id: 8, x: 90,  y: 400, color: '#A29BFE', label: 'Box H' },
  { id: 9, x: 310, y: 420, color: '#FD79A8', label: 'Box I' },
]

const ITEM_W = 90
const ITEM_H = 60

export default function App() {
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [selected, setSelected] = useState(new Set())
  const [band, setBand] = useState(null) // { x0, y0, x1, y1 }
  const dragRef = useRef(null)
  const canvasRef = useRef(null)

  /** Mouse position relative to the canvas */
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  /** Clicking the canvas background starts a rubber-band selection */
  const handleCanvasDown = (e) => {
    if (e.target !== canvasRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    dragRef.current = { mode: 'band', origin: pos }
    setBand({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y })
    setSelected(new Set())
  }

  /** Clicking a box starts dragging it (or the whole selected group) */
  const handleItemDown = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    const pos = getPos(e)
    // Keep existing group if clicking an already-selected box; otherwise solo-select
    const ids = selected.has(id) ? selected : new Set([id])
    if (!selected.has(id)) setSelected(ids)
    dragRef.current = {
      mode: 'drag',
      ids,
      origin: pos,
      // Snapshot starting positions to compute deltas without drift
      starts: Object.fromEntries(
        items.filter(it => ids.has(it.id)).map(it => [it.id, { x: it.x, y: it.y }])
      ),
    }
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const pos = getPos(e)
    const d = dragRef.current

    if (d.mode === 'band') {
      // Grow the rubber-band rectangle
      setBand(b => ({ ...b, x1: pos.x, y1: pos.y }))
    } else {
      // Move all selected boxes by the delta
      const dx = pos.x - d.origin.x
      const dy = pos.y - d.origin.y
      setItems(prev =>
        prev.map(it =>
          d.ids.has(it.id)
            ? { ...it, x: d.starts[it.id].x + dx, y: d.starts[it.id].y + dy }
            : it
        )
      )
    }
  }

  const handleMouseUp = () => {
    if (!dragRef.current) return

    if (dragRef.current.mode === 'band' && band) {
      // Select every box that overlaps the rubber-band rect
      const minX = Math.min(band.x0, band.x1)
      const maxX = Math.max(band.x0, band.x1)
      const minY = Math.min(band.y0, band.y1)
      const maxY = Math.max(band.y0, band.y1)
      setSelected(
        new Set(
          items
            .filter(
              it =>
                it.x < maxX &&
                it.x + ITEM_W > minX &&
                it.y < maxY &&
                it.y + ITEM_H > minY
            )
            .map(it => it.id)
        )
      )
      setBand(null)
    }

    dragRef.current = null
  }

  // Normalise the band rect so CSS left/top are always the top-left corner
  const bandRect = band && {
    left:   Math.min(band.x0, band.x1),
    top:    Math.min(band.y0, band.y1),
    width:  Math.abs(band.x1 - band.x0),
    height: Math.abs(band.y1 - band.y0),
  }

  return (
    <div className="app">
      <h1>Drag &amp; Rubber-band Selection</h1>

      <div className="hints">
        <span><kbd>Drag</kbd> a box to move it</span>
        <span><kbd>Drag</kbd> the canvas to rubber-band select</span>
        <span><kbd>Drag</kbd> a selected box to move the whole group</span>
      </div>

      <div
        ref={canvasRef}
        className="canvas"
        onMouseDown={handleCanvasDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {items.map(item => (
          <div
            key={item.id}
            className={\`box\${selected.has(item.id) ? ' selected' : ''}\`}
            style={{ left: item.x, top: item.y, background: item.color }}
            onMouseDown={e => handleItemDown(e, item.id)}
          >
            {item.label}
          </div>
        ))}

        {/* Rubber-band overlay */}
        {bandRect && (bandRect.width > 1 || bandRect.height > 1) && (
          <div className="rubber-band" style={bandRect} />
        )}
      </div>

      <p className="status">
        {selected.size > 0
          ? \`\${selected.size} box\${selected.size > 1 ? 'es' : ''} selected — drag any highlighted box to move the group\`
          : 'No selection — click a box or rubber-band to select'}
      </p>
    </div>
  )
}
`;

const appCss = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0f0f1a;
  color: #e0e0f0;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 40px;
  gap: 20px;
  min-height: 100vh;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #00d2ff 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Instruction hints ── */
.hints {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.85rem;
  color: #888;
}

.hints span {
  display: flex;
  align-items: center;
  gap: 6px;
}

kbd {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #1e1e35;
  border: 1px solid #444;
  font-size: 0.8rem;
  color: #ccc;
  font-family: inherit;
}

/* ── Canvas ── */
.canvas {
  position: relative;
  width: 700px;
  height: 520px;
  background: #13132a;
  border: 1px solid #2a2a4e;
  border-radius: 16px;
  overflow: hidden;
  cursor: crosshair;
  /* dot-grid background */
  background-image: radial-gradient(circle, #2a2a50 1px, transparent 1px);
  background-size: 30px 30px;
  /* Prevent text selection while dragging */
  user-select: none;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

/* ── Draggable boxes ── */
.box {
  position: absolute;
  width: 90px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
  cursor: grab;
  border: 3px solid transparent;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  transition: box-shadow 0.15s, transform 0.1s, border-color 0.15s;
  /* Keep label from triggering extra mouse events */
  pointer-events: all;
}

.box:hover {
  transform: scale(1.07);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  z-index: 1;
}

.box:active,
.box.selected:active {
  cursor: grabbing;
}

.box.selected {
  border-color: #ffffff;
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.35),
    0 6px 20px rgba(0, 0, 0, 0.55);
  transform: scale(1.05);
  z-index: 2;
}

/* ── Rubber-band rectangle ── */
.rubber-band {
  position: absolute;
  border: 2px dashed #00d2ff;
  background: rgba(0, 210, 255, 0.08);
  pointer-events: none;
  border-radius: 3px;
  /* Subtle animated march */
  animation: march 0.6s linear infinite;
}

@keyframes march {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: 20; }
}

/* ── Status text ── */
.status {
  font-size: 0.85rem;
  color: #666;
  min-height: 1.2em;
  text-align: center;
}
`;

const indexCss = `
:root { color-scheme: dark; }
body { margin: 0; }
`;

writeFileSync("C:/drag-demo/src/App.jsx", appJsx, "utf8");
writeFileSync("C:/drag-demo/src/App.css", appCss, "utf8");
writeFileSync("C:/drag-demo/src/index.css", indexCss, "utf8");

console.log("All files written successfully.");
