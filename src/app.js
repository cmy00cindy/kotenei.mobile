/**
 * 应用
 * @module km/app 
 * @author vfasky (vfasky@gmail.com)
 */
define('km/app', ['jquery', 'km/router', 'km/popTips', 'km/util'], function($, Router, popTips, util){
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

        $.each(self._on.viewBeforeShow, function(fun){
            fun(viewName);
        });

        callback = callback || function(){};
        //完成时回调
        var complete = function(view){
            callback();
            $.each(self._on.viewAfterShow, function(fun){
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
            require([viewName], function(View){
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

        var ajax = function(type, url, data){
            var dtd = $.Deferred();
            $.ajax(url, {
                type: type,
                cache: false,
                data: data || {},
                dataType: 'json'
            }).done(function(ret){
                //console.log(ret);
                if(ret.Status === false){
                    self.app.loading.hide();
                    self.app.showTip.error(ret.ErrorMessage || '发生未知错误', 1000);
                    if(ret.Url){
                        setTimeout(function(){
                            window.location.href = ret.Url;
                        }, 800);
                    }
                }
                else{
                    dtd.resolve(ret);
                }
            }).fail(function(){
                self.app.loading.hide();
                self.app.showTip.error('服务端发生错误了', 1000);
            });
            return dtd.promise();
        };

        //封装一个 promise 规范的http helper
        this.http = {
            get: function(url, data){
                return ajax('GET', url, data);
            },
            post: function(url, data){
                return ajax('POST', url, data);
            } 
        }; 
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