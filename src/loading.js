/*
 * loading模块
 * @date:2014-09-24
 * @author:kotenei(kotenei@qq.com)
 */
define('km/loading', ['jquery'], function ($) {

    var loading = {};

    var $loading = $('<div class="km-loading"><i class="fa fa-spinner fa-spin"></i></div>').hide();
    var $spin = $loading.find('.fa-spin');

    $(document.body).append($loading);

    loading.show = function () {
        $loading.fadeIn('fast').css({
            marginLeft: -($spin.width() / 2),
            marginTop: -($spin.height() / 2)
        });
        //$spin.css({
        //    marginLeft: -($spin.width() / 2),
        //    marginTop: -($spin.height() / 2)
        //})
    };

    loading.hide = function () {
        $loading.fadeOut('fast');
    };

    return loading;
});
