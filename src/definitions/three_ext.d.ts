declare module THREE {
	export class MTLLoader {
		constructor(baseUTL?: string, options?: any, crossOrigin?: any);

		load(url:string, callback: (m: MTLLoader.MaterialCreator) => void): void;
		parse(text: string): MTLLoader.MaterialCreator;
	}
	export module MTLLoader {
		export class MaterialCreator {
			constructor(baseUrl: string, options: any);

			setMaterials(materialsInfo: Object): void;
			convert(materialsInfo: any):any;
			preload(): void;
			getIndex(materialName:any):any;
			getAsArray():any;
			create(materialName:any):any;
			loadTexture(url:string, mapping:any, onLoad:any, onError:any):any;
		}
	}

	export class OBJLoader {
		constructor(manager?:any);

		load(url:string, onLoad: any, onProgress?:any, onError?: any): void;
		setMaterials(m: MTLLoader.MaterialCreator): void;
		parse(data:any):any;
	}
}