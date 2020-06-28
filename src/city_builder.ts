import { Engine } from './engine';
import { ShapeFactory } from './shape_factory';
import { CustomDepthMaterial } from './custom_depth_material';
import { Loader } from './loader';

interface Position {
	key?: string;
	x: number;
	y: number;
	z: number;
	yRotation?: number;
	scale?: THREE.Vector3;
	threeObj?: THREE.Object3D;
}

interface ModelSpec {
	key: string;
	obj: string;
	mtl: string;
	instances: Array<Position>;
	bodyDimensions: Ammo.btVector3;
	threeObj?: THREE.Object3D;
}

const THREE_V1 = new THREE.Vector3(1, 1, 1);
const DOWN = new THREE.Vector3(0, -1, 0);
const SCREEN_CENTER = new THREE.Vector2(0, 0);
const QUATERNION_0 = new THREE.Quaternion(0, 0, 0, 1);
const raycaster = new THREE.Raycaster();

export class CityBuilder {

	private engine: Engine;
	private factory: ShapeFactory;
	private loader: Loader;
	private objectMap: {[key: string]: ModelSpec} = {};

	public constructor(engine: Engine, factory: ShapeFactory, loader: Loader) {
		this.engine = engine;
		this.factory = factory;
		this.loader = loader;
	}

	public addModel(key: string, objPath: string, mtlPath: string, xsize: number, ysize: number, zsize: number): void {
		this.objectMap[key] = {
			key: key,
			obj: objPath,
			mtl: mtlPath,
			instances: [],
			bodyDimensions: new Ammo.btVector3(xsize, ysize, zsize)
		};
	}

	private deepClone(o: THREE.Object3D): THREE.Object3D {
		const _clone = o.clone(true);
		// the clone method ignores the customDepthMaterial attribute, we have to copy it manually.
		if (o.children) {
			for (let i = 0; i < o.children.length; i++) {
				const child = o.children[i];
				if (child.customDepthMaterial) {
					_clone.children[i].customDepthMaterial = child.customDepthMaterial;
				}
			}
		}
		return _clone;
	}

	private add(p: Position, object: ModelSpec): void {
		// Save instance
		const position: Position = {key: object.key, x: p.x, y: p.y, z: p.z, yRotation: p.yRotation || 0};
		object.instances.push(position);

		position.threeObj = this.deepClone(object.threeObj);

		let bodyDimensions: Ammo.btVector3 = object.bodyDimensions;

		// if object should be scaled, apply it
		if (p.scale) {
			position.threeObj.scale.copy(p.scale);
			// recalc body dimensions
			bodyDimensions = new Ammo.btVector3(
				bodyDimensions.x() * p.scale.x,
				bodyDimensions.y() * p.scale.y,
				bodyDimensions.z() * p.scale.x
			);
		}

		// add shortcut to scale object
		position.scale = position.threeObj.scale;

		// ThreeJS model
		position.threeObj.position.set(p.x, p.y, p.z);
		p.yRotation && position.threeObj.rotateY(p.yRotation);
		// Add physics body
		const pos = new THREE.Vector3(p.x, p.y, p.z);
		const shape = new Ammo.btBoxShape(bodyDimensions);
		shape.setMargin(0.05);
		const body = this.factory.createRigidBody(shape, 0, pos, QUATERNION_0);

		this.engine.addPhysicsObject(position.threeObj, body, 0);
	}

	private setCustomDepthMaterial(o: THREE.Mesh): void {
		// handle transparent texture
		if (o.material instanceof THREE.MeshPhongMaterial) {
			const material = <THREE.MeshPhongMaterial> o.material;
			if (material && material.transparent && material.map) {
				o.material.side = THREE.DoubleSide;
				o.customDepthMaterial = CustomDepthMaterial.create(material.map);
			}
		}
	}

