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

    /** Случайная конфигурация «пузырей» для процедурного облака */
    _generatePuffs() {
        const puffs = [];
        const baseRadiusX = (60 + Math.random() * 20) * this.scale; 
        const baseRadiusY = (35 + Math.random() * 15) * this.scale;   
        
        const steps = 14; 
        
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            
            const ex = baseRadiusX * Math.cos(angle);
            const ey = baseRadiusY * Math.sin(angle);
            
            const t = Math.atan2(ey * baseRadiusX, ex * baseRadiusY);
            const localScale = Math.sqrt(Math.pow(baseRadiusX * Math.sin(t), 2) + Math.pow(baseRadiusY * Math.cos(t), 2)) / Math.max(baseRadiusX, baseRadiusY);
            
            const r = (baseRadiusY * 0.55) + (localScale * baseRadiusY * 0.25) + (Math.random() - 0.5) * 5;
            
            const inset = 0.15; 
            const cx = ex * (1 - inset);
            const cy = ey * (1 - inset);

            puffs.push({ dx: cx, dy: cy, r: r });
        }

        puffs.push({ dx: 0, dy: 0, r: baseRadiusY * 0.9 });
        puffs.push({ dx: -baseRadiusX * 0.3, dy: 0, r: baseRadiusY * 0.7 });
        puffs.push({ dx: baseRadiusX * 0.3, dy: 0, r: baseRadiusY * 0.7 });
        
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
        // Рисуем всё облако как единый белый силуэт
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.beginPath();
        for (let i = 0; i < this.puffs.length; i++) {
            const p = this.puffs[i];
            ctx.moveTo(screenX + p.dx + p.r, this.y + p.dy);
            ctx.arc(screenX + p.dx, this.y + p.dy, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
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