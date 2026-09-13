/**
 * Парящая платформа — тип Solid Platform.
 */
class Platform extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    constructor(x, y, width = 120, height = 22) {
        super(x, y, width, height);
        this.solid = true;
    }

    draw(ctx, cameraX) {
        const sx = this.x - cameraX;

        // Основа
        const grad = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
        grad.addColorStop(0, '#8b5a2b');
        grad.addColorStop(1, '#5c3a1a');

        ctx.fillStyle = grad;
        ctx.fillRect(sx, this.y, this.width, this.height);

        // Верхняя трава
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(sx, this.y, this.width, 6);

        // Обводка
        ctx.strokeStyle = '#3e2310';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, this.y, this.width, this.height);
    }
}