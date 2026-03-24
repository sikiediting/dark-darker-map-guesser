import { useState, useRef, useEffect } from 'react';
import { MapPin, ZoomIn, ZoomOut } from 'lucide-react';

interface Pin {
  x: number;
  y: number;
  color: string;
}

interface InteractiveMapProps {
  imageUrl: string;
  onMapClick?: (x: number, y: number) => void;
  userPin?: Pin | null;
  targetPin?: Pin | null;
  disabled?: boolean;
  showDistance?: boolean;
  mapScaleMeters?: number;
  autoZoomOnSubmit?: boolean;
}

export default function InteractiveMap({
  imageUrl,
  onMapClick,
  userPin,
  targetPin,
  disabled = false,
  showDistance = false,
  mapScaleMeters = 150,
  autoZoomOnSubmit = false,
}: InteractiveMapProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const minScale = 1;
  const maxScale = 3;
  const zoomStep = 0.2;

  useEffect(() => {
    if (autoZoomOnSubmit && userPin && targetPin && imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      const midX = (targetPin.x + userPin.x) / 2;
      const midY = (targetPin.y + userPin.y) / 2;
      
      const targetScale = 1.8;
      
      if (img.complete) {
        const containerRect = container.getBoundingClientRect();
        const imgNaturalWidth = img.width;
        const imgNaturalHeight = img.height;
        
        const targetXPixels = (midX / 100) * imgNaturalWidth;
        const targetYPixels = (midY / 100) * imgNaturalHeight;
        
        const offsetX = (containerRect.width / 2) - (targetXPixels * targetScale);
        const offsetY = (containerRect.height / 2) - (targetYPixels * targetScale);
        
        setScale(targetScale);
        setTimeout(() => {
          setOffset({ x: offsetX, y: offsetY });
        }, 50);
      }
    }
  }, [autoZoomOnSubmit, userPin, targetPin]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.0005;
      setScale((prev) => Math.max(minScale, Math.min(maxScale, prev + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(maxScale, prev + zoomStep));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(minScale, prev - zoomStep));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isDragging || !imageRef.current) return;

    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();

    const isInImage = 
      e.clientX >= imgRect.left && 
      e.clientX <= imgRect.right &&
      e.clientY >= imgRect.top && 
      e.clientY <= imgRect.bottom;

    if (!isInImage) return;

    const percentX = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const percentY = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    onMapClick?.(
      Math.max(0, Math.min(100, percentX)),
      Math.max(0, Math.min(100, percentY))
    );
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Calculate distance and label position
  const showLine = showDistance && userPin && targetPin;
  let lineDistanceMeters = 0;
  let labelX = 50;
  let labelY = 50;

  if (showLine && userPin && targetPin) {
    const dx = userPin.x - targetPin.x;
    const dy = userPin.y - targetPin.y;
    const lineDistancePercent = Math.sqrt(dx * dx + dy * dy);
    lineDistanceMeters = (lineDistancePercent / 100) * mapScaleMeters;
    
    if (lineDistanceMeters < 12) {
      const perpX = -dy;
      const perpY = dx;
      const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
      
      const offsetAmount = 8;
      labelX = (targetPin.x + userPin.x) / 2 + (perpX / perpLength) * offsetAmount;
      labelY = (targetPin.y + userPin.y) / 2 + (perpY / perpLength) * offsetAmount;
    } else {
      labelX = (targetPin.x + userPin.x) / 2;
      labelY = (targetPin.y + userPin.y) / 2;
    }
  }

  return (
    <div className="w-full h-full bg-gray-700">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-200 px-2">
        <span>Zoom: {Math.round(scale * 100)}%</span>
        <div className="flex items-center gap-1">
          {scale > 1 && (
            <button onClick={handleReset} className="text-xs text-gold hover:text-white px-1">
              Reset
            </button>
          )}
          <button onClick={handleZoomOut} className="p-1 hover:bg-white/10 rounded" title="Zoom Out">
            <ZoomOut className="w-3 h-3 text-gold" />
          </button>
          <button onClick={handleZoomIn} className="p-1 hover:bg-white/10 rounded" title="Zoom In">
            <ZoomIn className="w-3 h-3 text-gold" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-[calc(100%-30px)] overflow-hidden rounded-lg border border-gold/30 flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.3s',
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Game Map"
            className="block w-full h-full object-contain cursor-crosshair"
            draggable={false}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ filter: 'brightness(1) contrast(1)' }}
          />

          <div className="absolute inset-0 pointer-events-none">
            {showLine && userPin && targetPin && (
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 20 }}>
                <line
                  x1={`${targetPin.x}%`}
                  y1={`${targetPin.y}%`}
                  x2={`${userPin.x}%`}
                  y2={`${userPin.y}%`}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  opacity="0.9"
                />
                {/* SMALL black box behind distance text */}
                <rect
                  x={`${labelX - 2.5}%`}
                  y={`${labelY - 1.2}%`}
                  width="5%"
                  height="2.4%"
                  fill="rgba(0,0,0,0.8)"
                  rx="3"
                />
                <text
                  x={`${labelX}%`}
                  y={`${labelY}%`}
                  fill="#fbbf24"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ 
                    fontFamily: 'system-ui, sans-serif'
                  }}
                >
                  {lineDistanceMeters.toFixed(1)}m
                </text>
              </svg>
            )}

            {targetPin && (
              <div
                className="absolute"
                style={{
                  left: `${targetPin.x}%`,
                  top: `${targetPin.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 25,
                }}
              >
                <MapPin className="w-5 h-5 md:w-6 md:h-6" style={{ color: targetPin.color, fill: targetPin.color }} />
              </div>
            )}

            {userPin && (
              <div
                className="absolute"
                style={{
                  left: `${userPin.x}%`,
                  top: `${userPin.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 25,
                }}
              >
                <MapPin className="w-5 h-5 md:w-6 md:h-6" style={{ color: userPin.color, fill: userPin.color }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}