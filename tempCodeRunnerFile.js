for (let y = 0; y < regionMap.length; y++) {
    for (let x = 0; x < regionMap[y].length; x++) {
      const regionId = regionMap[y][x];
      if (regionId > 0) {
        ctx.fillStyle = regionColors[regionId];
        ctx.globalAlpha = 0.8; // Устанавливаем полупрозрачность для регионов
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1; // Возвращаем прозрачность к 1
      }
    }
  }