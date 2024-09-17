const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const { createNoise, newFractalNoise, defaultOctaves, defaultFrequency, defaultPersistence, generateRandomSeed } = require('./mapgen');
const predefinedColors = require('./colors');

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

      if (info.type === terrainType.RIVER) {
        const width = info.width;
        if (width === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 2) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 3) {
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x + 1) * cellSize, y * cellSize, cellSize, cellSize);
        }
      } else {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas;
}

function generatePoliticalMap(physicalMap, width, height, minCountrySize) {
  const politicalMap = Array.from({ length: height }, () => Array(width).fill(0));
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  let countryId = 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function floodFill(x, y, countryId) {
    const queue = [{ x, y }];
    const terrain = physicalMap[y][x].type;

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (!isValid(x, y) || visited[y][x] || physicalMap[y][x].type !== terrain) {
        continue;
      }

      visited[y][x] = true;
      politicalMap[y][x] = countryId;

      for (const { dx, dy } of directions) {
        queue.push({ x: x + dx, y: y + dy });
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y][x] && physicalMap[y][x].type !== terrainType.OCEAN && physicalMap[y][x].type !== terrainType.SEA && physicalMap[y][x].type !== terrainType.RIVER) {
        floodFill(x, y, countryId);
        countryId++;
      }
    }
  }

  // Проверка размеров стран и их объединение при необходимости
  let countrySizes = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countrySizes[countryId]) {
          countrySizes[countryId] = 0;
        }
        countrySizes[countryId]++;
      }
    }
  }

  let countryNeighbors = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countryNeighbors[countryId]) {
          countryNeighbors[countryId] = new Set();
        }
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (isValid(nx, ny) && politicalMap[ny][nx] !== countryId && politicalMap[ny][nx] !== 0) {
            countryNeighbors[countryId].add(politicalMap[ny][nx]);
          }
        }
      }
    }
  }

  const mergeCountries = (smallCountryId, largeCountryId) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (politicalMap[y][x] === smallCountryId) {
          politicalMap[y][x] = largeCountryId;
        }
      }
    }
  };

  let countriesToMerge = [];
  do {
    countriesToMerge = [];
    for (const [countryId, size] of Object.entries(countrySizes)) {
      if (size < minCountrySize) {
        countriesToMerge.push(parseInt(countryId));
      }
    }

    for (const smallCountryId of countriesToMerge) {
      if (countryNeighbors[smallCountryId] && countryNeighbors[smallCountryId].size > 0) {
        const largeCountryId = Array.from(countryNeighbors[smallCountryId])[0];
        mergeCountries(smallCountryId, largeCountryId);
      } else {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (politicalMap[y][x] === smallCountryId) {
              politicalMap[y][x] = 0;
            }
          }
        }
      }
    }

    // Пересчет размеров стран после объединения
    countrySizes = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const countryId = politicalMap[y][x];
        if (countryId > 0) {
          if (!countrySizes[countryId]) {
            countrySizes[countryId] = 0;
          }
          countrySizes[countryId]++;
        }
      }
    }

    // Пересчет соседей стран после объединения
    countryNeighbors = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const countryId = politicalMap[y][x];
        if (countryId > 0) {
          if (!countryNeighbors[countryId]) {
            countryNeighbors[countryId] = new Set();
          }
          for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && politicalMap[ny][nx] !== countryId && politicalMap[ny][nx] !== 0) {
              countryNeighbors[countryId].add(politicalMap[ny][nx]);
            }
          }
        }
      }
    }
  } while (countriesToMerge.length > 0);

  // Проверка на наличие незанятых клеток и присоединение их к ближайшим странам
  const checkRadius = 100;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (politicalMap[y][x] === 0 && physicalMap[y][x].type !== terrainType.OCEAN && physicalMap[y][x].type !== terrainType.SEA && physicalMap[y][x].type !== terrainType.RIVER) {
        let nearestCountryId = null;
        let nearestDistance = Infinity;

        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (isValid(nx, ny) && politicalMap[ny][nx] > 0) {
              const distance = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCountryId = politicalMap[ny][nx];
              }
            }
          }
        }

        if (nearestCountryId !== null) {
          politicalMap[y][x] = nearestCountryId;
        }
      }
    }
  }

  return politicalMap;
}

