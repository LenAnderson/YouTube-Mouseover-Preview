import { Coordinate } from "./Coordinate.js";

export class StoryboardSheet {
	/**@type{Image}*/ img;
	/**@type{Number}*/ frameCount;
	/**@type{Number}*/ frameRowLength;
	/**@type{Number}*/ frameWidth;
	/**@type{Number}*/ frameHeight;




	constructor(/**@type{Image}*/img, /**@type{Number}*/frameRowLength, /**@type{Number}*/frameWidth, /**@type{Number}*/frameHeight) {
		this.img = img;
		this.frameRowLength = frameRowLength;
		this.frameWidth = frameWidth;
		this.frameHeight = frameHeight

		this.frameCount = Math.floor((img.height / frameHeight) * (img.width / frameWidth));
	}




	getFrame(/**@type{Number}*/index) {
		return new Coordinate(Math.floor(index/this.frameRowLength), index%this.frameRowLength);
	}
}