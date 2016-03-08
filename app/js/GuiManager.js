/// <reference path="../typings/main.d.ts" />
/// <reference path="events/EventDispatcher.ts"/>
/// <reference path="AtUtil.ts" />
/// <reference path="AudioManager.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GuiManager = (function (_super) {
    __extends(GuiManager, _super);
    function GuiManager() {
        if (GuiManager._instance) {
            throw new Error("must use the getInstance.");
        }
        _super.call(this);
        GuiManager._instance = this;
    }
    GuiManager.getInstance = function () {
        if (GuiManager._instance === null) {
            GuiManager._instance = new GuiManager();
        }
        return GuiManager._instance;
    };
    GuiManager.prototype.initialize = function () {
        this.gui = new dat.GUI({ autoPlace: true });
        this.getData();
    };
    GuiManager.prototype.getData = function () {
        var _this = this;
        //LOAD params
        $.ajax({
            type: "GET",
            dataType: "json",
            url: "data/filter_setting.json",
            success: function (data) {
                _this.setData(data);
            }
        });
    };
    GuiManager.prototype.setData = function (data) {
        var _this = this;
        this.filters = data.filters;
        //create UI from params JSON
        var folder;
        //change function beat detection using
        var am = AudioManager.getInstance();
        var useBeatDetect = this.gui.add({ 'useBeatDetect': am.getBeatDetect() }, 'useBeatDetect');
        useBeatDetect.onChange(function (value) {
            am.setBeatDetect(value);
        });
        $.each(this.filters, function (i, filter) {
            //create folder
            folder = _this.gui.addFolder(filter.displayName);
            //create toogle boolean
            folder.add(filter, 'on').listen().onChange(function () {
                _this.onToggleShaders();
            });
            //add slider for each para
            $.each(filter.params, function (i, param) {
                folder.add(param, 'value', param.min, param.max).step(param.step).listen().name(param.displayName).onChange(function () {
                    _this.onParamsChange();
                });
            });
            filter.folder = folder;
        });
        this.onToggleShaders();
        this.onParamsChange();
    };
    GuiManager.prototype.getFilterSetting = function () {
        return this.filters;
    };
    GuiManager.prototype.onParamsChange = function () {
        this.dispatchEvent(new events.Event("onParamsChange"));
    };
    GuiManager.prototype.onToggleShaders = function () {
        this.dispatchEvent(new events.Event("onToggleShaders"));
    };
    GuiManager.prototype.randomizeFilters = function () {
        //clear all filters
        $.each(this.filters, function (i, filter) {
            filter.on = false;
            filter.folder.close();
        });
        //console.log("---------------");
        var at = new ATUtil();
        //turn on 3 filters
        for (var i = 0; i < 2; i++) {
            var r = at.randomInt(0, this.filters.length - 1);
            this.filters[r].on = true;
            //console.log(filters[r].displayName);
            //open enabled folders
            this.filters[r].folder.open();
        }
        //RANDOMIZE ALL PARAMS
        $.each(this.filters, function (i, filter) {
            $.each(filter.params, function (j, param) {
                param.value = at.randomRange(param.min, param.max); //FIXME - use full range?
            });
        });
        this.onToggleShaders();
        this.onParamsChange();
    };
    GuiManager.prototype.close = function () {
        this.gui.close();
    };
    GuiManager._instance = null;
    return GuiManager;
}(events.EventDispatcher));
