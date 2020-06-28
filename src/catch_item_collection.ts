import { Engine } from './engine';
import { CustomDepthMaterial } from './custom_depth_material';

const v = new THREE.Vector3();
const yHeight = 1.5;

export class CatchItemCollection {

	private geometry: THREE.PlaneGeometry;
	private pageSize: number;
	private halfPageSize: number;
	private material: THREE.MeshBasicMaterial;
	private engine: Engine;
	private cityMapData: Array<string>;
	private customDepthMaterial: THREE.ShaderMaterial;
	private items: Array<THREE.Mesh> = [];
	private onUpdate: (hidden: number, total: number) => void;

	constructor(itemSize: number, pageSize: number, material: THREE.MeshBasicMaterial, engine: Engine, cityMapData: Array<string>) {
		this.createBasicGeometry(itemSize);
		this.pageSize = pageSize;
		this.halfPageSize = pageSize >> 1;
		this.material = material;
		this.engine = engine;
		this.cityMapData = cityMapData;
	}

	private createBasicGeometry(itemSize: number): void {
		const geometry2 = new THREE.PlaneGeometry(itemSize, itemSize);
		geometry2.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI));
		this.geometry = new THREE.PlaneGeometry(itemSize, itemSize);
		this.geometry.merge(geometry2);
	}

	private t(v: number) {
		return v * this.pageSize + this.halfPageSize;
	}

	public enableCustomDepthMaterial(): void {
		this.customDepthMaterial = CustomDepthMaterial.create(this.material.map);
	}

	public newItem(x: number, z: number, direction: string): void {
		const o = new THREE.Mesh(this.geometry, this.material);
		if (this.customDepthMaterial) {
			o.customDepthMaterial = this.customDepthMaterial;
			o.castShadow = true;
		}
		o.position.set(this.t(x), yHeight, this.t(z));
		this.engine.addObject(o);
		this.items.push(o);

		o.userData = {
			init: {x: x, z: z, direction: direction},
			nextIndex: {x: x, z: z},
			target: new THREE.Vector3(),
			direction: direction,
			speed: Math.random() * 0.1
		};
		this.updateUserData(o.userData);
	}

	public reset(): void {
		for (let o of this.items) {
			o.visible = true;
			const init = o.userData.init;
			o.position.set(this.t(init.x), yHeight, this.t(init.z));
			o.userData.nextIndex = {x: init.x, z: init.z};
			o.userData.direction = init.direction;
			this.updateUserData(o.userData);
		}
	}

	private updateUserData(userData: any): void {
		const d = userData.direction;
		if (d == 'right') {
			userData.nextIndex.x++;
		} else if (d == 'left') {
			userData.nextIndex.x--;
		} else if (d == 'up') {
			userData.nextIndex.z--;
		} else if (d == 'down')
			userData.nextIndex.z++;
		// update 3d target position
		userData.target.set(this.t(userData.nextIndex.x), yHeight, this.t(userData.nextIndex.z));
	}

	private chooseNextPosition(userData: any): void {
		const i = userData.nextIndex;
		const d = userData.direction;
		const options: Array<string> = [];
		d != 'down' && this.cityMapData[i.z-1][i.x] == '1' && options.push('up');
		d != 'up' && this.cityMapData[i.z+1][i.x] == '1' && options.push('down');
		d != 'right' && this.cityMapData[i.z][i.x-1] == '1' && options.push('left');
		d != 'left' && this.cityMapData[i.z][i.x+1] == '1' && options.push('right');
		// pick a random direction
		userData.direction = options[Math.floor(Math.random() * options.length)];
		this.updateUserData(userData);
	}

	public enableRotation(step: number, delay: number): void {
		const rotate = () => {
			for (let o of this.items)
				o.rotation.y += step;
		};
		setInterval(rotate, delay);
	}

	public addUpdateListener(listener: (hidden: number, total: number) => void): void {
		this.onUpdate = listener;
	}

	public update(callback: (p: THREE.Vector3) => Boolean): void {
		let hidden: number = 0;
		for (const o of this.items) {
			if (o.visible) {
				if (callback(o.position)) {
					o.visible = false;
					hidden++;
				} else {
					v.subVectors(o.userData.target, o.position);
					if (v.length() > 0.1) {
						v.normalize();
						v.multiplyScalar(0.1 + o.userData.speed);
						o.position.set(o.position.x + v.x, yHeight, o.position.z + v.z);
					} else {
						// choose the next target
						this.chooseNextPosition(o.userData);
					}
				}
			} else
				hidden++;
		}
		this.onUpdate && this.onUpdate(hidden, this.items.length);
	}
}