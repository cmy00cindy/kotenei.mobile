/**
 * 应用
 * @module km/app 
 * @author vfasky (vfasky@gmail.com)
 */
define('km/app', ['jquery', 'km/router', 'km/popTips'], function($, Router, popTips){
    var App = function($el, config){
        //路由绑定
        this._route = {};
        //当前view
        this._view = null;
        //绑定事件绑定
        this._on = {
            viewBeforeShow: [],
            viewAfterShow: []
        };
        //app 容器
        this.$el = $el;
        //配置
        this.config = $.extend({
          viewClass: 'app-view'
        }, config || {});
        
        //加载效果
        this.loading = {
            show: function(){
                
            },
            hide: function(){
                
            }
        };
        //提示效果
        this.showTip = popTips;
    };

    /**
     * 注册事件
     * @param  {String}   name     事件
     * @param  {Function} callback 回调
     * @return {km/App}          
     */
    App.prototype.on = function(name, callback){
        if(this._on.hasOwnProperty(name)){
            this._on[name].push(callback);
        }
        return this;
    };

    /**
     * 注销事件
     * @param  {String}   name     事件
     * @return {km/App}          
     */
    App.prototype.off = function(name){
        if(this._on.hasOwnProperty(name)){
            this._on[name] = [];
        }
        return this;
    };

    App.prototype.callView = function(viewName, context, callback){
        var self = this;
        var $el;

        callback = callback || function(){};
        //完成时回调
        var complete = function(view){
            callback();
            $.each(self._on.viewBeforeShow, function(fun){
                fun(view);
            });
        }

        if(self._view !== null){
            //已经加载，刷新
            if(self._view.name === viewName){
                self._view.instance.run(context);
                complete(self._view.instance);
                return;
            }
            //销毁旧view
            else{
                var oldView = self._view.instance;
                oldView.destroy();
            }
        }

        self.loading.show();
        $el = $('<div class="' + self.config.viewClass + '"></div>');
        //调度view
        require([viewName], function(View){
            self.loading.hide();
            //需要继承 km/view
            var view = new View($el, self);
            view.run(context);

            self._view = {
                name: viewName,
                instance: view
            };

            view.$el.appendTo(self.$el);
       
            complete(self._view.instance);
        });
    };

    //启动app
    App.prototype.run = function(){
        var self = this;
    };
});
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

                $tips.css({ marginLeft: -($tips.width() / 2), marginTop: -($tips.height() / 2) }).fadeIn('fase', function () {
                    tm = setTimeout(function () {
                        $tips.stop().remove();
                        callback();
                    }, delay);
                })
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

/**
 * 路由
 * @date :2014-09-21
 * @author kotenei(kotenei@qq.com)
 */
