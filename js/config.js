/**
 * Загрузчик конфигурации.
 * Пытается загрузить config.json через fetch. Если не удалось
 * (например, запуск с file://) — использует встроенные DEFAULTS.
 *
 * Все игровые классы читают параметры из window.CONFIG.
 */
(function () {
    'use strict';

    // Значения по умолчанию — совпадают с config.json.
    // Нужны как fallback, чтобы игра работала и без сервера.
    const DEFAULTS = {
        physics: {
            gravity: 0.42,
            maxFallSpeed: 16,
            playerJumpImpulse: -11,
            playerAcceleration: 0.6,
            playerMaxSpeed: 6,
            playerFriction: 0.82,
            killBounceImpulse: -8
        },
        player: {
            radius: 20,
            startLives: 3,
            damageInvincibilityMs: 1200,
            damageBlinkIntervalMs: 90,
            damagePulseScaleMin: 0.85,
            damagePulseScaleMax: 1.15,
            damageKnockbackX: -6,
            damageKnockbackY: -9
        },
        platforms: {
            width: 22,
            minWidth: 100,
            maxWidth: 180,
            minGapY: 90,
            maxGapY: 200,
            minGapX: 120,
            maxGapX: 320,
            lootSpawnChance: 0.6,
            lootOffsetAbove: 30
        },
        loot: {
            size: 22,
            defaultValue: 10,
            bobAmplitude: 6,
            bobSpeed: 0.08
        },
        enemy: {
            width: 40,
            height: 40,
            speed: 1.2,
            patrolRange: 90,
            scoreValue: 25,
            bobSpeed: 0.15
        },
        world: {
            screenWidth: 900,
            screenHeight: 600,
            terrainBaseLevel: 480,
            startZoneWidth: 900,
            minChunkWidth: 600,
            maxChunkWidth: 900
        },
        camera: {
            playerOffsetX: 300,
            lerp: 0.1
        }
    };

    /** Мелкое рекурсивное слияние: user поверх base */
    function merge(base, user) {
        if (!user || typeof user !== 'object') return base;
        const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
        for (const key of Object.keys(user)) {
            const bv = base[key];
            const uv = user[key];
            if (bv && uv && typeof bv === 'object' && typeof uv === 'object'
                && !Array.isArray(bv) && !Array.isArray(uv)) {
                out[key] = merge(bv, uv);
            } else {
                out[key] = uv;
            }
        }
        return out;
    }

    /**
     * Пытается загрузить config.json. Никогда не reject'ит —
     * в случае ошибки возвращает DEFAULTS.
     * @returns {Promise<object>}
     */
    async function loadConfig() {
        try {
            const res = await fetch('config.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const user = await res.json();
            console.info('[config] загружен config.json');
            return merge(DEFAULTS, user);
        } catch (err) {
            console.warn('[config] не удалось загрузить config.json, используются значения по умолчанию.', err.message);
            return DEFAULTS;
        }
    }

    // Публикуем API наружу
    window.GameConfig = {
        DEFAULTS,
        load: loadConfig
    };
})();