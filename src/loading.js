/*
 * loading模块
 * @date:2014-09-24
 * @author:kotenei(kotenei@qq.com)
 */
define('km/loading', ['jquery'], function ($) {

    var loading = {};

    var $loading = $('<div class="km-loading"><i class="cmicon cmicon-spinner spin"></i></div>').hide();
    var $spin = $loading.find('.cmicon-spinner');

    $(document.body).append($loading);

    loading.show = function () {
        $loading.show().css({
            left: '50%',
            top:'50%',
            marginLeft: -($spin.width() / 2),
            marginTop: -($spin.height() / 2)
        });
        //$spin.css({
        //    marginLeft: -($spin.width() / 2),
        //    marginTop: -($spin.height() / 2)
        //})
    };

    loading.hide = function () {
        $loading.hide();
    };

    return loading;
});
