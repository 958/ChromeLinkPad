(function(){
	document.addEventListener('ChromeLinkPad.addTargetLink', function(e){
		var link = e.target || document.querySelector('a:active');
		chrome.extension.sendRequest(
			{
				action: 'link.add',
				text: link.innerText || link.textContent,
				url: link.href
			}
		);
	}, false);
	document.addEventListener('ChromeLinkPad.addActiveLink', function(e){
		var link = document.querySelector('a:focus');
		if (!link) return;
		chrome.extension.sendRequest(
			{
				action: 'link.add',
				text: link.innerText || link.textContent,
				url: link.href
			}
		);
	}, false);
	document.addEventListener('ChromeLinkPad.addCurrentPage', function(e){
		chrome.extension.sendRequest(
			{
				action: 'link.add',
				text: document.title,
				url: window.location.href
			}
		);
	}, false);
	document.addEventListener('ChromeLinkPad.addCurrentPageAndClose', function(e){
		chrome.extension.sendRequest(
			{
				action: 'link.add',
				text: document.title,
				url: window.location.href
			},
			function(res) {
				if (res.status == 'success')
					chrome.extension.sendRequest({ action: 'tab.current-close' });
			}
		);
	}, false);
})();