function drawSolidBorders(ctx, politicalMap, physicalMap, cellSize) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        // Проверка правой границы
        if (x + 1 < width && politicalMap[y][x + 1] !== countryId) {
          const neighborType = physicalMap[y][x + 1].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * cellSize, y * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && politicalMap[y + 1][x] !== countryId) {
          const neighborType = physicalMap[y + 1][x].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, (y + 1) * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
      }
    }
  }
}

// Функция для отрисовки политической карты поверх физической
function drawPoliticalMapOverPhysical(physicalMap, politicalMap, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

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

  // Рисуем сплошные границы
  drawSolidBorders(ctx, politicalMap, physicalMap, cellSize);

  // Отрисовка рек на политической карте
  for (let y = 0; y < physicalMap.length; y++) {
    for (let x = 0; x < physicalMap[y].length; x++) {
      const info = physicalMap[y][x];
      if (info.type === terrainType.RIVER) {
        ctx.fillStyle = info.color;
        const width = info.width;
        if (width === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 2) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
        } else if (width === 3) {
          ctx.fillRect((x - 1) * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.fillRect((x + 1) * cellSize, y * cellSize, cellSize, cellSize);
        }
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

function generateRivers(map, heightMap, averageRiverLength) {
  const width = map[0].length;
  const height = map.length;
  const riverSources = [];
  const directions = [
    { dx: 0, dy: 1 },  // вниз
    { dx: 0, dy: -1 }, // вверх
    { dx: -1, dy: 0 }, // влево
    { dx: 1, dy: 0 },  // вправо
    { dx: 1, dy: 1 },  // вправо-вниз
    { dx: -1, dy: -1 },// влево-вверх
    { dx: -1, dy: 1 }, // влево-вниз
    { dx: 1, dy: -1 }  // вправо-вверх
  ];

  // Массив для определения противоположных направлений
  const oppositeDirections = {
    '0,1': '0,-1',
    '0,-1': '0,1',
    '-1,0': '1,0',
    '1,0': '-1,0',
    '1,1': '-1,-1',
    '-1,-1': '1,1',
    '-1,1': '1,-1',
    '1,-1': '-1,1'
  };

  // Определение истоков рек
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((map[y][x].type === terrainType.MOUNTAIN || map[y][x].type === terrainType.MOUNTAIN_ORE || map[y][x].type === terrainType.WET_GRASS || map[y][x].type === terrainType.DRY_GRASS || map[y][x].type === terrainType.GRASS) && Math.random() < 0.000085) {
        riverSources.push({ x, y });
      }
    }
  }

  // Расчет вероятности завершения реки
  const riverTerminationProbability = 0.01 / averageRiverLength;

  // Построение рек
  riverSources.forEach(source => {
    let current = source;
    let riverDirection = directions[Math.floor(Math.random() * directions.length)];
    const visited = new Set();
    visited.add(`${current.x},${current.y}`);
    let riverLength = 0; // Начальная длина реки
    let previousDirection = null; // Предыдущее направление

    while (current) {
      map[current.y][current.x].type = terrainType.RIVER;
      map[current.y][current.x].color = '#0952c6'; // Синий цвет для реки
      map[current.y][current.x].width = Math.min(3, Math.floor(riverLength / 120) + 1); // Увеличиваем ширину реки с её длиной

      riverLength++; // Увеличиваем длину реки

      // Найти следующую клетку с наименьшей высотой
      let next = null;
      let minHeight = heightMap[current.y][current.x];
      const possibleDirections = [
        riverDirection,
        { dx: riverDirection.dx + 1, dy: riverDirection.dy },
        { dx: riverDirection.dx - 1, dy: riverDirection.dy },
        { dx: riverDirection.dx, dy: riverDirection.dy + 1 },
        { dx: riverDirection.dx, dy: riverDirection.dy - 1 }
      ].filter(dir => dir.dx >= -1 && dir.dx <= 1 && dir.dy >= -1 && dir.dy <= 1 && `${dir.dx},${dir.dy}` !== oppositeDirections[`${riverDirection.dx},${riverDirection.dy}`] && `${dir.dx},${dir.dy}` !== previousDirection);

      // Перемешиваем направления для разнообразия
      possibleDirections.sort(() => Math.random() - 0.65);

      for (const dir of possibleDirections) {
        const ny = current.y + dir.dy;
        const nx = current.x + dir.dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited.has(`${nx},${ny}`)) {
          if (heightMap[ny][nx] < minHeight) {
            minHeight = heightMap[ny][nx];
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`; // Сохраняем предыдущее направление
            riverDirection = dir; // Обновляем основное направление реки
          } else if (heightMap[ny][nx] === minHeight && Math.random() < 0.005) {
            next = { x: nx, y: ny };
            previousDirection = `${riverDirection.dx},${riverDirection.dy}`; // Сохраняем предыдущее направление
            riverDirection = dir; // Обновляем основное направление реки
          } else {
            next = { x: nx, y: ny };
          }
        }
      }

      // Если следующая клетка — море или океан, завершить реку
      if (next && (map[next.y][next.x].type === terrainType.OCEAN || map[next.y][next.x].type === terrainType.SEA || map[next.y][next.x].type === terrainType.RIVER)) {
        map[next.y][next.x].type = terrainType.RIVER;
        map[next.y][next.x].color = '#0952c6';
        map[next.y][next.x].width = Math.min(3, Math.floor(riverLength / 120) + 1); // Увеличиваем ширину реки с её длиной
        break;
      }

      // Проверка вероятности завершения реки
      if (Math.random() < riverTerminationProbability) {
        break;
      }

      if (next) {
        visited.add(`${next.x},${next.y}`);
      }
      current = next;
    }
  });
}

// Генерация физической карты и рек
const physmap = generateMap(mapWidth, mapHeight, getTerrainNoise, getVariantNoise, getBiomeNoise);
generateRivers(physmap, physmap.map(row => row.map(cell => cell.type === terrainType.MOUNTAIN ? 1 : 0)), 250); // Средняя длина реки
const physcanvas = drawMap(physmap, cellSize);
saveMapAsPNG(physcanvas, 'physical_map_with_river.png');

// Функция для генерации случайных названий стран
function generateCountryNames(politicalMap) {
  const countryNames = {};
  const nameParts = [
    ['Ael', 'Ber', 'Cor', 'Dor', 'Eri', 'Fel', 'Gil', 'Hel', 'Ili', 'Jor', 'Kal', 'Lor', 'Mer', 'Nor', 'Oli', 'Pel', 'Qui', 'Ral', 'Sel', 'Tel', 'Uli', 'Ver', 'Wel', 'Xel', 'Yel', 'Zel'],
    ['an', 'ar', 'en', 'er', 'in', 'ir', 'on', 'or', 'un', 'ur', 'as', 'es', 'is', 'os', 'us', 'ys', 'ax', 'ex', 'ix', 'ox', 'ux', 'ay', 'ey', 'iy', 'oy', 'uy'],
    ['d', 'f', 'g', 'l', 'm', 'n', 'r', 's', 't', 'v', 'x', 'z', 'ch', 'sh', 'th', 'ph', 'rh', 'kh', 'gh', 'dh'],
    ['a', 'e', 'i', 'o', 'u', 'ae', 'ai', 'ao', 'au', 'ea', 'ei', 'eo', 'eu', 'ia', 'ie', 'io', 'iu', 'oa', 'oe', 'oi', 'ou', 'ua', 'ue', 'ui', 'uo', 'uu']
  ];

  const uniqueCountryIds = new Set();

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        uniqueCountryIds.add(countryId);
      }
    }
  }

  uniqueCountryIds.forEach(countryId => {
    let name = '';
    const nameLength = Math.floor(Math.random() * 3) + 2; // Длина имени от 2 до 4 слогов
    for (let i = 0; i < nameLength; i++) {
      name += nameParts[i % nameParts.length][Math.floor(Math.random() * nameParts[i % nameParts.length].length)];
    }
    countryNames[countryId] = name.charAt(0).toUpperCase() + name.slice(1);
  });

  return countryNames;
}

// Функция для вычисления центра страны
function calculateCountryCenters(politicalMap) {
  const countryCenters = {};
  const countrySizes = {};

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        if (!countryCenters[countryId]) {
          countryCenters[countryId] = { sumX: 0, sumY: 0, count: 0 };
        }
        countryCenters[countryId].sumX += x;
        countryCenters[countryId].sumY += y;
        countryCenters[countryId].count++;

        if (!countrySizes[countryId]) {
          countrySizes[countryId] = 0;
        }
        countrySizes[countryId]++;
      }
    }
  }

  for (const countryId in countryCenters) {
    const center = countryCenters[countryId];
    countryCenters[countryId] = {
      x: Math.round(center.sumX / center.count),
      y: Math.round(center.sumY / center.count),
      size: countrySizes[countryId]
    };
  }

  return countryCenters;
}

registerFont('fonts/Cinzel-Bold.ttf', { family: 'Cinzel' })

// Функция для отрисовки названий стран
function drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize) {
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  const possiblePositions = [
    { dx: 0, dy: 0 }, // Центр
    { dx: 0, dy: -1 }, // Вверх
    { dx: 0, dy: 1 }, // Вниз
    { dx: -1, dy: 0 }, // Влево
    { dx: 1, dy: 0 }, // Вправо
    { dx: -1, dy: -1 }, // Влево-вверх
    { dx: 1, dy: -1 }, // Вправо-вверх
    { dx: -1, dy: 1 }, // Влево-вниз
    { dx: 1, dy: 1 } // Вправо-вниз
  ];

  const possibleRotations = [0]; // Дефолтное положение по горизонтали
  for (let i = Math.PI / 16; i <= Math.PI / 4; i += Math.PI / 16) {
    possibleRotations.push(i); // По часовой стрелке
  }
  for (let i = -Math.PI / 16; i >= -Math.PI / 4; i -= Math.PI / 16) {
    possibleRotations.push(i); // Против часовой стрелки
  }

  for (const countryId in countryCenters) {
    const center = countryCenters[countryId];
    const name = countryNames[countryId];
    const fontSize = Math.max(20, Math.min(128, Math.sqrt(center.size) * 1)); // Увеличенный размер шрифта

    // Вычисляем ширину и высоту названия в пикселях
    ctx.font = `${fontSize}px Cinzel`;
    const textMetrics = ctx.measureText(name);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    let bestPosition = null;
    let bestRotation = 0;
    let minOverlap = Infinity;

    for (const pos of possiblePositions) {
      for (const rotation of possibleRotations) {
        const textX = (center.x + pos.dx + 0.5) * cellSize;
        const textY = (center.y + pos.dy + 0.5) * cellSize + fontSize / 2;

        // Проверка на перекрытие с другими странами и границами
        let overlap = 0;
        for (let dy = -textHeight / 2; dy <= textHeight / 2; dy += 2) {
          for (let dx = -textWidth / 2; dx <= textWidth / 2; dx += 2) {
            const px = textX + dx * Math.cos(rotation) - dy * Math.sin(rotation);
            const py = textY + dx * Math.sin(rotation) + dy * Math.cos(rotation);
            const mapX = Math.floor(px / cellSize);
            const mapY = Math.floor(py / cellSize);

            if (mapX >= 0 && mapX < politicalMap[0].length && mapY >= 0 && mapY < politicalMap.length) {
              if (politicalMap[mapY][mapX] !== parseInt(countryId)) {
                overlap++;
              }
            }
          }
        }

        if (overlap < minOverlap) {
          minOverlap = overlap;
          bestPosition = { x: textX, y: textY };
          bestRotation = rotation;
        }
      }
    }

    // Отрисовка названия в лучшей позиции с тенью и вращением
    if (bestPosition) {
      ctx.save(); // Сохраняем текущее состояние контекста
      ctx.translate(bestPosition.x, bestPosition.y); // Перемещаем начало координат
      ctx.rotate(bestRotation); // Вращаем контекст

      // Настройка тени
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Рисуем текст
      ctx.fillStyle = '#000000'; // Цвет текста
      ctx.fillText(name, 0, 0);

      // Восстанавливаем состояние контекста
      ctx.restore();
    }
  }
}

// Генерация политической карты
const minCountrySize = 1000; // Пример минимального размера страны
const politicalMap = generatePoliticalMap(physmap, mapWidth, mapHeight, minCountrySize);

// Проверка и корректировка идентификаторов стран
const uniqueCountryIds = new Set();
for (let y = 0; y < politicalMap.length; y++) {
  for (let x = 0; x < politicalMap[y].length; x++) {
    const countryId = politicalMap[y][x];
    if (countryId > 0) {
      uniqueCountryIds.add(countryId);
    }
  }
}

// Генерация названий стран
const countryNames = generateCountryNames(politicalMap);

// Вычисление центров стран
const countryCenters = calculateCountryCenters(politicalMap);

// Отрисовка политической карты с названиями стран
const politicalCanvas = drawPoliticalMapOverPhysical(physmap, politicalMap, cellSize);
const ctx = politicalCanvas.getContext('2d');
drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize);

// Сохранение карты с названиями стран
saveMapAsPNG(politicalCanvas, 'political_map_with_names.png');

// Функция для генерации карты регионов с использованием K-средних и сглаживания границ
function generateRegionMap(politicalMap, minRegionSize, minBorderLength) {
  const regionMap = Array.from({ length: politicalMap.length }, () => Array(politicalMap[0].length).fill(0));
  let regionId = 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < politicalMap[0].length && y >= 0 && y < politicalMap.length;
  }

  function kMeansClusteringWithRandomDirection(points, k) {
    const centroids = points.slice(0, k).map(p => ({ x: p.x, y: p.y }));
    let clusters = Array(k).fill().map(() => []);

    function assignPointsToClusters() {
      clusters = Array(k).fill().map(() => []);
      for (const point of points) {
        let minDistance = Infinity;
        let closestCentroidIndex = 0;
        for (let i = 0; i < centroids.length; i++) {
          const distance = Math.sqrt((point.x - centroids[i].x) ** 2 + (point.y - centroids[i].y) ** 2);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroidIndex = i;
          }
        }
        clusters[closestCentroidIndex].push(point);
      }
    }

    function updateCentroids() {
      for (let i = 0; i < centroids.length; i++) {
        const cluster = clusters[i];
        if (cluster.length === 0) continue;
        const sumX = cluster.reduce((sum, p) => sum + p.x, 0);
        const sumY = cluster.reduce((sum, p) => sum + p.y, 0);
        centroids[i].x = sumX / cluster.length;
        centroids[i].y = sumY / cluster.length;
      }
    }

    for (let i = 0; i < 10; i++) {
      assignPointsToClusters();
      updateCentroids();
    }

    return clusters;
  }

  function expandRegionWithRandomDirection(x, y, countryId, regionId) {
    const queue = [{ x, y }];
    const visited = new Set();
    visited.add(`${x},${y}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift();

      if (!isValid(x, y) || politicalMap[y][x] !== countryId || regionMap[y][x] !== 0) {
        continue;
      }

      regionMap[y][x] = regionId;

      // Случайное направление расширения с отклонением
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      const deviation = Math.random() * 0.5 - 0.25; // Случайное отклонение от основного направления
      const nx = x + randomDirection.dx + deviation;
      const ny = y + randomDirection.dy + deviation;
      if (isValid(Math.round(nx), Math.round(ny)) && !visited.has(`${Math.round(nx)},${Math.round(ny)}`)) {
        visited.add(`${Math.round(nx)},${Math.round(ny)}`);
        queue.push({ x: Math.round(nx), y: Math.round(ny) });
      }
    }
  }

  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0 && regionMap[y][x] === 0) {
        // Находим все точки внутри страны
        const countryPoints = [];
        for (let cy = 0; cy < politicalMap.length; cy++) {
          for (let cx = 0; cx < politicalMap[cy].length; cx++) {
            if (politicalMap[cy][cx] === countryId) {
              countryPoints.push({ x: cx, y: cy });
            }
          }
        }

        // Определяем количество регионов
        const k = Math.max(2, Math.floor(Math.sqrt(countryPoints.length / minRegionSize)));

        // Применяем K-средних для разделения страны на регионы
        const clusters = kMeansClusteringWithRandomDirection(countryPoints, k);

        // Заполняем карту регионов
        for (let i = 0; i < clusters.length; i++) {
          const cluster = clusters[i];
          for (const point of cluster) {
            expandRegionWithRandomDirection(point.x, point.y, countryId, regionId);
          }
          regionId++;
        }
      }
    }
  }

  // Сглаживание границ регионов
  smoothRegionBorders(regionMap, minBorderLength);

  return regionMap;
}

// Функция для сглаживания границ регионов с учетом минимальной длины границы
function smoothRegionBorders(regionMap, minBorderLength) {
  const width = regionMap[0].length;
  const height = regionMap.length;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  // Проверка и объединение регионов с короткими границами
  function mergeRegionsWithShortBorders(regionMap, minBorderLength) {
    let regionBorders = {};
    let regionSizes = {};

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const regionId = regionMap[y][x];
        if (regionId > 0) {
          for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && regionMap[ny][nx] !== regionId) {
              const neighborId = regionMap[ny][nx];
              if (!regionBorders[regionId]) {
                regionBorders[regionId] = new Set();
              }
              regionBorders[regionId].add(neighborId);
            }
          }
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const regionId = regionMap[y][x];
        if (regionId > 0) {
          if (!regionSizes[regionId]) {
            regionSizes[regionId] = 0;
          }
          regionSizes[regionId]++;
        }
      }
    }

    const mergeRegions = (smallRegionId, largeRegionId) => {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (regionMap[y][x] === smallRegionId) {
            regionMap[y][x] = largeRegionId;
          }
        }
      }
    };

    let regionsToMerge = [];
    do {
      regionsToMerge = [];
      for (const [regionId, neighbors] of Object.entries(regionBorders)) {
        if (neighbors.size > 0) {
          const borderLength = Array.from(neighbors).reduce((sum, neighborId) => sum + regionSizes[neighborId], 0);
          if (borderLength < minBorderLength) {
            regionsToMerge.push(parseInt(regionId));
          }
        }
      }

      for (const smallRegionId of regionsToMerge) {
        if (regionBorders[smallRegionId] && regionBorders[smallRegionId].size > 0) {
          const largeRegionId = Array.from(regionBorders[smallRegionId])[0];
          mergeRegions(smallRegionId, largeRegionId);
        }
      }

      // Пересчет размеров регионов после объединения
      regionSizes = {};
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const regionId = regionMap[y][x];
          if (regionId > 0) {
            if (!regionSizes[regionId]) {
              regionSizes[regionId] = 0;
            }
            regionSizes[regionId]++;
          }
        }
      }

      // Пересчет соседей регионов после объединения
      regionBorders = {};
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const regionId = regionMap[y][x];
          if (regionId > 0) {
            if (!regionBorders[regionId]) {
              regionBorders[regionId] = new Set();
            }
            for (const { dx, dy } of directions) {
              const nx = x + dx;
              const ny = y + dy;
              if (isValid(nx, ny) && regionMap[ny][nx] !== regionId) {
                regionBorders[regionId].add(regionMap[ny][nx]);
              }
            }
          }
        }
      }
    } while (regionsToMerge.length > 0);
  }

  mergeRegionsWithShortBorders(regionMap, minBorderLength);

  // Сглаживание границ регионов
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        const neighborRegions = new Set();
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (isValid(nx, ny)) {
            neighborRegions.add(regionMap[ny][nx]);
          }
        }

        // Если у клетки более одного соседа из другого региона, сглаживаем границу
        if (neighborRegions.size > 1) {
          const neighborCounts = Array.from(neighborRegions).map(id => ({ id, count: 0 }));
          for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny)) {
              const neighborId = regionMap[ny][nx];
              const neighbor = neighborCounts.find(n => n.id === neighborId);
              if (neighbor) {
                neighbor.count++;
              }
            }
          }

          // Находим регион с наибольшим количеством соседей
          neighborCounts.sort((a, b) => b.count - a.count);
          const dominantRegionId = neighborCounts[0].id;

          // Сглаживаем границу, присваивая клетку доминирующему региону
          regionMap[y][x] = dominantRegionId;
        }
      }
    }
  }
}

