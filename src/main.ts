//定義ファイル
/// <reference path="DefinitelyTyped/threejs/three.d.ts" />
/// <reference path="DefinitelyTyped/jquery/jquery.d.ts" />

declare module THREE {
		export var EffectComposer;
		export var RenderPass;
		export var ShaderPass;
		export var CopyShader;
		export var DotMatrixShader;
		export var DotScreenShader;
		export var FilmShader;
		export var MirrorShader;
}

interface Window {
		URL: any;
		webkitURL: any;
}

class VisualizerMain {
		private scene:THREE.Scene;
		private camera:THREE.PerspectiveCamera;
		private renderer;
		private container;

		private video;

		private passes;
		private renderPass;
		private copyPass;

		private composer;

		private gui;
		private sourceSize;
		private planeMaterial;
		private videoTexture;

		private filters;

		constructor() {

				this.camera = new THREE.PerspectiveCamera(55, 1080 / 720, 20, 3000);
				this.camera.position.set(0, 0, 800);
				this.scene = new THREE.Scene();

				this.renderer = new THREE.WebGLRenderer();
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
					}, (stream)=> {
							this.onCamEnabled(stream)
					},
					function (error) {
							console.log("Unable to capture WebCam. Please reload the page.")
					});

				//POST PROCESSING
				//Create Shader Passes
				this.composer = new THREE.EffectComposer(this.renderer);
				this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));

				this.renderPass = new THREE.RenderPass(this.scene, this.camera);
				this.copyPass = new THREE.ShaderPass(THREE.CopyShader);

				//object based look up
				this.passes = {};
//				this.passes.badtv = new THREE.ShaderPass( THREE.BadTVShader );
//				this.passes.rgb = new THREE.ShaderPass( THREE.RGBShiftShader );
//				this.passes.pixelate = new THREE.ShaderPass( THREE.PixelateShader );
//				this.passes.slices = new THREE.ShaderPass( THREE.SlicesShader );
				this.passes.dotmatrix = new THREE.ShaderPass(THREE.DotMatrixShader);

				this.passes.film = new THREE.ShaderPass(THREE.FilmShader);
//				this.passes.vignette = new THREE.ShaderPass( THREE.VignetteShader );
				this.passes.mirror = new THREE.ShaderPass(THREE.MirrorShader);
//				this.passes.kaleido = new THREE.ShaderPass( THREE.KaleidoShader );
//				this.passes.dotscreen = new THREE.DotScreenPass(new THREE.Vector2( 0, 0 ), 0.5, 0.8);
//				this.passes.bleach = new THREE.ShaderPass( THREE.BleachBypassShader );
//				this.passes.lut = new THREE.ShaderPass( THREE.LUTShader );
//				this.passes.lines = new THREE.ShaderPass( THREE.LinesShader );
//				this.passes.glow = new THREE.ShaderPass( THREE.GlowShader );
//				this.passes.posterize = new THREE.ShaderPass( THREE.PosterizeShader );
//				this.passes.huesat = new THREE.ShaderPass( THREE.HueSaturationShader );
//				this.passes.brightness = new THREE.ShaderPass( THREE.BrightnessContrastShader );
//				this.passes.polar = new THREE.ShaderPass( THREE.PolarPixelateShader );
//				this.passes.edges = new THREE.ShaderPass( THREE.EdgeShader2 );
//				this.passes.tilt = new THREE.ShaderPass( THREE.VerticalTiltShiftShader );
//				this.passes.wobble = new THREE.ShaderPass( THREE.WobbleShader );

				//composerに追加する
				//ここのロジックは
//				var dotMatrixPass = new THREE.ShaderPass(THREE.DotMatrixShader);
//				dotMatrixPass.uniforms["size"].value = 10;
//				composer.addPass(dotMatrixPass);

				this.gui = new dat.GUI({autoPlace: true });
				console.log(this.gui)
				//LOAD params
				$.ajax({
						type: "GET",
						dataType: "json",
						url: "data/filters.json",
						success: (data)=> {
								this.initFilters(data)
						},
				});

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
				this.videoTexture.minFilter = this.videoTexture.magFilter = THREE.LinearFilter


				this.planeMaterial.needsUpdate = true;
				var planeGeometry = new THREE.PlaneGeometry(800, 800, 10, 10);
				var plane = new THREE.Mesh(planeGeometry, this.planeMaterial);
				this.scene.add(plane);
		}


		private initFilters(data) {
				console.log(data)
				this.filters = data.filters;
				//create UI from params JSON
				var folder;
				$.each(this.filters, (i, filter)=> {

						//create folder

						folder = this.gui.addFolder(filter.displayName);

						//create toogle boolean
						folder.add(filter, 'on').listen().onChange(()=> {
								this.onToggleShaders()
						});

						//add slider for each param
						console.log(filter.params)
						$.each(filter.params, (i, param)=> {
								folder.add(param, 'value', param.min, param.max).step(param.step).listen().name(param.displayName).onChange(()=> {
										this.onParamsChange()
								});
						});
						filter.folder = folder;
						console.log("filter.folder", filter.folder)
				});

				this.onToggleShaders();
//				this.onParamsChange();
		}

		private onParamsChange() {

				//console.log(filters);

				//copy gui params into shader uniforms
				$.each(this.filters, (i, filter)=> {
						$.each(filter.params, (j, param)=> {

								if (param.custom) return true;
								//DEBUG
								console.log(this.passes[filter.name], param.name);
								console.log(this.passes[filter.name])
								console.log(this.passes[filter.name].uniforms[param.name])
								if (this.passes[filter.name].uniforms[param.name] !=  undefined )this.passes[filter.name].uniforms[param.name].value = param.value;
						});

				});

				//FIXMEEEE
				//custom param setting
				//passes.lut.uniforms.lookupTable.value = luts[filters.lut.mode];
//		passes.lut.uniforms.lookupTable.value = luts[filters[14].params[1].value];   //VERY BAD
		}

		private onToggleShaders() {
				console.log("onToggleShaders")
				//Add Shader Passes to Composer
				//order defined by filters.json
				this.composer = new THREE.EffectComposer(this.renderer);
				this.composer.addPass(this.renderPass);
				$.each(this.filters, (i, filter)=> {
						if (filter.on) {
								console.log(this.composer)
								this.composer.addPass(this.passes[filter.name]);
						}
				});


				this.composer.addPass(this.copyPass);
				this.copyPass.renderToScreen = true;
//		this.composer.setSize(renderW,renderH );
				this.composer.setSize(800, 800);
		}

		private onWindowResize() {
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
		}

		private update() {
				if (this.video && this.videoTexture && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
						this.videoTexture.needsUpdate = true;
				}
		}

		private render() {
				this.update();
				this.renderer.render(this.scene, this.camera);
				this.composer.render(0.1);
		}

		public animate() {
				requestAnimationFrame((e)=>
						this.animate()
				);

				this.render();

		}
}

window.addEventListener("load", (e) => {
		var main:VisualizerMain = new VisualizerMain();
		main.animate();
});