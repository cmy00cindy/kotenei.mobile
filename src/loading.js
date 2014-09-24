/*
 * loading模块
 * @date:2014-09-24
 * @author:kotenei(kotenei@qq.com)
 */
define('km/loading', ['jquery'], function ($) {

    
    var loading = {};
    
    var $loading = $('<div class="km-loading"><i class="fa fa-spinner fa-spin"></i></div>').hide();

    $(document.body).append($loading);

    loading.show = function () {
        $loading.fadeIn();
    };

    loading.hide = function () {
        $loading.fadeOut();
    };

    return loading;
});
