// Функция для генерации регионов внутри страны
function generateRegionsForCountry(countryId, politicalMap, minRegions, maxRegions) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;
  const regions = {};
  const regionColors = {};
  let regionId = 1;

  // Создаем случайное количество регионов для страны
  const numRegions = Math.floor(Math.random() * (maxRegions - minRegions + 1)) + minRegions;

  // Создаем массив для хранения клеток страны
  const countryCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (politicalMap[y][x] === countryId) {
        countryCells.push({ x, y });
      }
    }
  }

  // Перемешиваем клетки страны
  for (let i = countryCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [countryCells[i], countryCells[j]] = [countryCells[j], countryCells[i]];
  }

  // Распределяем клетки по регионам
  const cellsPerRegion = Math.floor(countryCells.length / numRegions);
  for (let i = 0; i < numRegions; i++) {
    const regionCells = countryCells.splice(0, cellsPerRegion);
    regions[regionId] = regionCells;
    regionColors[regionId] = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
    regionId++;
  }

  // Распределяем оставшиеся клетки по регионам
  while (countryCells.length > 0) {
    const cell = countryCells.pop();
    const randomRegionId = Math.floor(Math.random() * numRegions) + 1;
    regions[randomRegionId].push(cell);
  }

  return { regions, regionColors };
}

// Функция для генерации карты регионов
function generateRegionMap(politicalMap, minRegions, maxRegions) {
  const regionMap = Array.from({ length: politicalMap.length }, () => Array(politicalMap[0].length).fill(0));
  const regionColors = {};

  for (const countryId in countryCenters) {
    const { regions, regionColors: countryRegionColors } = generateRegionsForCountry(parseInt(countryId), politicalMap, minRegions, maxRegions);
    for (const regionId in regions) {
      const cells = regions[regionId];
      for (const { x, y } of cells) {
        regionMap[y][x] = parseInt(regionId);
      }
      regionColors[regionId] = countryRegionColors[regionId];
    }
  }

  return { regionMap, regionColors };
}

// Функция для отрисовки карты регионов
function drawRegionMap(physicalMap, regionMap, regionColors, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        ctx.fillStyle = regionColors[regionId];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Рисуем сплошные границы
  drawSolidBorders(ctx, regionMap, physicalMap, cellSize);

  // Отрисовка рек на карте регионов
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

// Генерация карты регионов
const minRegions = 2; // Минимальное количество регионов в стране
const maxRegions = 5; // Максимальное количество регионов в стране
const { regionMap, regionColors } = generateRegionMap(politicalMap, minRegions, maxRegions);

// Отрисовка карты регионов
const regionCanvas = drawRegionMap(physmap, regionMap, regionColors, cellSize);

// Сохранение карты регионов
saveMapAsPNG(regionCanvas, 'region_map.png');