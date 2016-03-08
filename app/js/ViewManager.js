/// <reference path="../typings/main.d.ts" />
/// <reference path="events/EventDispatcher.ts"/>
/// <reference path="GuiManager.ts" />
/// <reference path="AudioManager.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// build error出るが一旦無視する
/*
 interface Navigator {
 getUserMedia(
 options: { video?: any; audio?: any; },
 success: (stream: any) => void,
 error?: (error: string) => void
 ) : void;
 webkitGetUserMedia(
 options: { video?: boolean; audio?: boolean; },
 success: (stream: any) => void,
 error?: (error: string) => void
 ) : void;
 mozGetUserMedia(
 options: { video?: boolean; audio?: boolean; },
 success: (stream: any) => void,
 error?: (error: string) => void
 ) : void;
 }

 navigator.getUserMedia(
 {video: true, audio: true},
 function (stream) {  },
 function (error) {  }
 );

 navigator.webkitGetUserMedia(
 {video: true, audio: true},
 function (stream) {  },
 function (error) {  }
 );

 navigator.mozGetUserMedia(
 {video: true, audio: true},
 function (stream) {  },
 function (error) {  }
 );
 */
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
        // POST PROCESSING
        // Create Shader Passes
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
        //object based look up
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
        //this.passes.bokeh = new THREE.ShaderPass(THREE.BokehShader);
        this.passes.technicolor = new THREE.ShaderPass(THREE.TechnicolorShader);
        // gui setting
        this.guiManager = new GuiManager();
        this.guiManager.addEventListener('onParamsChange', function (e) {
            _this.onParamsChange();
        });
        this.guiManager.addEventListener('onToggleShaders', function (e) {
            _this.onToggleShaders();
        });
        this.guiManager.initialize();
        this.guiManager.close();
        //audioManager
        this.audioManager = AudioManager.getInstance();
        //key Assain
        window.addEventListener("keyup", function (e) {
            console.log(e.which);
            switch (e.which) {
                //Listen to 'P' key
                case 80:
                    _this.captureView();
                    break;
                //Listen to Space key
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
        // movie
        this.setVideo("data/video/a21.mp4");
        //this.setWebCam();
        //todo : event beat detection
        this.audioManager.addEventListener('onBeat', function () {
            _this.changeFilter();
        });
    };
    ViewManager.prototype.onCamEnabled = function (stream) {
        //on webcam enabled
        window.URL = window.URL || window.webkitURL;
        this.video.src = window.URL.createObjectURL(stream);
        this.sourceSize = new THREE.Vector2(this.video.width, this.video.height);
        //init video texture
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
        //copy gui params into shader uniforms
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
        //Add Shader Passes to Composer
        //order defined by filters.json
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
            console.log(imgData);
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
    ViewManager._instance = null;
    return ViewManager;
}(events.EventDispatcher));
