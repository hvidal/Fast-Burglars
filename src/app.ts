///<reference path="./definitions/three.d.ts"/>
///<reference path="./definitions/detector.d.ts"/>
///<reference path="./definitions/ammo.d.ts"/>
///<reference path="./definitions/stats.d.ts"/>
///<reference path="./definitions/threex.d.ts"/>


import { Engine } from './engine';
import { ShapeFactory } from './shape_factory';
import { WASDCamera } from './wasd_camera';
import { ChaseCamera } from './chase_camera';
import { Vehicle, VehicleSteering } from './vehicle';
import { CityBuilder } from './city_builder';
import { CityMap } from './city_map';
import { CatchItemCollection } from './catch_item_collection';
import { Loader, AudioPlayer } from './loader';
import { Timer } from './timer';

//-------------------------------------------------------------------

const UI = {
	blockerID: 'blocker',
	hurdID: 'hurd',
	containerID: 'container',
	progressID: 'progress',
	progressBarID: 'progressbar',
	titleID: 'title',
	burglarCountID: 'burglar-count',
	burglarTotalID: 'burglar-total',
	restartID: 'restart',
	timerID: 'timer',
	gameoverID: 'gameover',
};

const State = {
	LOADING: 0,
	PAUSED: 1,
	RUNNING: 2,
	GAMEOVER: 3
};
let gameState: number = State.LOADING;

const elem = document.getElementById(UI.containerID);
elem.innerHTML = "";

const allowEditing = false;
let isEditMode = allowEditing;
const isDebug = false;

