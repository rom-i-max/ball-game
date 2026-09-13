/**
 * Главный класс игры: держит состояние, обновляет и рисует мир.
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

    /** Инициализация состояния (используется и для рестарта) - версия 1.0
    _init() {
        // Генераторы и окружение
        this.terrain = new TerrainGenerator(480, this.width);
        this.clouds = new CloudGenerator(this.width, 12);
        this.chunkGen = new ChunkGenerator(this.terrain);

        // Игрок и камера
        const startY = this.terrain.getHeightAt(300) - 40;
        this.player = new Player(300, startY);
        this.camera = new Camera(this.width, 300);
        this.camera.snapTo(this.player);

        // Счётчики
        this.score = 0;
        this.kills = 0;
        this.lives = 3;

        // Состояние
        this.gameOver = false;
        this.prevCameraX = this.camera.x;

        // Прогреваем чанки
        this.chunkGen.ensureChunks(this.camera.x, this.width);

        // Обновляем HUD
        this._updateHUD();
        this._hideOverlay();
    }
*/
	// версия 2.0
	
	    _init() {
        const w = (window.CONFIG && window.CONFIG.world) || {};
        const pl = (window.CONFIG && window.CONFIG.player) || {};
        const cam = (window.CONFIG && window.CONFIG.camera) || {};

        this.terrain = new TerrainGenerator(w.terrainBaseLevel ?? 480, this.width);
        this.clouds = new CloudGenerator(this.width, 12);
        this.chunkGen = new ChunkGenerator(this.terrain);

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

        this.chunkGen.ensureChunks(this.camera.x, this.width);

        this._updateHUD();
        this._hideOverlay();
    }

    /** Полный сброс (R) */
    restart() {
        this._init();
    }

    /**
     * Обновление логики кадра.
     * @param {number} dt
     */
    update(dt) {
        if (this.gameOver) {
            // Разрешаем рестарт через R
            if (this.input.restartRequested) {
                this.input.restartRequested = false;
                this.restart();
            }
            return;
        }

        // 1) Игрок
        this.player.update(dt, this.input, this.terrain, this.chunkGen.platforms);

        // 2) Камера
        this.prevCameraX = this.camera.x;
        this.camera.update(this.player);
        const cameraDX = this.camera.x - this.prevCameraX;

        // 3) Облака
        this.clouds.update(dt, cameraDX, this.camera.x);

        // 4) Чанки: догружаем впереди, чистим позади
        this.chunkGen.ensureChunks(this.camera.x, this.width);
        this.chunkGen.cleanup(this.camera.x);

        // 5) Лут
        for (const loot of this.chunkGen.loots) {
            loot.update(dt);
            if (loot.checkCollect(this.player)) {
                this.score += loot.value;
            }
        }

        // 6) Враги
        for (const enemy of this.chunkGen.enemies) {
            enemy.update(dt);
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

        // 7) Падение вниз (если игрок как-то улетел под карту)
        if (this.player.y > this.height + 400) {
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

    /** Отрисовка кадра */
    draw() {
        this._drawSky();
        this._drawSun();
        this.clouds.draw(this.ctx, this.camera.x);
        this.terrain.draw(this.ctx, this.camera.x);

        // Платформы
        for (const p of this.chunkGen.platforms) {
            p.draw(this.ctx, this.camera.x);
        }

        // Лут
        for (const l of this.chunkGen.loots) {
            l.draw(this.ctx, this.camera.x);
        }

        // Враги
        for (const e of this.chunkGen.enemies) {
            e.draw(this.ctx, this.camera.x);
        }

        // Игрок
        this.player.draw(this.ctx, this.camera.x);
    }

    /** Небо — вертикальный градиент */
    _drawSky() {
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#1b3a6b');
        grad.addColorStop(0.55, '#5fa8dc');
        grad.addColorStop(1, '#b9e2f2');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /** Солнце — статичное, с мягким свечением */
    _drawSun() {
        const cx = this.width - 140;
        const cy = 100;
        const r = 50;

        const glow = this.ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 3);
        glow.addColorStop(0, 'rgba(255, 245, 180, 0.95)');
        glow.addColorStop(0.35, 'rgba(255, 220, 120, 0.55)');
        glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
        this.ctx.fill();

        const core = this.ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, r);
        core.addColorStop(0, '#fffbe6');
        core.addColorStop(1, '#ffd166');
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