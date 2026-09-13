/**
 * Игрок — круглый мяч с физикой гравитации и прыжка.
 */
class Player extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     */
/* конструктор - первая версия 

	constructor(x, y) {
        const radius = 20;
        super(x - radius, y - radius, radius * 2, radius * 2);
        this.radius = radius;
        this.isGrounded = false;

        // Параметры физики
        this.gravity = 0.65;
        this.jumpImpulse = -12;
        this.maxSpeed = 6;
        this.acceleration = 0.6;
        this.friction = 0.82;
    }
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
    }
	
    /**
     * @param {number} dt
     * @param {Input} input
     * @param {TerrainGenerator} terrain
     * @param {Platform[]} platforms
     */
    update(dt, input, terrain, platforms = []) {
        // Горизонтальное управление
        if (input.keys.left) {
            this.vx -= this.acceleration * dt;
        } else if (input.keys.right) {
            this.vx += this.acceleration * dt;
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
        this.vy = Math.min(this.vy, 18);

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
    }

    draw(ctx, cameraX) {
        const screenX = this.x - cameraX + this.radius;
        const screenY = this.y + this.radius;

        // Тень
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + this.radius + 4, this.radius * 0.9, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

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