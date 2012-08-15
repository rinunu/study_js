/**
 * JavaScript グラフィックスより
 */


/**
 * ゲーム内時間を管理します
 *
 */
function timeInfo(goalFPS) {
    var oldTime,
        paused = true,

    // getInfo を実行した回数
        interCount = 0,
        totalFPS = 0,
        totalCoeff = 0;
    return {
        getInfo: function () {
            if (paused) {
                paused = false;
                oldTime = +new Date();
                return{
                    elapsed: 0,
                    coeff: 0,
                    FPS: 0,
                    averageFPS: 0,
                    averageCoeff: 0
                }
            }
            var newTime = +new Date();
            var elapsed = newTime - oldTime;
            oldTime = newTime;
            var FPS = 1000 / elapsed;
            interCount++;
            totalFPS += FPS;
            var coeff = goalFPS / FPS;
            totalCoeff += coeff;

            return {
                elapsed: elapsed,

                /**
                 * ゲームオブジェクトの変化の計算に用いる係数
                 */
                coeff: coeff,
                FPS: FPS,
                averageFPS: totalFPS / interCount,
                averageCoeff: totalCoeff / interCount
            }
        },

        /**
         * ゲーム開始時や中断時に実行します
         *
         * 実行すると、次回 getInfo 時にデータをクリアします。
         *
         * これにより、 coeff が大きな値になってしまうのを防ぎます。
         */
        pause: function () {
            paused = true;
        }
    }
}