/**
 * Обработчик клавиатуры с состоянием нажатых клавиш.
 */
class Input {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            jump: false,
        };
        this._jumpPressed = false; // флаг «только что нажали»
        this._bind();
    }

    _bind() {
        window.addEventListener('keydown', (e) => this._onKey(e, true));
        window.addEventListener('keyup', (e) => this._onKey(e, false));
    }

    _onKey(e, isDown) {
        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = isDown;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = isDown;
                e.preventDefault();
                break;
            case 'Space':
            case 'ArrowUp':
            case 'KeyW':
                if (isDown && !this.keys.jump) this._jumpPressed = true;
                this.keys.jump = isDown;
                e.preventDefault();
                break;
            case 'KeyR':
                if (isDown) this.restartRequested = true;
                break;
        }
    }

    /** Возвращает true один раз при новом нажатии прыжка */
    consumeJump() {
        if (this._jumpPressed) {
            this._jumpPressed = false;
            return true;
        }
        return false;
    }

    /** Сбрасывает состояние (используется при рестарте) */
    reset() {
        this.keys.left = false;
        this.keys.right = false;
        this.keys.jump = false;
        this._jumpPressed = false;
        this.restartRequested = false;
    }
}