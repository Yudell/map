const { createCanvas } = require('canvas');
const fs = require('fs');
const { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } = require('./mapgen');
const { generatePoliticalMap, drawPoliticalMap } = require('./politicalMapGenerator');

// Константы для типов местности
const terrainType = {
  OCEAN: 'OCEAN',
  SEA: 'SEA',
  WET_SAND: 'WET_SAND',
  SAND: 'SAND',
  DRY_SAND: 'DRY_SAND',
  DRY_GRASS: 'DRY_GRASS',
  GRASS: 'GRASS',
  WET_GRASS: 'WET_GRASS',
  MOUNTAIN_SNOW: 'MOUNTAIN_SNOW',
  MOUNTAIN_ORE: 'MOUNTAIN_ORE',
  MOUNTAIN: 'MOUNTAIN',
  DESERT: 'DESERT' // Новый тип местности
};

// Функция для генерации карты
function generateMap(width, height, terrainNoise, variantNoise, biomeNoise) {
  const map = [];
  
  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      const terrainValue = terrainNoise(x / 100, y / 100);
      const variantValue = variantNoise(x / 100, y / 100);
      const biomeValue = biomeNoise(x / 100, y / 100);
      let info = {};

      // Определение типа местности и вариантов на основе шумов
      if (terrainValue < 0) {
        info.color = '#003eb2';
        info.type = terrainType.OCEAN;
      } else if (terrainValue < 0.2) {
        info.color = '#0952c6';
        info.type = terrainType.SEA;
      } else if (terrainValue < 0.22) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#867645';
          info.type = terrainType.WET_SAND;
        } else if (variantValue < 0.2) {
          info.color = '#a49463';
          info.type = terrainType.SAND;
        } else {
          info.color = '#c2b281';
          info.type = terrainType.DRY_SAND;
        }
      } else if (biomeValue > 0.5) { // Используем biomeValue для определения пустыни
        info.color = '#f0e68c';
        info.type = terrainType.DESERT;
      } else if (terrainValue < 0.5) {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#284d00';
          info.type = terrainType.DRY_GRASS;
        } else if (variantValue < 0.2) {
          info.color = '#3c6114';
          info.type = terrainType.GRASS;
        } else {
          info.color = '#5a7f32';
          info.type = terrainType.WET_GRASS;
        }
      } else {
        info.variantNoise = variantValue;
        if (variantValue < -0.2) {
          info.color = '#ebebeb';
          info.type = terrainType.MOUNTAIN_SNOW;
        } else if (variantValue < 0.2) {
          info.color = '#8c8e7b';
          info.type = terrainType.MOUNTAIN_ORE;
        } else {
          info.color = '#a0a28f';
          info.type = terrainType.MOUNTAIN;
        }
      }

      map[y][x] = info;
    }
  }

  // Проверка и корректировка границ пустыни
  const allowedNeighbors = [terrainType.SAND, terrainType.GRASS, terrainType.WET_GRASS];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (map[y][x].type === terrainType.DESERT) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width && !allowedNeighbors.includes(map[ny][nx].type)) {
              if (map[ny][nx].type === terrainType.MOUNTAIN_SNOW || map[ny][nx].type === terrainType.MOUNTAIN_ORE || map[ny][nx].type === terrainType.MOUNTAIN) {
                map[ny][nx].type = terrainType.GRASS;
                map[ny][nx].color = '#3c6114';
              }
            }
          }
        }
      }
    }
  }

  return map;
}

// Функция для отрисовки карты
function drawMap(map, cellSize) {
  const canvas = createCanvas(map[0].length * cellSize, map.length * cellSize);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const info = map[y][x];
      ctx.fillStyle = info.color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  return canvas;
}

// Сохранение карты в виде PNG-файла
function saveMapAsPNG(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
}

// Конфигурация
const mapWidth = 1000;
const mapHeight = 1000;
const cellSize = 10;


// Генерация случайного сида
const terrainSeed = generateRandomSeed();
const variantSeed = generateRandomSeed();
const biomeSeed = generateRandomSeed();

// Использование случайного сида для функций шума
const terrainNoise = createNoise(terrainSeed);
const variantNoise = createNoise(variantSeed);
const biomeNoise = createNoise(biomeSeed);

const getTerrainNoise = newFractalNoise({
  noise: terrainNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

const getVariantNoise = newFractalNoise({
  noise: variantNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});

const getBiomeNoise = newFractalNoise({
  noise: biomeNoise,
  octaves: defaultOctaves,
  frequency: defaultFrequency,
  persistence: defaultPersistence
});



const physmap = generateMap(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
const physcanvas = drawMap(physmap, cellSize);
saveMapAsPNG(physcanvas, 'dap.png');

// Генерация и сохранение политической карты
const politicalMap = generatePoliticalMap(physmap, mapWidth, mapHeight);
const politicalCanvas = drawPoliticalMap(politicalMap, cellSize);
saveMapAsPNG(politicalCanvas, 'political_map.png');