// Функция для отрисовки границ регионов
function drawRegionBorders(ctx, politicalMap, regionMap, physicalMap, cellSize, minBorderLength) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 1;

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }
  ];

  function isValid(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  // Проверка длины границы
  function checkBorderLength(x, y, regionId) {
    let borderLength = 0;
    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (isValid(nx, ny) && regionMap[ny][nx] !== regionId) {
        borderLength++;
      }
    }
    return borderLength;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        // Проверка правой границы
        if (x + 1 < width && regionMap[y][x + 1] !== regionId) {
          const neighborType = physicalMap[y][x + 1].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            const borderLength = checkBorderLength(x, y, regionId);
            if (borderLength >= minBorderLength) {
              ctx.beginPath();
              ctx.moveTo((x + 1) * cellSize, y * cellSize);
              ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
              ctx.stroke();
            }
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && regionMap[y + 1][x] !== regionId) {
          const neighborType = physicalMap[y + 1][x].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            const borderLength = checkBorderLength(x, y, regionId);
            if (borderLength >= minBorderLength) {
              ctx.beginPath();
              ctx.moveTo(x * cellSize, (y + 1) * cellSize);
              ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
              ctx.stroke();
            }
          }
        }
      }
    }
  }
}

// Функция для отрисовки политической карты с границами регионов
function drawPoliticalMapWithRegionBorders(physicalMap, politicalMap, regionMap, cellSize, minBorderLength) {
  const canvas = drawPoliticalMapOverPhysical(physicalMap, politicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  // Рисуем границы регионов
  drawRegionBorders(ctx, politicalMap, regionMap, physicalMap, cellSize, minBorderLength);

  return canvas;
}

// Генерация карты регионов
const minRegionSize = 500; // Пример минимального размера региона
const minBorderLength = 10; // Минимальная длина границы региона
const regionMap = generateRegionMap(politicalMap, minRegionSize, minBorderLength);

// Отрисовка политической карты с границами регионов
const politicalCanvasWithRegionBorders = drawPoliticalMapWithRegionBorders(physmap, politicalMap, regionMap, cellSize, minBorderLength);

// Сохранение карты с границами регионов
saveMapAsPNG(politicalCanvasWithRegionBorders, 'political_map_with_region_borders.png');