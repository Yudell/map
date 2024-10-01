//const { createCanvas } = require('canvas');

// Функция для генерации политической карты
function generatePoliticalMap(physicalMap, width, height) {
    const politicalMap = Array.from({ length: height }, () => Array(width).fill(0));
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const queue = [];
  
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
  
    let countryId = 0;
  
    // Функция для обхода и маркировки территории
    function bfs(x, y, id) {
      queue.push([x, y]);
      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        if (!visited[cy][cx]) {
          visited[cy][cx] = true;
          politicalMap[cy][cx] = id;
          for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && physicalMap[ny][nx].type !== 'OCEAN' && physicalMap[ny][nx].type !== 'SEA' && physicalMap[ny][nx].type !== 'RIVER' && !visited[ny][nx]) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
  
    // Находим все территории
    const territories = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (physicalMap[y][x].type !== 'OCEAN' && physicalMap[y][x].type !== 'SEA' && physicalMap[y][x].type !== 'RIVER' && !visited[y][x]) {
          countryId++;
          const territory = { id: countryId, tiles: [] };
          bfs(x, y, countryId);
          for (let ny = 0; ny < height; ny++) {
            for (let nx = 0; nx < width; nx++) {
              if (politicalMap[ny][nx] === countryId) {
                territory.tiles.push([nx, ny]);
              }
            }
          }
          territories.push(territory);
        }
      }
    }
  
    // Разделяем территории на страны с использованием алгоритма водораздела с добавлением случайности
    function watershed(territory) {
      const markers = [];
      const distances = Array.from({ length: height }, () => Array(width).fill(Infinity));
      const queue = [];
  
      // Создаем маркеры
      for (let i = 0; i < 5; i++) {
        const [x, y] = territory.tiles[Math.floor(Math.random() * territory.tiles.length)];
        markers.push({ id: countryId + i + 1, x, y });
        distances[y][x] = 0;
        queue.push([x, y]);
      }
  
      // Распространяем маркеры с добавлением случайности и изменениями направления
      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const shuffledDirections = directions.sort(() => 0.5 - Math.random()); // Перемешиваем направления
        for (const [dx, dy] of shuffledDirections) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && politicalMap[ny][nx] === territory.id) {
            let minDist = Infinity;
            let closestMarker = null;
            for (const marker of markers) {
              const dist = Math.sqrt((nx - marker.x) ** 2 + (ny - marker.y) ** 2) + Math.random() * 5; // Добавляем случайный фактор
              if (dist < minDist) {
                minDist = dist;
                closestMarker = marker;
              }
            }
            if (minDist < distances[ny][nx]) {
              distances[ny][nx] = minDist;
              politicalMap[ny][nx] = closestMarker.id;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
  
    // Разделяем территории на страны
    for (const territory of territories) {
      if (territory.tiles.length > 150) { // Минимальный размер для разделения
        watershed(territory);
      }
    }
  
  return politicalMap;
}

module.exports = {
  generatePoliticalMap
};