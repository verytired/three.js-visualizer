/// <reference path="events/EventDispatcher.ts"/>
/// <reference path="DefinitelyTyped/threejs/three.d.ts" />
/// <reference path="DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="GuiManager.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ViewManager = (function (_super) {
    __extends(ViewManager, _super);
    function ViewManager() {
        if (ViewManager._instance) {
            throw new Error("must use the getInstance.");
        }
        _super.call(this);
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
        this.camera = new THREE.PerspectiveCamera(55, 1080 / 720, 20, 3000);
        this.camera.position.set(0, 0, 800);
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true
        });
        //				this.renderer.setPixelRatio(window.devicePixelRatio);
        //				this.renderer.shadowMapEnabled = true;
        this.container = document.getElementById('container');
        this.container.appendChild(this.renderer.domElement);
        window.addEventListener("resize", this.onWindowResize, false);
        this.onWindowResize();
        //Use webcam
        this.video = document.createElement('video');
        this.video.width = 640;
        this.video.height = 420;
        this.video.autoplay = true;
        this.video.loop = true;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        //get webcam
        navigator.getUserMedia({
            video: {
                mandatory: {
                    minWidth: 640,
                    minHeight: 420
                }
            }
        }, function (stream) {
            _this.onCamEnabled(stream);
        }, function (error) {
            console.log("Unable to capture WebCam. Please reload the page.");
        });
        //POST PROCESSING
        //Create Shader Passes
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
        //gui setting
        this.guiManager = new GuiManager();
        this.guiManager.addEventListener('onParamsChange', function (e) {
            _this.onParamsChange();
        });
        this.guiManager.addEventListener('onToggleShaders', function (e) {
            _this.onToggleShaders();
        });
        this.guiManager.initialize();
        //capture
        /*** ADDING SCREEN SHOT ABILITY ***/
        window.addEventListener("keyup", function (e) {
            var imgData, imgNode;
            //Listen to 'P' key
            if (e.which !== 80)
                return;
            try {
                imgData = _this.renderer.domElement.toDataURL();
                console.log(imgData);
            }
            catch (e) {
                console.log(e);
                console.log("Browser does not support taking screenshot of 3d context");
                return;
            }
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
        var planeGeometry = new THREE.PlaneGeometry(800, 800, 10, 10);
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
                //DEBUG
                //								console.log(this.passes[filter.name], param.name);
                if (_this.passes[filter.name].uniforms[param.name] != undefined)
                    _this.passes[filter.name].uniforms[param.name].value = param.value;
            });
        });
        //FIXMEEEE
        //custom param setting
        //passes.lut.uniforms.lookupTable.value = luts[filters.lut.mode];
        //		passes.lut.uniforms.lookupTable.value = luts[filters[14].params[1].value];   //VERY BAD
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
        //		this.composer.setSize(renderW,renderH );
        this.composer.setSize(800, 800);
    };
    ViewManager.prototype.onWindowResize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        /*
         var CPWidth = 262;//width of #controls-holder

         renderW = window.innerWidth - CPWidth;
         renderH = window.innerHeight;

         if (renderW > 0){
         camera.aspect = renderW / renderH;
         camera.updateProjectionMatrix();
         renderer.setSize( renderW,renderH);
         if (composer) composer.setSize(renderW,renderH );
         }

         //console.log(renderW,renderH);

         //console.log("imgAspectRatio", imgAspectRatio);
         //console.log("camera.aspect", camera.aspect);
         //resize img plane to fit scene

         if (sourceSize){

         var srcAspect = sourceSize.x/sourceSize.y;

         if (srcAspect > camera.aspect){

         //image is wider than scene, so make image width fill scene
         var scale = (renderW / sourceSize.x )* 0.9;
         // console.log("scale: " , scale);
         plane.scale.y = (1/srcAspect) * scale;
         plane.scale.x = scale;


         }else{
         //image is taller than scene, so make image height fill scene
         //default settings should do this
         plane.scale.y = 1;
         plane.scale.x = srcAspect;
         }
         }
         */
    };
    ViewManager.prototype.update = function () {
        if (this.video && this.videoTexture && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.videoTexture.needsUpdate = true;
        }
    };
    ViewManager.prototype.render = function () {
        this.update();
        this.renderer.render(this.scene, this.camera);
        this.composer.render(0.1);
    };
    ViewManager.prototype.animate = function () {
        var _this = this;
        requestAnimationFrame(function (e) { return _this.animate(); });
        this.render();
    };
    ViewManager._instance = null;
    return ViewManager;
})(events.EventDispatcher);
