/**
 * Главный класс игры: держит состояние, обновляет и рисует мир.
 * С конечным уровнем из JSON.
 */
class Game {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Input} input
     */
    constructor(canvas, input) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = input;
        this.width = canvas.width;
        this.height = canvas.height;

        this._init();
    }

    /** Инициализация состояния (используется и для рестарта) */
    async _init() {
        this.isLoading = true; // Блокируем update до завершения загрузки
        
        const w = (window.CONFIG && window.CONFIG.world) || {};
        const pl = (window.CONFIG && window.CONFIG.player) || {};
        const cam = (window.CONFIG && window.CONFIG.camera) || {};

        // Создаем terrain с учетом конфига
        this.terrain = new TerrainGenerator(w.terrainBaseLevel ?? 480, this.width);
        this.clouds = new CloudGenerator(this.width, 12);
        
        // Загружаем уровень из JSON или используем чанк-генератор как fallback
        this.levelData = null;
        this.chunkGen = null;
        this.platforms = [];
        this.loots = [];
        this.enemies = [];
        this.interactables = [];
        
        await this._loadLevel();
        
        if (!this.levelData) {
            // Fallback на чанк-генератор
            this.chunkGen = new ChunkGenerator(this.terrain);
        }

        const startY = this.terrain.getHeightAt(300) - 40;
        this.player = new Player(300, startY);
        this.camera = new Camera(this.width, cam.playerOffsetX ?? 300);
        this.camera.lerp = cam.lerp ?? 0.1;
        this.camera.snapTo(this.player);

        this.score = 0;
        this.kills = 0;
        this.lives = pl.startLives ?? 3;

        this.gameOver = false;
        this.prevCameraX = this.camera.x;
        this.levelFinished = false;

        this._updateHUD();
        this._hideOverlay();
        
        this.isLoading = false; // Разрешаем update
    }

    /**
     * Загрузка уровня из JSON
     * @returns {Promise<void>}
     */
    async _loadLevel() {
        try {
            const response = await fetch('level.json');
            if (!response.ok) {
                console.info('[Game] level.json не найден, используем процедурную генерацию');
                return;
            }
            this.levelData = await response.json();
            console.info('[Game] уровень загружен из level.json');
            
            // Инициализируем массивы объектов уровня
            this.platforms = [];
            this.loots = [];
            this.enemies = [];
            this.interactables = [];
            
            // Парсим объекты из JSON
            if (this.levelData.platforms) {
                for (const p of this.levelData.platforms) {
                    this.platforms.push(new Platform(p.x, p.y, p.width, p.height));
                }
            }
            if (this.levelData.loots) {
                for (const l of this.levelData.loots) {
                    this.loots.push(new Loot(l.x, l.y, l.value));
                }
            }
            if (this.levelData.enemies) {
                for (const e of this.levelData.enemies) {
                    // Вычисляем Y для врага на основе terrain или платформы
                    let enemyY = this.terrain.getHeightAt(e.x) - 24;
                    // Проверяем, есть ли платформа под врагом
                    for (const p of this.platforms) {
                        if (e.x >= p.x && e.x <= p.x + p.width && 
                            p.y < enemyY + 24 && p.y > enemyY - 50) {
                            enemyY = p.y - 24;
                            break;
                        }
                    }
                    this.enemies.push(new Enemy(e.x, enemyY, e.patrolRange || 90, this.terrain, this.platforms));
                }
            }
            if (this.levelData.interactables) {
                for (const i of this.levelData.interactables) {
                    this.interactables.push(new Interactable(i.x, i.y, i.type, i.properties));
                }
            }
        } catch (err) {
            console.warn('[Game] ошибка загрузки level.json:', err.message);
        }
    }

    /** Полный сброс (R) */
    async restart() {
        await this._init();
    }

    /**
     * Обновление логики кадра.
     * @param {number} dt
     */
    update(dt) {
        // Блокируем обновление во время загрузки
        if (this.isLoading) return;
        
        if (this.gameOver) {
            // Разрешаем рестарт через R
            if (this.input.restartRequested) {
                this.input.restartRequested = false;
                this.restart();
            }
            return;
        }

        // Проверка завершения уровня
        const levelLength = (window.CONFIG && window.CONFIG.world && window.CONFIG.world.levelLength) || 5000;
        if (this.player && this.player.x > levelLength && !this.levelFinished) {
            this.levelFinished = true;
            this._levelComplete();
        }

        // Получаем платформы в зависимости от типа уровня
        const platforms = this.levelData ? this.platforms : (this.chunkGen ? this.chunkGen.platforms : []);
        
        // 1) Игрок — только если существует
        if (this.player) {
            this.player.update(dt, this.input, this.terrain, platforms);
        }

        // 2) Камера — только если существует
        if (this.camera && this.player) {
            this.prevCameraX = this.camera.x;
            this.camera.update(this.player);
            const cameraDX = this.camera.x - this.prevCameraX;

            // 3) Облака
            this.clouds.update(dt, cameraDX, this.camera.x);
        }

        if (this.levelData) {
            // Статический уровень из JSON
            // Лут
            for (const loot of this.loots) {
                loot.update(dt);
                if (this.player && loot.checkCollect(this.player)) {
                    this.score += loot.value;
                }
            }

            // Враги
            for (const enemy of this.enemies) {
                enemy.update(dt);
                if (this.player) {
                    const result = enemy.checkCollision(this.player);
                    
                    if (result === 'kill') {
                        const ph = (window.CONFIG && window.CONFIG.physics) || {};
                        const en = (window.CONFIG && window.CONFIG.enemy) || {};
                        this.kills += 1;
                        this.score += en.scoreValue ?? 25;
                        this.player.vy = ph.killBounceImpulse ?? -8;
                    } else if (result === 'damage') {
                        this._onPlayerDamage();
                    }
                }
            }

            // Интерактивные объекты
            for (const obj of this.interactables) {
                obj.update(dt, this.player);
                if (this.player && obj.interact(this.player)) {
                    // Обработка взаимодействия
                }
            }
        } else if (this.chunkGen) {
            // Процедурный уровень (чанк-генератор)
            // 4) Чанки: догружаем впереди, чистим позади
            this.chunkGen.ensureChunks(this.camera.x, this.width);
            this.chunkGen.cleanup(this.camera.x);

            // 5) Лут
            for (const loot of this.chunkGen.loots) {
                loot.update(dt);
                if (this.player && loot.checkCollect(this.player)) {
                    this.score += loot.value;
                }
            }

            // 6) Враги
            for (const enemy of this.chunkGen.enemies) {
                enemy.update(dt);
                if (this.player) {
                    const result = enemy.checkCollision(this.player);
                    
                    if (result === 'kill') {
                        const ph = (window.CONFIG && window.CONFIG.physics) || {};
                        const en = (window.CONFIG && window.CONFIG.enemy) || {};
                        this.kills += 1;
                        this.score += en.scoreValue ?? 25;
                        this.player.vy = ph.killBounceImpulse ?? -8;
                    } else if (result === 'damage') {
                        this._onPlayerDamage();
                    }
                }
            }
        }

        // 7) Падение вниз (если игрок как-то улетел под карту)
        if (this.player && this.player.y > this.height + 400) {
            this._onPlayerDamage();
        }

        this._updateHUD();
    }

    /** Наносим урон, обрабатываем смерти */
    _onPlayerDamage() {
        this.lives -= 1;

        // Отталкивание игрока вверх-назад
        this.player.vy = -9;
        this.player.vx = -6;

        // Небольшая неуязвимость: телепорт чуть вверх над землёй
        const groundY = this.terrain.getHeightAt(this.player.centerX);
        this.player.y = Math.min(this.player.y, groundY - this.player.height - 10);

        if (this.lives <= 0) {
            this._gameOver();
        }
    }

    _gameOver() {
        this.gameOver = true;
        this._showOverlay(
            'Игра окончена',
            `Очки: ${this.score} · Убито врагов: ${this.kills}. Нажмите R для перезапуска`
        );
    }

    _levelComplete() {
        this.gameOver = true;
        this._showOverlay(
            'Уровень пройден!',
            `Очки: ${this.score} · Убито врагов: ${this.kills}. Нажмите R для нового запуска`
        );
    }

    /** Отрисовка кадра */
    draw() {
        // Если идёт загрузка — не рисуем ничего кроме фона
        if (this.isLoading) {
            const colors = (window.CONFIG && window.CONFIG.colors) || {};
            this._drawSky(colors.sky);
            this._drawSun(colors.sun);
            return;
        }
        
        const colors = (window.CONFIG && window.CONFIG.colors) || {};
        
        this._drawSky(colors.sky);
        this._drawSun(colors.sun);
        this.clouds.draw(this.ctx, this.camera.x);
        this.terrain.draw(this.ctx, this.camera.x);

        // Платформы
        const platforms = this.levelData ? this.platforms : (this.chunkGen ? this.chunkGen.platforms : []);
        for (const p of platforms) {
            p.draw(this.ctx, this.camera.x, colors.platform);
        }

        // Лут
        const loots = this.levelData ? this.loots : (this.chunkGen ? this.chunkGen.loots : []);
        for (const l of loots) {
            l.draw(this.ctx, this.camera.x);
        }

        // Враги
        const enemies = this.levelData ? this.enemies : (this.chunkGen ? this.chunkGen.enemies : []);
        for (const e of enemies) {
            e.draw(this.ctx, this.camera.x);
        }

        // Игрок — только если существует
        if (this.player) {
            this.player.draw(this.ctx, this.camera.x);
        }
    }

    /** Небо — вертикальный градиент */
    _drawSky(skyColors) {
        const cfg = skyColors || {};
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, cfg.top || '#1b3a6b');
        grad.addColorStop(0.55, cfg.mid || '#5fa8dc');
        grad.addColorStop(1, cfg.bottom || '#b9e2f2');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /** Солнце — статичное, с мягким свечением */
    _drawSun(sunColors) {
        const cfg = sunColors || {};
        const cx = this.width - 140;
        const cy = 100;
        const r = 50;

        const glow = this.ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 3);
        glow.addColorStop(0, cfg.glowInner || 'rgba(255, 245, 180, 0.95)');
        glow.addColorStop(0.35, cfg.glowOuter || 'rgba(255, 220, 120, 0.55)');
        glow.addColorStop(1, cfg.glowTransparent || 'rgba(255, 220, 120, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
        this.ctx.fill();

        const core = this.ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, r);
        core.addColorStop(0, cfg.coreInner || '#fffbe6');
        core.addColorStop(1, cfg.coreOuter || '#ffd166');
        this.ctx.fillStyle = core;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /** Обновить цифры в HUD */
    _updateHUD() {
        const s = document.getElementById('score');
        const k = document.getElementById('kills');
        const l = document.getElementById('lives');
        if (s) s.textContent = this.score;
        if (k) k.textContent = this.kills;
        if (l) l.textContent = this.lives;
    }

    _showOverlay(title, text) {
        const overlay = document.getElementById('overlay');
        const t = document.getElementById('overlayTitle');
        const x = document.getElementById('overlayText');
        if (!overlay) return;
        if (t) t.textContent = title;
        if (x) x.textContent = text;
        overlay.classList.remove('hidden');
    }

    _hideOverlay() {
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.add('hidden');
    }
}
