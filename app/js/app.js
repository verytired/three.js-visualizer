var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ATUtil = (function () {
    function ATUtil() {
    }
    ATUtil.prototype.randomRange = function (min, max) {
        return min + Math.random() * (max - min);
    };
    ATUtil.prototype.randomInt = function (min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    };
    ATUtil.prototype.lerp = function (value, min, max) {
        return min + (max - min) * value;
    };
    ATUtil.prototype.norm = function (value, min, max) {
        return (value - min) / (max - min);
    };
    ATUtil.prototype.map = function (value, min1, max1, min2, max2) {
        return this.lerp(this.norm(value, min1, max1), min2, max2);
    };
    ATUtil.prototype.clamp = function (value, min, max) {
        return Math.max(Math.min(value, max), min);
    };
    return ATUtil;
}());
var events;
(function (events) {
    var EventDispatcher = (function () {
        function EventDispatcher() {
            this.listeners = {};
        }
        EventDispatcher.prototype.dispatchEvent = function (event) {
            var e;
            var type;
            if (event instanceof Event) {
                type = event.type;
                e = event;
            }
            else {
                type = event;
                e = new Event(type);
            }
            if (this.listeners[type] != null) {
                e.currentTarget = this;
                for (var i = 0; i < this.listeners[type].length; i++) {
                    var listener = this.listeners[type][i];
                    try {
                        listener.handler(e);
                    }
                    catch (error) {
                        if (window.console) {
                            console.error(error.stack);
                        }
                    }
                }
            }
        };
        EventDispatcher.prototype.addEventListener = function (type, callback, priolity) {
            if (priolity === void 0) { priolity = 0; }
            if (this.listeners[type] == null) {
                this.listeners[type] = [];
            }
            this.listeners[type].push(new EventListener(type, callback, priolity));
            this.listeners[type].sort(function (listener1, listener2) {
                return listener2.priolity - listener1.priolity;
            });
        };
        EventDispatcher.prototype.removeEventListener = function (type, callback) {
            if (this.hasEventListener(type, callback)) {
                for (var i = 0; i < this.listeners[type].length; i++) {
                    var listener = this.listeners[type][i];
                    if (listener.equalCurrentListener(type, callback)) {
                        listener.handler = null;
                        this.listeners[type].splice(i, 1);
                        return;
                    }
                }
            }
        };
        EventDispatcher.prototype.clearEventListener = function () {
            this.listeners = {};
        };
        EventDispatcher.prototype.containEventListener = function (type) {
            if (this.listeners[type] == null)
                return false;
            return this.listeners[type].length > 0;
        };
        EventDispatcher.prototype.hasEventListener = function (type, callback) {
            if (this.listeners[type] == null)
                return false;
            for (var i = 0; i < this.listeners[type].length; i++) {
                var listener = this.listeners[type][i];
                if (listener.equalCurrentListener(type, callback)) {
                    return true;
                }
            }
            return false;
        };
        return EventDispatcher;
    }());
    events.EventDispatcher = EventDispatcher;
    var EventListener = (function () {
        function EventListener(type, handler, priolity) {
            if (type === void 0) { type = null; }
            if (handler === void 0) { handler = null; }
            if (priolity === void 0) { priolity = 0; }
            this.type = type;
            this.handler = handler;
            this.priolity = priolity;
        }
        EventListener.prototype.equalCurrentListener = function (type, handler) {
            if (this.type == type && this.handler == handler) {
                return true;
            }
            return false;
        };
        return EventListener;
    }());
    var Event = (function () {
        function Event(type, value) {
            if (type === void 0) { type = null; }
            if (value === void 0) { value = null; }
            this.type = type;
            this.value = value;
        }
        Event.COMPLETE = "complete";
        Event.CHANGE_PROPERTY = "changeProperty";
        return Event;
    }());
    events.Event = Event;
})(events || (events = {}));
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
        this.waveData = [];
        this.levelsData = [];
        this.volume = 0;
        this.bpmTime = 0;
        this.ratedBPMTime = 550;
        this.levelHistory = [];
        this.BEAT_HOLD_TIME = 40;
        this.BEAT_DECAY_RATE = 0.98;
        this.BEAT_MIN = 0.15;
        this.count = 0;
        this.msecsFirst = 0;
        this.msecsPrevious = 0;
        this.msecsAvg = 633;
        this.gotBeat = false;
        this.levelsCount = 16;
        this.binCount;
        this.volSens = 1.0;
        this.beatCutOff = 0;
        this.beatTime = 0;
        this.beatHoldTime = 40;
        this.beatDecayRate = 0.97;
        this.high = 0;
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.3;
        this.analyser.fftSize = 1024;
        this.analyser.connect(this.audioContext.destination);
        this.binCount = this.analyser.frequencyBinCount;
        this.levelBins = Math.floor(this.binCount / this.levelsCount);
        this.freqByteData = new Uint8Array(this.binCount);
        this.timeByteData = new Uint8Array(this.binCount);
        var length = 256;
        for (var i = 0; i < length; i++) {
            this.levelHistory.push(0);
        }
        this.msecsAvg = 640;
        this.timer = setInterval(this.onBMPBeat, this.msecsAvg);
        this.fileReader.onload = function () {
            _this.stopSound();
            _this.initSound();
            _this.audioContext.decodeAudioData(_this.fileReader.result, function (buffer) {
                _this.source = _this.audioContext.createBufferSource();
                _this.source.buffer = buffer;
                _this.source.connect(_this.analyser);
                _this.startSound();
                _this.dispatchEvent(new events.Event("onLoad"));
            });
        };
        document.getElementById('file').addEventListener('change', function (e) {
            _this.fileReader.readAsArrayBuffer(e.target.files[0]);
        });
    };
    AudioManager.prototype.getSpectrum = function () {
        var spectrums = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(spectrums);
        return spectrums;
    };
    AudioManager.prototype.getAnalyser = function () {
        return this.analyser;
    };
    AudioManager.prototype.loadSampleAudio = function () {
        var _this = this;
        this.stopSound();
        this.initSound();
        var sampleURL = "data/sound/db.mp3";
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
        this.bpmStart = new Date().getTime();
        this.gotBeat = false;
    };
    AudioManager.prototype.update = function () {
        if (!this.isPlayingAudio)
            return;
        this.analyser.getByteFrequencyData(this.freqByteData);
        this.analyser.getByteTimeDomainData(this.timeByteData);
        for (var i = 0; i < this.binCount; i++) {
            this.waveData[i] = ((this.timeByteData[i] - 128) / 128);
        }
        for (var i = 0; i < this.levelsCount; i++) {
            var sum = 0;
            for (var j = 0; j < this.levelBins; j++) {
                sum += this.freqByteData[(i * this.levelBins) + j];
            }
            this.levelsData[i] = sum / this.levelBins / 256 * this.volSens;
        }
        var sum = 0;
        for (var j = 0; j < this.levelsCount; j++) {
            sum += this.levelsData[j];
        }
        this.volume = sum / this.levelsCount;
        this.levelHistory.push(this.volume);
        this.levelHistory.shift(1);
        if (this.volume > this.beatCutOff && this.volume > this.BEAT_MIN) {
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
    };
    AudioManager.prototype.setBeatDetect = function (flag) {
        this._useBeatDetect = flag;
    };
    AudioManager.prototype.getBeatDetect = function () {
        return this._useBeatDetect;
    };
    AudioManager._instance = null;
    return AudioManager;
}(events.EventDispatcher));
var Config = {
    isDeme: false
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
        var folder;
        var am = AudioManager.getInstance();
        var useBeatDetect = this.gui.add({ 'useBeatDetect': am.getBeatDetect() }, 'useBeatDetect');
        useBeatDetect.onChange(function (value) {
            am.setBeatDetect(value);
        });
        $.each(this.filters, function (i, filter) {
            folder = _this.gui.addFolder(filter.displayName);
            folder.add(filter, 'on').listen().onChange(function () {
                _this.onToggleShaders();
            });
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
        $.each(this.filters, function (i, filter) {
            filter.on = false;
            filter.folder.close();
        });
        var at = new ATUtil();
        for (var i = 0; i < 2; i++) {
            var r = at.randomInt(0, this.filters.length - 1);
            this.filters[r].on = true;
            this.filters[r].folder.open();
        }
        $.each(this.filters, function (i, filter) {
            $.each(filter.params, function (j, param) {
                param.value = at.randomRange(param.min, param.max);
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
var ViewManager = (function (_super) {
    __extends(ViewManager, _super);
    function ViewManager() {
        _super.call(this);
        this.HEIGHT = 720;
        this.WIDTH = 1080;
        if (ViewManager._instance) {
            throw new Error("must use the getInstance.");
        }
        ViewManager._instance = this;
    }
    ViewManager.getInstance = function () {
        if (ViewManager._instance === null) {
            ViewManager._instance = new ViewManager();
        }
        return ViewManager._instance;
    };
    ViewManager.prototype.initialize = function () {
        var _this = this;
        this.camera = new THREE.PerspectiveCamera(90, this.WIDTH / this.HEIGHT, 0.1, 1000);
        this.camera.position.set(0, 0, window.innerHeight / 2);
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true
        });
        this.container = document.getElementById('container');
        this.container.appendChild(this.renderer.domElement);
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
        this.passes = {};
        this.passes.rgb = new THREE.ShaderPass(THREE.RGBShiftShader);
        this.passes.dotmatrix = new THREE.ShaderPass(THREE.DotMatrixShader);
        this.passes.film = new THREE.ShaderPass(THREE.FilmShader);
        this.passes.mirror = new THREE.ShaderPass(THREE.MirrorShader);
        this.passes.kaleido = new THREE.ShaderPass(THREE.KaleidoShader);
        this.passes.dotscreen = new THREE.DotScreenPass(new THREE.Vector2(0, 0), 0.5, 0.8);
        this.passes.glitch = new THREE.GlitchPass();
        this.passes.bleach = new THREE.ShaderPass(THREE.BleachBypassShader);
        this.passes.huesat = new THREE.ShaderPass(THREE.HueSaturationShader);
        this.passes.brightness = new THREE.ShaderPass(THREE.BrightnessContrastShader);
        this.passes.edges = new THREE.ShaderPass(THREE.EdgeShader2);
        this.passes.tilt = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
        this.passes.technicolor = new THREE.ShaderPass(THREE.TechnicolorShader);
        this.guiManager = new GuiManager();
        this.guiManager.addEventListener('onParamsChange', function (e) {
            _this.onParamsChange();
        });
        this.guiManager.addEventListener('onToggleShaders', function (e) {
            _this.onToggleShaders();
        });
        this.guiManager.initialize();
        window.addEventListener("keyup", function (e) {
            console.log(e.which);
            switch (e.which) {
                case 80:
                    _this.captureView();
                    break;
                case 32:
                    _this.changeFilter();
                    break;
                case 49:
                    _this.setVideo("data/video/a11.mp4");
                    break;
                case 50:
                    _this.setVideo("data/video/a21.mp4");
                    break;
                case 51:
                    _this.setVideo("data/video/aon.mp4");
                    break;
            }
        });
        window.addEventListener("resize", function (e) {
            _this.onWindowResize();
        }, false);
        this.onWindowResize();
        if (Config.isDeme) {
            this.setVideo("data/video/a21.mp4");
            this.audioManager = AudioManager.getInstance();
            this.audioManager.addEventListener('onBeat', function () {
                _this.changeFilter();
            });
        }
        else {
            this.setWebCam();
        }
    };
    ViewManager.prototype.onCamEnabled = function (stream) {
        window.URL = window.URL || window.webkitURL;
        this.video.src = window.URL.createObjectURL(stream);
        this.sourceSize = new THREE.Vector2(this.video.width, this.video.height);
        this.videoTexture = new THREE.Texture(this.video);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture
        });
        this.videoTexture.minFilter = this.videoTexture.magFilter = THREE.LinearFilter;
        this.planeMaterial.needsUpdate = true;
        var planeGeometry = new THREE.PlaneGeometry(this.WIDTH, this.HEIGHT, 10, 10);
        var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
        this.scene.add(plane);
    };
    ViewManager.prototype.onParamsChange = function () {
        var _this = this;
        var filterSetting = this.guiManager.getFilterSetting();
        $.each(filterSetting, function (i, filter) {
            $.each(filter.params, function (j, param) {
                if (param.custom)
                    return true;
                if (_this.passes[filter.name].uniforms[param.name] != undefined)
                    _this.passes[filter.name].uniforms[param.name].value = param.value;
            });
        });
    };
    ViewManager.prototype.onToggleShaders = function () {
        var _this = this;
        var filterSetting = this.guiManager.getFilterSetting();
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(this.renderPass);
        $.each(filterSetting, function (i, filter) {
            if (filter.on) {
                _this.composer.addPass(_this.passes[filter.name]);
            }
        });
        this.composer.addPass(this.copyPass);
        this.copyPass.renderToScreen = true;
        this.composer.setSize(window.innerWidth, window.innerHeight);
    };
    ViewManager.prototype.onWindowResize = function () {
        var screenWidth = window.innerWidth;
        var screenHeight = window.innerHeight;
        if (screenWidth >= screenHeight) {
            screenWidth = screenHeight * this.WIDTH / this.HEIGHT;
        }
        else {
            screenHeight = screenWidth * this.HEIGHT / this.WIDTH;
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(screenWidth, screenHeight);
    };
    ViewManager.prototype.update = function () {
        if (Config.isDeme)
            this.audioManager.update();
        if (this.video && this.videoTexture && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.videoTexture.needsUpdate = true;
        }
    };
    ViewManager.prototype.render = function () {
        this.renderer.render(this.scene, this.camera);
        this.composer.render(0.1);
    };
    ViewManager.prototype.animate = function () {
        var _this = this;
        requestAnimationFrame(function (e) {
            return _this.animate();
        });
        this.update();
        this.render();
    };
    ViewManager.prototype.captureView = function () {
        try {
            var imgData = this.renderer.domElement.toDataURL();
            var date = new Date().toString();
            var imgDLHelper = document.getElementById('canvasDLHelper');
            imgDLHelper.setAttribute('href', imgData.replace('image/png', 'image/octet-stream'));
            imgDLHelper.setAttribute('download', date + ".png");
            imgDLHelper.click();
        }
        catch (e) {
            console.log(e);
            console.log("Browser does not support taking screenshot of 3d context");
            return;
        }
    };
    ViewManager.prototype.changeFilter = function () {
        console.log("changeFilter");
        this.guiManager.randomizeFilters();
    };
    ViewManager.prototype.setVideo = function (videoPath) {
        this.video = document.createElement('video');
        this.video.loop = true;
        this.video.width = this.WIDTH;
        this.video.height = this.HEIGHT;
        this.video.volume = 0;
        this.video.src = videoPath;
        this.video.play();
        this.videoTexture = new THREE.Texture(this.video);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture
        });
        this.videoTexture.minFilter = this.videoTexture.magFilter = THREE.LinearFilter;
        this.planeMaterial.needsUpdate = true;
        var planeGeometry = new THREE.PlaneGeometry(this.WIDTH, this.HEIGHT, 10, 10);
        var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
        this.scene.add(plane);
    };
    ViewManager.prototype.setWebCam = function () {
        var _this = this;
        this.video = document.createElement('video');
        this.video.width = this.WIDTH;
        this.video.height = this.HEIGHT;
        this.video.autoplay = true;
        this.video.loop = true;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        navigator.getUserMedia({
            video: {
                mandatory: {
                    minWidth: this.WIDTH,
                    minHeight: this.HEIGHT
                }
            },
            audio: {}
        }, function (stream) {
            _this.onCamEnabled(stream);
        }, function (error) {
            console.log("Unable to capture WebCam. Please reload the page.");
        });
    };
    ViewManager._instance = null;
    return ViewManager;
}(events.EventDispatcher));
var Visualizer = (function () {
    function Visualizer() {
        this.audioManager = new AudioManager();
        this.audioManager.initialize();
        this.audioManager.loadSampleAudio();
        this.viewManager = new ViewManager();
        this.viewManager.initialize();
    }
    Visualizer.prototype.start = function () {
        this.viewManager.animate();
    };
    return Visualizer;
}());
window.addEventListener("load", function (e) {
    var main = new Visualizer();
    main.start();
});
