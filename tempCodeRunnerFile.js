// Функция для смешивания цветов
function mixColors(color1, color2, ratio) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 * (1 - ratio) + r2 * ratio).toString(16).padStart(2, '0');
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio).toString(16).padStart(2, '0');
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

// Функция для отрисовки карты регионов поверх политической карты
function drawRegionMapOverPoliticalMap(physicalMap, politicalMap, regionMap, countryNames, countryCenters, cellSize) {
  const canvas = drawMap(physicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  // Отрисовка политической карты
  const politicalColors = checkAndAdjustCountryColors(politicalMap, physicalMap, cellSize);
  for (let y = 0; y < politicalMap.length; y++) {
    for (let x = 0; x < politicalMap[y].length; x++) {
      const countryId = politicalMap[y][x];
      if (countryId > 0) {
        ctx.fillStyle = politicalColors[countryId];
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

  // Отрисовка названий стран на политической карте
  drawCountryNames(ctx, politicalMap, countryNames, countryCenters, cellSize);

  // Отрисовка регионов поверх политической карты
  const regionColors = {};
  const regionColorVariations = ['#ffffff', '#cccccc', '#999999', '#666666', '#333333']; // Вариации цветов для регионов

  for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      const countryId = politicalMap[y][x];
      if (regionId > 0 && !regionColors[regionId]) {
        const countryColor = politicalColors[countryId];
        const variationIndex = regionId % regionColorVariations.length;
        const variationColor = regionColorVariations[variationIndex];
        regionColors[regionId] = mixColors(countryColor, variationColor, 0.2); // Смешиваем цвета с небольшим весом вариации
      }
      if (regionId > 0) {
        ctx.fillStyle = regionColors[regionId];
        ctx.globalAlpha = 0.5; // Устанавливаем полупрозрачность для регионов
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1; // Возвращаем прозрачность к 1
      }
    }
  }

  return canvas;
}

// Генерация карты регионов
const minRegionSize = 400; // Минимальный размер региона
const noiseSettings = {
  octaves: 100, // Количество октав
  frequency: 1, // Частота шума
  persistence: 0.7 // Персистентность
};
const regionMap = generateRegionMap(politicalMap, physmap, mapWidth, mapHeight, minRegionSize, noiseSettings);

// Отрисовка карты регионов поверх политической карты с названиями стран
const regionCanvasOverPoliticalMap = drawRegionMapOverPoliticalMap(physmap, politicalMap, regionMap, countryNames, countryCenters, cellSize);
saveMapAsPNG(regionCanvasOverPoliticalMap, 'political_map_with_regions_over_political_map_and_names.png');