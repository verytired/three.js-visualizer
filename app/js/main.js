/// <reference path="ViewManager.ts" />
/// <reference path="AudioManager.ts" />
var VisualizerMain = (function () {
    function VisualizerMain() {
        this.audioManager = new AudioManager();
        this.viewManager = new ViewManager();
        this.viewManager.initialize();
    }
    VisualizerMain.prototype.start = function () {
        this.viewManager.animate();
    };
    return VisualizerMain;
})();
window.addEventListener("load", function (e) {
    var main = new VisualizerMain();
    main.start();
});
