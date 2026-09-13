/**
 * Плавный ландшафт с прямыми участками и утолщённым зелёным слоем.
 * Цвета берутся из config.json.
 */
class TerrainGenerator {
    /**
     * @param {number} baseLevel — базовый уровень земли (Y)
     * @param {number} screenWidth
     */
    constructor(baseLevel = 480, screenWidth = 900) {
        const cfg = (window.CONFIG && window.CONFIG.colors && window.CONFIG.colors.terrain) || {};
        this.baseLevel = baseLevel;
        this.screenWidth = screenWidth;

        // Сохраняем цвета из конфига
        this.colors = {
            grassTop: cfg.grassTop || '#6bcf7f',
            grassLayer: cfg.grassLayer || '#3fa34d',
            soilTop: cfg.soilTop || '#7a4a2b',
            soilDeep: cfg.soilDeep || '#4a2c19'
        };

        // Волны с разными частотами и амплитудами (псевдо-Перлин)
        // Уменьшили частоты для более плавного рельефа
        this.waves = [
            { amp: 50, freq: 0.0015, phase: Math.random() * Math.PI * 2 },
            { amp: 25, freq: 0.0040, phase: Math.random() * Math.PI * 2 },
            { amp: 12, freq: 0.0100, phase: Math.random() * Math.PI * 2 },
        ];

        // Прямые участки: массив {startX, endX, height}
        this.flatSections = [];
        this._generateFlatSections();
    }

    /**
     * Генерирует прямые участки на уровне
     */
    _generateFlatSections() {
        const levelLength = (window.CONFIG && window.CONFIG.world && window.CONFIG.world.levelLength) || 5000;
        const sectionCount = 4 + Math.floor(Math.random() * 3); // 4-6 прямых участков
        
        for (let i = 0; i < sectionCount; i++) {
            const length = 150 + Math.random() * 200; // длина 150-350px
            const startX = 400 + i * (levelLength / sectionCount) + Math.random() * 100;
            const heightOffset = (Math.random() - 0.5) * 60; // небольшое отклонение по высоте
            
            this.flatSections.push({
                startX: startX,
                endX: startX + length,
                heightOffset: heightOffset
            });
        }
    }

    /**
     * Проверяет, попадает ли точка в прямой участок
     * @param {number} x
     * @returns {{isFlat: boolean, heightOffset: number}|null}
     */
    _getFlatSection(x) {
        for (const section of this.flatSections) {
            if (x >= section.startX && x <= section.endX) {
                return { isFlat: true, heightOffset: section.heightOffset };
            }
        }
        return null;
    }

    /**
     * Высота (Y) земли в мировой координате X.
     * @param {number} x
     * @returns {number}
     */
    getHeightAt(x) {
        // Проверяем прямой участок
        const flatSection = this._getFlatSection(x);
        if (flatSection) {
            return this.baseLevel - flatSection.heightOffset;
        }

        // Иначе вычисляем через волны
        let offset = 0;
        for (const w of this.waves) {
            offset += Math.sin(x * w.freq + w.phase) * w.amp;
        }
        
        // Плавный переход к прямым участкам: интерполяция на границах
        const transitionZone = 60; // зона плавного перехода
        for (const section of this.flatSections) {
            // Левая граница перехода
            if (x > section.startX - transitionZone && x < section.startX) {
                const t = (x - (section.startX - transitionZone)) / transitionZone;
                const smoothT = t * t * (3 - 2 * t); // smoothstep
                const waveY = this.baseLevel - offset;
                const flatY = this.baseLevel - section.heightOffset;
                return waveY + (flatY - waveY) * smoothT;
            }
            // Правая граница перехода
            if (x > section.endX && x < section.endX + transitionZone) {
                const t = (x - section.endX) / transitionZone;
                const smoothT = t * t * (3 - 2 * t); // smoothstep
                const flatY = this.baseLevel - section.heightOffset;
                const waveY = this.baseLevel - offset;
                return flatY + (waveY - flatY) * smoothT;
            }
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

        // 1) Трава (утолщённый слой ~20px вместо ~12px)
        ctx.beginPath();
        ctx.moveTo(startX - cameraX, this.getHeightAt(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x - cameraX, this.getHeightAt(x));
        }
        ctx.lineTo(endX - cameraX, screenH);
        ctx.lineTo(startX - cameraX, screenH);
        ctx.closePath();

        // Градиент почвы: сверху — более толстый слой травы
        const topY = this.baseLevel - 150; // Увеличили зону градиента
        const grad = ctx.createLinearGradient(0, topY, 0, screenH);
        grad.addColorStop(0, this.colors.grassLayer);    // трава
        grad.addColorStop(0.13, this.colors.grassLayer); // трава (~20px)
        grad.addColorStop(0.14, this.colors.soilTop);    // почва
        grad.addColorStop(1, this.colors.soilDeep);      // глубокая земля
        ctx.fillStyle = grad;
        ctx.fill();

        // 2) Яркая линия травы поверх
        ctx.beginPath();
        ctx.moveTo(startX - cameraX, this.getHeightAt(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x - cameraX, this.getHeightAt(x));
        }
        ctx.strokeStyle = this.colors.grassTop;
        ctx.lineWidth = 4;
        ctx.stroke();
    }
}