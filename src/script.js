// ==UserScript==
// @name         YouTube - Mouseover Preview
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Mouseover-Preview/raw/master/youtube_mouseover_preview.user.js
// @version      2.6
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

import { error, log } from "./basics.js";
import { MouseoverPreview } from "./MouseoverPreview.js";

(function() {
    'use strict';




	// ${imports}



	
	window.addEventListener('error', error);
	window.addEventListener('unhandledrejection', error);




	const run = async()=>{
		log('run');
		const app = new MouseoverPreview();
	};
	run();
})();