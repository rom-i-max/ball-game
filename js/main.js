/**
 * Точка входа: асинхронно загружаем config, затем стартуем игру.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('game');
    if (!canvas) {
        console.error('Canvas #game не найден');
        return;
    }

    async function boot() {
        // 1) Конфиг (всегда что-то вернёт — либо json, либо DEFAULTS)
        window.CONFIG = await window.GameConfig.load();

        // 2) Игровые системы
        const input = new Input();
        const game = new Game(canvas, input);

        // 3) Цикл
        let lastTime = performance.now();
        async function loop(now) {
            let dt = (now - lastTime) / (1000 / 60);
            lastTime = now;
            if (dt > 3) dt = 3;

            game.update(dt);
            game.draw();

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    boot();
})();