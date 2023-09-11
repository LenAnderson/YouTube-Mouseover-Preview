export const gm_fetch = async (url) => {
	return new Promise(resolve=>{
		GM_xmlhttpRequest({
			method: 'GET',
			url: url,
			onload: (response)=>{
				response.text = async()=>response.responseText;
				resolve(response);
			},
		});
	});
};