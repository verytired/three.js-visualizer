//定義ファイル
/// <reference path="DefinitelyTyped/threejs/three.d.ts" />
var VisualizerMain = (function () {
    function VisualizerMain() {
        var _this = this;
        this.camera = new THREE.PerspectiveCamera(55, 1080 / 720, 20, 3000);
        this.camera.position.set(0, 0, 800);
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMapEnabled = true;
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
    }
    VisualizerMain.prototype.onCamEnabled = function (stream) {
        //on webcam enabled
        window.URL = window.URL || window.webkitURL;
        console.log(this.video);
        this.video.src = window.URL.createObjectURL(stream);
        this.sourceSize = new THREE.Vector2(this.video.width, this.video.height);
        //init video texture
        this.videoTexture = new THREE.Texture(this.video);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture
        });
        this.planeMaterial.needsUpdate = true;
        var planeGeometry = new THREE.PlaneGeometry(800, 800, 10, 10);
        var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
        this.scene.add(plane);
    };
    VisualizerMain.prototype.onWindowResize = function () {
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
    VisualizerMain.prototype.update = function () {
        if (this.video && this.videoTexture && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.videoTexture.needsUpdate = true;
        }
    };
    VisualizerMain.prototype.render = function () {
        this.update();
        this.renderer.render(this.scene, this.camera);
    };
    VisualizerMain.prototype.animate = function () {
        var _this = this;
        requestAnimationFrame(function (e) { return _this.animate(); });
        this.render();
    };
    return VisualizerMain;
})();
window.addEventListener("load", function (e) {
    var main = new VisualizerMain();
    main.animate();
});
