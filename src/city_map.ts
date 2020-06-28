import { Engine } from './engine';
import { ShapeFactory } from './shape_factory';
import { Loader } from './loader';

interface GroundMaterial {
	src: string;
	base: THREE.Material;
	handler: (t: THREE.Texture) => void;
}

interface GroundBlock {
	material: GroundMaterial;
	yRotation?: number;
}

const _repeatHandler = (texture: THREE.Texture) => {
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1, 1);
};

const _clampToEdgeHandler = (texture: THREE.Texture) => {
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
};

const materials = {
	block: {
		src: "assets/img/cement.jpg",
		base: new THREE.MeshPhongMaterial({color: 0xAAAAAA}),
		handler: _repeatHandler
	},
	grass: {
		src: "assets/img/grass.jpg",
		base: new THREE.MeshPhongMaterial({color: 0xBBBBBB}),
		handler: _repeatHandler
	},
	asphalt: {
		src: "assets/img/asphalt.jpg",
		base: new THREE.MeshPhongMaterial({color: 0x888888}),
		handler: _clampToEdgeHandler
	},
	asphalt0: {
		src: "assets/img/asphalt0.jpg",
		base: new THREE.MeshPhongMaterial({color: 0x888888}),
		handler: _clampToEdgeHandler
	},
	asphaltT: {
		src: "assets/img/asphaltT.jpg",
		base: new THREE.MeshPhongMaterial({color: 0x888888}),
		handler: _clampToEdgeHandler
	},
	asphaltX: {
		src: "assets/img/asphaltX.jpg",
		base: new THREE.MeshPhongMaterial({color: 0x888888}),
		handler: _clampToEdgeHandler
	},
	asphaltC: {
		src: "assets/img/asphaltC.jpg",
		base: new THREE.MeshPhongMaterial({color: 0x888888}),
		handler: _clampToEdgeHandler
	},
};

const PI_2 = Math.PI / 2;
const streetConfig = {
	'1111': { material: materials.asphaltX }, // cross
	'XX11': { material: materials.asphalt0, yRotation: PI_2 }, // horizontal
	'11XX': { material: materials.asphalt0 }, // vertical
	'X111': { material: materials.asphaltT }, // T down
	'1X11': { material: materials.asphaltT, yRotation: Math.PI }, // T up
	'111X': { material: materials.asphaltT, yRotation: -PI_2 }, // T left
	'11X1': { material: materials.asphaltT, yRotation: PI_2 }, // T right
	'X1X1': { material: materials.asphaltC }, // Curve down-right
	'X11X': { material: materials.asphaltC, yRotation: -PI_2 }, // Curve down-left
	'1XX1': { material: materials.asphaltC, yRotation: PI_2 }, // Curve up-right
	'1X1X': { material: materials.asphaltC, yRotation: Math.PI }, // Curve up-left
	getKey: (up: string, down: string, left: string, right: string) => {
		return (
			(up == '1'? '1':'X') +
			(down == '1'? '1':'X') +
			(left == '1'? '1':'X') +
			(right == '1'? '1':'X')
		);
	}
};

const quat = new THREE.Quaternion(0, 0, 0, 1);
const blockHeight = 2;
const halfBlockHeight = blockHeight >> 1;
const streetShift = -0.3;

export class CityMap {

	public constructor(data: Array<string>, pageSize: number, engine: Engine, factory: ShapeFactory, loader: Loader) {
		this.buildBlocks(data, pageSize, engine, factory, loader);
		this.buildMargins(data, pageSize, engine, factory, loader);
	}

