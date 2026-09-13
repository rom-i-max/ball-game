/**
 * Лут — монета/кристалл. Исчезает при касании игроком.
 */
class Loot extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} value
     */
    constructor(x, y, value = 10) {
        const size = 22;
        super(x - size / 2, y - size / 2, size, size);
        this.value = value;
        this.collected = false;
        this.phase = Math.random() * Math.PI * 2;
        this.baseY = this.y;
    }

    update(dt) {
        this.phase += dt * 0.08;
        // Лёгкое покачивание
        this.y = this.baseY + Math.sin(this.phase) * 6;
    }

    /**
     * Проверка касания игроком (радиус-коллизия).
     * @param {Player} player
     */
    checkCollect(player) {
        if (this.collected) return false;
        const dx = this.centerX - player.centerX;
        const dy = this.centerY - player.centerY;
        const r = player.radius + this.width / 2;
        if (dx * dx + dy * dy < r * r) {
            this.collected = true;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX) {
        if (this.collected) return;
        const screenX = this.centerX - cameraX;
        const screenY = this.centerY;

        // Сияние
        const glow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, this.width);
        glow.addColorStop(0, 'rgba(255, 225, 80, 0.6)');
        glow.addColorStop(1, 'rgba(255, 225, 80, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width, 0, Math.PI * 2);
        ctx.fill();

        // Монета
        const grad = ctx.createRadialGradient(
            screenX - 4, screenY - 4, 2,
            screenX, screenY, this.width / 2
        );
        grad.addColorStop(0, '#fff6a8');
        grad.addColorStop(1, '#f4b400');

        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Внутренний блик
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width / 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}