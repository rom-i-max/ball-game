/**
 * Система спрайтовых анимаций.
 * Загружает sprite sheet и данные из JSON, предоставляет кадры для отрисовки.
 */
class SpriteAnimator {
    /**
     * @param {string} imagePath - путь к спрайт-листу
     * @param {string} jsonPath - путь к JSON с данными анимаций
     */
    constructor(imagePath, jsonPath) {
        this.image = new Image();
        this.image.src = imagePath;
        this.imageLoaded = false;
        
        this.animations = {};
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 4; // кадров на один кадр анимации (при 60fps = 15fps анимация)
        
        this.jsonPath = jsonPath;
        this._loadJson();
    }

    async _loadJson() {
        try {
            const response = await fetch(this.jsonPath);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            
            this.meta = data.meta;
            this.animations = data.animations || {};
            this.imageLoaded = true;
            
            console.info(`[SpriteAnimator] загружены анимации из ${this.jsonPath}`);
        } catch (err) {
            console.warn(`[SpriteAnimator] не удалось загрузить ${this.jsonPath}`, err.message);
        }
    }

    /**
     * Установить текущую анимацию
     * @param {string} animName - имя анимации
     * @param {boolean} loop - зациклить ли
     */
    setAnimation(animName, loop = true) {
        if (!this.animations[animName]) {
            console.warn(`[SpriteAnimator] анимация "${animName}" не найдена`);
            return;
        }
        
        // Если уже воспроизводится эта анимация, не сбрасываем
        if (this.currentAnimation === animName && loop) {
            return;
        }
        
        this.currentAnimation = animName;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.loop = loop;
    }

    /**
     * Обновление анимации
     * @param {number} dt - delta time
     */
    update(dt) {
        if (!this.currentAnimation || !this.animations[this.currentAnimation]) {
            return;
        }

        const anim = this.animations[this.currentAnimation];
        this.frameTimer += dt;

        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame++;

            if (this.currentFrame >= anim.total_frames) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = anim.total_frames - 1;
                }
            }
        }
    }

    /**
     * Получить текущий кадр
     * @returns {{x: number, y: number, width: number, height: number}|null}
     */
    getCurrentFrame() {
        if (!this.currentAnimation || !this.animations[this.currentAnimation]) {
            return null;
        }

        const anim = this.animations[this.currentAnimation];
        if (!anim.frames || anim.frames.length === 0) {
            return null;
        }

        const frameIndex = Math.min(this.currentFrame, anim.frames.length - 1);
        return anim.frames[frameIndex];
    }

    /**
     * Отрисовка текущего кадра
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX - центр по X на экране
     * @param {number} screenY - центр по Y на экране
     * @param {number} scaleX - масштаб по X (для отражения)
     */
    draw(ctx, screenX, screenY, scaleX = 1) {
        if (!this.imageLoaded || !this.currentAnimation) {
            return;
        }

        const frame = this.getCurrentFrame();
        if (!frame) {
            return;
        }

        // Масштабируем спрайт относительно стандартного размера игрока (40x40)
        const targetSize = 40;
        const scale = targetSize / Math.max(frame.width, frame.height);
        const drawWidth = frame.width * scale * scaleX;
        const drawHeight = frame.height * scale;

        ctx.save();
        
        if (scaleX < 0) {
            // Отражение по горизонтали
            ctx.translate(screenX, screenY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image,
                frame.x, frame.y, frame.width, frame.height,
                -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
            );
        } else {
            ctx.drawImage(
                this.image,
                frame.x, frame.y, frame.width, frame.height,
                screenX - drawWidth / 2, screenY - drawHeight / 2, drawWidth, drawHeight
            );
        }
        
        ctx.restore();
    }

    /**
     * Проверка загрузки изображения
     * @returns {boolean}
     */
    isReady() {
        return this.imageLoaded && this.image.complete;
    }
}
