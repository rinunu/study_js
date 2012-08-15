$(function () {
        var // 衝突オブジェクト
            PLAYER = 1,
            LASER = 2,
            ALIEN = 4,
            ALIEN_BOMB = 8,
            SHIELD = 16,
            SAUCER = 32,
        // 画面最上部
            TOP_OF_SCREEN = 64,


        // tank の位置
            TANK_Y = 352 - 16,

            SHIELD_Y = TANK_Y - 56,
            SCREEN_WIDTH = 480,
            SCREEN_HEIGHT = 384,
            ALIEN_COLUMNS = 11,
            ALIEN_ROWS = 5,
            SYS_process,
            SYS_collisionManager,
            SYS_timeInfo,
            SYS_spriteParams = {
                width: 32,
                height: 32,
                imagesWidth: 256,
                images: '/assets/images/invaders.png',
                $drawTarget: $('#draw-target')
            };

        var keys2 = function () {
            /**
             * キーと操作を関連付けます
             * @type {Object}
             */
            var keyMap = {
                '90': 'left', // z
                '88': 'right', // x
                '77': 'fire' // m
            };

            /**
             * 現在のキーの状態
             * 開放: 0
             * 押下: 1
             */
            var kInfo = {
                left: 0,
                right: 0,
                fire: 0
            };

            $(document).bind('keydown keyup', function (e) {
                var key = '' + e.which;
                if (keyMap[key] !== undefined) {
                    kInfo[keyMap[key]] = e.type === 'keydown' ? 1 : 0;
                    return false;
                }
            });
            return kInfo;
        }();

        /**
         * アニメを表示します
         */
        function animEffect(x, y, imageList, timeout) {
            var imageIndex = 0,
                that = DHTMLSprite(SYS_spriteParams);

            setTimeout(function () {
                that.removed = true;
                that.destroy();
            }, timeout)

            that.move = function () {
                that.changeImage(imageList[imageIndex]);
                imageIndex++;
                if (imageIndex === imageList.length) {
                    imageIndex = 0;
                }
                that.draw(x, y)
            };

            SYS_process.add(that);
        }

        /**
         * process を管理します。
         *
         * process は敵、ミサイル等、ゲームを構成するオブジェクトです
         */
        function processor() {
            var processList = [],
                addedItems = [];

            return {
                add: function (process) {
                    addedItems.push(process);
                },

                process: function () {
                    var newProcessList = [],
                        len = processList.length;
                    for (var i = 0; i < len; i++) {
                        if (!processList[i].removed) {
                            processList[i].move();
                            newProcessList.push(processList[i]);
                        }
                    }
                    processList = newProcessList.concat(addedItems);
                    addedItems = [];
                }
            }
        }

        /**
         * 衝突判定は一方向で行います。
         *
         * 衝突判定を持つオブジェクトは collider と呼びます。
         */
        function collisionManager() {
            // collider は grid に配置し、近くの grid にいる collider とのみ衝突判定します。
            // これにより、衝突判定処理を高速化します。

            var
            // 次に追加する collider に割り当てる index
                listIndex = 0,

            // 全グリッド
                grid = [],

            // 衝突判定を行う全 collider のリストです
                checkList = {},

            // 次に collider を追加する checkList の index
                checkListIndex = 0,

                gridWidth = 15,
                gridHeight = 12;

            for (var i = 0; i < gridWidth * gridHeight; i++) {
                grid.push({});
            }

            // x, y ピクセル座標の含まれる grid を返します
            function getGridList(x, y) {
                var i = (Math.floor(y / 32) * gridWidth) + Math.floor(x / 32);
                if (grid[i] === undefined) {
                    return;
                }
                return grid[i];
            }

            return {
                /**
                 *
                 * @param colliderFlag 自分の種類を表すビットです
                 * @param collideeFlags 自分と衝突判定を行う collider のビットセットです
                 * @param callback 衝突時に呼び出されます
                 */
                newCollider: function (colliderFlag, collideeFlags, width, height, callback) {
                    var
                    // 項目が画面外にあるとき undefined になりうる
                        list,

                    //
                        indexStr = '' + listIndex++,

                    //
                        checkIndex;

                    var colliderObj = {
                        colliderFlag: colliderFlag,
                        collideeFlags: collideeFlags,

                        // 高速化用
                        halfWidth: width / 2,
                        halfHeight: height / 2,
                        centerX: 0,
                        centerY: 0,

                        /**
                         * 衝突オブジェクトの座標を更新します
                         */
                        update: function (x, y) {
                            colliderObj.centerX = x + 16;
                            colliderObj.centerY = y + 32 - colliderObj.halfHeight;

                            // 古い grid から削除し
                            if (list) {
                                delete list[indexStr];
                            }

                            // 新しい grid へ入れる
                            list = getGridList(colliderObj.centerX, colliderObj.centerY);
                            if (list) {
                                list[indexStr] = colliderObj;
                            }
                        },

                        /**
                         * 衝突オブジェクトを collisionManager から削除します
                         */
                        remove: function () {
                            if (collideeFlags) {
                                delete checkList[checkIndex];
                            }
                            if (list) {
                                delete list[indexStr];
                            }
                        },

                        callback: callback,

                        /**
                         * 1つのグリッド内で、衝突処理を行います
                         *
                         * チェック対象のグリッドは自分が含まれるグリッド、もしくは
                         * offset で指定されたグリッドです
                         */
                        checkCollisions: function (offsetX, offsetY) {
                            // チェック対処
                            var list = getGridList(
                                colliderObj.centerX + offsetX,
                                colliderObj.centerY + offsetY);

                            if (!list) {
                                return;
                            }

                            var i, collideeObj;
                            for (i in list) {
                                if (list.hasOwnProperty(i) &&
                                    // 自分以外の collider
                                    i !== indexStr &&
                                    // 衝突判定する必要がある
                                    (colliderObj.collideeFlags & list[i].colliderFlag)) {

                                    collideeObj = list[i];
                                    if (Math.abs(colliderObj.centerX - collideeObj.centerX) >
                                        (colliderObj.halfWidth + collideeObj.halfWidth)) {
                                        continue;
                                    }
                                    if (Math.abs(colliderObj.centerY - collideeObj.centerY) >
                                        (colliderObj.halfHeight + collideeObj.halfHeight)) {
                                        continue;
                                    }

                                    console.log("hit!");
                                    collideeObj.callback(colliderObj.colliderFlag);
                                    callback(collideeObj.colliderFlag);
                                    return true;
                                }
                            }
                            return false;
                        }
                    };

                    if (collideeFlags) {
                        checkIndex = '' + checkListIndex++;
                        checkList[checkIndex] = colliderObj;
                    }
                    return colliderObj;
                },

                /**
                 * 衝突処理を行います
                 */
                checkCollisions: function () {
                    var i, collider;
                    // collider をループ
                    for (i in checkList) {
                        if (checkList.hasOwnProperty(i)) {
                            collider = checkList[i];
                            // 上下左右のグリッドに対して衝突判定を行います
                            for (var y = -32; y <= 32; y += 32) {
                                for (var x = -32; x <= 32; x += 32) {
                                    if (collider.checkCollisions(x, y)) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            };
        }

        /**
         *
         * @param frame 表示する絵
         */
        function alien(x, y, frame, points, hitCallback) {
            var
                animFlag = 0,
                collider,
                collisionWidth = 16;
            if (frame === 2) {
                collisionWidth = 22;
            } else if (frame === 4) {
                collisionWidth = 25;
            }

            var that = DHTMLSprite(SYS_spriteParams);

            that.canFire = false;

            that.remove = function (colliderFlag) {
                if (colliderFlag & SHIELD) {
                    return;
                }
                animEffect(x, y, [8], 250);
                that.destroy();
                collider.remove();
                that.removed = true;
                hitCallback(points);
            };

            collider = SYS_collisionManager.newCollider(ALIEN, 0, collisionWidth, 16, that.remove);
            collider.update(x, y);

            /**
             *
             */
            that.move = function (dx, dy) {
                that.changeImage(frame + animFlag);
                animFlag ^= 1; // 0 / 1 を交互に切り替える
                x += dx;
                y += dy;

                // (高速化) shield に近いものだけ、 shield との当たり判定をつけます
                if (!collider.collideeFlags && y >= SHIELD_Y - 16) {
                    collider.remove();
                    collider = SYS_collisionManager.newCollider(ALIEN, SHIELD,
                        collisionWidth, 16, that.remove);
                }
                collider.update(x, y);

                that.draw(x, y);

                // 壁にぶつかっているか
                if ((dx > 0 && x >= SCREEN_WIDTH - 32 - 16) || (dx < 0 && x <= 16)) {
                    return true;
                } else {
                    return false;
                }
            };

            that.getXY = function () {
                return{
                    x: x,
                    y: y
                };
            };

            return that;
        }


        /**
         *
         * @param x
         * @param y
         * @param removedCallback
         */
        function alienBomb(x, y, removedCallback) {
            var that = DHTMLSprite(SYS_spriteParams);
            var collider;

            that.changeImage(19);

            that.remove = function () {
                animEffect(x, y + 8, [18], 250);
                that.destroy();
                collider.remove();
                that.removed = true;
                removedCallback();
            };

            collider = SYS_collisionManager.newCollider(ALIEN_BOMB, SHIELD,
                6, 12, that.remove);

            that.move = function () {
                y += 3.5 + SYS_timeInfo.coeff;
                that.draw(x, y);
                collider.update(x, y);
                if (y >= TANK_Y) {
                    that.remove();
                }
            };

            SYS_process.add(that);
        }

        /**
         * alien を管理します
         */
        function aliensManager(gameCallback, startY) {
            var aliensList = [],

                paused = false,

            // 爆弾投下候補エイリアンs
                aliensFireList = [],

            // たまを撃っているエイリアンのインデックス
                moveIndex,

            // 移動量
                dx = 4,
                dy = 0,

                images = [0, 2, 2, 4, 4],
                changeDir = false,
                waitFire = false,
                scores = [40, 20, 20, 10, 10];

            function hitFunc(points) {
                if (!paused) {
                    that.pauseAliens(150);
                }
                gameCallback({
                    message: 'alienKilled',
                    score: points
                });
            }

            // エイリアンを生成します
            for (var y = 0; y < ALIEN_ROWS; y++) {
                for (var x = 0; x < ALIEN_COLUMNS; x++) {
                    var anAlien = alien((x * 32) + 16, (y * 32) + startY,
                        images[y], scores[y], hitFunc);
                    aliensList.push(anAlien);
                    if (y == ALIEN_ROWS - 1) {
                        aliensList[aliensList.length - 1].canFire = true;
                    }
                }
            }
            moveIndex = aliensList.length - 1;

            var that = {
                // 指定した時間だけ、インベーダ全体を停止します
                pauseAliens: function (pauseTime) {
                    paused = true;
                    setTimeout(function () {
                        paused = false;
                    }, pauseTime);
                },

                move: function () {
                    if (paused) {
                        return;
                    }
                    if (!aliensList.length) {
                        that.removed = true;
                        gameCallback({
                            message: 'allAliensKilled'
                        });
                        return;
                    }

                    var anAlien = aliensList[moveIndex];
                    if (anAlien.removed) {
                        // 一番下のインベーダーを探します
                        for (var i = aliensList.length - 1; i >= 0; i--) {
                            if (aliensList[i].getXY().x === anAlien.getXY().x &&
                                i !== moveIndex) {
                                if (i < moveIndex) {
                                    aliensList[i].canFire = true
                                }
                                break;
                            }
                        }
                        aliensList.splice(moveIndex, 1);
                        moveIndex--;
                        if (moveIndex === -1) {
                            moveIndex = aliensList.length - 1;
                        }
                        return;
                    }

                    if (anAlien.canFire) {
                        aliensFireList.push(anAlien);
                    }

                    // 移動量
                    var dx2 = dy ? 0 : dx; // 下へ移動中は横へは移動しない
                    if (anAlien.move(dx2, dy)) {
                        changeDir = true; // 壁にぶつかったなら
                    }

                    // tank に達したなら
                    if (anAlien.getXY().y >= TANK_Y) {
                        gameCallback({
                            message: 'aliensAtBottom'
                        });
                        return;
                    }

                    // 次の process では次の alien を動かす
                    moveIndex--;

                    // すべて動かした場合
                    if (moveIndex === -1) {
                        moveIndex = aliensList.length - 1;

                        // 速度更新
                        dy = 0;
                        var coeff = SYS_timeInfo.averageCoeff;
                        dx = 4 * (dx < 0 ? -coeff : coeff);
                        if (changeDir) {
                            dx = -dx;
                            changeDir = false;
                            dy = 16;
                        }

                        // 爆弾投下
                        if (!waitFire) {
                            var fireAlien = aliensFireList[Math.floor(Math.random() *
                                aliensFireList.length)];
                            var xy = fireAlien.getXY();
                            alienBomb(xy.x, xy.y, function () {
                                waitFire = false;
                            });
                            aliensFireList = [];
                            waitFire = true;
                        }
                    }
                }
            };

            SYS_process.add(that);
            return that;
        }

        function tank(gameCallback) {
            var x = ((SCREEN_WIDTH / 2) - 160),
                canFire = true,
                collider,

            // fire ボタンの開放を待つか
            // 押しっぱなし対策
                waitFireRelease = true,
                that = DHTMLSprite(SYS_spriteParams);

            that.changeImage(6);
            that.draw(x, TANK_Y);

            that.move = function () {
                var dx = keys.left ? -2 : 0;
                dx = keys.right ? 2 : dx;
                x += dx * SYS_timeInfo.coeff;

                if (dx > 0 && x >= (SCREEN_WIDTH / 2) + 168) {
                    x = (SCREEN_WIDTH / 2) + 168;
                }
                if (dx < 0 && x <= (SCREEN_WIDTH / 2) - 200) {
                    x = (SCREEN_WIDTH / 2) - 200;
                }

                that.draw(x, TANK_Y);
                collider.update(x, TANK_Y);

                if (canFire) {
                    if (keys.fire) {
                        if (!waitFireRelease) {
                            laser(x, TANK_Y + 8, function () {
                                canFire = true;
                            });
                            canFire = false;
                            waitFireRelease = true;
                        }
                    } else {
                        waitFireRelease = false;
                    }
                }
            };

            // tank に hit した際の処理です
            function hit() {
                collider.remove();
                that.destroy();
                that.removed = true;
                animEffect(x, TANK_Y, [8], 250);
                gameCallback({
                    message: 'playerKilled'
                });
            }

            collider = SYS_collisionManager.newCollider(PLAYER, ALIEN_BOMB,
                30, 12, hit);

            SYS_process.add(that);
        }

        /**
         * tank からの laser
         * @param callback laser が削除された場合に呼ばれます
         */
        function laser(x, y, callback) {
            var that = DHTMLSprite(SYS_spriteParams);
            var collider;

            function remove(collideeFlags) {
                if (collideeFlags & (TOP_OF_SCREEN + SHIELD + ALIEN_BOMB)) {
                    animEffect(x, y, [18], 250);
                }
                that.destroy();
                collider.remove();
                that.removed = true;
                setTimeout(callback, 200);
            }

            var collider = SYS_collisionManager.newCollider(LASER, ALIEN + ALIEN_BOMB +
                SHIELD + SAUCER, 2, 10, remove);
            that.changeImage(7);

            that.move = function () {
                y -= 7 * SYS_timeInfo.coeff;
                that.draw(x, y);
                collider.update(x, y);
                if (y <= -8) {
                    remove(TOP_OF_SCREEN);
                }
            };

            SYS_process.add(that);

        }


        function game() {
            SYS_process = processor();
            var time = timeInfo(60);
            var aliens;
            var aliensStartY;
            var gameState = 'titleScreen';
            var newTankTimeout;
            var lives;
            var startText =
                '<div class="message">' +
                    '<p>ORBIT ASSAULT</p>' +
                    '<p>Press FiRE to Start</p>' +
                    '<p>Z = LEFT</p>' +
                    '<p>X = RIGHT</p>' +
                    '<p>M = FIRE</p>' +
                    "</div>"

            function initShields() {
                // TODO
            }

            function updateScores() {
                // TODO
            }

            function newSaucer() {
                // TODO
            }

            /**
             * ゲームの状態を初期化し、ゲームを開始します
             */
            function init() {
                $("#draw-target").children().remove();
                SYS_process = processor();
                SYS_collisionManager = collisionManager();
                aliens = aliensManager(gameCallback, aliensStartY);

                setTimeout(function () {
                    tank(gameCallback);
                }, 2000);
                initShields();
                newSaucer();
                updateScores();
            }

            var gameOverFlag = false;

            function gameOver() {
                // TODO
                gameOverFlag = true;
                clearTimeout(newTankTimeout);
            }

            function gameCallback(messageObj) {
                if (gameOverFlag) {
                    return;
                }

                switch (messageObj.message) {
                    case 'alienKilled':
                        // TODO
                        break;
                    case 'saucerHit':
                        // TODO
                        break;
                    case 'playerKilled':
                        // TODO
                        aliens.pauseAliens(2500);
                        lives--;
                        if (lives <= 0) {
                            gameOver();
                        } else {
                            newTankTimeout = setTimeout(function () {
                                tank(gameCallback);
                            }, 2000);
                        }
                        break;
                }
            }

            function gameLoop() {
                SYS_timeInfo = time.getInfo();
                SYS_process.process();

                switch (gameState) {
                    case 'playing':
                        SYS_collisionManager.checkCollisions();

                        break;
                    case 'titleScreen':
                        //if (keys.fire) {
                        gameOverFlag = false;
                        lives = 3;
                        aliensStartY = 64;
                        gameState = 'playing';
                        init();
                        //}
                        break;
                }

                setTimeout(gameLoop, 15);
            }

            $("#draw-target").append(startText);
            gameLoop();
        }


        game();
    }

)
;


