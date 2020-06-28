import { Engine } from './engine';

export class ShapeFactory {

	private engine: Engine;

	constructor(engine: Engine) {
		this.engine = engine;
	}

	public createRigidBody(physicsShape: Ammo.btCollisionShape, mass: number, pos: THREE.Vector3, quat: THREE.Quaternion): Ammo.btRigidBody {
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

		const motionState = new Ammo.btDefaultMotionState(transform);
		const localInertia = new Ammo.btVector3(0, 0, 0);
		physicsShape.calculateLocalInertia(mass, localInertia);

		var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
		const body = new Ammo.btRigidBody(rbInfo);
		return body;
	}

	public createCustomParallelepiped(sx: number, sy: number, sz: number, mass: number, pos: THREE.Vector3, quat: THREE.Quaternion, material: THREE.Material): THREE.Mesh {
		let shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
		shape.setMargin(0.05);

		const geometry = new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1);
		return this.createParallelepiped(geometry, shape, mass, pos, quat, material);
	}

	public createParallelepiped(geometry: THREE.Geometry, shape: Ammo.btBoxShape, mass: number, pos: THREE.Vector3, quat: THREE.Quaternion, material: THREE.Material): THREE.Mesh {
		let threeObject = new THREE.Mesh(geometry, material);
		threeObject.position.copy(pos);
		threeObject.quaternion.copy(quat);

		const body = this.createRigidBody(shape, mass, pos, quat);
		this.engine.addPhysicsObject(threeObject, body, mass);

		return threeObject;
	}
}