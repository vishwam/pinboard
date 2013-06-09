window.open(
	'https://pinboard.in/add' 
	+ '?url='+encodeURIComponent(location.href)	
	+ '&title='+encodeURIComponent(document.title).substr(0, 256)
	+ '&description='+encodeURIComponent(window.getSelection().toString()).substr(0, 65536),
	'Pinboard',
	'toolbar=no,width=700,height=350');
