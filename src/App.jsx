import { useRef, useState } from "react";
import "./App.css";
import { useIsMobileDevice } from "./hooks/useIsMobileDevice";

const INITIAL_ITEMS = [
  { id: 1, x: 80, y: 80, label: "Box A" },
  { id: 2, x: 240, y: 110, label: "Box B" },
  { id: 3, x: 400, y: 90, label: "Box C" },
];

const BOX_WIDTH = 90;
const BOX_HEIGHT = 60;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function App() {
  const isMobile = useIsMobileDevice();
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [demoMode, setDemoMode] = useState("drag");
  const [bandShape, setBandShape] = useState("rectangle");
  const [drawnShapes, setDrawnShapes] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [band, setBand] = useState(null); // { x0, y0, x1, y1 }
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  // Mouse position relative to the canvas
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getCanvasSize = () => ({
    width: canvasRef.current?.clientWidth ?? 0,
    height: canvasRef.current?.clientHeight ?? 0,
  });

  // In rubber mode, pressing on empty canvas starts drawing a band
  const handleCanvasDown = (e) => {
    if (demoMode !== "rubber") return;
    if (e.target !== canvasRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    dragRef.current = { mode: "band", origin: pos };
    setBand({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
    setSelected(new Set());
  };

  // In drag mode, pressing a box starts dragging that box
  const handleItemDown = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getPos(e);
    const ids = new Set([id]);
    setSelected(ids);
    dragRef.current = {
      mode: "drag",
      ids,
      origin: pos,
      // Snapshot starting position to avoid movement drift
      starts: Object.fromEntries(
        items
          .filter((it) => ids.has(it.id))
          .map((it) => [it.id, { x: it.x, y: it.y }]),
      ),
    };
  };

  const handleModeChange = (mode) => {
    if (mode === demoMode) return;
    setDemoMode(mode);
    setBand(null);
    setSelected(new Set());
    dragRef.current = null;
  };

  const handleShapeChange = (shape) => {
    if (shape === bandShape) return;
    setBandShape(shape);
    setBand(null);
    dragRef.current = null;
  };

  const removeShape = (id) =>
    setDrawnShapes((prev) => prev.filter((s) => s.id !== id));
  const clearShapes = () => setDrawnShapes([]);

  const handleMouseMove = (e) => {
    if (!dragRef.current) return;
    const rawPos = getPos(e);
    const d = dragRef.current;
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    const pos = {
      x: clamp(rawPos.x, 0, canvasWidth),
      y: clamp(rawPos.y, 0, canvasHeight),
    };

    if (d.mode === "band") {
      // Rubber-banding is now bound to the canvas edges too.
      if (bandShape === "circle") {
        const maxRadius = Math.max(
          0,
          Math.min(
            d.origin.x,
            d.origin.y,
            canvasWidth - d.origin.x,
            canvasHeight - d.origin.y,
          ),
        );
        const wantedRadius = Math.hypot(pos.x - d.origin.x, pos.y - d.origin.y);
        const radius = Math.min(wantedRadius, maxRadius);

        setBand({
          x0: d.origin.x - radius,
          y0: d.origin.y - radius,
          x1: d.origin.x + radius,
          y1: d.origin.y + radius,
        });
      } else {
        setBand({ x0: d.origin.x, y0: d.origin.y, x1: pos.x, y1: pos.y });
      }
    } else {
      // Move the box by mouse delta while keeping it inside canvas bounds
      const dx = pos.x - d.origin.x;
      const dy = pos.y - d.origin.y;
      const maxX = Math.max(0, canvasWidth - BOX_WIDTH);
      const maxY = Math.max(0, canvasHeight - BOX_HEIGHT);

      setItems((prev) =>
        prev.map((it) =>
          d.ids.has(it.id)
            ? {
                ...it,
                x: Math.min(maxX, Math.max(0, d.starts[it.id].x + dx)),
                y: Math.min(maxY, Math.max(0, d.starts[it.id].y + dy)),
              }
            : it,
        ),
      );
    }
  };

  const handleMouseUp = () => {
    if (!dragRef.current) return;

    if (dragRef.current.mode === "band" && band) {
      const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
      const minX = clamp(Math.min(band.x0, band.x1), 0, canvasWidth);
      const maxX = clamp(Math.max(band.x0, band.x1), 0, canvasWidth);
      const minY = clamp(Math.min(band.y0, band.y1), 0, canvasHeight);
      const maxY = clamp(Math.max(band.y0, band.y1), 0, canvasHeight);

      if (maxX - minX > 1 || maxY - minY > 1) {
        setDrawnShapes((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            shape: bandShape,
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
        ]);
      }

      setBand(null);
    }

    dragRef.current = null;
  };

  // Normalize the temporary band rectangle for rendering
  const bandRect = band && {
    left: Math.min(band.x0, band.x1),
    top: Math.min(band.y0, band.y1),
    width: Math.abs(band.x1 - band.x0),
    height: Math.abs(band.y1 - band.y0),
  };

  if (isMobile) {
    return (
      <div className="device-block-screen">
        <div className="device-block-card">
          <h1>Desktop Access Only</h1>
          <p>This demo is available on desktop/laptop screens only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Dragging vs Rubberbanding Demo</h1>

      <p className="mode-description">
        Dragging moves boxes. Rubberbanding draws shapes.
      </p>

      <div className="mode-switcher">
        <button
          type="button"
          className={`mode-btn${demoMode === "drag" ? " active" : ""}`}
          onClick={() => handleModeChange("drag")}
        >
          Drag
        </button>
        <button
          type="button"
          className={`mode-btn${demoMode === "rubber" ? " active" : ""}`}
          onClick={() => handleModeChange("rubber")}
        >
          Rubber banding
        </button>
      </div>

      <p className="mode-description">
        {demoMode === "drag"
          ? "Dragging mode: click and drag a box to move it."
          : `Rubberbanding mode: draw a ${bandShape} and release to create it.`}
      </p>

      {demoMode === "rubber" && (
        <div className="shape-switcher">
          <button
            type="button"
            className={`shape-btn${bandShape === "rectangle" ? " active" : ""}`}
            onClick={() => handleShapeChange("rectangle")}
          >
            Rectangle
          </button>
          <button
            type="button"
            className={`shape-btn${bandShape === "circle" ? " active" : ""}`}
            onClick={() => handleShapeChange("circle")}
          >
            Circle
          </button>
        </div>
      )}

      <div
        ref={canvasRef}
        className={`canvas ${demoMode === "drag" ? "mode-drag" : "mode-rubber"}`}
        onMouseDown={handleCanvasDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {demoMode === "drag" &&
          items.map((item) => (
            <div
              key={item.id}
              className={`box${selected.has(item.id) ? " selected" : ""}`}
              style={{ left: item.x, top: item.y }}
              onMouseDown={(e) => handleItemDown(e, item.id)}
            >
              {item.label}
            </div>
          ))}

        {demoMode === "rubber" &&
          drawnShapes.map((shape) => (
            <div
              key={shape.id}
              className={`drawn-shape${shape.shape === "circle" ? " circle" : ""}`}
              style={{
                left: shape.left,
                top: shape.top,
                width: shape.width,
                height: shape.height,
              }}
              title="Click to remove"
              onClick={() => removeShape(shape.id)}
            />
          ))}

        {bandRect && (bandRect.width > 1 || bandRect.height > 1) && (
          <div
            className={`rubber-band${bandShape === "circle" ? " circle" : ""}`}
            style={bandRect}
          />
        )}
      </div>

      <div className="status-row">
        <p className="status">
          {demoMode === "drag"
            ? "Dragging active: move boxes inside the canvas."
            : drawnShapes.length === 0
              ? "Rubberbanding active: draw a shape on the canvas."
              : `Rubberbanding active: ${drawnShapes.length} shape${drawnShapes.length === 1 ? "" : "s"} — click one to remove.`}
        </p>
        {demoMode === "rubber" && drawnShapes.length > 0 && (
          <button type="button" className="clear-btn" onClick={clearShapes}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
