/**
 * Бесконечный холмистый ландшафт на основе комбинации синусоид.
 */
class TerrainGenerator {
    /**
     * @param {number} baseLevel — базовый уровень земли (Y)
     * @param {number} screenWidth
     */
    constructor(baseLevel = 480, screenWidth = 900) {
        this.baseLevel = baseLevel;
        this.screenWidth = screenWidth;

        // Волны с разными частотами и амплитудами (псевдо-Перлин)
        this.waves = [
            { amp: 60, freq: 0.0025, phase: Math.random() * Math.PI * 2 },
            { amp: 35, freq: 0.0070, phase: Math.random() * Math.PI * 2 },
            { amp: 18, freq: 0.0180, phase: Math.random() * Math.PI * 2 },
            { amp: 8,  freq: 0.0400, phase: Math.random() * Math.PI * 2 },
        ];
    }

    /**
     * Высота (Y) земли в мировой координате X.
     * @param {number} x
     * @returns {number}
     */
    getHeightAt(x) {
        let offset = 0;
        for (const w of this.waves) {
            offset += Math.sin(x * w.freq + w.phase) * w.amp;
        }
        return this.baseLevel - offset;
    }

    /**
     * Отрисовка земли от cameraX до cameraX + screenWidth.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraX
     */
    draw(ctx, cameraX) {
        const step = 5;
        const startX = cameraX - step;
        const endX = cameraX + this.screenWidth + step;
        const screenH = ctx.canvas.height;

        // 1) Трава (зелёная полоса)
        ctx.beginPath();
        ctx.moveTo(startX - cameraX, this.getHeightAt(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x - cameraX, this.getHeightAt(x));
        }
        ctx.lineTo(endX - cameraX, screenH);
        ctx.lineTo(startX - cameraX, screenH);
        ctx.closePath();

        // Градиент почвы: сверху — трава, снизу — земля
        const topY = this.baseLevel - 120;
        const grad = ctx.createLinearGradient(0, topY, 0, screenH);
        grad.addColorStop(0, '#3fa34d');    // трава
        grad.addColorStop(0.08, '#3fa34d'); // трава
        grad.addColorStop(0.09, '#7a4a2b'); // почва
        grad.addColorStop(1, '#4a2c19');    // глубокая земля
        ctx.fillStyle = grad;
        ctx.fill();

        // 2) Яркая линия травы поверх
        ctx.beginPath();
        ctx.moveTo(startX - cameraX, this.getHeightAt(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x - cameraX, this.getHeightAt(x));
        }
        ctx.strokeStyle = '#6bcf7f';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}