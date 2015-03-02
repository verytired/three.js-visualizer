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
        this.audioContext = new AudioContext();
        this.fileReader = new FileReader();
        this.isPlayAydio = false;
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
    AudioManager.prototype.initialize = function () {
        var _this = this;
        //analyser test
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.connect(this.audioContext.destination);
        //loading audio file
        this.fileReader.onload = function () {
            _this.stopSound();
            _this.initSound();
            //ロード完了後buffer取得開始
            _this.audioContext.decodeAudioData(_this.fileReader.result, function (buffer) {
                _this.source = _this.audioContext.createBufferSource();
                _this.source.buffer = buffer;
                _this.source.connect(_this.analyser);
                //onload callback
                _this.startSound();
                _this.dispatchEvent(new events.Event("onLoad"));
            });
        };
        //view fileName
        document.getElementById('file').addEventListener('change', function (e) {
            _this.fileReader.readAsArrayBuffer(e.target.files[0]);
        });
    };
    /**
     * スペクトラム取得
     * @returns {Uint8Array}
     */
    AudioManager.prototype.getSpectrum = function () {
        //描画前にスペクトラムを取得する
        var spectrums = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(spectrums);
        return spectrums;
    };
    /**
     * アナライザー取得
     * @returns {any}
     */
    AudioManager.prototype.getAnalyser = function () {
        return this.analyser;
    };
    //load sample MP3
    AudioManager.prototype.loadSampleAudio = function () {
        var _this = this;
        this.stopSound();
        this.initSound();
        var sampleURL = "data/test1.mp3";
        // Load asynchronously
        var request = new XMLHttpRequest();
        request.open("GET", sampleURL, true);
        request.responseType = "arraybuffer";
        request.onload = function () {
            _this.audioContext.decodeAudioData(request.response, function (buffer) {
                _this.audioBuffer = buffer;
                _this.startSound();
            }, function (e) {
                console.log(e);
            });
        };
        request.send();
    };
    AudioManager.prototype.initSound = function () {
        this.source = this.audioContext.createBufferSource();
        this.source.connect(this.analyser);
    };
    AudioManager.prototype.startSound = function () {
        this.source.buffer = this.audioBuffer;
        this.source.loop = true;
        this.source.start(0.0);
        this.isPlayingAudio = true;
    };
    AudioManager.prototype.stopSound = function () {
        this.isPlayingAudio = false;
        if (this.source) {
            this.source.stop(0);
            this.source.disconnect();
        }
    };
    AudioManager._instance = null;
    return AudioManager;
})(events.EventDispatcher);