if (!Detector.webgl) {
	Detector.addGetWebGLMessage();
} else {
	const engine = new Engine(elem, 0xBFD1E5);
	engine.enableShadows();
	engine.addFog(0xefd1b5, 0.003);

	const animateFnArray: Array<(dt: number)=>void> = [];
	const restartFnArray: Array<()=>void> = [];

	// Game State Switch -- Implemented at the very end
	let setGameState: (state: number) => void;

	// PROGRESS BAR
	const progress = document.getElementById(UI.progressID);
	const title = document.getElementById(UI.titleID);
	const onProgress = (percent: number) => {
		if (percent < 100)
			progress.style.width = percent + '%';
		else {
			document.getElementById(UI.progressBarID).style.display = 'none';
			title.style.display = 'block';
			engine.update(true);
			gameState = State.PAUSED;
		}
	};

	const loader = new Loader(onProgress);

	// CAMERA 1
	const wasdCamera = new WASDCamera(45, window.innerWidth / window.innerHeight, 0.2, 1000);
	wasdCamera.getObject().position.set(168, 25, -12);
	wasdCamera.getObject().rotation.y = 3.14;
	wasdCamera.setPitchRotationX(-0.31);
	engine.addObject(wasdCamera.getObject());
	engine.setCamera(wasdCamera);
	animateFnArray.push((dt: number) => wasdCamera.update(dt));

	// CAMERA 2
	const cameraPos = new THREE.Vector3(168, 25, -12);
	const chaseCamera = new ChaseCamera(45, window.innerWidth / window.innerHeight, 0.2, 1000, cameraPos);
	engine.setCamera(wasdCamera);
	animateFnArray.push((dt: number) => chaseCamera.update(dt));
	restartFnArray.push(() => chaseCamera.position.copy(cameraPos));

	// DIRECTIONAL LIGHT
	let light = new THREE.DirectionalLight(0xCCCCCC, 1);
	light.castShadow = true;
	light.position.set(-50, 50, -50);
	const d = 100;
	light.shadow.camera.left = -d;
	light.shadow.camera.right = d;
	light.shadow.camera.top = d;
	light.shadow.camera.bottom = -d;
	light.shadow.camera.near = 1;
	light.shadow.camera.far = 1000;
	light.shadow.mapSize.x = 4096;
	light.shadow.mapSize.y = 4096;
	engine.addLight(light);

	const modelDir = 'assets/models';

	// AMBIENT LIGHT
	{
		let ambientLight = new THREE.AmbientLight(0xAAAAAA);
		engine.addLight(ambientLight);
	}

	const factory = new ShapeFactory(engine);

	// City Map

	// 0 = block
	// 1 = street
	// 2 = grass
	const cityMapData: Array<string> = [
		'000000000000000000000000',
		'011111111111111111111110',
		'010010012210010010012210',
		'010010012210012210012210',
		'011111111111111111111110',
		'010010010010010010012210',
		'010012210010010012210010',
		'011111112212211111112210',
		'010010010012210010010010',
		'010010012212210010012210',
		'012211111111111111111110',
		'012210010012210210010010',
		'012210010010010210010010',
		'011111111111111111111110',
		'010010010012212210012210',
		'010010010010012210012210',
		'011111111111111111111110',
		'010210012212212210012210',
		'012010012210012210012210',
		'011111111111111111111110',
		'010010010012210010010010',
		'010012210012210012212210',
		'011111111111111111111110',
		'000000000000000000000000',
	];
	const pageSize = 16;
	const cityMap = new CityMap(cityMapData, pageSize, engine, factory, loader);

	// BUILDINGS, HOUSES, TREES
	{
		const builder = new CityBuilder(engine, factory, loader);
		builder.addModel('1', modelDir + '/building/buildingLP1.obj', modelDir + '/building/buildingLP1.mtl', 6, 10, 6);
		builder.addModel('2', modelDir + '/building/buildingLP2.obj', modelDir + '/building/buildingLP2.mtl', 4.6, 10, 4.6);
		builder.addModel('3', modelDir + '/building/buildingLP3.obj', modelDir + '/building/buildingLP3.mtl', 4.7, 10, 4.7);
		builder.addModel('4', modelDir + '/building/buildingLP4.obj', modelDir + '/building/buildingLP4.mtl', 5, 10, 5);
		builder.addModel('5', modelDir + '/building/buildingLP5.obj', modelDir + '/building/buildingLP5.mtl', 4.5, 10, 4.5);
		builder.addModel('6', modelDir + '/building/buildingLP6.obj', modelDir + '/building/buildingLP6.mtl', 5, 10, 5);
		builder.addModel('7', modelDir + '/building/buildingLP7.obj', modelDir + '/building/buildingLP7.mtl', 4.6, 10, 4.6);
		builder.addModel('0', modelDir + '/vegetation/treeLP1.obj', modelDir + '/vegetation/treeLP1.mtl', 0.5, 10, 0.5);
		builder.addModel('9', modelDir + '/vegetation/treeLP2.obj', modelDir + '/vegetation/treeLP2.mtl', 0.5, 10, 0.5);
		builder.addModel('8', modelDir + '/vegetation/plant1.obj', modelDir + '/vegetation/plant1.mtl', 0.1, 0.1, 0.1);

		const PI_2 = Math.PI / 2;

		builder.addInstances({
			'0':[
					{x:246.77,y:0.00,z:185.30,yRotation:3.927,},
					{x:345.22,y:0.00,z:119.81,},
					{x:326.45,y:0.00,z:36.02,scale: new THREE.Vector3(0.66,0.66,0.66),yRotation:2.356,},
					{x:330.76,y:0.00,z:52.48,scale: new THREE.Vector3(1.09,1.09,1.09),},
					{x:344.90,y:0.00,z:41.11,},
					{x:342.06,y:0.00,z:55.85,scale: new THREE.Vector3(1.77,1.77,1.77),},
					{x:133.40,y:0.00,z:51.37,yRotation:1.571,},
					{x:154.68,y:0.00,z:119.92,yRotation:1.571,},
					{x:151.10,y:0.00,z:148.96,yRotation:1.571,},
					{x:133.00,y:0.00,z:291.27,},
					{x:147.01,y:0.00,z:293.26,},
					{x:186.17,y:0.00,z:134.31,scale: new THREE.Vector3(1.77,1.77,1.77),},
					{x:186.16,y:0.00,z:125.07,},
					{x:248.40,y:0.00,z:57.22,scale: new THREE.Vector3(0.86,0.86,0.86),yRotation:0.785,},
					{x:246.32,y:0.00,z:53.77,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:86.40,y:0.00,z:249.89,},
					{x:107.80,y:0.00,z:233.81,},
					{x:104.23,y:0.00,z:242.92,},
					{x:341.99,y:0.00,z:89.04,scale: new THREE.Vector3(0.81,0.81,0.81),yRotation:0.785,},
					{x:330.64,y:0.00,z:87.48,},
					{x:42.60,y:0.00,z:197.80,yRotation:2.356,},
					{x:42.05,y:0.00,z:172.97,},
					{x:182.45,y:0.00,z:183.53,yRotation:1.571,},
					{x:333.01,y:0.00,z:243.25,},
					{x:329.57,y:0.00,z:343.20,},
					{x:343.84,y:0.00,z:345.06,},
					{x:347.65,y:0.00,z:341.09,},
					{x:231.38,y:0.00,z:233.67,},
					{x:242.66,y:0.00,z:253.32,scale: new THREE.Vector3(1.77,1.77,1.77),},
					{x:52.68,y:0.00,z:229.33,scale: new THREE.Vector3(0.90,0.90,0.90),},
					{x:45.72,y:0.00,z:226.64,scale: new THREE.Vector3(0.66,0.66,0.66),},
					{x:329.56,y:0.00,z:282.62,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:338.75,y:0.00,z:295.83,yRotation:0.785,},
					{x:106.92,y:0.00,z:100.59,scale: new THREE.Vector3(0.81,0.81,0.81),},
					{x:40.34,y:0.00,z:295.33,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:0.785,},
				],
			'1':[
					{x:40.00,y:0.00,z:40.00,yRotation:-1.571,},
					{x:40.00,y:0.00,z:90.00,},
					{x:140.28,y:0.00,z:198.25,},
					{x:140.22,y:0.00,z:184.63,},
					{x:230.83,y:0.00,z:102.68,},
					{x:230.87,y:0.00,z:88.31,},
					{x:54.58,y:0.00,z:89.74,},
					{x:150.98,y:0.00,z:88.25,scale: new THREE.Vector3(1.10,1.10,1.10),},
					{x:198.76,y:0.00,z:55.84,},
					{x:327.41,y:0.00,z:328.52,},
					{x:150.29,y:0.00,z:335.86,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:89.99,y:0.00,z:188.68,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:231.64,y:0.00,z:199.03,},
					{x:231.75,y:0.00,z:184.61,},
					{x:294.53,y:0.00,z:152.04,},
					{x:282.98,y:0.00,z:198.62,},
					{x:283.14,y:0.00,z:186.01,},
					{x:294.80,y:0.00,z:186.11,},
					{x:294.78,y:0.00,z:198.54,},
				],
			'2':[
					{x:245.99,y:0.00,z:88.50,},
					{x:55.37,y:0.00,z:103.46,yRotation:4.712,},
					{x:87.70,y:0.00,z:40.27,yRotation:1.571,},
					{x:278.49,y:0.00,z:232.30,scale: new THREE.Vector3(0.90,0.90,0.90),yRotation:3.142,},
					{x:345.74,y:0.00,z:327.82,},
					{x:343.70,y:0.00,z:185.11,},
					{x:136.94,y:0.00,z:329.60,yRotation:3.142,},
					{x:136.83,y:0.00,z:341.07,yRotation:3.142,},
					{x:280.06,y:0.00,z:153.51,yRotation:4.712,},
					{x:40.26,y:0.00,z:332.56,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:1.571,},
					{x:54.23,y:0.00,z:332.59,scale: new THREE.Vector3(1.19,1.19,1.19),yRotation:7.854,},
					{x:152.97,y:0.00,z:99.80,},
					{x:152.98,y:0.00,z:108.35,},
					{x:284.61,y:0.00,z:282.66,scale: new THREE.Vector3(1.33,1.33,1.33),},
				],
			'3':[
					{x:247.07,y:0.00,z:102.33,},
					{x:57.39,y:0.00,z:40.31,},
					{x:40.90,y:0.00,z:103.82,yRotation:3.142,},
					{x:244.54,y:0.00,z:136.13,yRotation:7.854,},
					{x:232.20,y:0.00,z:135.92,yRotation:1.571,},
					{x:278.43,y:0.00,z:245.72,scale: new THREE.Vector3(1.10,1.10,1.10),yRotation:3.142,},
					{x:153.14,y:0.00,z:184.98,},
					{x:153.17,y:0.00,z:198.47,},
					{x:328.92,y:0.00,z:201.66,yRotation:4.712,},
					{x:231.68,y:0.00,z:330.21,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:14.137,},
					{x:87.53,y:0.00,z:137.30,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:3.142,},
					{x:54.10,y:0.00,z:295.41,scale: new THREE.Vector3(1.10,1.10,1.10),yRotation:6.283,},
				],
			'4':[
					{x:89.72,y:0.00,z:297.63,yRotation:3.142,},
					{x:89.67,y:0.00,z:279.69,yRotation:3.142,},
					{x:103.78,y:0.00,z:297.67,},
					{x:103.06,y:0.00,z:279.58,},
					{x:294.84,y:0.00,z:87.49,yRotation:1.571,},
					{x:280.99,y:0.00,z:87.45,yRotation:1.571,},
					{x:199.41,y:0.00,z:103.38,},
					{x:199.38,y:0.00,z:89.18,},
					{x:134.63,y:0.00,z:136.48,yRotation:3.142,},
					{x:153.07,y:0.00,z:136.50,},
					{x:184.94,y:0.00,z:38.97,yRotation:1.571,},
					{x:183.89,y:0.00,z:200.77,yRotation:4.712,},
					{x:199.16,y:0.00,z:200.91,yRotation:4.712,},
					{x:88.65,y:0.00,z:327.28,yRotation:1.571,},
					{x:103.92,y:0.00,z:327.38,yRotation:1.571,},
					{x:151.64,y:0.00,z:247.23,},
					{x:139.48,y:0.00,z:246.91,yRotation:3.142,},
					{x:248.29,y:0.00,z:39.25,yRotation:1.571,},
					{x:234.19,y:0.00,z:39.37,yRotation:1.571,},
					{x:90.15,y:0.00,z:229.43,scale: new THREE.Vector3(0.81,0.81,0.81),yRotation:3.142,},
				],
			'5':[
					{x:343.68,y:0.00,z:135.98,scale: new THREE.Vector3(1.46,1.46,1.46),},
					{x:344.62,y:0.00,z:103.85,scale: new THREE.Vector3(1.46,1.46,1.46),yRotation:1.571,},
					{x:327.57,y:0.00,z:135.79,scale: new THREE.Vector3(1.46,1.46,1.46),yRotation:4.712,},
					{x:326.81,y:0.00,z:104.23,scale: new THREE.Vector3(1.46,1.46,1.46),yRotation:4.712,},
					{x:40.57,y:0.00,z:56.31,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:4.712,},
					{x:56.79,y:0.00,z:55.97,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:7.854,},
					{x:136.67,y:0.00,z:101.82,yRotation:4.712,},
					{x:294.32,y:0.00,z:40.26,scale: new THREE.Vector3(1.46,1.46,1.46),yRotation:3.142,},
					{x:294.27,y:0.00,z:139.16,scale: new THREE.Vector3(1.61,1.61,1.61),yRotation:3.142,},
					{x:342.64,y:0.00,z:200.34,},
					{x:294.52,y:0.00,z:231.99,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:1.571,},
					{x:102.60,y:0.00,z:189.03,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:3.142,},
					{x:102.53,y:0.00,z:199.03,scale: new THREE.Vector3(1.10,1.10,1.10),},
					{x:102.57,y:0.00,z:88.96,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:3.142,},
					{x:281.89,y:0.00,z:39.16,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:4.712,},
					{x:101.20,y:0.00,z:149.84,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:7.854,},
					{x:293.79,y:0.00,z:244.84,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:280.31,y:0.00,z:138.57,scale: new THREE.Vector3(1.46,1.46,1.46),yRotation:3.142,},
					{x:39.59,y:0.00,z:280.50,scale: new THREE.Vector3(1.61,1.61,1.61),yRotation:4.712,},
				],
			'6':[
					{x:200.48,y:0.00,z:246.71,yRotation:7.854,},
					{x:185.09,y:0.00,z:246.45,yRotation:7.854,},
					{x:88.28,y:0.00,z:55.99,yRotation:3.142,},
					{x:102.07,y:0.00,z:55.88,yRotation:3.142,},
					{x:183.50,y:0.00,z:102.62,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:7.854,},
					{x:183.59,y:0.00,z:90.16,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:7.854,},
					{x:53.91,y:0.00,z:150.32,yRotation:4.712,},
					{x:54.12,y:0.00,z:137.25,yRotation:10.996,},
					{x:136.59,y:0.00,z:88.43,},
					{x:294.48,y:0.00,z:52.15,yRotation:3.142,},
					{x:282.53,y:0.00,z:52.32,yRotation:3.142,},
					{x:38.78,y:0.00,z:137.29,yRotation:1.571,},
					{x:38.92,y:0.00,z:150.63,yRotation:1.571,},
					{x:295.12,y:0.00,z:329.26,},
					{x:281.44,y:0.00,z:329.04,},
					{x:184.70,y:0.00,z:297.74,yRotation:3.142,},
					{x:247.42,y:0.00,z:328.61,yRotation:12.566,},
					{x:247.48,y:0.00,z:342.26,yRotation:9.424,},
					{x:231.97,y:0.00,z:341.58,yRotation:9.425,},
					{x:41.64,y:0.00,z:237.25,},
					{x:41.45,y:0.00,z:248.82,},
					{x:54.96,y:0.00,z:237.26,},
					{x:54.89,y:0.00,z:248.62,},
					{x:86.79,y:0.00,z:149.55,yRotation:7.854,},
				],
			'7':[
					{x:103.15,y:0.00,z:40.13,},
					{x:246.35,y:0.00,z:151.83,yRotation:3.142,},
					{x:92.12,y:0.00,z:239.81,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:7.854,},
					{x:198.87,y:0.00,z:39.22,},
					{x:329.56,y:0.00,z:185.09,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:150.48,y:0.00,z:231.37,},
					{x:139.60,y:0.00,z:231.36,},
					{x:40.17,y:0.00,z:344.24,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:53.60,y:0.00,z:344.38,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:89.09,y:0.00,z:88.04,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:200.77,y:0.00,z:296.13,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:3.142,},
					{x:101.03,y:0.00,z:137.23,scale: new THREE.Vector3(1.33,1.33,1.33),yRotation:4.712,},
					{x:284.22,y:0.00,z:294.76,scale: new THREE.Vector3(1.46,1.46,1.46),},
				],
			'8':[
					{x:134.57,y:0.00,z:117.94,yRotation:2.356,},
					{x:129.57,y:0.00,z:121.38,},
					{x:133.55,y:0.00,z:153.81,},
					{x:131.50,y:0.00,z:148.76,yRotation:1.571,},
					{x:140.37,y:0.00,z:153.13,yRotation:0.785,},
					{x:242.21,y:0.00,z:188.29,},
					{x:247.26,y:0.00,z:187.92,},
					{x:245.59,y:0.00,z:200.98,},
					{x:250.72,y:0.00,z:203.75,},
					{x:326.98,y:0.00,z:155.56,scale: new THREE.Vector3(0.81,0.81,0.81),},
					{x:324.74,y:0.00,z:153.03,},
					{x:324.34,y:0.00,z:149.76,},
					{x:346.20,y:0.00,z:156.62,},
					{x:343.98,y:0.00,z:148.74,},
					{x:345.85,y:0.00,z:122.81,},
					{x:342.58,y:0.00,z:119.40,},
					{x:345.00,y:0.00,z:117.43,},
					{x:331.47,y:0.00,z:121.19,},
					{x:326.02,y:0.00,z:119.27,},
					{x:327.08,y:0.00,z:122.70,},
					{x:332.62,y:0.00,z:116.17,},
					{x:330.65,y:0.00,z:41.71,},
					{x:331.65,y:0.00,z:36.92,},
					{x:325.31,y:0.00,z:51.58,yRotation:0.785,},
					{x:345.88,y:0.00,z:53.91,},
					{x:348.89,y:0.00,z:58.81,},
					{x:349.65,y:0.00,z:40.99,},
					{x:343.52,y:0.00,z:34.96,},
					{x:343.48,y:0.00,z:35.01,},
					{x:137.38,y:0.00,z:52.19,yRotation:0.785,},
					{x:132.64,y:0.00,z:56.78,},
					{x:140.50,y:0.00,z:58.96,},
					{x:150.53,y:0.00,z:57.81,yRotation:1.571,},
					{x:156.34,y:0.00,z:52.69,yRotation:2.356,},
					{x:150.11,y:0.00,z:38.53,},
					{x:154.65,y:0.00,z:36.88,},
					{x:147.97,y:0.00,z:42.46,yRotation:3.142,},
					{x:138.06,y:0.00,z:37.87,scale: new THREE.Vector3(0.81,0.81,0.81),},
					{x:156.96,y:0.00,z:118.59,},
					{x:151.70,y:0.00,z:118.49,yRotation:0.785,},
					{x:150.85,y:0.00,z:123.86,},
					{x:148.38,y:0.00,z:113.96,},
					{x:93.80,y:0.00,z:103.49,},
					{x:88.88,y:0.00,z:101.87,},
					{x:89.23,y:0.00,z:107.94,},
					{x:61.34,y:0.00,z:204.45,yRotation:5.498,},
					{x:60.23,y:0.00,z:196.70,yRotation:2.356,},
					{x:59.76,y:0.00,z:185.70,yRotation:4.712,},
					{x:150.24,y:0.00,z:274.51,},
					{x:134.63,y:0.00,z:279.04,},
					{x:133.62,y:0.00,z:283.91,},
					{x:132.81,y:0.00,z:291.64,},
					{x:131.38,y:0.00,z:298.71,},
					{x:104.97,y:0.00,z:344.20,},
					{x:103.76,y:0.00,z:337.48,},
					{x:100.99,y:0.00,z:341.81,},
					{x:88.11,y:0.00,z:346.79,},
					{x:89.27,y:0.00,z:339.38,},
					{x:92.70,y:0.00,z:342.88,},
					{x:86.21,y:0.00,z:341.61,},
					{x:135.98,y:0.00,z:276.40,},
					{x:135.98,y:0.00,z:276.40,},
					{x:278.98,y:0.00,z:107.88,},
					{x:279.30,y:0.00,z:101.36,},
					{x:281.39,y:0.00,z:102.11,},
					{x:297.39,y:0.00,z:106.63,},
					{x:293.93,y:0.00,z:104.50,},
					{x:300.00,y:0.00,z:100.51,},
					{x:292.33,y:0.00,z:101.60,},
					{x:290.64,y:0.00,z:107.02,},
					{x:249.40,y:0.00,z:177.75,yRotation:8.639,},
					{x:250.36,y:0.00,z:185.14,yRotation:2.356,},
					{x:246.95,y:0.00,z:181.75,},
					{x:200.24,y:0.00,z:131.84,},
					{x:190.06,y:0.00,z:124.36,},
					{x:183.06,y:0.00,z:119.58,yRotation:0.785,},
					{x:182.14,y:0.00,z:139.35,},
					{x:186.41,y:0.00,z:149.73,},
					{x:200.95,y:0.00,z:149.51,},
					{x:194.91,y:0.00,z:156.88,},
					{x:205.14,y:0.00,z:154.33,},
					{x:200.62,y:0.00,z:142.21,},
					{x:202.00,y:0.00,z:137.89,},
					{x:247.11,y:0.00,z:52.46,},
					{x:235.63,y:0.00,z:53.03,scale: new THREE.Vector3(1.15,1.15,1.15),},
					{x:229.91,y:0.00,z:56.10,scale: new THREE.Vector3(1.16,1.16,1.16),yRotation:0.785,},
					{x:254.24,y:0.00,z:55.82,yRotation:2.356,},
					{x:251.90,y:0.00,z:54.87,},
					{x:236.47,y:0.00,z:57.85,yRotation:0.785,},
					{x:327.39,y:0.00,z:84.74,},
					{x:325.72,y:0.00,z:88.16,},
					{x:338.95,y:0.00,z:84.57,},
					{x:345.11,y:0.00,z:85.08,},
					{x:39.47,y:0.00,z:182.98,},
					{x:40.26,y:0.00,z:187.02,yRotation:2.356,},
					{x:51.73,y:0.00,z:194.12,},
					{x:36.58,y:0.00,z:200.43,},
					{x:43.00,y:0.00,z:202.31,yRotation:0.785,},
					{x:181.67,y:0.00,z:230.45,},
					{x:187.00,y:0.00,z:235.45,yRotation:0.785,},
					{x:197.98,y:0.00,z:228.08,},
					{x:200.05,y:0.00,z:234.18,},
					{x:193.66,y:0.00,z:185.27,},
					{x:344.29,y:0.00,z:236.06,},
					{x:332.83,y:0.00,z:233.06,},
					{x:328.43,y:0.00,z:231.68,},
					{x:339.64,y:0.00,z:247.09,},
					{x:343.87,y:0.00,z:249.70,},
					{x:348.20,y:0.00,z:246.73,},
					{x:330.89,y:0.00,z:296.55,yRotation:1.570,},
					{x:341.78,y:0.00,z:286.07,yRotation:3.141,},
					{x:342.94,y:0.00,z:280.68,},
					{x:327.71,y:0.00,z:279.97,},
					{x:344.38,y:0.00,z:293.73,yRotation:0.785,},
					{x:347.80,y:0.00,z:300.03,yRotation:0.785,},
					{x:326.01,y:0.00,z:346.31,},
					{x:298.89,y:0.00,z:343.51,yRotation:1.571,},
					{x:293.83,y:0.00,z:344.71,yRotation:0.785,},
					{x:281.49,y:0.00,z:342.39,yRotation:1.571,},
					{x:281.11,y:0.00,z:348.33,},
					{x:278.16,y:0.00,z:345.45,},
					{x:232.59,y:0.00,z:247.55,},
					{x:244.40,y:0.00,z:246.08,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:248.52,y:0.00,z:237.58,},
					{x:237.05,y:0.00,z:234.06,},
					{x:182.77,y:0.00,z:324.22,},
					{x:200.62,y:0.00,z:337.32,},
					{x:197.43,y:0.00,z:341.59,},
					{x:200.02,y:0.00,z:326.97,},
					{x:186.89,y:0.00,z:342.37,},
					{x:229.79,y:0.00,z:285.20,},
					{x:230.82,y:0.00,z:294.08,},
					{x:244.28,y:0.00,z:291.21,},
					{x:297.28,y:0.00,z:286.66,yRotation:1.571,},
					{x:297.44,y:0.00,z:280.00,yRotation:0.785,},
					{x:296.47,y:0.00,z:296.76,yRotation:1.571,},
					{x:292.91,y:0.00,z:292.51,},
					{x:301.68,y:0.00,z:291.38,yRotation:0.785,},
					{x:181.13,y:0.00,z:278.75,scale: new THREE.Vector3(1.33,1.33,1.33),},
					{x:197.19,y:0.00,z:280.97,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:200.90,y:0.00,z:278.14,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:0.785,},
					{x:104.90,y:0.00,z:106.25,yRotation:2.356,},
					{x:101.81,y:0.00,z:102.10,yRotation:0.785,},
					{x:35.22,y:0.00,z:294.05,yRotation:0.785,},
					{x:37.89,y:0.00,z:298.26,scale: new THREE.Vector3(1.21,1.21,1.21),},
					{x:57.31,y:0.00,z:279.30,},
					{x:52.81,y:0.00,z:282.26,yRotation:0.785,},
					{x:51.63,y:0.00,z:274.74,yRotation:1.571,},
				],
			'9':[
					{x:137.60,y:0.00,z:120.66,yRotation:1.571,},
					{x:136.20,y:0.00,z:148.83,yRotation:2.356,},
					{x:247.60,y:0.00,z:199.33,},
					{x:328.64,y:0.00,z:152.42,scale: new THREE.Vector3(0.66,0.66,0.66),yRotation:2.356,},
					{x:339.50,y:0.00,z:153.90,yRotation:4.712,},
					{x:153.79,y:0.00,z:43.80,yRotation:3.142,},
					{x:149.78,y:0.00,z:53.93,scale: new THREE.Vector3(0.81,0.81,0.81),yRotation:2.356,},
					{x:134.36,y:0.00,z:40.30,scale: new THREE.Vector3(0.66,0.66,0.66),yRotation:0.785,},
					{x:83.69,y:0.00,z:105.00,},
					{x:60.27,y:0.00,z:164.72,},
					{x:56.66,y:0.00,z:185.87,},
					{x:56.66,y:0.00,z:195.41,},
					{x:54.61,y:0.00,z:202.99,yRotation:1.571,},
					{x:135.82,y:0.00,z:281.76,},
					{x:152.11,y:0.00,z:281.07,},
					{x:202.35,y:0.00,z:120.93,yRotation:1.571,},
					{x:198.55,y:0.00,z:137.18,},
					{x:233.29,y:0.00,z:54.31,scale: new THREE.Vector3(0.81,0.81,0.81),yRotation:1.571,},
					{x:184.45,y:0.00,z:55.78,},
					{x:201.23,y:0.00,z:184.74,yRotation:1.571,},
					{x:340.88,y:0.00,z:232.42,},
					{x:244.23,y:0.00,z:236.80,},
					{x:98.58,y:0.00,z:289.77,scale: new THREE.Vector3(0.73,0.73,0.73),yRotation:3.142,},
					{x:184.02,y:0.00,z:330.52,},
					{x:245.32,y:0.00,z:282.86,scale: new THREE.Vector3(1.21,1.21,1.21),yRotation:0.785,},
					{x:186.40,y:0.00,z:281.07,scale: new THREE.Vector3(0.73,0.73,0.73),yRotation:0.785,},
				],
		});

		allowEditing && builder.startEditor();
	}

	// BURGLARS
	const burglarSize = 2.6;
	const burglarMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, transparent: true});
	const burglarCollection = new CatchItemCollection(burglarSize, pageSize, burglarMaterial, engine, cityMapData);

	loader.loadTexture('assets/img/burglar.png', (texture: THREE.Texture) => {
		burglarMaterial.map = texture;
		burglarMaterial.needsUpdate = true;

		const getTsections = (colLeft: number, colRight: number) => {
			const left: Array<number> = [];
			const right: Array<number> = [];
			for (let i = 0; i < cityMapData.length; i++) {
				if (cityMapData[i][colLeft+1] == '1')
					left.push(i);
				if (cityMapData[i][colRight-1] == '1')
					right.push(i);
			}
			return {left: left, right: right};
		};
		const sections = getTsections(1, 22);

		const addRandomBurglars = (arr: Array<number>, max: number, dir: string) => {
			for (let i = 0; i < max; i++) {
				const row = arr[Math.floor(Math.random() * arr.length)];
				burglarCollection.newItem(1, row, dir);
			}
		};
		addRandomBurglars(sections.left, 5, 'right');
		addRandomBurglars(sections.right, 5, 'left');
		burglarCollection.enableCustomDepthMaterial();
		burglarCollection.enableRotation(0.15, 85);
	});

	// AUDIO
	let pointPlayer: AudioPlayer;
	loader.loadAudio('assets/audio/point.ogg', (player: AudioPlayer) => {
		pointPlayer = player;
	});

	let finishPlayer: AudioPlayer;
	loader.loadAudio('assets/audio/finish.ogg', (player: AudioPlayer) => {
		finishPlayer = player;
	});

	// -- add listener
	const burglarCountElement = document.getElementById(UI.burglarCountID);
	const burglarTotalElement = document.getElementById(UI.burglarTotalID);
	let _caught: number;
	burglarCollection.addUpdateListener((caught: number, total: number) => {
		if (caught != _caught) {
			burglarCountElement.innerHTML = caught.toString();
			burglarTotalElement.innerHTML = total.toString();
			_caught = caught;
			caught > 0 && pointPlayer && pointPlayer.play(false);
			if (caught == total) {
				setTimeout(() => {
					finishPlayer && finishPlayer.play(false);
				}, 500);
				setGameState(State.GAMEOVER);
			}
		}
	});
	restartFnArray.push(() => burglarCollection.reset());

	// VEHICLE
	{
		loader.loadOBJ(modelDir + '/wheel.obj', modelDir + '/wheel.mtl', (wheel: THREE.Object3D) => {
			wheel.castShadow = true;
			for (let i = 0; i < wheel.children.length; i++)
				wheel.children[i].castShadow = true;

			loader.loadOBJ(modelDir + '/police.obj', modelDir + '/police.mtl', (car: THREE.Object3D) => {
				car.castShadow = true;
				for (let i = 0; i < car.children.length; i++)
					car.children[i].castShadow = true;

				const mass = 100.0;
				const pos = new THREE.Vector3(168, 1, 40);
				const quat = new THREE.Quaternion(0, 0, 0, 1);

				const carCollisionShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.25, 2));
				const carRigidBody = factory.createRigidBody(carCollisionShape, mass, pos, quat);

				const vehicle = new Vehicle(mass, carRigidBody, pos, quat, engine.getPhysicsWorld());

				// Wheels
				const wheelRadius = 0.5;
				const suspensionRestLength = 0.3;
				const yAttach = -0.25;
				const zAttach = 1.5;
				vehicle.addWheel(new Ammo.btVector3(-1.0, yAttach, zAttach + 0.2), wheelRadius, suspensionRestLength, true);
				vehicle.addWheel(new Ammo.btVector3(1.0, yAttach, zAttach + 0.2), wheelRadius, suspensionRestLength, true);
				vehicle.addWheel(new Ammo.btVector3(-1.0, yAttach, -zAttach), wheelRadius, suspensionRestLength, false);
				vehicle.addWheel(new Ammo.btVector3(1.0, yAttach, -zAttach), wheelRadius, suspensionRestLength, false);

				const wheelDiameter = 2 * wheelRadius;
				const wheelWidth = 0.3;
				const wheelArr = [
					wheel.clone(true),
					wheel.clone(true),
					wheel.clone(true),
					wheel.clone(true),
				];
				engine.addObject(wheelArr[0]);
				engine.addObject(wheelArr[1]);
				engine.addObject(wheelArr[2]);
				engine.addObject(wheelArr[3]);

				engine.addPhysicsObject(car, carRigidBody, mass);
				engine.addVehicle(car, vehicle.bt());

				// CONTROLS
				const vehicleSteering = new VehicleSteering(vehicle);

				light.target = car;
				chaseCamera.setChaseObject(car, 7, 10, 15);

				const toSun = new THREE.Vector3(-50, 50, 50);

				car.userData.update = () => {
					vehicleSteering.updateWheel(0, true, wheelArr[0]);
					vehicleSteering.updateWheel(1, true, wheelArr[1]);
					vehicleSteering.updateWheel(2, false, wheelArr[2]);
					vehicleSteering.updateWheel(3, false, wheelArr[3]);

					// make sun light follow the car (shadows always visible)
					light.position.set(toSun.x + car.position.x, toSun.y + car.position.y, toSun.z + car.position.z);

					// update burglars
					burglarCollection.update((p: THREE.Vector3) => {
						return p.distanceTo(car.position) < 3.0;
					});
				};

				const vZero = new Ammo.btVector3(0,0,0);
				restartFnArray.push(() => {
					var transform = new Ammo.btTransform();
					transform.setIdentity();
					transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
					transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
					carRigidBody.setWorldTransform(transform);
					carRigidBody.setLinearVelocity(vZero);
					carRigidBody.setAngularVelocity(vZero);
				});
			});
		});
	}

	if (isDebug) {
		// STATS
		const stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		elem.appendChild(stats.domElement);
		animateFnArray.push((dt: number) => stats.update());

		// STATS 2
		var rendererStats = new THREEx.RendererStats();
		rendererStats.domElement.style.position = 'absolute';
		rendererStats.domElement.style.left = '0px';
		rendererStats.domElement.style.bottom = '0px';
		document.body.appendChild(rendererStats.domElement);
		animateFnArray.push((dt: number) => rendererStats.update(engine.getRenderer()));
	}

	// AUDIO
	let sirenPlayer: AudioPlayer;
	loader.loadAudio('assets/audio/siren.ogg', (player: AudioPlayer) => {
		sirenPlayer = player;
	});

	// TIMER
	const timerElement = document.getElementById(UI.timerID);
	const timer = new Timer();
	animateFnArray.push((dt: number) => timer.print(timerElement))
	restartFnArray.push(() => timer.restart());

	// BLOCKER SCREEN & STATES
	const blocker = document.getElementById(UI.blockerID);
	const hurd = document.getElementById(UI.hurdID);
	const gameover = document.getElementById(UI.gameoverID);

	setGameState = (state: number) => {
		gameState = state;
		if (state == State.RUNNING) {
			wasdCamera.enabled = true;
			chaseCamera.enabled = true;
			blocker.style.display = 'none';
			hurd.style.display = 'block';
			hurd.className = '';
			gameover.style.display = 'none';
			sirenPlayer.play(true);
			timer.start();
		} else if (state == State.PAUSED) {
			wasdCamera.enabled = false;
			chaseCamera.enabled = false;
			blocker.style.display = 'block';
			hurd.style.display = 'none';
			hurd.className = '';
			gameover.style.display = 'none';
			sirenPlayer.stop();
			timer.stop();
		} else if (state == State.GAMEOVER) {
			hurd.className = 'blocker';
			gameover.style.display = 'block';
			timer.stop();
			sirenPlayer.stop();
		}
	}
	restartFnArray.push(() => setGameState(State.RUNNING));

	document.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.keyCode == 27 && gameState != State.GAMEOVER) { // ESC
			setGameState(State.PAUSED);
		} else if (allowEditing && gameState == State.RUNNING && event.key == '\\') {
			isEditMode = !isEditMode;
			isEditMode && wasdCamera.lockPointer();
			engine.setCamera(isEditMode? wasdCamera : chaseCamera);
		}
	}, true);

	// HANDLE MOUSE CLICK
	window.addEventListener('mousedown', (event) => {
		let element = <Element> event.target;
		if (element.nodeName == 'A')
			return;
		else if (gameState == State.LOADING)
			return;

		if (isEditMode && !wasdCamera.enabled) {
			wasdCamera.lockPointer();
			setGameState(State.RUNNING);
		} else if (!chaseCamera.enabled) {
			engine.setCamera(chaseCamera);
			setGameState(State.RUNNING);
		}
	}, false);

	// START THE ENGINE
	const animate = () => {
		requestAnimationFrame(animate);
		const dt = engine.update(gameState == State.RUNNING);
		for (let fn of animateFnArray)
			fn(dt);
	}
	animate();

	// handle restart
	document.getElementById(UI.restartID).addEventListener('click', (event) => {
		if (event.clientX == 0 && event.clientY == 0)
			return;
		for (let fn of restartFnArray)
			fn();
	});
}
