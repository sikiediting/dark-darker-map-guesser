// Calculate distance in percentage (0-100)
export function calculateDistancePercent(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Convert percentage distance to real meters
export function calculateDistanceMeters(
  distancePercent: number,
  mapScaleMeters: number
): number {
  return (distancePercent / 100) * mapScaleMeters;
}

// Calculate score based on distance in METERS - Your exact curve
export function calculateScore(distanceMeters: number, mapScaleMeters: number): number {
  // 0-2m = 5,000 (Green - PERFECT)
  if (distanceMeters <= 2) {
    return 5000;
  }

  // 2-5m = 5,000 to 4,800
  if (distanceMeters <= 5) {
    return Math.round(5000 - ((distanceMeters - 2) / 3) * 200);
  }

  // 5-10m = 4,800 to 4,000
  if (distanceMeters <= 10) {
    return Math.round(4800 - ((distanceMeters - 5) / 5) * 800);
  }

  // 10-15m = 4,000 to 2,500
  if (distanceMeters <= 15) {
    return Math.round(4000 - ((distanceMeters - 10) / 5) * 1500);
  }

  // 15-30m = 2,500 to 1,000
  if (distanceMeters <= 30) {
    return Math.round(2500 - ((distanceMeters - 15) / 15) * 1500);
  }

  // 30-50m = 1,000 to 100
  if (distanceMeters <= 50) {
    return Math.round(1000 - ((distanceMeters - 30) / 20) * 900);
  }

  // 50m+ = 100 to 0 (very gradual)
  if (distanceMeters <= 100) {
    return Math.round(100 - ((distanceMeters - 50) / 50) * 100);
  }

  return 0;
}

// Get score color
export function getScoreColor(score: number): string {
  if (score >= 4900) return '#4ade80';
  if (score >= 4500) return '#facc15';
  if (score >= 4000) return '#fb923c';
  if (score >= 2000) return '#f87171';
  return '#dc2626';
}

// Get score border color
export function getScoreBorderColor(score: number): string {
  if (score >= 4900) return '#4ade80';
  if (score >= 4500) return '#facc15';
  if (score >= 4000) return '#fb923c';
  if (score >= 2000) return '#f87171';
  return '#dc2626';
}

// Get map type display name
export function getMapTypeName(mapType: string): string {
  const names: Record<string, string> = {
    ruins: 'Ancient Ruins',
    goblin: 'Goblin Caves',
    ice: 'Ice Caverns',
    all: 'Mixed Maps',
  };
  return names[mapType] || mapType;
}

// Get map type color
export function getMapTypeColor(mapType: string): string {
  const colors: Record<string, string> = {
    ruins: '#d4af37',
    goblin: '#22c55e',
    ice: '#3b82f6',
    all: '#a855f7',
  };
  return colors[mapType] || '#d4af37';
}

// Calculate map scale based on grid size
export function calculateMapScale(gridSize: number): number {
  return gridSize * 30;
}