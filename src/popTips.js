/*
 * 弹出提示模块
 * @date:2014-09-10
 * @author:kotenei(kotenei@qq.com)
 */
define('km/popTips', ['jquery'], function ($) {

    /**
     * 弹出提示模块
     * @return {Object} 
     */
    var PopTips = (function () {

        var _instance;

        function init() {

            var $tips, tm;

            function build(status, content, delay, callback) {

                if (tm) { clearTimeout(tm); }

                if ($.isFunction(delay)) { callback = delay; delay = 3000; }

                callback = callback || $.noop;
                delay = delay || 3000;

                if ($tips) { $tips.stop().remove(); }

                $tips = $(getHtml(status, content))
                        .appendTo(document.body);

                $tips.css({
                    left: "50%",
                    top:"50%",
                    marginLeft: -($tips[0].offsetWidth / 2),
                    marginTop: -($tips[0].offsetHeight / 2)
                })

                tm = setTimeout(function () {
                    $tips.stop().remove();
                    callback();
                }, delay);
            }

            function getHtml(status, content) {
                var html = [];
                switch (status) {
                    case "success":
                        html.push('<div class="km-pop-tips success"><span class="fa fa-check"></span>&nbsp;<span>' + content + '</span></div>');
                        break;
                    case "error":
                        html.push('<div class="km-pop-tips error"><span class="fa fa-close"></span>&nbsp;<span>' + content + '</span></div>');
                        break;
                    case "warning":
                        html.push('<div class="km-pop-tips warning"><span class="fa fa-exclamation"></span>&nbsp;<span>' + content + '</span></div>');
                        break;
                }
                return html.join('');
            }

            return {
                success: function (content, callback, delay) {
                    build("success", content, callback, delay);
                },
                error: function (content, callback, delay) {
                    build("error", content, callback, delay);
                },
                warning: function (content, callback, delay) {
                    build("warning", content, callback, delay);
                }
            };
        }

        return {
            getInstance: function () {
                if (!_instance) {
                    _instance = init();
                }
                return _instance;
            }
        }
    })();

    return PopTips.getInstance();
});
