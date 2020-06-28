///<reference path="./definitions/three_ext.d.ts"/>

const textureLoader = new THREE.TextureLoader();
const mtlLoader = new THREE.MTLLoader();

export class Loader {

	private total: number = 0;
	private loaded: number = 0;
	private callback: (percent: number) => void;
	public audioContext: AudioContext;

	constructor(callback: (percent: number) => void) {
		this.callback = callback;

		// init audio
		const _window: any = window;
		this.audioContext = new (_window.AudioContext || _window.webkitAudioContext)();
	}

	private reportProgress() {
		const percent = Math.round(100 * this.loaded / this.total);
		this.callback(percent);
	}

	public loadTexture(url: string, handler: (texture: THREE.Texture) => void) {
		this.total++;
		textureLoader.load(url, (texture: THREE.Texture) => {
			this.loaded++;
			handler(texture);
			this.reportProgress();
		});
	}

	private loadMTL0(url: string, handler: (materials: THREE.MTLLoader.MaterialCreator) => void) {
		this.total++;
		mtlLoader.load(url, (materials: THREE.MTLLoader.MaterialCreator) => {
			this.loaded++;
			materials.preload();
			handler(materials);
			this.reportProgress();
		});
	}

	public loadOBJ0(url: string, materials: THREE.MTLLoader.MaterialCreator, handler: (o: THREE.Object3D) => void) {
		this.total++;
		const objLoader = new THREE.OBJLoader();
		objLoader.setMaterials(materials);
		objLoader.load(url, (o: THREE.Object3D) => {
			this.loaded++;
			handler(o);
			this.reportProgress();
		});
	}

	public loadOBJ(objPath: string, mtlPath: string, callback: (o: THREE.Object3D) => void) {
		this.loadMTL0(mtlPath, (materials: THREE.MTLLoader.MaterialCreator) => {
			this.loadOBJ0(objPath, materials, callback);
		});
	}

	public loadAudio(path: string, callback: (player: AudioPlayer) => void) {
		this.total++;
		new AudioBufferLoader(this.audioContext, [path], (bufferList: Array<AudioBuffer>) => {
			this.loaded++;
			callback(new AudioPlayer(this, bufferList[0]));
			this.reportProgress();
		}).load();
	}
}

export class AudioPlayer {
	private loader: Loader;
	private buffer: AudioBuffer;
	private source: AudioBufferSourceNode;

	constructor(loader: Loader, buf: AudioBuffer) {
		this.loader = loader;
		this.buffer = buf;
	}
	public play(loop: boolean = false) {
		this.source && this.stop();
		this.source = this.loader.audioContext.createBufferSource();
		this.source.buffer = this.buffer;
		this.source.connect(this.loader.audioContext.destination);
		this.source.loop = loop;
		this.source.start(0);
	}
	public stop() {
		if (this.source) {
			this.source.stop();
			this.source = null;
		}
	}
};

/* See https://www.html5rocks.com/en/tutorials/webaudio/intro/js/buffer-loader.js */
class AudioBufferLoader {

	private context: AudioContext;
	private urls: Array<string>;
	private onload: (s: Array<AudioBuffer>) => void;
	private bufferList: Array<AudioBuffer> = [];
	private loadCount: number = 0;

	constructor(context: AudioContext, urls: Array<string>, callback: (s: Array<AudioBuffer>) => void) {
		this.context = context;
		this.urls = urls;
		this.onload = callback;
	}

	private loadBuffer(url: string, index: number) {
		// Load buffer asynchronously
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		var loader = this;

		request.onload = function() {
			// Asynchronously decode the audio file data in request.response
			loader.context.decodeAudioData(
				request.response,
				function(buffer: AudioBuffer) {
					if (!buffer) {
						alert('error decoding file data: ' + url);
						return;
					}
					loader.bufferList[index] = buffer;
					if (++loader.loadCount == loader.urls.length)
						loader.onload(loader.bufferList);
				},
				function(error: Error) {
					console.error('decodeAudioData error', error);
				}
			);
		}

		request.onerror = function() {
			alert('BufferLoader: XHR error');
		}
		request.send();
	}

	public load() {
		for (var i = 0; i < this.urls.length; ++i)
			this.loadBuffer(this.urls[i], i);
	}
}