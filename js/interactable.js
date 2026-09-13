/**
 * Интерактивные объекты: ящики, бочки, переключатели.
 */
class Interactable extends Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} type - 'crate', 'barrel', 'switch'
     * @param {Object} properties
     */
    constructor(x, y, type, properties = {}) {
        const size = type === 'switch' ? 30 : 40;
        super(x - size / 2, y - size, size, size);
        this.type = type;
        this.properties = properties;
        this.interacted = false;
        this.health = properties.health || (type === 'crate' ? 3 : 1);
        this.maxHealth = this.health;
        this.animationTimer = 0;
    }

    update(dt, player) {
        if (this.type === 'switch' && !this.interacted) {
            // Проверка активации переключателя
            if (this.checkPlayerNear(player)) {
                this.interacted = true;
                this.animationTimer = 0.5;
            }
        }
        
        if (this.animationTimer > 0) {
            this.animationTimer -= dt / 60;
        }
    }

    checkPlayerNear(player) {
        const dx = Math.abs(this.centerX - player.centerX);
        const dy = Math.abs(this.centerY - player.centerY);
        return dx < 50 && dy < 50;
    }

    interact(player) {
        if (this.type === 'crate' || this.type === 'barrel') {
            // Урон по объекту при прыжке сверху
            if (player.vy > 0 && player.bottom > this.y && 
                player.bottom < this.y + 20 && 
                Math.abs(player.centerX - this.centerX) < this.width / 2) {
                this.health--;
                player.vy = -6; // отскок
                
                if (this.health <= 0) {
                    this.destroy();
                    return true;
                }
            }
        } else if (this.type === 'switch' && !this.interacted) {
            if (this.checkPlayerNear(player)) {
                this.interacted = true;
                return true;
            }
        }
        return false;
    }

    destroy() {
        // Объект разрушен
        this.health = 0;
    }

    draw(ctx, cameraX) {
        if (this.health <= 0) return;
        
        const screenX = this.x - cameraX;
        const bob = this.animationTimer > 0 ? Math.sin(this.animationTimer * Math.PI * 4) * 3 : 0;
        
        if (this.type === 'crate') {
            this._drawCrate(ctx, screenX, this.y + bob);
        } else if (this.type === 'barrel') {
            this._drawBarrel(ctx, screenX, this.y + bob);
        } else if (this.type === 'switch') {
            this._drawSwitch(ctx, screenX, this.y + bob);
        }
    }

    _drawCrate(ctx, screenX, y) {
        const colors = (window.CONFIG && window.CONFIG.colors && window.CONFIG.colors.objects) || {};
        const baseColor = colors.crate || '#8B4513';
        const darkColor = colors.crateDark || '#5D2906';
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(screenX, y, this.width, this.height);
        
        // Крест-усиление
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, y);
        ctx.lineTo(screenX + this.width, y + this.height);
        ctx.moveTo(screenX + this.width, y);
        ctx.lineTo(screenX, y + this.height);
        ctx.stroke();
        
        // Рамка
        ctx.strokeRect(screenX, y, this.width, this.height);
        
        // Индикатор повреждений
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            const damageWidth = this.width * (1 - this.health / this.maxHealth);
            ctx.fillRect(screenX, y + this.height - 5, damageWidth, 5);
        }
    }

    _drawBarrel(ctx, screenX, y) {
        const colors = (window.CONFIG && window.CONFIG.colors && window.CONFIG.colors.objects) || {};
        const baseColor = colors.barrel || '#A0522D';
        const ringColor = colors.barrelRing || '#4a4a4a';
        
        // Тело бочки
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.ellipse(screenX + this.width/2, y + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Кольца
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        for (let i = 1; i <= 3; i++) {
            const ringY = y + this.height * i / 4;
            ctx.beginPath();
            ctx.arc(screenX + this.width/2, ringY, this.width/2 * 0.9, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawSwitch(ctx, screenX, y) {
        const colors = (window.CONFIG && window.CONFIG.colors && window.CONFIG.colors.objects) || {};
        const baseColor = this.interacted ? (colors.switchOn || '#4CAF50') : (colors.switchOff || '#757575');
        
        // Основание
        ctx.fillStyle = '#555';
        ctx.fillRect(screenX + 5, y + 10, this.width - 10, this.height - 10);
        
        // Рычаг
        ctx.fillStyle = baseColor;
        const leverAngle = this.interacted ? Math.PI / 4 : -Math.PI / 4;
        const leverLength = 15;
        const cx = screenX + this.width / 2;
        const cy = y + this.height / 2;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(leverAngle) * leverLength, cy + Math.sin(leverAngle) * leverLength);
        ctx.stroke();
    }
}