	public addInstances(instances: {[key: string]: Array<Position>}): void {
		for (let key in this.objectMap) {
			const object: ModelSpec = this.objectMap[key];
			this.loader.loadOBJ(object.obj, object.mtl, (threeObj: THREE.Object3D) => {
				object.threeObj = threeObj;
				// shadows
				threeObj.castShadow = true;
				for (let child of threeObj.children) {
					child.castShadow = true;
					child.receiveShadow = true;
					(child instanceof THREE.Mesh) && this.setCustomDepthMaterial(child);
				}
				// instances
				const positionArray: Array<Position> = instances[key];
				if (positionArray) {
					for (let p of positionArray) {
						this.add(p, object);
					}
				}
			});
		}
	}

	private getTarget(): THREE.Vector2 {
		raycaster.setFromCamera(SCREEN_CENTER, this.engine.getCamera());
		const cosTheta = DOWN.dot(raycaster.ray.direction);
		const distance = raycaster.ray.origin.y / cosTheta;

		const toGround = raycaster.ray.direction.clone();
		toGround.multiplyScalar(distance);
		const groundPoint = raycaster.ray.origin.add(toGround);
		return new THREE.Vector2(groundPoint.x, groundPoint.z);
	}

	private printJson(): void {
		let s: string = '{\n';
		for (let key in this.objectMap) {
			const o: ModelSpec = this.objectMap[key];
			s += "\t'" + key + "':[\n";
			for (let instance of o.instances) {
				s += '\t\t\t{';
				s += 'x:' + instance.x.toFixed(2) + ',';
				s += 'y:' + instance.y.toFixed(2) + ',';
				s += 'z:' + instance.z.toFixed(2) + ',';
				if (!instance.scale.equals(THREE_V1)) {
					s += 'scale: new THREE.Vector3(' +
						instance.scale.x.toFixed(2) + ',' +
						instance.scale.y.toFixed(2) + ',' +
						instance.scale.z.toFixed(2) + '),';
				}
				if (instance.yRotation) {
					s += 'yRotation:' + instance.yRotation.toFixed(3) + ',';
				}
				s += '},\n';
			}
			s += '\t\t],\n'
		}
		s += '}';
		console.log(s);
	}

	private getAt(p: THREE.Vector2): Position {
		const TOLERANCE = 5;
		for (let key in this.objectMap) {
			const o: ModelSpec = this.objectMap[key];
			for (let instance of o.instances) {
				const dx = p.x - instance.x;
				const dz = p.y - instance.z;
				const distance = Math.sqrt(dx * dx + dz * dz);
				if (distance < TOLERANCE)
					return instance;
			}
		}
		return null;
	}

	public startEditor(): void {
		document.addEventListener('keydown', (event: KeyboardEvent) => {
			let instance: Position;
			switch(event.key) {
				case 'x': // delete
					instance = this.getAt(this.getTarget());
					if (instance) {
						this.engine.removeObject(instance.threeObj);
						const _list: Array<Position> = this.objectMap[instance.key].instances;
						const index: number = _list.indexOf(instance, 0);
						if (index > -1)
							_list.splice(index, 1);
					}
					break;
				case 'r': // rotate
					instance = this.getAt(this.getTarget());
					if (instance) {
						const inc = 0.25 * Math.PI;
						instance.yRotation += inc;
						instance.threeObj.rotateY(inc);
					}
					break;
				case '=': // (+) scale up
					instance = this.getAt(this.getTarget());
					if (instance) {
						instance.scale.multiplyScalar(1.1);
					}
					break;
				case '-': // (-) scale down
					instance = this.getAt(this.getTarget());
					if (instance) {
						instance.scale.multiplyScalar(0.9);
					}
					break;
				case 'p':
					this.printJson();
					break;
				default:
					const object: ModelSpec = this.objectMap[event.key];
					if (object) {
						const target = this.getTarget();
						this.add({x: target.x, y: 0, z: target.y}, object);
					}
			}
		}, false);
	}
}