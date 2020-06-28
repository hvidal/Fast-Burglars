export class Vehicle {
	private btVehicle: Ammo.btRaycastVehicle;
	private tuning: Ammo.btVehicleTuning = new Ammo.btVehicleTuning();

	constructor(mass: number, body: Ammo.btRigidBody, pos: THREE.Vector3, quat: THREE.Quaternion, physicsWorld: Ammo.btDiscreteDynamicsWorld) {
		const vehicleRaycaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
		this.btVehicle = new Ammo.btRaycastVehicle(this.tuning, body, vehicleRaycaster);
		this.btVehicle.setCoordinateSystem(0, 1, 2);
	}

	private WHEEL_DIR_CS0: Ammo.btVector3 = new Ammo.btVector3(0, -1, 0);
	private WHEEL_AXLE_CS: Ammo.btVector3 = new Ammo.btVector3(-1, 0, 0);

	public addWheel(pos: Ammo.btVector3, radius: number, suspensionRestLength: number, isFrontWheel: boolean) {
		const info = this.btVehicle.addWheel(
			pos,
			this.WHEEL_DIR_CS0,
			this.WHEEL_AXLE_CS,
			suspensionRestLength,
			radius,
			this.tuning,
			isFrontWheel);
		info.set_m_suspensionStiffness(50.0);
		info.set_m_wheelsDampingRelaxation(10.0);
		info.set_m_wheelsDampingCompression(0.0);
		info.set_m_frictionSlip(10.0);
		info.set_m_rollInfluence(0.0);
	}

	public defaultBreakForce: number = 4;
	public minBreakForce: number = 1.25;

	public brake(wheelNumber: number, force: number = this.defaultBreakForce) {
		this.btVehicle.applyEngineForce(0, wheelNumber);
		this.btVehicle.setBrake(force, wheelNumber);
	};

	public bt(): Ammo.btRaycastVehicle {
		return this.btVehicle;
	}
}

const jumpUpForce = new Ammo.btVector3(0, 6, 0);
const jumpRotationForce = new Ammo.btVector3(0.3, 0.5, -2.5);

export class VehicleSteering {
	private vehicle: Vehicle;
	private steeringLimit: number = 0.35;

	private fullEngineForce: number = 600;
	private engineForce: number = 0;
	private steering: number = 0;

	constructor(vehicle: Vehicle) {
		this.vehicle = vehicle;

		document.addEventListener('keydown', (event: KeyboardEvent) => {
			// engine
			if (event.keyCode == 38) // ArrowUp
				this.engineForce = this.fullEngineForce;
			else if (event.keyCode == 40) // ArrowDown
				this.engineForce = -this.fullEngineForce;
			// steering
			if (event.keyCode == 37) // ArrowLeft
				this.steering = this.steeringLimit;
			else if (event.keyCode == 39) // ArrowRight
				this.steering = -this.steeringLimit;

			if (event.keyCode == 32) // Space
				this.jump();
		}, true);

		document.addEventListener('keyup', (event: KeyboardEvent) => {
			if (event.keyCode == 38 || event.keyCode == 40)
				this.engineForce = 0;
			if (event.keyCode == 37 || event.keyCode == 39)
				this.steering = 0;
		}, true);
	}

	private jump(): void {
		const body = this.vehicle.bt().getRigidBody();
		const centerOfMass = body.getCenterOfMassTransform();
		if (centerOfMass.getOrigin().y() < 3) {
			body.setLinearVelocity(body.getLinearVelocity().op_add(jumpUpForce));
			body.setAngularVelocity(jumpRotationForce);
		}
	}

	public updateWheel(i: number, hasEngineForce: boolean, wheelObj: THREE.Object3D): void {
		let wheelTransform = this.vehicle.bt().getWheelTransformWS(i);
		const p = wheelTransform.getOrigin();
		const q = wheelTransform.getRotation();

		wheelObj.position.set(p.x(), p.y(), p.z());
		wheelObj.quaternion.set(q.x(), q.y(), q.z(), q.w());

		// Rotate right wheels 180 degrees
		(i == 1 || i == 3) && wheelObj.rotateY(Math.PI);

		// engine force
		const speed = this.vehicle.bt().getCurrentSpeedKmHour();
		if (this.engineForce != 0) {
			const canMove = (speed > -1 && this.engineForce > 0) || (speed < 1 && this.engineForce < 0);
			if (canMove)
				hasEngineForce && this.vehicle.bt().applyEngineForce(this.engineForce, i);
			else
				this.vehicle.brake(i);
		} else {
			this.vehicle.brake(i, this.vehicle.minBreakForce);
		}
		// apply steering
		(i == 0 || i == 1) && this.vehicle.bt().setSteeringValue(this.steering, i);
	};

}