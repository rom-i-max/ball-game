/**
 * Модульный генератор мира «чанками».
 * Чанк — ширина 600–900 px. Каждый чанк имеет случайный пресет.
 *
 * Спавн платформ учитывает физику игрока:
 *  - горизонтальный зазор между платформами: minGapX..maxGapX
 *  - высота над землёй: minGapY..maxGapY
 *  - размеры: minWidth..maxWidth
 */
class ChunkGenerator {
    /**
     * @param {TerrainGenerator} terrain
     */
    constructor(terrain) {
        const cfg = (window.CONFIG && window.CONFIG.world) || {};
        this.terrain = terrain;
        this.nextChunkX = cfg.startZoneWidth ?? 900; // стартовая зона пустая

        this.platforms = [];
        this.loots = [];
        this.enemies = [];

        this.minChunkWidth = cfg.minChunkWidth ?? 600;
        this.maxChunkWidth = cfg.maxChunkWidth ?? 900;
    }

    /**
     * Спавнит чанки, пока самый дальний не выйдет за правую границу экрана.
     * @param {number} cameraX
     * @param {number} screenWidth
     */
    ensureChunks(cameraX, screenWidth) {
        while (this.nextChunkX < cameraX + screenWidth + 400) {
            this._spawnChunk();
        }
    }

    /** Генерация одного случайного чанка */
    _spawnChunk() {
        const width = this.minChunkWidth + Math.random() * (this.maxChunkWidth - this.minChunkWidth);
        const startX = this.nextChunkX;
        const endX = startX + width;

        // Пресет: 0 — платформы, 1 — лут, 2 — враги, 3 — комбо
        const preset = Math.floor(Math.random() * 4);

        switch (preset) {
            case 0:
                this._spawnPlatforms(startX, endX);
                break;
            case 1:
                this._spawnLootCluster(startX, endX);
                break;
            case 2:
                this._spawnEnemies(startX, endX);
                break;
            case 3:
                this._spawnPlatforms(startX, endX);
                this._spawnEnemies(startX, endX);
                this._spawnLootCluster(startX, endX);
                break;
        }

        this.nextChunkX = endX;
    }

    /** Случайная точка по X внутри чанка (с отступом от краёв) */
    _randX(startX, endX) {
        return startX + 60 + Math.random() * (endX - startX - 120);
    }

    /**
     * Пресет: парящие платформы над холмами.
     * Соблюдает горизонтальный зазор между платформами (minGapX..maxGapX)
     * и вертикальный диапазон над землёй (minGapY..maxGapY).
     */
    _spawnPlatforms(startX, endX) {
        const p = (window.CONFIG && window.CONFIG.platforms) || {};
        const minW = p.minWidth ?? 100;
        const maxW = p.maxWidth ?? 180;
        const h    = p.width ?? 22;
        const minGY = p.minGapY ?? 90;
        const maxGY = p.maxGapY ?? 200;
        const minGX = p.minGapX ?? 120;
        const maxGX = p.maxGapX ?? 320;
        const lootChance = p.lootSpawnChance ?? 0.6;
        const lootOff = p.lootOffsetAbove ?? 30;

        // Внутри чанка делаем 1–2 платформы
        const count = 1 + Math.floor(Math.random() * 2);
        let lastRight = startX - maxGX; // чтобы первая платформа не липла к левому краю

        for (let i = 0; i < count; i++) {
            // Горизонтальная позиция: не ближе minGX к предыдущей,
            // и не вылезает за правый край чанка.
            const minX = lastRight + minGX;
            const maxX = endX - maxW;
            if (minX > maxX) break;

            // Хотим, чтобы разброс был в диапазоне minGX..maxGX,
            // но не выходил за пределы чанка.
            const span = Math.min(maxGX, maxX - minX);
            const x = minX + Math.random() * Math.max(0, span);

            const w = minW + Math.random() * (maxW - minW);

            // Высота над землёй — в заданном диапазоне.
            const groundY = this.terrain.getHeightAt(x + w / 2);
            const gapY = minGY + Math.random() * (maxGY - minGY);
            const y = groundY - gapY;

            this.platforms.push(new Platform(x, y, w, h));
            lastRight = x + w;

            if (Math.random() < lootChance) {
                this.loots.push(new Loot(x + w / 2, y - lootOff));
            }
        }
    }

    /** Пресет: кластер лута на вершинах холмов */
    _spawnLootCluster(startX, endX) {
        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const x = this._randX(startX, endX);
            const groundY = this.terrain.getHeightAt(x);
            this.loots.push(new Loot(x, groundY - 40));
        }
    }

    /** Пресет: враги, патрулирующие землю */
    _spawnEnemies(startX, endX) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const x = this._randX(startX, endX);
            const range = 80 + Math.random() * 100;
            this.enemies.push(new Enemy(x, range, this.terrain));
        }
    }

    /**
     * Удаляет сущности, оставшиеся далеко позади камеры.
     * @param {number} cameraX
     */
    cleanup(cameraX) {
        const threshold = cameraX - 300;
        this.platforms = this.platforms.filter((p) => p.x + p.width > threshold);
        this.loots = this.loots.filter((l) => !l.collected && l.x + l.width > threshold);
        this.enemies = this.enemies.filter((e) => e.alive && e.x + e.width > threshold);
    }
}