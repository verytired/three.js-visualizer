/// <reference path="ViewManager.ts" />
/// <reference path="AudioManager.ts" />

class Visualizer {
    private viewManager:ViewManager;
    private audioManager:AudioManager;

    constructor() {
        this.audioManager = new AudioManager();
        this.audioManager.initialize();
        this.audioManager.loadSampleAudio();

        this.viewManager = new ViewManager();
        this.viewManager.initialize();

    }

    public start() {
        this.viewManager.animate();
    }
}

window.addEventListener("load", (e) => {
    var main:Visualizer = new Visualizer();
    main.start();
});