/**
 * Враг — патрулирует отрезок земли, движется влево-вправо.
 */
class Enemy extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} patrolRange
     * @param {TerrainGenerator} terrain
     * @param {Platform[]} platforms
     */
    constructor(x, y, patrolRange, terrain, platforms = []) {
        const cfg = (window.CONFIG && window.CONFIG.enemy) || {};
        const w = cfg.width ?? 40;
        const h = cfg.height ?? 40;
        super(x - w / 2, y - h, w, h);
        this.terrain = terrain;
        this.platforms = platforms;
        this.startX = x;
        this.patrolRange = patrolRange ?? cfg.patrolRange ?? 90;
        this.speed = cfg.speed ?? 1.2;
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.alive = true;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Встаём на землю или платформу
        this._snapToGround();
    }

    _snapToGround() {
        let groundY = this.terrain.getHeightAt(this.centerX);
        
        // Проверяем платформы
        for (const p of this.platforms) {
            if (this.centerX >= p.x && this.centerX <= p.x + p.width &&
                this.bottom <= p.y + 10 && this.bottom > p.y - 50) {
                groundY = Math.min(groundY, p.y);
            }
        }
        
        this.y = groundY - this.height;
    }

    update(dt) {
        if (!this.alive) return;

        this.x += this.speed * this.direction * dt;

        // Разворот на границах патруля
        if (this.x < this.startX - this.patrolRange) {
            this.x = this.startX - this.patrolRange;
            this.direction = 1;
        } else if (this.x > this.startX + this.patrolRange) {
            this.x = this.startX + this.patrolRange;
            this.direction = -1;
        }

        this._snapToGround();
        this.bobPhase += dt * 0.15;
    }

    /**
     * Проверка столкновения с игроком и логика боя.
     * @param {Player} player
     * @returns {'kill' | 'damage' | null}
     */
    checkCollision(player) {
        if (!this.alive) return null;

        // Радиус-коллизия по центрам
        const dx = this.centerX - player.centerX;
        const dy = this.centerY - player.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = player.radius + Math.min(this.width, this.height) / 2 - 6;
        if (dist > minDist) return null;

        // Условие убийства: игрок падает и его низ выше центра врага
        const playerBottom = player.y + player.height;
        if (player.vy > 0 && playerBottom < this.centerY + 4) {
            this.alive = false;
            return 'kill';
        }

        return 'damage';
    }

    draw(ctx, cameraX) {
        if (!this.alive) return;
        const screenX = this.x - cameraX;
        const bob = Math.sin(this.bobPhase) * 3;
        const cx = screenX + this.width / 2;
        const cy = this.y + this.height / 2 + bob;

        // Тень
        const groundY = this.terrain.getHeightAt(this.centerX);
        ctx.beginPath();
        ctx.ellipse(cx, groundY + 2, this.width * 0.45, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Тело (колобок-слизень)
        const grad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, this.width / 2);
        grad.addColorStop(0, '#b06ad8');
        grad.addColorStop(1, '#6a2e91');

        ctx.beginPath();
        ctx.ellipse(cx, cy, this.width / 2, this.height / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#3d1a55';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Глаза
        const eyeOffX = this.width * 0.18;
        const eyeOffY = -this.height * 0.15;
        const eyeR = 5;
        for (const side of [-1, 1]) {
            const ex = cx + eyeOffX * side + this.direction * 3;
            const ey = cy + eyeOffY;

            ctx.beginPath();
            ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Зрачок смотрит в сторону движения
            ctx.beginPath();
            ctx.arc(ex + this.direction * 2, ey, eyeR * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
        }

        // Рот
        ctx.beginPath();
        ctx.arc(cx + this.direction * 3, cy + this.height * 0.18, 5, 0, Math.PI);
        ctx.strokeStyle = '#2a0d3d';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
