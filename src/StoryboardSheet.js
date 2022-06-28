import { Coordinate } from "./Coordinate.js";

export class StoryboardSheet {
	/**@type{Image}*/ img;
	/**@type{Number}*/ frameCount;




	constructor(/**@type{Image}*/img) {
		this.img = img;
		this.frameCount = img.height / 90 * 5;
	}




	getFrame(/**@type{Number}*/index) {
		return new Coordinate(Math.floor(index/5), index%5);
	}
}