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