(function (window) {

    /**
     * 事件处理
     * @type {Object}
     */
    var eventHelper = {
        addEventListener: function (element, type, handle) {
            if (element.addEventListener) {
                element.addEventListener(type, handle, false);
            } else if (element.attachEvent) {
                element.attachEvent("on" + type, handle);
            } else {
                element["on" + type] = handle;
            }
        },
        removeEventListener: function (element, type, handle) {
            if (element.removeEventListener) {
                element.removeEventListener(type, handler, false);
            } else if (element.detachEvent) {
                element.detachEvent("on" + type, handler);
            } else {
                element["on" + type] = null;
            }
        },
        proxy: function (fn, thisObject) {
            var proxy = function () {
                return fn.apply(thisObject || this, arguments)
            }
            return proxy
        }
    };

    /**
     * 路由
     */
    var Router = function () {
        this._routes = [];
    };

    /**
     * 初始化
     * @return {Void}
     */
    Router.prototype.init = function () {
        var self = this;
        eventHelper.addEventListener(window, 'hashchange', eventHelper.proxy(self.listener, this));
        this.listener();
    };


    /**
     * 监听hash变化
     * @return {Void}
     */
    Router.prototype.listener = function () {
        var path = location.hash.slice(1);
        var route = this.getRoute(path);
        var values;

        if (!route) {
            location.replace('#/');
            return;
        }
        values = this.getValues(path, route);     
        route.handle.apply(route, values);
    };

    /**
     * 设置路由
     * @param  {String} routeUrl  - 路由地址
     * @param  {Object} constraints - 正则约束
     * @return {Object}     
     */
    Router.prototype.map = function (routeUrl, constraints, callback) {
        var reg, pattern, result, params = [];
        pattern = routeUrl.replace(/\//g, '\\/');

        if (typeof constraints === 'function') {
            callback = constraints;
            constraints = null;
        }

        if (constraints) {
            for (var k in constraints) {
                reg = new RegExp('\\{' + k + '\\}', 'g');
                pattern = pattern.replace(reg, '(' + constraints[k].replace(/\^/, '').replace(/\$/, '') + ')');
                params.push(k);
            }
        }

        //(?<={)[^}]+(?=}) js不支持零宽断言-_-b
        reg = new RegExp('{([^}]+)}', 'g');
        result;
        while ((result = reg.exec(pattern)) != null) {
            params.push(result[1]);
            reg.lastIndex;
        }

        pattern = '^' + pattern.replace(/{[^}]+}/gi, '(.+)') + '$';

        this._routes.push({
            routeUrl: routeUrl,
            pattern: pattern,
            params: params,
            handle: callback || function () { }
        });

        return this;
    };

    /**
     * 获取参数值
     * @param  {String} path  - 路径
     * @param  {Object} route - 路由相关信息
     * @return {Array}  
     */
    Router.prototype.getValues = function (path, route) {
        var route, values = [];

        if (path.length === 0) {
            return values;
        }

        route = route || this.getRoute(path);

        if (route != null) {
            var matches = path.match(route.pattern);
            if (matches.length != 0) {
                for (var i = 1; i < matches.length; i++) {
                    values.push(matches[i]);
                }
            }
        }
        return values;
    };

    /**
     * 获取匹配路由
     * @param  {String} path - 路径
     * @return {Object}     
     */
    Router.prototype.getRoute = function (path) {
        for (var i = 0; i < this._routes.length; i++) {
            if (new RegExp(this._routes[i].pattern).test(path)) {
                return this._routes[i];
            }
        }
        return null;
    };

    /**
     * 注册一个AMD模块
     * 
     */
    if (typeof window.define === "function" && define.amd) {
        define("km/router", [], function () {
            return Router;
        });
    } else {
        window.Router = Router;
    }

})(window);
/*
 * 消息提示模块
 * @date:2014-09-05
 * @author:kotenei(kotenei@qq.com)
 */
