///<reference path="./definitions/three.d.ts"/>
///<reference path="./definitions/ammo.d.ts"/>

export class Engine {
	private renderer: THREE.WebGLRenderer;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private light: THREE.Light;

	private clock = new THREE.Clock();
	private physicsWorld: Ammo.btDiscreteDynamicsWorld;
	private rigidBodies = new Array<THREE.Object3D>();

	public constructor(element: HTMLElement, clearColor: number) {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(clearColor);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		element.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();

		// Physics configuration
		const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		const overlappingPairCache = new Ammo.btAxisSweep3(new Ammo.btVector3(-1000,-1000,-1000), new Ammo.btVector3(1000,1000,1000));
		const solver = new Ammo.btSequentialImpulseConstraintSolver();

		this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, overlappingPairCache, solver, collisionConfiguration);
		this.physicsWorld.setGravity( new Ammo.btVector3(0, -9.8, 0));
	}

	public getRenderer(): THREE.WebGLRenderer {
		return this.renderer;
	}

	public enableShadows(): void {
		this.renderer.shadowMap.enabled = true;
	}

	public setCamera(camera: THREE.PerspectiveCamera): void {
		this.camera = camera;
		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}, false);
	}

	public getCamera(): THREE.PerspectiveCamera {
		return this.camera;
	}

	public getPhysicsWorld(): Ammo.btDiscreteDynamicsWorld {
		return this.physicsWorld;
	}

	public addLight(light: THREE.Light): void {
		this.light = light;
		this.scene.add(this.light);
	}

	public addFog(hex: number, density: number) {
		this.scene.fog = new THREE.FogExp2(hex, density);
	}

	public addObject(object: THREE.Object3D): void {
		this.scene.add(object);
	}

	public removeObject(object: THREE.Object3D): void {
		this.scene.remove(object);
		// remove physics body
		const body = object.userData.physicsBody;
		this.physicsWorld.removeRigidBody(body);
		const index: number = this.rigidBodies.indexOf(object, 0);
		if (index > -1)
			this.rigidBodies.splice(index, 1);
	}

	public addPhysicsObject(object: THREE.Object3D, body: Ammo.btRigidBody, mass: number): void {
		object.userData.physicsBody = body;
		if (mass > 0) {
			this.rigidBodies.push(object);
			body.setActivationState(4); // Disable deactivation
		}
		this.scene.add(object);
		this.physicsWorld.addRigidBody(body);
	}

	public addVehicle(object: THREE.Object3D, vehicle: Ammo.btRaycastVehicle): void {
		this.rigidBodies.push(object);
		this.scene.add(object);
		this.physicsWorld.addAction(vehicle);
	}

	private tempTransform = new Ammo.btTransform();

	private updatePhysics(delta: number) {
		// Step world
		this.physicsWorld.stepSimulation(delta, 10);

		// Update rigid bodies
		const len = this.rigidBodies.length;
		for (let i = 0; i < len; i++) {
			var objThree = this.rigidBodies[i];
			var ms = objThree.userData.physicsBody.getMotionState();
			if (ms) {
				ms.getWorldTransform(this.tempTransform);

				let p = this.tempTransform.getOrigin();
				objThree.position.set(p.x(), p.y(), p.z());

				let q = this.tempTransform.getRotation();
				objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
			}
			objThree.userData.update && objThree.userData.update();
		}
	}

	public update(isPhysicsEnabled: boolean): number {
		const deltaTime = this.clock.getDelta();
		isPhysicsEnabled && this.updatePhysics(deltaTime);
		this.renderer.render(this.scene, this.camera);
		return deltaTime;
	}
}