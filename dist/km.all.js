/**
 * 应用
 * @module km/app 
 * @author vfasky (vfasky@gmail.com)
 */
define('km/app', ['jquery', 'km/router', 'km/popTips', 'km/util','km/loading'], function($, Router, popTips, util,loading){
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
          viewClass: 'app-view',
          Template: null
        }, config || {});
        
        //加载效果
        this.loading = {
            show: function(){
                loading.show();
            },
            hide: function(){
                loading.hide();
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

        $.map(self._on.viewBeforeShow, function(fun){
            fun(viewName);
        });

        callback = callback || function(){};
        //完成时回调
        var complete = function(view){
            callback();
            $.map(self._on.viewAfterShow, function(fun){
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

        var callView = function(View){
            self.loading.hide();
            $el = $('<div class="' + self.config.viewClass + '"></div>');
            // console.log(View);
            //需要继承 App.View
            var view = new View($el, self);
            view.run(context);

            self._view = {
                name: viewName,
                instance: view
            };

            view.$el.appendTo(self.$el);
       
            complete(self._view.instance);
        };

        if(typeof(viewName) === 'string'){
            //调度view
            var _require = window.requirejs || window.require;
            _require([viewName], function(View){
                callView(View);
            });
        }
        else{
            callView(viewName);
        }
    };

    /**
     * 注册路由
     *
     * @param {String} path - 路径名
     * @param {String} viewName - 视图名
     * @return {Void}
     */
    App.prototype.route = function(path, constraints, viewName){
        if(viewName === undefined){
            viewName    = constraints;
            constraints = {};
        }
        this._route[path] = [constraints, viewName];
        return this;
    };
    
    App.prototype.url = function(viewName){
        viewName = $.trim(viewName);
        for(var k in this._route){
            var v = this._route[k];
            if(viewName === v[1]){
                return k;
            }
        }
    };

    //启动app
    App.prototype.run = function(){
        var self = this;

        var router = new Router()

        for(var path in self._route){
            (function(path){
                var info = self._route[path];
                router.map(path, info[0], function(params){
                    self.callView(info[1], params || {});
                });
            })(path);
        }
        router.init();
    };

    App.View = function($el, app){
        var self = this;
        this.$el = $el;
        this.app = app;

        //模板引擎绑定
        if(app.config.Template){
            this.Template = app.config.Template;
        }

        //封装一个 promise 规范的http helper
        this.http = {
            get: function(url, data){
                return self.ajax('GET', url, data);
            },
            post: function(url, data){
                return self.ajax('POST', url, data);
            },
            put: function(url, data){
                return self.ajax('PUT', url, data);
            },
            head: function(url, data){
                return self.ajax('HEAD', url, data);
            },
            'delete': function(url, data){
                return self.ajax('DELETE', url, data);
            } 
        }; 
    };

    App.View.prototype.ajax = function(type, url, data){
        var self = this;
        var dtd = $.Deferred();
        self.app.loading.show();
        $.ajax(url, {
            type: type,
            cache: false,
            data: data || {},
            dataType: 'json'
        }).done(function(ret){
            if (ret.state) {
                ret.Status = ret.state;
                if(ret.error){
                    ret.ErrorMessage = ret.error;
                }
                if(ret.url){
                    ret.Url = ret.url;
                }
            }
            if(ret.Status === false){
                self.app.loading.hide();
                self.app.showTip.error(ret.ErrorMessage || '发生未知错误', 1000);
                if(ret.Url){
                    setTimeout(function(){
                        window.location.href = ret.Url;
                    }, 800);
                }
            }
            else {
                self.app.loading.hide();
                dtd.resolve(ret);
            }
        }).fail(function(){
            self.app.loading.hide();
            self.app.showTip.error('服务端发生错误了', 1000);
        });
        return dtd.promise(); 
    };

    App.View.prototype.when = function(){
        return $.when.apply(this, arguments);
    };

    App.View.prototype.run = function(context){
        this.context = context;
    };

    App.View.prototype.destroy = function(){
        this.$el.remove();
    };

    App.View.extend = function(definition){
        definition = $.extend({
            initialize: function(){}
        }, definition || {});

        var initialize = definition.initialize;

        var View = function($el, app){
            this.superclass = App.View.prototype;
            this.superclass.initialize = App.View;
            initialize.call(this, $el, app);
        };

        View.prototype = util.createProto(App.View.prototype);

        delete definition.initialize;

        for(var k in definition){
            View.prototype[k] = definition[k];
        }
        return View;
    };

    return App;
});

/**
 * 自动完成模块
 * @date :2014-09-23
 * @author kotenei (kotenei@qq.com)
 */
define('km/autoComplete', ['jquery'], function ($) {

    /**
     * keycode
     * @type {Object}
     */
    var KEY = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        TAB: 9,
        ENTER: 13
    };

    /**
     * 自动完成模块
     * @param {JQuery} $element - dom
     * @param {Object} options - 参数
     */
    var AutoComplete = function ($element, options) {
        this.$element = $element;
        this.options = $.extend({}, {
            url: null,
            zIndex: 1000,
            data: [],
            max: 10,
            width: null,
            height: null,
            isBottom: true,
            hightLight: false,
            formatItem: function (item) { return item; },
            callback: {
                setValue: null
            }
        }, options);
        this.tpl = '<div class="km-autocomplete"></div>';
        this.active = 0;
        this.init();
    };

    /**
     * 初始化
     * @return {Void}
     */
    AutoComplete.prototype.init = function () {
        var self = this;
        this.$listBox = $(this.tpl).hide().appendTo(document.body);
        this.data = this.options.data || [];
        this.$element.on('input paste', function (e) {
            var $this = $(this),
                val = $.trim($this.val());

            if (!self.cache) {
                self.cache = val;
                self.search(val);
                self.active = 0;
            } else if (self.cache != val) {
                self.cache = val;
                self.search(val);
                self.active = 0;
            }

            switch (e.keyCode) {
                case KEY.UP:
                case KEY.LEFT:
                    e.preventDefault();
                    self.prev();
                    break;
                case KEY.DOWN:
                case KEY.RIGHT:
                    self.next();
                    break;
                case KEY.ENTER:
                case KEY.TAB:
                    self.select();
                    break;
                default:
                    break;
            }
        });

        this.$listBox.on('click', 'li', function () {
            var text = $(this).text();
            self.$element.val(text).focus();
            if ($.isFunction(self.options.callback.setValue)) {
                var item = self.getItem(text);
                self.options.callback.setValue(item);
            };

        });


        $(document).on('click.autocomplete', function () {
            self.hide();
        });

        $(window).on('resize.autocomplete', function () {
            self.setCss();
        })
    };

    /**
     * 搜索数据
     * @param  {String} value - 输入值
     * @return {Void}       
     */
    AutoComplete.prototype.search = function (value) {
        var self = this;
        if (this.options.url) {
            $.ajax({
                mode: "abort",
                type: 'GET',
                url: this.options.url,
                cache: false,
                data: { keyword: value }
            }).done(function (ret) {
                if (ret && ret instanceof Array) {
                    var data;
                    self.data = ret;
                    data = self.getData(value);
                    self.build(value, data);
                    self.show();
                }
            });
        } else if (this.options.proxy) {
            this.options.proxy(value, function (data) {
                self.data = data;
                data = self.getData(value);
                self.build(value, data);
                self.show();
            });
        } else {
            var data = this.getData(value);
            this.build(value, data);
            this.show();
        }
    };

    /**
     * 获取数据
     * @param  {String} value - 输入值
     * @return {Array}     
     */
    AutoComplete.prototype.getData = function (value) {
        this.cacheData = [];
        var data = [], flag = 0;
        if (value.length === 0) { return data; }
        for (var i = 0, formatted; i < this.data.length; i++) {
            formatted = this.options.formatItem(this.data[i]);
            if (formatted.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
                this.cacheData.push(this.data[i]);
                data.push(formatted);
                if (flag === (this.options.max - 1)) {
                    break;
                }
                flag++;
            }
        }
        return data;
    };

    /**
     * 构造列表
     * @param  {Array} data - 数据
     * @return {Void}    
     */
    AutoComplete.prototype.build = function (value, data) {
        this.$listBox.find('ul').remove();
        this.$listItem = null;
        if (data.length === 0) { return; }
        var html = '<ul>';
        for (var i = 0; i < data.length; i++) {
            html += '<li class="' + (i == 0 ? "active" : "") + '">' + this.hightLight(value, data[i]) + '</li>';
        }
        html += '</ul>';
        this.$listBox.append(html);
        this.$list = this.$listBox.find('ul');
        this.$listItem = this.$listBox.find('li');
    };

    /**
     * 高亮显示
     * @param  {String} char - 匹配字符
     * @param  {String} str  -  需要高亮的字符串
     * @return {String}      
     */
    AutoComplete.prototype.hightLight = function (char, str) {
        if (this.options.hightLight) {
            var reg = new RegExp('(' + char + ')', 'ig');
            str = str.replace(reg, '<strong>$1</strong>');
            return str;
        } else {
            return str;
        }
    };

    /**
     * 显示列表
     * @return {Void}
     */
    AutoComplete.prototype.show = function () {
        if (!this.hasItem()) { this.hide(); return; }
        this.setCss();
        this.$listBox.show();
    };


    /**
     * 获取样式
     * @return {Object}
     */
    AutoComplete.prototype.getCss = function () {
        var css = {
            left: this.$element.offset().left,
            top: this.$element.outerHeight() + this.$element.offset().top,
            width: this.options.width || this.$element.outerWidth()
        }

        if (!this.options.isBottom) {
            css.top = this.$element.offset().top - this.$listBox.outerHeight(true);
        }
        return css;
    };

    /**
     * 设置样式
     * @return {Void}
     */
    AutoComplete.prototype.setCss = function () {
        this.$list.css('max-height', this.options.height || "auto");
        var css = this.getCss();
        this.$listBox.css(css);
    }


    /**
     * 隐藏列表
     * @return {Void} 
     */
    AutoComplete.prototype.hide = function () {
        this.$listBox.hide();
    };

    /**
     * 移动到上一项
     * @return {Void} 
     */
    AutoComplete.prototype.prev = function () {
        this.moveSelect(-1);
    };

    /**
     * 移动下一项
     * @return {Void}
     */
    AutoComplete.prototype.next = function () {
        this.moveSelect(1);
    };

    /**
     * 判断是否有列表项
     * @return {Boolean} 
     */
    AutoComplete.prototype.hasItem = function () {
        return this.$listItem && this.$listItem.length > 0;
    };

    /**
     * 移动到选择项
     * @param  {Number} step - 移动步数
     * @return {Void}    
     */
    AutoComplete.prototype.moveSelect = function (step) {
        if (!this.hasItem()) { return; }
        this.active += step;
        if (this.active < 0) {
            this.active = this.$listItem.length - 1;
        } else if (this.active > this.$listItem.length - 1) {
            this.active = 0;
        }
        var $curItem = this.$listItem.removeClass('active').eq(this.active).addClass('active');
        var offset = 0;
        this.$listItem.each(function () {
            offset += this.offsetHeight;
        });

        var listScrollTop = this.$list.scrollTop(),
            clientHeight = this.$list[0].clientHeight,
            itemHeight = $curItem.height(),
            itemTop = $curItem.position().top;

        if (itemTop > clientHeight) {
            this.$list.scrollTop(itemTop + itemHeight - clientHeight + listScrollTop);
        } else if (itemTop < 0) {
            this.$list.scrollTop(listScrollTop + itemTop)
        }

    };

    /**
     * 选择项
     * @return {Void} 
     */
    AutoComplete.prototype.select = function () {
        var $item = this.$listBox.find('li.active');
        var text = $item.text();
        this.$element.val(text);
        this.hide();
        if ($.isFunction(this.options.callback.setValue)) {
            var item = this.getItem(text);
            this.options.callback.setValue(item);
        }
    };

    //根据值获取数据项
    AutoComplete.prototype.getItem = function (value) {
        var data = this.cacheData;
        if (!data || data.length === 0) { return; }
        for (var i = 0, formatted; i < data.length; i++) {
            formatted = this.options.formatItem(data[i]);
            if (value === formatted) {
                return data[i];
            }
        }
        return null;
    }

    return AutoComplete;

});

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
        var paths = location.hash.slice(1).split('?');
        var path = paths[0], params;

        if (paths[1]) {
            params = this.getUrlParams(paths[1]);
        }

        var route = this.getRoute(path);
        var values, ret = {};

        if (!route) {
            location.replace('#/');
            return;
        }

        values = this.getValues(path, route);

        for (var i = 0; i < route.params.length; i++) {
            ret[route.params[i]] = values[i];
        }

        params = $.extend({}, ret, params);
        route.handle(params);
    };

    /**
    * 取URL参数  param1=value1&param2=value2
    * @param  {String} str  - 带参数的字符串    
    */
    Router.prototype.getUrlParams = function (str) {
        var params = {};
        if (!str) { return params; }
        var arrStr = str.split('&');
        for (var i = 0, arrParams; i < arrStr.length; i++) {
            arrParams = arrStr[i].split('=');
            params[arrParams[0]] = arrParams[1];
        }
        return params;
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
        return false;
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
 * @module km/util 
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
     * 添加自定义验证规则
     * @param  {String} name - 验证名称
     * @param  {Function} name - 验证方法
     * @param  {String} name - 验证出错提示
     * @return {String}  
     */
    Validate.prototype.addMethod = function (name, method, message) {
        this.methods[name] = method;
        this.errorMessages[name] = message !== undefined ? message : this.errorMessages[name];
    }

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
            return this.optional($element) || /^((13[0-9])|(15[^4,\\D])|(18[0,5-9])|(170)|(177)|(181))\d{8}$/.test(value);
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


    /**
     * 取表单数据
     * @return {Object}
     */
    Validate.prototype.getData = function(){
        var data = {};
        var self  = this;
        self.$form.find('input[name], textarea[name]').each(function(){
            var $el = $(this);
            if($el.is('[type=checkbox]') === false && $el.is('[type=radio]') === false){
                data[$el.attr('name')] = $.trim($el.val());
            }
            else if($el.is('[type=radio]:checked')){
                data[$el.attr('name')] = $.trim($el.val());
            }
            else if($el.is('[type=checkbox]:checked')){
                var name = $el.attr('name');
                if(!data[name]){
                    data[name] = [];
                }
                data[name].push($el.val());
            }
        });
        return data;
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
/*
 * 字符限制模块
 * @date:2014-09-8
 * @author:kotenei(kotenei@qq.com)
 */
define('km/wordLimit', ['jquery'], function ($) {

    /**
     * 字符限制模块
     * @param {JQuery} $element - dom
     * @param {Object} options - 参数设置
     */
    var WordLimit = function ($element, options) {
        this.$element = $element;
        this.options = $.extend({}, {
            maxLength: 140,
            feedback: '.chars'
        }, options);
        this.init();
    };

    /**
     * 初始化
     * @return {Void}
     */
    WordLimit.prototype.init = function () {
        var self = this;
        this.maxLength = parseInt(this.$element.attr('maxLength') || this.options.maxLength);
        this.$feedback = $(this.options.feedback);
        this.$element.on('input paste', function () {
            var val = $.trim($(this).val());
            self.update(val);
        });
        this.update($.trim(this.$element.val()));
    };

    /**
     * 更新字符长度和反馈状态
     * @param  {[type]} value [description]
     * @return {[type]}       [description]
     */
    WordLimit.prototype.update = function (value) {
        var len = value.length,
            limit = this.maxLength,
            count = limit - len;
        if (len >= limit) {
            this.$element.val(value.substring(0, limit));
        }
        this.$feedback.html(count < 0 ? 0 : count)
    };

    /**
     * 全局初始化
     * @param {JQuery} $elements - dom
     */
    WordLimit.Global = function ($elements) {
        $elements = $elements || $("input,textarea").filter('[data-module="wordlimit"]');
        $elements.each(function () {
            var $this = $(this),
                maxLength = $this.attr('maxLength'),
                wordLimit = WordLimit.Get($this);
            if (!maxLength) { return; }
            if (!wordLimit) {
                wordLimit = new WordLimit($this, {
                    maxLength: maxLength,
                    feedback: $this.attr('data-feedback')
                });
                WordLimit.Set($this, wordLimit);
            }
        });
    };

    /**
     * 获取缓存对象
     * @param {JQuery} $element - dom
     */
    WordLimit.Get = function ($element) {
        return $element.data('wordLimit');
    }

    /**
     * 设置缓存对象
     * @param {JQuery} $element  - dom
     * @param {Object} wordLimit - 被缓存的对象
     */
    WordLimit.Set = function ($element, wordLimit) {
        $element.data("wordLimit", wordLimit);
    }

    return WordLimit;
});
;
define("km", ["km/app", "km/autoComplete", "km/loading", "km/popTips", "km/router", "km/tooltips", "km/util", "km/validate", "km/validateTooltips", "km/wordLimit"], function(_app, _autoComplete, _loading, _popTips, _router, _tooltips, _util, _validate, _validateTooltips, _wordLimit){
    return {
        "App" : _app,
        "AutoComplete" : _autoComplete,
        "loading" : _loading,
        "popTips" : _popTips,
        "Router" : _router,
        "Tooltips" : _tooltips,
        "util" : _util,
        "Validate" : _validate,
        "ValidateTooltips" : _validateTooltips,
        "WordLimit" : _wordLimit
    };
});