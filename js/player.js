/**
 * Игрок — круглый мяч с физикой гравитации и прыжка.
 * С спрайтовой анимацией.
 */
class Player extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        const cfg = (window.CONFIG && window.CONFIG.player) || {};
        const ph  = (window.CONFIG && window.CONFIG.physics) || {};
        const radius = cfg.radius || 20;

        super(x - radius, y - radius, radius * 2, radius * 2);
        this.radius = radius;
        this.isGrounded = false;

        // Параметры физики (из config.json)
        this.gravity = ph.gravity ?? 0.42;
        this.maxFallSpeed = ph.maxFallSpeed ?? 16;
        this.jumpImpulse = ph.playerJumpImpulse ?? -11;
        this.maxSpeed = ph.playerMaxSpeed ?? 6;
        this.acceleration = ph.playerAcceleration ?? 0.6;
        this.friction = ph.playerFriction ?? 0.82;

        // Урон / неуязвимость
        this.invincibleMs = 0;
        this.blinkIntervalMs = cfg.damageBlinkIntervalMs ?? 90;
        this.pulseScaleMin = cfg.damagePulseScaleMin ?? 0.85;
        this.pulseScaleMax = cfg.damagePulseScaleMax ?? 1.15;

        // Спрайтовый аниматор
        this.animator = new SpriteAnimator('assets/player.png', 'assets/player.json');
        
        // Состояния анимации
        this.facingRight = true;
        this.lastMoveTime = 0;
        
        // Угол вращения для эффекта качения
        this.rotation = 0;
        
        // Фиксированный кадр: строка 3 (y=126), первый кадр (frame 0 из bored)
        // Используем данные из player.json: x=0, y=126, width=64, height=64
        this.fixedFrame = { x: 0, y: 126, width: 64, height: 64 };
    }

    /**
     * @param {number} dt
     * @param {Input} input
     * @param {TerrainGenerator} terrain
     * @param {Platform[]} platforms
     */
    update(dt, input, terrain, platforms = []) {
        const wasGrounded = this.isGrounded;

        // Горизонтальное управление
        if (input.keys.left) {
            this.vx -= this.acceleration * dt;
            this.facingRight = false;
            this.lastMoveTime = Date.now();
        } else if (input.keys.right) {
            this.vx += this.acceleration * dt;
            this.facingRight = true;
            this.lastMoveTime = Date.now();
        } else {
            this.vx *= Math.pow(this.friction, dt);
        }
        this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));

        // Прыжок
        if (input.consumeJump() && this.isGrounded) {
            this.vy = this.jumpImpulse;
            this.isGrounded = false;
        }

        // Гравитация
        this.vy += this.gravity * dt;
        // Ограничение падения
        this.vy = Math.min(this.vy, this.maxFallSpeed);

        // Перемещение
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Коллизия с землёй
        this.isGrounded = false;
        const groundY = terrain.getHeightAt(this.centerX);
        const bottomY = this.y + this.height;
        if (bottomY >= groundY) {
            this.y = groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Коллизия с платформами (тип Solid Platform)
        for (const p of platforms) {
            if (!p.solid) continue;
            // Касание сверху и движение вниз
            if (
                this.vy >= 0 &&
                this.right > p.x &&
                this.x < p.right &&
                this.bottom > p.y &&
                this.bottom - this.vy <= p.y + 4 &&
                this.bottom <= p.y + this.height
            ) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            }
        }

        // Обновление вращения персонажа (пропорционально скорости и диаметру)
        this._updateRotation(dt);
    }

    /**
     * Обновление угла вращения для эффекта качения
     * @param {number} dt
     */
    _updateRotation(dt) {
        // Длина окружности = 2 * π * r
        const circumference = 2 * Math.PI * this.radius;
        // Пройденное расстояние за кадр
        const distanceMoved = Math.abs(this.vx) * dt;
        // Угол вращения в радианах: пройденное расстояние / длина окружности * 2π
        const rotationDelta = (distanceMoved / circumference) * 2 * Math.PI;
        
        // Направление вращения зависит от направления движения
        if (this.vx > 0) {
            this.rotation += rotationDelta;
        } else if (this.vx < 0) {
            this.rotation -= rotationDelta;
        }
    }

    /**
     * Отрисовка игрока со спрайтом и динамической тенью
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraX
     */
    draw(ctx, cameraX) {
        const screenX = this.x - cameraX + this.radius;
        const screenY = this.y + this.radius;
        const colors = (window.CONFIG && window.CONFIG.colors) || {};
        const shadowCfg = colors.shadow || {};

        // Вычисляем высоту над "землёй" для тени
        const groundY = this.isGrounded ? 
            screenY + this.radius : 
            this.y + this.height;
        
        const heightAboveGround = Math.max(0, groundY - (screenY + this.radius));
        
        // Тень: размытие и размер зависят от высоты
        const shadowBlurBase = shadowCfg.blurBase ?? 4;
        const shadowBlurMax = shadowCfg.blurMax ?? 15;
        const shadowScale = Math.max(0.3, 1 - heightAboveGround / 200);
        const shadowBlur = shadowBlurBase + (shadowBlurMax - shadowBlurBase) * (heightAboveGround / 150);
        const shadowAlpha = 0.25 * shadowScale;

        // Рисуем тень на поверхности (земля или платформа)
        ctx.save();
        ctx.filter = `blur(${shadowBlur}px)`;
        ctx.beginPath();
        ctx.ellipse(
            screenX, 
            groundY, 
            this.radius * 0.9 * shadowScale, 
            4 * shadowScale, 
            0, 0, Math.PI * 2
        );
        ctx.fillStyle = shadowCfg.color || `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fill();
        ctx.restore();

        // Отрисовка спрайта с вращением
        const scaleX = this.facingRight ? 1 : -1;
        this._drawFixedFrame(ctx, screenX, screenY, scaleX);
        
        // Fallback: если спрайт не загрузился, рисуем градиентный круг
        this._drawFallback(ctx, screenX, screenY);
    }

    /**
     * Отрисовка фиксированного кадра с вращением
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX - центр по X
     * @param {number} screenY - центр по Y
     * @param {number} scaleX - масштаб по X (для отражения)
     */
    _drawFixedFrame(ctx, screenX, screenY, scaleX) {
        if (!this.animator.isReady()) {
            return;
        }

        const frame = this.fixedFrame;
        const targetSize = 40;
        const scale = targetSize / Math.max(frame.width, frame.height);
        const drawWidth = frame.width * scale;
        const drawHeight = frame.height * scale;

        ctx.save();
        
        // Перемещаем контекст к центру персонажа
        ctx.translate(screenX, screenY);
        
        // Отражение по горизонтали если нужно
        if (scaleX < 0) {
            ctx.scale(-1, 1);
        }
        
        // Вращение для эффекта качения
        ctx.rotate(this.rotation);
        
        // Рисуем спрайт центрированным
        ctx.drawImage(
            this.animator.image,
            frame.x, frame.y, frame.width, frame.height,
            -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
        );
        
        ctx.restore();
    }

    /**
     * Fallback: если спрайт не загрузился, рисуем градиентный круг
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     */
    _drawFallback(ctx, screenX, screenY) {
        if (!this.animator.isReady()) {
            // Тело мяча с радиальным градиентом
            const grad = ctx.createRadialGradient(
                screenX - this.radius * 0.3,
                screenY - this.radius * 0.3,
                this.radius * 0.15,
                screenX,
                screenY,
                this.radius
            );
            grad.addColorStop(0, '#ff8c66');
            grad.addColorStop(1, '#e63946');

            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#a4161a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Блик
            ctx.beginPath();
            ctx.arc(screenX - this.radius * 0.35, screenY - this.radius * 0.35, this.radius * 0.22, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        }
    }
}
