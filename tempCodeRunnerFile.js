// Функция для генерации карты регионов с использованием K-средних и сглаживания границ
function generateRegionMap(politicalMap, minRegionSize) {
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

      // Случайное направление расширения
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      const nx = x + randomDirection.dx;
      const ny = y + randomDirection.dy;
      if (isValid(nx, ny) && !visited.has(`${nx},${ny}`)) {
        visited.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny });
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
  smoothRegionBorders(regionMap);

  return regionMap;
}

// Функция для сглаживания границ регионов
function smoothRegionBorders(regionMap) {
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

/// Функция для отрисовки границ регионов
function drawRegionBorders(ctx, politicalMap, regionMap, physicalMap, cellSize) {
  const width = politicalMap[0].length;
  const height = politicalMap.length;

  ctx.strokeStyle = '#000000'; // Цвет границ
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        // Проверка правой границы
        if (x + 1 < width && regionMap[y][x + 1] !== regionId) {
          const neighborType = physicalMap[y][x + 1].type;
          if (neighborType !== terrainType.SEA && neighborType !== terrainType.OCEAN && neighborType !== terrainType.RIVER) {
            ctx.beginPath();
            ctx.moveTo((x + 1) * cellSize, y * cellSize);
            ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
            ctx.stroke();
          }
        }
        // Проверка нижней границы
        if (y + 1 < height && regionMap[y + 1][x] !== regionId) {
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

// Функция для отрисовки политической карты с границами регионов
function drawPoliticalMapWithRegionBorders(physicalMap, politicalMap, regionMap, cellSize) {
  const canvas = drawPoliticalMapOverPhysical(physicalMap, politicalMap, cellSize);
  const ctx = canvas.getContext('2d');

  // Рисуем границы регионов
  drawRegionBorders(ctx, politicalMap, regionMap, physicalMap, cellSize);

  return canvas;
}

// Генерация карты регионов
const minRegionSize = 500; // Пример минимального размера региона
const regionMap = generateRegionMap(politicalMap, minRegionSize);

// Отрисовка политической карты с границами регионов
const politicalCanvasWithRegionBorders = drawPoliticalMapWithRegionBorders(physmap, politicalMap, regionMap, cellSize);

// Сохранение карты с границами регионов
saveMapAsPNG(politicalCanvasWithRegionBorders, 'political_map_with_region_borders.png');