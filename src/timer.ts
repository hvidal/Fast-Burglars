export class Timer {

	private startTime: number;
	private delay: number = 0;
	private interval: number = 0;

	public restart() {
		this.delay = 0;
		this.start();
	}

	public start() {
		this.startTime = new Date().getTime();
		this.interval = setInterval(() => {
			const now = new Date().getTime();
			this.delay += (now - this.startTime) / 1000;
			this.startTime = now;
		}, 500);
	}

	public stop() {
		clearInterval(this.interval);
		this.interval = 0;
	}

	private format(n: number) {
		return n < 10? '0' + n : n.toString();
	}

	public print(elem: HTMLElement) {
		const minutes = Math.floor(this.delay / 60);
		const seconds = Math.floor(this.delay % 60);
		elem.innerHTML = this.format(minutes) + ':' + this.format(seconds);
	}
}