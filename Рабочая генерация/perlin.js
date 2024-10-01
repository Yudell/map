const { createCanvas } = require('canvas');
const fs = require('fs');
const { makeNoise2D } = require('open-simplex-noise');

// Constants
const TERRAIN_TYPES = {
  DEEP_WATER: '#00008B',
  SHALLOW_WATER: '#0000FF',
  SAND: '#C2B280',
  GRASS: '#006400',
  DIRT: '#8B4513',
  ROCK: '#696969',
  SNOW: '#FFFAFA',
  FOREST: '#228B22',
  MOUNTAIN: '#8B0000',
  PEAK: '#FFFFFF',
};

function generateMap(width, height, seed) {
  const noise = makeNoise2D({
    seed: seed,
    salt: seed
  });
  const map = [];

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      const noiseValue = noise(x / 100, y / 100);
      let terrainType;

      // Determine terrain type based on noise value
      if (noiseValue < -0.5) {
        terrainType = TERRAIN_TYPES.DEEP_WATER;
      } else if (noiseValue < -0.2) {
        terrainType = TERRAIN_TYPES.SHALLOW_WATER;
      } else if (noiseValue < 0) {
        terrainType = TERRAIN_TYPES.SAND;
      } else if (noiseValue < 0.2) {
        terrainType = TERRAIN_TYPES.GRASS;
      } else if (noiseValue < 0.4) {
        terrainType = TERRAIN_TYPES.DIRT;
      } else if (noiseValue < 0.6) {
        terrainType = TERRAIN_TYPES.ROCK;
      } else if (noiseValue < 0.8) {
        terrainType = TERRAIN_TYPES.SNOW;
      } else {
        terrainType = TERRAIN_TYPES.PEAK;
      }

      map[y][x] = terrainType;
    }
  }

  return map;
}

function drawMap(map, cellSize) {
  const canvas = createCanvas(map[0].length * cellSize, map.length * cellSize);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const terrainType = map[y][x];
      ctx.fillStyle = terrainType;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  return canvas;
}

function saveMapAsPNG(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
}

// Configuration
const mapWidth = 500;
const mapHeight = 500;
const cellSize = 50;
const seed = 123; // Пример seed

// Generate and save the map
const map = generateMap(mapWidth, mapHeight, seed);
const canvas = drawMap(map, cellSize);
saveMapAsPNG(canvas, 'map.png');