/**
 * Базовый класс для всех динамических объектов игры.
 */
class Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
    }

    /**
     * Обновление координат на основе скоростей.
     * @param {number} dt — коэффициент времени кадра (1.0 при 60 FPS)
     */
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    /**
     * Отрисовка. По умолчанию ничего не рисует.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraX
     */
    draw(ctx, cameraX) {
        // override в наследниках
    }

    /**
     * Проверка пересечения с другим Entity (AABB).
     * @param {Entity} other
     * @returns {boolean}
     */
    intersects(other) {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    /** Правая граница */
    get right() { return this.x + this.width; }
    /** Нижняя граница */
    get bottom() { return this.y + this.height; }
    /** Центр по X */
    get centerX() { return this.x + this.width / 2; }
    /** Центр по Y */
    get centerY() { return this.y + this.height / 2; }
}