define('km/tooltips', ['jquery'], function ($) {

    /**
     * 消息提示模块
     * @param {JQuery} $element - dom
     * @param {Object} options - 参数
     */
    function Tooltips($element, options) {
        this.$element = $element;
        this.options = $.extend({}, {
            delay: 0,
            //title: '',
            content: '',
            tipClass: '',
            placement: 'right',
            trigger: 'hover click',
            container: document.body
        }, options);
        this.init();
    };

    /**
     * 初始化
     * @return {Void}
     */
    Tooltips.prototype.init = function () {
        this.$tips = $('<div class="km-tooltips"><div class="tooltips-arrow"></div><div class="tooltips-title"></div><div class="tooltips-inner"></div></div>');
        this.$tips.addClass(this.options.placement).addClass(this.options.tipClass);
        //this.setTitle();
        this.setContent();
        this.isShow = false;
        var triggers = this.options.trigger.split(' ');
        for (var i = 0, trigger; i < triggers.length; i++) {
            trigger = triggers[i];
            if (trigger === 'click') {
                this.$element.on(trigger + ".km-tooltips", $.proxy(this.toggle, this));
            } else if (trigger != 'manual') {
                var eventIn = trigger === 'hover' ? 'mouseenter' : 'focus';
                var eventOut = trigger === 'hover' ? 'mouseleave' : 'blur';
                this.$element.on(eventIn, $.proxy(this.show, this));
                this.$element.on(eventOut, $.proxy(this.hide, this));
            }
        }

        this.options.container ? this.$tips.appendTo(this.options.container) : this.$tips.insertAfter(this.$element);
        this.hide();
    };

    /*设置标题
    Tooltips.prototype.setTitle = function (title) {
        title = $.trim(title || this.options.title);
        if (title.length === 0) {
            title = this.$element.attr('data-title') || "";
        }
        var $tips = this.$tips;
        $tips.find('.tooltips-title').text(title);
    };*/

    /**
     * 设置内容
     * @param {String} content - 内容
     */
    Tooltips.prototype.setContent = function (content) {
        content = $.trim(content || this.options.content);
        if (content.length === 0) {
            content = this.$element.attr('data-content') || "";
        }
        var $tips = this.$tips;
        $tips.find('.tooltips-inner').html(content);
    };

    /**
     * 定位
     */
    Tooltips.prototype.setPosition = function () {
        var pos = this.getOffset();
        this.$tips.css(pos);
    };

    /**
     * 获取定位偏移值
     * @return {Object} 
     */
    Tooltips.prototype.getOffset = function () {
        var placement = this.options.placement;
        var container = this.options.container;
        var $element = this.$element;
        var $tips = this.$tips;
        var offset = $element.offset();
        var ew = $element.outerWidth();
        var eh = $element.outerHeight();
        var tw = $tips.outerWidth();
        var th = $tips.outerHeight();

        switch (placement) {
            case 'left':
                return { top: offset.top + eh / 2 - th / 2, left: offset.left - tw };
            case 'top':
                return { top: offset.top - th, left: offset.left + ew / 2 - tw / 2 };
            case 'right':
                return { top: offset.top + eh / 2 - th / 2, left: offset.left + ew };
            case 'bottom':
                return { top: offset.top + eh, left: offset.left + ew / 2 - tw / 2 };
        }
    };

    /**
     * 显示tips
     * @return {Void}
     */
    Tooltips.prototype.show = function () {
        if ($.trim(this.options.content).length === 0) {
            this.hide();
            return;
        }
        this.isShow = true;
        this.setPosition();
        this.$tips.show().addClass('in');
    };

    /**
     * 隐藏tips
     * @return {Void}
     */
    Tooltips.prototype.hide = function () {
        this.isShow = false;
        this.$tips.hide().removeClass('in');
    };

    /**
     * 切换
     * @return {Void}
     */
    Tooltips.prototype.toggle = function () {
        if (this.isShow) {
            this.hide();
        } else {
            this.show();
        }
    };

    /**
     * 全局tooltips
     * @param {JQuery} $elements - dom
     */
    Tooltips.Global = function ($elements) {
        var $elements = $elements || $('[data-module="tooltips"]');
        $elements.each(function () {
            var $this = $(this);
            var tooltips = Tooltips.Get($this);
            if (!tooltips) {
                tooltips = new Tooltips($this, {
                    title: $this.attr('data-title'),
                    content: $this.attr('data-content'),
                    placement: $this.attr('data-placement'),
                    tipClass: $this.attr('data-tipClass'),
                    trigger: $this.attr('data-trigger')
                });
                Tooltips.Set($this, tooltips);
            }
        });
    };

    /**
     * 从缓存获取对象
     * @param {JQuery} $element - dom
     */
    Tooltips.Get = function ($element) {
        return $element.data("tooltips");
    };

    /**
     * 设置缓存
     * @param {JQuery} $element - dom
     * @param {Object} tooltips - 缓存对象
     */
    Tooltips.Set = function ($element, tooltips) {
        $element.data("tooltips", tooltips);
    }

    return Tooltips;
});
/**
 * 
 * @module kotenei/util 
 * @author vfasky (vfasky@gmail.com)
 */
define('km/util', function(){
    var exports = {};

    var Ctor = function () {};
    exports.createProto = Object.__proto__ ? function(proto) {
        return {
            __proto__: proto
        };
    } : function(proto) {
        Ctor.prototype = proto;
        return new Ctor();
    };

    return exports;
});
/*
 * 表单验证模块 用法和jqeury.validate一样 轻量级
 * @date:2014-09-04
 * @author:kotenei(kotenei@qq.com)
 */
