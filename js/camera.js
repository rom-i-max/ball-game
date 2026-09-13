/**
 * Камера с плавным следованием за игроком (LERP).
 */
class Camera {
    /**
     * @param {number} screenWidth
     * @param {number} playerOffsetX — где держим игрока на экране (левая треть)
     */
    constructor(screenWidth, playerOffsetX = 300) {
        this.x = 0;
        this.screenWidth = screenWidth;
        this.playerOffsetX = playerOffsetX;
        this.lerp = 0.1;
    }

    /**
     * @param {Player} player
     */
    update(player) {
        const targetCameraX = player.x - this.playerOffsetX;
        this.x += (targetCameraX - this.x) * this.lerp;
        // Камера не уходит влево за старт
        if (this.x < 0) this.x = 0;
    }

    /** Прямая установка (для рестарта) */
    snapTo(player) {
        this.x = Math.max(0, player.x - this.playerOffsetX);
    }
}