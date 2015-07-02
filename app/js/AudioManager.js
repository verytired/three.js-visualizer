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
        _super.call(this);
        this._useBeatDetect = true;
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
        this.audioContext = new AudioContext();
        this.fileReader = new FileReader();
        this.isPlayingAudio = false;
        this.waveData = []; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
        this.levelsData = []; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]
        this.volume = 0; // averaged normalized level from 0 - 1
        this.bpmTime = 0; // bpmTime ranges from 0 to 1. 0 = on beat. Based on tap bpm
        this.ratedBPMTime = 550; //time between beats (msec) multiplied by BPMRate
        this.levelHistory = []; //last 256 ave norm levels
        this.BEAT_HOLD_TIME = 40; //num of frames to hold a beat
        this.BEAT_DECAY_RATE = 0.98;
        this.BEAT_MIN = 0.15; //level less than this is no beat
        //BPM STUFF
        this.count = 0;
        this.msecsFirst = 0;
        this.msecsPrevious = 0;
        this.msecsAvg = 633; //time between beats (msec)
        this.gotBeat = false;
        this.levelsCount = 16; //should be factor of 512
        this.binCount; //512
        this.volSens = 1.0;
        this.beatCutOff = 0;
        this.beatTime = 0;
        this.beatHoldTime = 40;
        this.beatDecayRate = 0.97;
        this.high = 0;
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.3; //smooths out bar chart movement over time
        this.analyser.fftSize = 1024;
        this.analyser.connect(this.audioContext.destination);
        this.binCount = this.analyser.frequencyBinCount; // = 512
        this.levelBins = Math.floor(this.binCount / this.levelsCount); //number of bins in each level
        this.freqByteData = new Uint8Array(this.binCount);
        this.timeByteData = new Uint8Array(this.binCount);
        var length = 256;
        for (var i = 0; i < length; i++) {
            this.levelHistory.push(0);
        }
        //assume 120BPM
        this.msecsAvg = 640;
        this.timer = setInterval(this.onBMPBeat, this.msecsAvg);
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
        var sampleURL = "data/sound/db.mp3";
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
    AudioManager.prototype.onBMPBeat = function () {
        //console.log("onBMPBeat");
        this.bpmStart = new Date().getTime();
        //		if (!ControlsHandler.audioParams.bpmMode) return;
        //only fire bpm beat if there was an on onBeat in last timeframe
        //experimental combined beat + bpm mode
        //if (gotBeat){
        //this.NeonShapes.onBPMBeat();
        //GoldShapes.onBPMBeat();
        this.gotBeat = false;
        //}
    };
    //called every frame
    //update published viz data
    AudioManager.prototype.update = function () {
        //				console.log("audio.update");
        if (!this.isPlayingAudio)
            return;
        //GET DATA
        this.analyser.getByteFrequencyData(this.freqByteData); //<-- bar chart
        this.analyser.getByteTimeDomainData(this.timeByteData); // <-- waveform
        //normalize waveform data
        for (var i = 0; i < this.binCount; i++) {
            this.waveData[i] = ((this.timeByteData[i] - 128) / 128);
        }
        //TODO - cap levels at 1 and -1 ?
        //normalize levelsData from freqByteData
        for (var i = 0; i < this.levelsCount; i++) {
            var sum = 0;
            for (var j = 0; j < this.levelBins; j++) {
                sum += this.freqByteData[(i * this.levelBins) + j];
            }
            this.levelsData[i] = sum / this.levelBins / 256 * this.volSens;
        }
        //TODO - cap levels at 1?
        //GET AVG LEVEL
        var sum = 0;
        for (var j = 0; j < this.levelsCount; j++) {
            sum += this.levelsData[j];
        }
        this.volume = sum / this.levelsCount;
        // high = Math.max(high,level);
        this.levelHistory.push(this.volume);
        this.levelHistory.shift(1);
        //BEAT DETECTION
        if (this.volume > this.beatCutOff && this.volume > this.BEAT_MIN) {
            //				onBeat();
            console.log("on beat");
            if (this._useBeatDetect) {
                this.dispatchEvent(new events.Event("onBeat"));
            }
            this.beatCutOff = this.volume * 1.1;
            this.beatTime = 0;
        }
        else {
            if (this.beatTime <= this.beatHoldTime) {
                this.beatTime++;
            }
            else {
                this.beatCutOff *= this.beatDecayRate;
                this.beatCutOff = Math.max(this.beatCutOff, this.BEAT_MIN);
            }
        }
        this.bpmTime = (new Date().getTime() - this.bpmStart) / this.msecsAvg;
        //trace(bpmStart);
        //		if (ControlsHandler.audioParams.showDebug) debugDraw();
    };
    /**
     * set BeatDetect function
     * @param flag
     */
    AudioManager.prototype.setBeatDetect = function (flag) {
        this._useBeatDetect = flag;
    };
    /**
     * get BeatDetect function flag
     * @returns {boolean}
     */
    AudioManager.prototype.getBeatDetect = function () {
        return this._useBeatDetect;
    };
    AudioManager._instance = null;
    return AudioManager;
})(events.EventDispatcher);
