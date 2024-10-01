const { createCanvas } = require('canvas');
const fs = require('fs');
const { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } = require('./mapgen');
const { generatePoliticalMap } = require('./politicalMapGenerator');

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
  DESERT: 'DESERT',
  RIVER: 'RIVER',
};

// Функция для генерации карты
function generateMap(width, height, terrainNoise, variantNoise, biomeNoise) {
  const map = [];
  const heightMap = [];
  
  for (let y = 0; y < height; y++) {
    map[y] = [];
    heightMap[y] = [];
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
      heightMap[y][x] = terrainValue;
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

// Функция для отрисовки политической карты поверх физической
function drawPoliticalMapOverPhysical(physicalMap, politicalMap, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  const predefinedColors = [
    '#b8b2e2',
    '#c9e7d5',
    '#f5eaa9',
    '#d6dce3',
    '#f5cbc9',
    '#b7e0d8',
    '#e1ecba',
    '#c6d9f3',
    '#e8ceef'
  ];

  const colors = {};
  let colorIndex = 0;

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0 && !colors[countryId]) {
        colors[countryId] = predefinedColors[colorIndex % predefinedColors.length];
        colorIndex++;
      }
      if (countryId > 0) {
        ctx.fillStyle = colors[countryId];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
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

function generateRivers(map, heightMap) {
  const width = map[0].length;
  const height = map.length;
  const riverSources = [];

  // Определение истоков рек
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((map[y][x].type === terrainType.MOUNTAIN || map[y][x].type === terrainType.MOUNTAIN_ORE) && Math.random() < 0.001) {
        riverSources.push({ x, y });
      }
    }
  }

  // Построение рек
  riverSources.forEach(source => {
    let current = source;
    while (current) {
      map[current.y][current.x].type = terrainType.RIVER;
      map[current.y][current.x].color = '#0000ff'; // Синий цвет для реки

      // Найти следующую клетку с наименьшей высотой
      let next = null;
      let minHeight = heightMap[current.y][current.x];
      const directions = [
        { dx: -1, dy: 0 }, // влево
        { dx: 1, dy: 0 },  // вправо
        { dx: 0, dy: -1 }, // вверх
        { dx: 0, dy: 1 },  // вниз
        { dx: -1, dy: -1 },// влево-вверх
        { dx: 1, dy: -1 }, // вправо-вверх
        { dx: -1, dy: 1 }, // влево-вниз
        { dx: 1, dy: 1 }   // вправо-вниз
      ];

      // Перемешиваем направления для разнообразия
      directions.sort(() => Math.random() - 0.7);

      for (const dir of directions) {
        const ny = current.y + dir.dy;
        const nx = current.x + dir.dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          if (heightMap[ny][nx] < minHeight) {
            minHeight = heightMap[ny][nx];
            next = { x: nx, y: ny };
          } else if (heightMap[ny][nx] === minHeight && Math.random() < 0.7) {
            next = { x: nx, y: ny };
          }
        }
      }

      // Если следующая клетка — море или океан, завершить реку
      if (next && (map[next.y][next.x].type === terrainType.OCEAN || map[next.y][next.x].type === terrainType.SEA)) {
        map[next.y][next.x].type = terrainType.RIVER;
        map[next.y][next.x].color = '#0000ff';
        break;
      }

      current = next;
    }
  });
}

// Генерация карты и рек
const physmap = generateMap(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
generateRivers(physmap, physmap.map(row => row.map(cell => cell.type === terrainType.MOUNTAIN ? 1 : 0)));
const physcanvas = drawMap(physmap, cellSize);
saveMapAsPNG(physcanvas, 'physical_map_with_river.png');

const politicalMap = generatePoliticalMap(physmap, mapWidth, mapHeight);
const politicalCanvas = drawPoliticalMapOverPhysical(physmap, politicalMap, cellSize);
saveMapAsPNG(politicalCanvas, 'political_map_with_river.png');