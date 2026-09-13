/**
 * Точка входа: создаёт Input и Game, запускает игровой цикл через rAF.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('game');
    if (!canvas) {
        console.error('Canvas #game не найден');
        return;
    }

    const input = new Input();
    const game = new Game(canvas, input);

    let lastTime = performance.now();

    /**
     * Главный цикл.
     * dt нормируется так, чтобы 60 FPS ≈ 1.0.
     * @param {number} now
     */
    function loop(now) {
        let dt = (now - lastTime) / (1000 / 60);
        lastTime = now;

        // Клампим dt, чтобы после переключения вкладки игра не «прыгала»
        if (dt > 3) dt = 3;

        game.update(dt);
        game.draw();

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
})();