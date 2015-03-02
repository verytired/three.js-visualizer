/// <reference path="events/EventDispatcher.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var AudioManager = (function (_super) {
    __extends(AudioManager, _super);
    function AudioManager() {
        if (AudioManager._instance) {
            throw new Error("must use the getInstance.");
        }
        _super.call(this);
        AudioManager._instance = this;
    }
    AudioManager.getInstance = function () {
        if (AudioManager._instance === null) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    };
    AudioManager._instance = null;
    return AudioManager;
})(events.EventDispatcher);
