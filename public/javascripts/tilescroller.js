// JavaScript グラフィックスより

var tileScroller = function (params) {
    console.log(params);

    var $viewport = params.$viewport,

    // 表示範囲に表示する最大のタイル数
        tilesAcross = Math.ceil(($viewport.innerWidth()
            + params.tileWidth) / params.tileWidth),
        tilesDown = Math.ceil(($viewport.innerHeight()
            + params.tileHeight) / params.tileHeight),

    // 汎用カウンタ
        left,
        top,
        i;

    // $viewport
    // まずすべての要素を含む文字列を作り、そこから JQuery で要素に変換します。
    // こうすることで高速になります。
    var html = '<div class="handle" style="position: absolute;">'
    for (top = 0; top < tilesDown; top++) {
        for (left = 0; left < tilesAcross; left++) {
            html += '<div class="tile" style="position:absolute;' +
                'background-image:url(\'' + params.image + '\');' +
                'width:' + params.tileWidth + 'px;' +
                'height:' + params.tileHeight + 'px;' +
                'background-position: 0px 0px;' +
                'left:' + (left * params.tileWidth) + 'px;' +
                'top:' + (top * params.tileHeight) + 'px;' + '"/>';
        }
    }
    html += '</div>';
    $viewport.html(html);

    // すべてのタイルを表示する親要素
    // この要素を移動すると、子である全タイルも移動します。
    var handle = $('.handle', $viewport)[0];


    // 各タイルの style プロパティ
    var tileStyles = [];
    for (i = 0; i < tilesAcross * tilesDown; i++) {
        tileStyles.push($('.tile', $viewport)[i].style)
    }


    // 各タイルのビットマップ内での座標
    var tileBackPos = [];
    tileBackPos.push('0px 0px');
    for (top = 0; top < params.imageHeight; top += params.tileHeight) {
        for (left = 0; left < params.imageWidth; left += params.tileWidth) {
            tileBackPos.push(-left + 'px ' + -top + 'px');
        }
    }


    var that = {};
    // public に参照できると便利
    that.mapWidthPixels = params.mapWidth * params.tileWidth;
    that.mapheightPixels = params.mapHeight * params.tileHeight;

    /**
     * @param viewportX map にて viewport が置かれているピクセル座標
     * @param viewportY 同上
     */
    that.draw = function (viewportX, viewportY) {
        // >> 0 は float => int

        // TODO ラップする場合のコード

        // handle の位置を更新します
        var offsetX = -(viewportX % params.tileWidth) >> 0,
            offsetY = -(viewportY % params.tileHeight) >> 0;
        handle.style.left = offsetX + 'px';
        handle.style.top = offsetY + 'px';

        // ピクセル座標 => タイル座標
        var tilesViewportX = (viewportX / params.tileWidth) >> 0;
        var tilesViewportY = (viewportY / params.tileHeight) >> 0;

        var map = params.map,
            mapWidth = params.mapWidth,
            mapHeight = params.mapHeight,

            tilesY = tilesViewportY,

        // 最適化用. 現在処理中の tile の tileStyles 内での index
            tileInView = 0;

        for (var countDown = tilesDown; countDown; countDown--, tilesY++) {
            // TODO ラップ処理

            // 範囲外のタイルは描画しない
            if (tilesY < 0 || tilesY >= mapHeight) {
                for (var i = tilesAcross; i; i--) {
                    tileStyles[tileInView++].visibility = 'hidden';
                }
                continue;
            }

            // 横方向ループ
            var tilesX = tilesViewportX;
            var tilesLeft = tilesY * mapWidth; // 左端のタイル座標
            for (var countAcross = tilesAcross;
                 countAcross;
                 countAcross--, tilesX++, tileInView++) {
                // TODO ラップ処理

                // 範囲外のタイルは描画しない
                if (tilesX < 0 || tilesX >= mapWidth) {
                    tileStyles[tileInView].visibility = 'hidden';
                    continue;
                }

                var tileIndex = map[tilesLeft + tilesX];
                if (tileIndex != 0) {
                    tileStyles[tileInView].visibility = 'visible';
                    tileStyles[tileInView].backgroundPosition = tileBackPos[tileIndex];
                } else {
                    tileStyles[tileInView].visibility = 'hidden';

                }
            }
        }
    };
    return that;
};

/**
 * Tiled 形式ののマップを読み込みます
 *
 * 結果は tileScroller の配列として callback へ渡されます
 */
var loadMap = function (xmlFile, baseUrl, $viewports, callback) {
    var tileScrollers = [];
    $.ajax({
        type: "GET",
        url: xmlFile,
        dataType: "xml",
        success: function (xml) {
            var $imageInfo = $(xml).find('image'),
                $mapInfo = $(xml).find('map'),
                i;
            $(xml).find('layer').each(function () {
                // + つけているのは 文字列 => 数字
                //noinspection SpellCheckingInspection
                var params = {
                    tileWidth: +$mapInfo.attr('tilewidth'),
                    tileHeight: +$mapInfo.attr('tileheight'),
                    wrapX: false,
                    wrapY: false,
                    mapWidth: +$mapInfo.attr('width'),
                    mapHeight: +$mapInfo.attr('height'),
                    image: baseUrl + "/" + $imageInfo.attr('source'),
                    imageWidth: +$imageInfo.attr('width'),
                    imageHeight: +$imageInfo.attr('height')
                };

                var mapText = $(this).find('data').text().split(',');

                var $viewport = $('<div>');
                $viewport.attr({
                    'id': $(this).attr('name')
                }).css({
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        overflow: 'hidden'
                    });
                $viewports.append($viewport);
                params.$viewport = $viewport;
                params.map = [];
                for (i = 0; i < mapText.length; i++) {
                    params.map.push(+mapText[i]);
                }
                tileScrollers.push(tileScroller(params));
            });

            callback(tileScrollers);
        }
    });


};