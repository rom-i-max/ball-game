/**
 * Облако — динамическая сущность с параллаксом и собственным ветром.
 */
class Cloud extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} scale
     * @param {number} opacity
     * @param {number} parallaxFactor
     */
    constructor(x, y, scale, opacity, parallaxFactor) {
        super(x, y, 120 * scale, 50 * scale);
        this.scale = scale;
        this.opacity = opacity;
        this.parallaxFactor = parallaxFactor;
        this.windSpeed = 0.1 + Math.random() * 0.15; // минимальный собственный ветер
        this.puffs = this._generatePuffs();
    }

    /** Случайная конфигурация «пузырей» из 3–4 кругов */
    _generatePuffs() {
        const count = 3 + Math.floor(Math.random() * 2); // 3 или 4
        const puffs = [];
        const baseR = 30 * this.scale;
        for (let i = 0; i < count; i++) {
            puffs.push({
                dx: (i - (count - 1) / 2) * baseR * 0.9 + (Math.random() - 0.5) * 10,
                dy: (Math.random() - 0.5) * baseR * 0.6,
                r: baseR * (0.7 + Math.random() * 0.6),
            });
        }
        return puffs;
    }

    update(dt, cameraDX) {
        // Движение: собственный ветер + параллакс от камеры
        this.x += this.windSpeed * dt;
        this.x -= cameraDX * this.parallaxFactor;
    }

    draw(ctx, cameraX) {
        const screenX = this.x - cameraX * this.parallaxFactor;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        for (const p of this.puffs) {
            ctx.beginPath();
            ctx.arc(screenX + p.dx, this.y + p.dy, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

/**
 * Генератор пула облаков с бесконечной прокруткой.
 */
class CloudGenerator {
    /**
     * @param {number} screenWidth
     * @param {number} count
     */
    constructor(screenWidth, count = 12) {
        this.screenWidth = screenWidth;
        this.clouds = [];
        for (let i = 0; i < count; i++) {
            this.clouds.push(this._randomCloud(Math.random() * screenWidth * 2));
        }
    }

    _randomCloud(x) {
        const scale = 0.6 + Math.random() * 1.2;
        const y = 40 + Math.random() * 220;
        const opacity = 0.5 + Math.random() * 0.5;
        const parallaxFactor = 0.1 + Math.random() * 0.2; // 0.1..0.3
        return new Cloud(x, y, scale, opacity, parallaxFactor);
    }

    update(dt, cameraDX, cameraX) {
        for (const cloud of this.clouds) {
            cloud.update(dt, cameraDX);

            // Экранная позиция с учётом параллакса
            const screenX = cloud.x - cameraX * cloud.parallaxFactor;

            // Ушло за левый край → переносим далеко вправо
            if (screenX + cloud.width < -100) {
                cloud.x += (this.screenWidth + 400) / Math.max(cloud.parallaxFactor, 0.1);
            }
        }
    }

    draw(ctx, cameraX) {
        for (const cloud of this.clouds) {
            cloud.draw(ctx, cameraX);
        }
    }
}