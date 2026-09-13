/**
 * Интерактивные объекты (ящики, бочки, переключатели).
 */
class Interactable extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} type - тип объекта ('crate', 'barrel', 'switch')
     * @param {object} properties - дополнительные свойства
     */
    constructor(x, y, type = 'crate', properties = {}) {
        super(x, y, 40, 40);
        this.type = type;
        this.properties = properties;
        
        this.interacted = false;
        this.breaking = false;
        this.breakFrame = 0;
        
        // Для ящиков: можно разбить или открыть
        this.health = properties.health || 3;
        this.isOpen = false;
    }

    /**
     * Обновление состояния
     * @param {number} dt
     * @param {Player} player
     */
    update(dt, player) {
        if (this.breaking) {
            this.breakFrame += dt;
            if (this.breakFrame >= 15) {
                this.breaking = false;
                this.interacted = true; // объект разрушен
            }
        }
    }

    /**
     * Проверка взаимодействия с игроком
     * @param {Player} player
     * @returns {boolean} - было ли взаимодействие
     */
    interact(player) {
        if (this.interacted) return false;

        // Простая проверка столкновения
        if (this.intersects(player)) {
            if (this.type === 'crate') {
                // Игрок столкнулся с ящиком - можно разбить
                if (Math.abs(player.vx) > 3 || Math.abs(player.vy) > 5) {
                    this.health -= 1;
                    this.breaking = true;
                    
                    if (this.health <= 0) {
                        this.interacted = true;
                        // Можно добавить спавн лута
                        return true;
                    }
                }
            } else if (this.type === 'switch') {
                // Переключатель активируется при касании
                this.interacted = true;
                return true;
            }
        }
        return false;
    }

    /**
     * Отрисовка
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cameraX
     */
    draw(ctx, cameraX) {
        if (this.interacted) return; // Не рисуем разрушенные объекты

        const screenX = this.x - cameraX;
        const screenY = this.y;

        if (this.type === 'crate') {
            if (this.breaking) {
                // Анимация разрушения
                ctx.fillStyle = '#8b5a2b';
                ctx.globalAlpha = 1 - (this.breakFrame / 15);
            } else {
                ctx.fillStyle = '#a67c52';
            }

            // Рисуем ящик
            ctx.fillRect(screenX, screenY, this.width, this.height);
            
            // Крест на ящике
            ctx.strokeStyle = '#6b4226';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(screenX + 5, screenY + 5);
            ctx.lineTo(screenX + this.width - 5, screenY + this.height - 5);
            ctx.moveTo(screenX + this.width - 5, screenY + 5);
            ctx.lineTo(screenX + 5, screenY + this.height - 5);
            ctx.stroke();
            
            // Рамка
            ctx.strokeStyle = '#4a2c19';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, this.width, this.height);
            
            ctx.globalAlpha = 1;
        } else if (this.type === 'switch') {
            // Рисуем переключатель
            ctx.fillStyle = this.interacted ? '#4a9eff' : '#ff6b6b';
            ctx.beginPath();
            ctx.arc(screenX + this.width/2, screenY + this.height/2, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.type === 'barrel') {
            // Бочка
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2, screenY + this.height/2, 
                       this.width/2, this.height/2 - 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#5a2d0c';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}