	private buildBlocks(data: Array<string>, pageSize: number, engine: Engine, factory: ShapeFactory, loader: Loader): void {
		const halfPage = pageSize >> 1;

		const geometry = new THREE.PlaneGeometry(pageSize, pageSize);
		geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-0.5 * Math.PI).setPosition(new THREE.Vector3(0, 1, 0)));

		const shape = new Ammo.btBoxShape(new Ammo.btVector3(pageSize * 0.5, halfBlockHeight, pageSize * 0.5));
		shape.setMargin(0.05);

		for (let row = 0; row < data.length; row++) {
			const z = row * pageSize;
			const s = data[row];
			for (let column = 0; column < s.length; column++) {
				let yShift = 0;
				let yRotation = 0;
				const x = column * pageSize;
				const c = s[column];
				let m: GroundMaterial;
				if (c == '0' || c == '2') {
					m = c == '0'? materials.block : materials.grass;
				} else if (c == '1') {
					yShift = streetShift;
					const up = data[row-1][column];
					const down = data[row+1][column];
					const left = data[row][column-1];
					const right = data[row][column+1];

					const key: string = streetConfig.getKey(up, down, left, right);
					const conf: GroundBlock = (<any>streetConfig)[key];
					if (conf) {
						m = conf.material;
						yRotation = conf.yRotation || 0;
					} else
						m = materials.asphalt;
				}
				const pos = new THREE.Vector3(x + halfPage, -halfBlockHeight + yShift, z + halfPage);
				const page = factory.createParallelepiped(geometry, shape, 0, pos, quat, m.base);
				yRotation != 0 && page.rotateY(yRotation);
				page.receiveShadow = true;
				loader.loadTexture(m.src, (texture: THREE.Texture) => {
					m.handler(texture);
					const _material: any = page.material;
					_material.map = texture;
					_material.needsUpdate = true;
				});
			}
		}
	}

	private getQuaternion(yRotation: number) {
		const yAxis = new THREE.Vector3(0, 1, 0);
		const quaternion = new THREE.Quaternion(0, 0, 0, 1);
		quaternion.setFromAxisAngle(yAxis, yRotation);
		return quaternion;
	}

	/* Adds extra land around the city and walls to prevent objects from falling */
	private buildMargins(data: Array<string>, pageSize: number, engine: Engine, factory: ShapeFactory, loader: Loader): void {
		const sizeFactor = 2;
		const width = pageSize * sizeFactor;
		const halfWidth = width >> 1;

		const cityLength = data[0].length * pageSize;
		const length = cityLength + width;
		const halfLength = length >> 1;

		const quat_PI_2 = this.getQuaternion(0.5 * Math.PI);

		// Grass Margins
		{
			const geometry = new THREE.PlaneGeometry(width, length);
			geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-0.5 * Math.PI).setPosition(new THREE.Vector3(0, halfBlockHeight, 0)));

			const shape = new Ammo.btBoxShape(new Ammo.btVector3(width * 0.5, halfBlockHeight, length * 0.5));
			shape.setMargin(0.05);

			const material = new THREE.MeshPhongMaterial({color: 0xAAAAAA});
			loader.loadTexture('assets/img/grass0.jpg', (texture: THREE.Texture) => {
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.set(sizeFactor, data[0].length + 1);
				material.map = texture;
				material.needsUpdate = true;
			});

			const createMargin = (x: number, z: number, quat: THREE.Quaternion) => {
				const pos = new THREE.Vector3(x, -halfBlockHeight, z);
				const page = factory.createParallelepiped(geometry, shape, 0, pos, quat, material);
				page.receiveShadow = true;
				engine.addObject(page);
			};

			createMargin(-halfWidth, halfLength, quat);
			createMargin(cityLength + halfWidth, halfLength - width, this.getQuaternion(Math.PI));
			createMargin(halfLength - width, -halfWidth, quat_PI_2);
			createMargin(halfLength, cityLength + halfWidth, quat_PI_2);
		}

		// Walls
		{
			const wallSize = cityLength + width + width;
			const halfWallSize = wallSize >> 1;
			const wallHeight = 14;
			const halfWallHeight = wallHeight >> 1;
			const wallThickness = 2;

			const geometry0 = new THREE.PlaneGeometry(wallSize, wallHeight);
			const geometry1 = new THREE.PlaneGeometry(wallSize, wallHeight).applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));

			const shape = new Ammo.btBoxShape(new Ammo.btVector3(halfWallSize, halfWallHeight, wallThickness >> 1));

			const material = new THREE.MeshPhongMaterial({color: 0xAAAAAA});
			loader.loadTexture('assets/img/cement.jpg', (texture: THREE.Texture) => {
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.set(wallSize / wallHeight, 1);
				material.map = texture;
				material.needsUpdate = true;
			});

			const createWalls = (x: number, z: number, quat: THREE.Quaternion, geometry: THREE.Geometry) => {
				const pos = new THREE.Vector3(x, halfWallHeight, z);
				const page = factory.createParallelepiped(geometry, shape, 0, pos, quat, material);
				page.receiveShadow = true;
				engine.addObject(page);
			};

			createWalls(halfWallSize - width, -width, quat, geometry0);
			createWalls(halfWallSize - width, cityLength + width, quat, geometry1);
			createWalls(-width, halfWallSize - width, quat_PI_2, geometry0);
			createWalls(cityLength + width, halfWallSize - width, quat_PI_2, geometry1);
		}

		// Underground
		{
			const material = new THREE.MeshPhongMaterial({color: 0x555555});
			const geometry = new THREE.PlaneGeometry(length, length).applyMatrix(new THREE.Matrix4().makeRotationX(-0.5 * Math.PI));
			const pos = new THREE.Vector3(halfLength, -0.5, halfLength);
			const o = new THREE.Mesh(geometry, material);
			o.position.copy(pos);
			engine.addObject(o);
		}

	}
}