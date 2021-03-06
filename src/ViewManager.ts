/// <reference path="../typings/main.d.ts" />
/// <reference path="events/EventDispatcher.ts"/>
/// <reference path="GuiManager.ts" />
/// <reference path="AudioManager.ts" />
/// <reference path="Config.ts" />

declare module THREE {
    export var EffectComposer;
    export var RenderPass;
    export var ShaderPass;
    export var CopyShader;
    export var DotMatrixShader;
    export var DotScreenShader;
    export var FilmShader;
    export var RGBShiftShader;
    export var MirrorShader;
    export var KaleidoShader;
    export var DotScreenPass;
    export var GlitchPass;
    export var BleachBypassShader;
    export var HueSaturationShader;
    export var BrightnessContrastShader;
    export var EdgeShader2;
    export var VerticalTiltShiftShader;
    export var BokehShader;
    export var TechnicolorShader;
}

interface Window {
    webkitURL: any;
}

interface Navigator {
    getUserMedia(options:{ video?: any; audio?: any; },
                 success:(stream:any) => void,
                 error?:(error:string) => void) : void;
    webkitGetUserMedia(options:{ video?: any; audio?: any; },
                       success:(stream:any) => void,
                       error?:(error:string) => void) : void;
    mozGetUserMedia(options:{ video?: any; audio?: any; },
                    success:(stream:any) => void,
                    error?:(error:string) => void) : void;
}

class ViewManager extends events.EventDispatcher {

    private static _instance:ViewManager = null;

    private scene:THREE.Scene;
    private camera:THREE.PerspectiveCamera;
    private renderer;
    private container;

    private video;

    private passes;
    private renderPass;
    private copyPass;
    private composer;

    private sourceSize;
    private planeMaterial;
    private videoTexture;

    private guiManager:GuiManager;
    private audioManager:AudioManager;

    private HEIGHT:number = 720;
    private WIDTH:number = 1080;

    constructor() {
        super();
        if (ViewManager._instance) {
            throw new Error("must use the getInstance.");
        }
        ViewManager._instance = this;
    }

    public static getInstance():ViewManager {
        if (ViewManager._instance === null) {
            ViewManager._instance = new ViewManager();
        }
        return ViewManager._instance;
    }

    public initialize() {

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
        this.guiManager.addEventListener('onParamsChange', (e)=> {
            this.onParamsChange()
        });
        this.guiManager.addEventListener('onToggleShaders', (e)=> {
            this.onToggleShaders()
        });
        this.guiManager.initialize();

        //key Assain
        window.addEventListener("keyup", (e)=> {
            console.log(e.which);

            switch (e.which) {
                //Listen to 'P' key
                case 80:
                    this.captureView();
                    break;
                //Listen to Space key
                case 32:
                    this.changeFilter();
                    break;
                case 49:
                    this.setVideo("data/video/a11.mp4");
                    break;
                case 50:
                    this.setVideo("data/video/a21.mp4");
                    break;
                case 51:
                    this.setVideo("data/video/aon.mp4");
                    break;
            }
        });

        window.addEventListener("resize", (e)=> {
            this.onWindowResize()
        }, false);
        this.onWindowResize();


        // demo test
        if (Config.isDemo) {
            this.setVideo("data/video/a21.mp4");
            this.audioManager = AudioManager.getInstance();
            this.audioManager.addEventListener('onBeat', ()=> {
                this.changeFilter();
            })
        } else {
            this.setWebCam();
        }
    }

    private onCamEnabled(stream) {
        //on webcam enabled
        window.URL = window.URL || window.webkitURL;
        this.video.src = window.URL.createObjectURL(stream);
        this.sourceSize = new THREE.Vector2(this.video.width, this.video.height);

        //init video texture
        this.videoTexture = new THREE.Texture(this.video);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
        });
        this.videoTexture.minFilter = this.videoTexture.magFilter = THREE.LinearFilter;

        this.planeMaterial.needsUpdate = true;
        var planeGeometry = new THREE.PlaneGeometry(this.WIDTH, this.HEIGHT, 10, 10);
        var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
        this.scene.add(plane);
    }

    private onParamsChange() {
        //copy gui params into shader uniforms
        var filterSetting = this.guiManager.getFilterSetting();
        $.each(filterSetting, (i, filter)=> {
            $.each(filter.params, (j, param)=> {
                if (param.custom) return true;
                if (this.passes[filter.name].uniforms[param.name] != undefined)this.passes[filter.name].uniforms[param.name].value = param.value;
            });

        });
    }

    private onToggleShaders() {
        //Add Shader Passes to Composer
        //order defined by filters.json
        var filterSetting = this.guiManager.getFilterSetting();
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(this.renderPass);
        $.each(filterSetting, (i, filter)=> {
            if (filter.on) {
                this.composer.addPass(this.passes[filter.name]);
            }
        });

        this.composer.addPass(this.copyPass);
        this.copyPass.renderToScreen = true;
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    private onWindowResize() {
        let screenWidth = window.innerWidth;
        let screenHeight = window.innerHeight;
        if (screenWidth >= screenHeight) {
            screenWidth = screenHeight * this.WIDTH / this.HEIGHT;
        } else {
            screenHeight = screenWidth * this.HEIGHT / this.WIDTH;
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(screenWidth, screenHeight);
    }

    private update() {
        if (Config.isDemo)this.audioManager.update();
        if (this.video && this.videoTexture && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.videoTexture.needsUpdate = true;
        }

    }

    private render() {
        this.renderer.render(this.scene, this.camera);
        this.composer.render(0.1);
    }

    public animate() {
        requestAnimationFrame((e)=>
            this.animate()
        );
        this.update();
        this.render();

    }

    private captureView() {
        try {
            var imgData = this.renderer.domElement.toDataURL();
            var date = new Date().toString();
            var imgDLHelper = document.getElementById('canvasDLHelper');
            imgDLHelper.setAttribute('href',imgData.replace('image/png','image/octet-stream'));
            imgDLHelper.setAttribute('download',date+".png");
            imgDLHelper.click();
        }
        catch (e) {
            console.log(e);
            console.log("Browser does not support taking screenshot of 3d context");
            return;
        }
    }

    private changeFilter() {
        console.log("changeFilter");
        this.guiManager.randomizeFilters()
    }

    private setVideo(videoPath) {
        this.video = document.createElement('video');
        this.video.loop = true;
        this.video.width = this.WIDTH;
        this.video.height = this.HEIGHT;
        this.video.volume = 0;
        this.video.src = videoPath;
        this.video.play();

        this.videoTexture = new THREE.Texture(this.video);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
        });
        this.videoTexture.minFilter = this.videoTexture.magFilter = THREE.LinearFilter;

        this.planeMaterial.needsUpdate = true;
        var planeGeometry = new THREE.PlaneGeometry(this.WIDTH, this.HEIGHT, 10, 10);
        var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
        this.scene.add(plane);
    }


    // todo : use webCam

    private setWebCam() {
        //Use webcam
        this.video = document.createElement('video');
        this.video.width = this.WIDTH;
        this.video.height = this.HEIGHT;
        this.video.autoplay = true;
        this.video.loop = true;

        // navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        //get webcam
        //noinspection TypeScriptValidateTypes
        navigator.getUserMedia(
            {
                video: {
                    mandatory: {
                        minWidth: this.WIDTH,
                        minHeight: this.HEIGHT
                    }
                },
                audio: {}
            }, (stream)=> {
                this.onCamEnabled(stream)
            },
            function (error) {
                console.log("Unable to capture WebCam. Please reload the page.")
            });

    }
}