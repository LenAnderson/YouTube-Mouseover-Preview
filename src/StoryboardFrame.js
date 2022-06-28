import { Coordinate } from "./Coordinate.js";
import { StoryboardSheet } from "./StoryboardSheet.js";

export class StoryboardFrame {
	/**@type{StoryboardSheet}*/ sheet;
	/**@type{Coordinate}*/ coordinate;


	get src() {
		return this.sheet.img.src;
	}
	
	get row() {
		return this.coordinate.row;
	}
	get col() {
		return this.coordinate.col;
	}




	constructor(/**@type{StoryboardSheet}*/sheet, /**@type{Coordinate}*/coordinate) {
		this.sheet = sheet;
		this.coordinate = coordinate;
	}
}