define('km/validate', ['jquery'], function ($) {

    /**
     * 表单验证模块
     * @param {JQuery} $form - dom
     * @param {Object} options - 参数
     */
    function Validate($form, options) {
        this.$form = $form;
        this.options = $.extend({}, Validate.DEFAULTS, options);
        this.rules = this.options.rules;
        this.messages = this.options.messages;
        this.init();
    }

    /**
     * 默认参数
     * @type {Object}
     */
    Validate.DEFAULTS = {
        errorClass: 'error',
        errorElement: 'label',
        rules: {},
        messages: {},
        focusClear: true,
        keyupClear: true,
        errorPlacement: null
    }

    /**
     * 初始化
     * @return {Void} 
     */
    Validate.prototype.init = function () {
        this.getValidFields();
        if (this.validFields.count === 0) {
            return;
        }
        this.eventBind();
    };

    /**
     * 获取验证的元素
     * @return {Void} 
     */
    Validate.prototype.getValidFields = function () {
        this.validFields = { data: {}, count: 0 };
        var self = this;
        var $elements = this.$form.find('input,select,textarea')
        .filter(function () {
            if (!(this.name in self.rules)) {
                return false;
            } else {
                return true;
            }
        }).each(function () {
            if (!self.validFields.data[this.name]) {
                self.validFields.data[this.name] = $(this);
                self.validFields.count++;
            }
        });
    };

    /**
     * 事件绑定
     * @return {Void} 
     */
    Validate.prototype.eventBind = function () {
        var self = this;
        this.$form.on('submit', function (e) {
            return self.validateFrom(e);
        }).on('focus blur keyup',
        ':text, [type="password"], [type="file"], select, textarea, ' +
        '[type="number"], [type="search"] ,[type="tel"], [type="url"], ' +
        '[type="email"], [type="datetime"], [type="date"], [type="month"], ' +
        '[type="week"], [type="time"], [type="datetime-local"], ' +
        '[type="range"], [type="color"]', function (e) {
            self.validate(e);
        }).on('click', '[type="radio"], [type="checkbox"], select, option', function (e) {
            self.validate(e);
        });
    };

    /**
     * 验证
     * @param  {Object} e - 事件
     * @return {Boolean}   
     */
    Validate.prototype.validate = function (e) {

        var element = e.target,
            $element = $(element),
            rules = this.rules[element.name],
            result, val;
        if (this.options.focusClear && e.type === "focusin"
            || this.options.keyupClear && e.type === "keyup") {
            this.hideError($element);
            return;
        }

        if (!rules) { return; }

        val = this.elementValue($element);

        for (var method in rules) {
            var rule = { method: method, parameters: rules[method] };

            result = this.methods[method].call(this, val, $element, rule.parameters);

            if (!result) {
                this.formatAndAdd(element, rule);
                return false;
            } else {
                this.hideError($element);
            }

        }
        return true;
    };

    /**
     * 表单提交时验证
     * @return {Boolean} 
     */
    Validate.prototype.validateFrom = function () {
        var self = this, pass = true;

        for (var item in this.validFields.data) {
            if (!self.validate({ target: this.validFields.data[item][0] })) { pass = false; }
        }
        return pass;
    };

    Validate.prototype.valid = function () {
        return this.validateFrom();
    };

    /**
     * 判断元素类别是不是单选或者复选框
     * @param  {Object} element - dom
     * @return {Boolean}        
     */
    Validate.prototype.checkable = function (element) {
        return (/radio|checkbox/i).test(element.type);
    };

    /**
     * 处理错误
     * @param  {Object} element - dom
     * @param  {Object} rule  - 验证规则
     * @return {Void}        
     */
    Validate.prototype.formatAndAdd = function (element, rule) {
        var $element = $(element);
        var message = this.defaultMessage(element, rule.method);
        message = this.format(message, rule.parameters);
        this.showError($element, message);
    };

    /**
     * 显示错误
     * @param  {JQuery} $element - dom
     * @param  {String} message - 错误信息
     * @return {Void}         
     */
    Validate.prototype.showError = function ($element, message) {
        if (this.checkable($element[0])) {
            $element = this.validFields.data[$element[0].name];
        }
        var $error = $element.data('error');
        if (!$error) {
            $error = $("<" + this.options.errorElement + ">").addClass(this.options.errorClass);
            $element.data('error', $error);
        }
        $error.html(message).show();
        $element.addClass(this.options.errorClass);
        if ($.isFunction(this.options.errorPlacement)) {
            this.options.errorPlacement($element, $error);
        } else {
            $error.insertAfter($element);
        }
    };

    /**
     * 隐藏错误
     * @param  {JQuery} $element - dom
     * @return {Void}        
     */
    Validate.prototype.hideError = function ($element) {
        if (this.checkable($element[0])) {
            $element = this.validFields.data[$element[0].name];
        }
        var $error = $element.data('error');
        $element.removeClass(this.options.errorClass);
        if ($.isFunction(this.options.errorPlacement)) {
            this.options.errorPlacement($element, $([]));
        }
        if (!$error) { return; }
        $error.hide();
    };

    /**
     * 获取默认提示
     * @param  {Object} element - dom
     * @param  {String} method  验证规则
     * @return {String}         
     */
    Validate.prototype.defaultMessage = function (element, method) {

        if (!this.messages[element.name]) {
            this.messages[element.name] = {};
            this.messages[element.name][method] = this.errorMessages[method];
        }

        if (!this.messages[element.name][method]) {
            this.messages[element.name][method] = this.errorMessages[method];
        }

        return this.messages[element.name][method];
    };

    /**
     * 获取格式化错误提示
     * @param  {String} message - 错误提示
     * @param  {Object} params - 格式化参数
     * @return {String}        
     */
    Validate.prototype.format = function (message, params) {
        if (message.indexOf('{0}') != -1) {
            if (params.constructor !== Array) {
                params = [params];
            }
            $.each(params, function (i, n) {
                message = message.replace(new RegExp("\\{" + i + "\\}", "g"), function () {
                    return n;
                });
            });
        }
        return message;
    };

    /**
     * 默认错误提示信息
     * @type {Object}
     */
    Validate.prototype.errorMessages = {
        required: '该字段不能为空',
        email: '电子邮箱格式错误',
        url: 'url格式错误',
        date: '请输入一个有效日期',
        dateISO: '请输入一个有效日期（ISO）',
        mobile: '手机号码格式错误',
        phone: '电话号码格式错误',
        number: '请输入一个有效的数字',
        digits: '请输入正整数',
        minLength: '请输入一个长度不小于{0}个字符的值',
        maxLength: '请输入一个长度不大于{0}个字符的值',
        rangeLength: '请输入一个长度介于{0}到{1}个字符的值',
        min: '请输入一个大于或等于{0}的值',
        max: '请输入一个小于或等于{0}的值',
        range: '请输入一个介于{0}到{1}之间的数值',
        equalTo: '请再输入一个相同的值',
        remote: '远程验证失败'
    };


    /**
     * 验证的规则
     * @type {Object}
     */
    Validate.prototype.methods = {
        required: function (value, $element) {
            if ($element[0].nodeName.toLowerCase() === "select") {   
                var val = $.trim($element.val());
                return val && val.length > 0;
            }
            if (this.checkable($element[0])) {
                return this.getLength(value, $element[0]) > 0;
            }
            return $.trim(value).length > 0;
        },
        email: function (value, $element) {
            return this.optional($element) || /^(?:[a-z0-9]+[_\-+.]+)*[a-z0-9]+@(?:([a-z0-9]+-?)*[a-z0-9]+.)+([a-z]{2,})+$/i.test(value);
        },
        url: function (value, $element) {
            return this.optional($element) || /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
        },
        date: function (value, $element) {
            return this.optional($element) || !/Invalid|NaN/.test(new Date(value).toString());
        },
        dateISO: function (value, $element) {
            return this.optional($element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\s\d{1,2}[:]\d{1,2}[:]\d{1,2}\w$/.test(value);
        },
        mobile: function (value, $element) {
            return this.optional($element) || /^((13[0-9])|(15[^4,\\D])|(18[0,5-9]))\d{8}$/.test(value);
        },
        phone: function (value, $element) {
            return this.optional($element) || /^((0\d{2,3}\-)[1-9]\d{7}(\-\d{1,4})?)$/.test(value);
        },
        number: function (value, $element) {
            return this.optional($element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(value);
        },
        digits: function (value, $element) {
            return this.optional($element) || /^\d+$/.test(value);
        },
        minLength: function (value, $element, param) {
            var length = $.isArray(value) ? value.length : this.getLength($.trim(value), $element[0]);
            return this.optional($element) || length >= param;
        },
        maxLength: function (value, $element, param) {
            var length = $.isArray(value) ? value.length : this.getLength($.trim(value), $element[0]);
            return this.optional($element) || length <= param;
        },
        rangeLength: function (value, $element, param) {
            var length = $.isArray(value) ? value.length : this.getLength($.trim(value), $element[0]);
            return this.optional($element) || (length >= param[0] && length <= param[1]);
        },
        min: function (value, $element, param) {
            return this.optional($element) || value >= param;
        },
        max: function (value, $element, param) {
            return this.optional($element) || value <= param;
        },
        range: function (value, $element, param) {
            return this.optional($element) || (value >= param[0] && value <= param[1]);
        },
        equalTo: function (value, $element, param) {
            var $element = $(param);
            return value === this.elementValue($element);
        },
        remote: function (value, $element, param) {
            var url, data = {}, self = this;

            var previous = this.previousValue($element[0]);

            if (previous.old === value) {
                return previous.valid;
            }

            previous.old = value;

            if (typeof param === "string") {
                url = param;
            } else {
                url = param.url;
                data = param.data;
            }

            data[$element[0].name] = value;
            data["rnd"] = Math.random();

            $.post(url, data)
            .success(function (msg) {
                var valid = msg === true || msg === "true";
                if (valid) {
                    self.hideError($element);
                } else {
                    self.showError($element, previous.message)
                }
                previous.valid = valid;
            })
            .error(function () { return false; });

            return true;
        }
    };

    /**
     * 记录之前的远程验证信息
     * @param  {Object} element - dom
     * @return {Object}       
     */
    Validate.prototype.previousValue = function (element) {
        return $.data(element, "previousValue") || $.data(element, "previousValue", {
            old: null,
            valid: true,
            message: this.defaultMessage(element, "remote")
        });
    }

    /**
     * 可选方法，验证时值非必填
     * @param  {JQuery} $element - dom
     * @return {Boolean}        
     */
    Validate.prototype.optional = function ($element) {
        var val = this.elementValue($element);
        return !this.methods.required.call(this, val, $element);
    };

    /**
     * 取元素值
     * @param  {JQuery} $element - dom
     * @return {String}      
     */
    Validate.prototype.elementValue = function ($element) {
        var type = $element.attr("type"),
            val = $element.val();

        if (type === "radio" || type === "checkbox") {
            return $("input[name='" + $element.attr("name") + "']:checked").val();
        }

        if (typeof val === "string") {
            return val.replace(/\r/g, "");
        }
        return val;
    };

    /**
     * 获取选中项元素的长度
     * @param  {String} value  - 元素值
     * @param  {Object} element - dom
     * @return  {Number}         
     */
    Validate.prototype.getLength = function (value, element) {
        switch (element.nodeName.toLowerCase()) {
            case "select":
                return $("option:selected", element).length;
            case "input":
                if (this.checkable(element)) {
                    return this.$form.find("[name='" + (element.name) + "']").filter(":checked").length;
                }
        }
        return value.length;
    };

    return Validate;

});
/*
 * validate扩展  使用tooltips显示错误
 * @date:2014-09-06
 * @author:kotenei(kotenei@qq.com)
 */
define('km/validateTooltips', ['jquery', 'km/validate', 'km/tooltips', 'km/util'], function ($, Validate, Tooltips, util) {
	
	/**
     * 表单验证模块
     * @param {JQuery} $form - dom
     * @param {Object} options - 参数
     */	
	var ValidateTooltips = function($form, options){
	    Validate.call(this, $form, options);
	};

	ValidateTooltips.prototype = util.createProto(Validate.prototype);

	/**
	 * 获取元素错误提示定位
	 * @param  {object} element - dom
	 * @return {String}       
	 */
	ValidateTooltips.prototype.getTipsPlacement = function (element) {
		var name = element.name, placement = "bottom";
		if (!this.tipsPlacement) {
			this.tipsPlacement = this.options.tipsPlacement || {};
		}
		if (!this.tipsPlacement[name]) {
			this.tipsPlacement[name] = placement;
		} else {
			placement = this.tipsPlacement[name];
		}
		return placement;
	};

	/**
	 * 显示tips错误
	 * @param  {JQuery} $element - dom
	 * @param  {String} message - 错误信息
	 * @return {Void}        
	 */
	ValidateTooltips.prototype.showError = function ($element, message) {
		if (this.checkable($element[0])) {
			$element = this.validFields.data[$element[0].name];
		}
		var placement = this.getTipsPlacement($element[0]);
		var tooltips = Tooltips.Get($element);
		if (!tooltips) {
			tooltips = new Tooltips($element, {
				content: message,
				tipClass: 'danger',
				trigger: 'manual',
                placement:placement
			});
			Tooltips.Set($element, tooltips);
		} else {
			tooltips.setContent(message);
		}
		tooltips.show();
		$element.addClass(this.options.errorClass);
	};

	/**
	 * 隐藏tips错误
	 * @param  {JQuery} $element -dom
	 * @return {Void}  
	 */
	ValidateTooltips.prototype.hideError = function ($element) {
		if (this.checkable($element[0])) {
			$element = this.validFields.data[$element[0].name];
		}
		var tooltips = Tooltips.Get($element);
		if (tooltips) {
			tooltips.hide();
		}
		$element.removeClass(this.options.errorClass);
		
	};

	return ValidateTooltips;
});
;
define("km", ["km/app", "km/popTips", "km/router", "km/tooltips", "km/util", "km/validate", "km/validateTooltips"], function(_app, _popTips, _router, _tooltips, _util, _validate, _validateTooltips){
    return {
        "App" : _app,
        "popTips" : _popTips,
        "Router" : _router,
        "Tooltips" : _tooltips,
        "util" : _util,
        "Validate" : _validate,
        "ValidateTooltips" : _validateTooltips
    };
});