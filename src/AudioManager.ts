/// <reference path="events/EventDispatcher.ts"/>

class AudioManager extends events.EventDispatcher {

	private static _instance:AudioManager = null;

	constructor() {
		super();
		if (AudioManager._instance) {
			throw new Error("must use the getInstance.");
		}
		super();
		AudioManager._instance = this;
	}

	public static getInstance():AudioManager {
		if (AudioManager._instance === null) {
			AudioManager._instance = new AudioManager();
		}
		return AudioManager._instance;
	}

	private source;
	private audioContext;
	private fileReader;
	private analyser;
	private isPlayingAudio:Boolean;

	private waveData; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
	private levelsData; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]
	private volume; // averaged normalized level from 0 - 1
	private bpmTime; // bpmTime ranges from 0 to 1. 0 = on beat. Based on tap bpm
	private ratedBPMTime;//time between beats (msec) multiplied by BPMRate
	private levelHistory; //last 256 ave norm levels
	private bpmStart; //FIXME

	private BEAT_HOLD_TIME; //num of frames to hold a beat
	private BEAT_DECAY_RATE;
	private BEAT_MIN; //level less than this is no beat

	//BPM STUFF
	private count;
	private msecsFirst;
	private msecsPrevious;
	private msecsAvg; //time between beats (msec)

	private timer;
	private gotBeat;

	private freqByteData; //bars - bar data is from 0 - 256 in 512 bins. no sound is 0;
	private timeByteData; //waveform - waveform data is from 0-256 for 512 bins. no sound is 128.
	private levelsCount; //should be factor of 512

	private binCount; //512
	private levelBins;

	private volSens;
	private beatCutOff;
	private beatTime;

//		var source;
//		var buffer;
	private audioBuffer;
//		var dropArea;
//		var audioContext;
	//var processor;
//		var analyser;
	private beatHoldTime;
	private beatDecayRate;
	private high;

	private _useBeatDetect:boolean = true;

	public initialize() {

		this.audioContext = new AudioContext();
		this.fileReader = new FileReader();
		this.isPlayingAudio = false;

		this.waveData = []; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
		this.levelsData = []; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]
		this.volume = 0; // averaged normalized level from 0 - 1
		this.bpmTime = 0; // bpmTime ranges from 0 to 1. 0 = on beat. Based on tap bpm
		this.ratedBPMTime = 550;//time between beats (msec) multiplied by BPMRate
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
		this.fileReader.onload = ()=> {

			this.stopSound();
			this.initSound();

			//ロード完了後buffer取得開始
			this.audioContext.decodeAudioData(this.fileReader.result, (buffer)=> {
				this.source = this.audioContext.createBufferSource();
				this.source.buffer = buffer;
				this.source.connect(this.analyser);
				//onload callback
				this.startSound()
				this.dispatchEvent(new events.Event("onLoad"));
			});
		}
		//view fileName
		document.getElementById('file').addEventListener('change', (e:any)=> {
			this.fileReader.readAsArrayBuffer(e.target.files[0]);
		});
	}


	/**
	 * スペクトラム取得
	 * @returns {Uint8Array}
	 */
	public getSpectrum() {
		//描画前にスペクトラムを取得する
		var spectrums = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(spectrums);
		return spectrums
	}

	/**
	 * アナライザー取得
	 * @returns {any}
	 */
	public getAnalyser() {
		return this.analyser
	}

	//load sample MP3
	public loadSampleAudio() {

		this.stopSound();
		this.initSound();

		var sampleURL = "data/sound/db.mp3"
		// Load asynchronously
		var request = new XMLHttpRequest();
		request.open("GET", sampleURL, true);
		request.responseType = "arraybuffer";

		request.onload = ()=> {
			this.audioContext.decodeAudioData(request.response, (buffer)=> {
				this.audioBuffer = buffer;
				this.startSound();
			}, function (e) {
				console.log(e);
			});
		};
		request.send();

	}

	public initSound() {
		this.source = this.audioContext.createBufferSource();
		this.source.connect(this.analyser);
	}

	public startSound() {
		this.source.buffer = this.audioBuffer;
		this.source.loop = true;
		this.source.start(0.0);
		this.isPlayingAudio = true;
	}

	public stopSound() {
		this.isPlayingAudio = false;
		if (this.source) {
			this.source.stop(0);
			this.source.disconnect();
		}
	}

	private onBMPBeat() {
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

	}

	//called every frame
	//update published viz data
	public update() {

//				console.log("audio.update");

		if (!this.isPlayingAudio) return;

		//GET DATA
		this.analyser.getByteFrequencyData(this.freqByteData); //<-- bar chart
		this.analyser.getByteTimeDomainData(this.timeByteData); // <-- waveform

		//normalize waveform data
		for (var i = 0; i < this.binCount; i++) {
			this.waveData[i] = ((this.timeByteData[i] - 128) / 128 );
		}
		//TODO - cap levels at 1 and -1 ?

		//normalize levelsData from freqByteData
		for (var i = 0; i < this.levelsCount; i++) {
			var sum = 0;
			for (var j = 0; j < this.levelBins; j++) {
				sum += this.freqByteData[(i * this.levelBins) + j];
			}
			this.levelsData[i] = sum / this.levelBins / 256 * this.volSens

			//adjust for the fact that lower levels are percieved more quietly
			//make lower levels smaller
			//levelsData[i] *=  1 + (i/levelsCount)/2; //??????
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
			console.log("on beat")
			if(this._useBeatDetect){
				this.dispatchEvent(new events.Event("onBeat"));
			}

			this.beatCutOff = this.volume * 1.1;
			this.beatTime = 0;
		} else {
			if (this.beatTime <= this.beatHoldTime) {
				this.beatTime++;
			} else {
				this.beatCutOff *= this.beatDecayRate;
				this.beatCutOff = Math.max(this.beatCutOff, this.BEAT_MIN);
			}
		}


		this.bpmTime = (new Date().getTime() - this.bpmStart) / this.msecsAvg;
		//trace(bpmStart);

//		if (ControlsHandler.audioParams.showDebug) debugDraw();
	}

	/**
	 * set BeatDetect function
	 * @param flag
	 */
	public setBeatDetect(flag:boolean) {
		this._useBeatDetect = flag;
	}

	/**
	 * get BeatDetect function flag
	 * @returns {boolean}
	 */
	public getBeatDetect() {
		return this._useBeatDetect;
	}
}