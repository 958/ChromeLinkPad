(function(){
	var GReaderEx = {
		init: function() {
			var self = this;
			document.addEventListener('keydown', function(e){ self.handler(e); }, false);
		},
		handler: function(e) {
			var key = (e.shiftKey && !e.ctrlKey && !e.altKey && e.keyCode == 73);
			if(key && !('selectionStart' in e.target && e.target.disabled != true)) {
				var item = document.querySelector('#current-entry .entry-title-link');
				if(!item) return;
				chrome.extension.sendRequest(
					{
						action: 'link.add',
						text: item.text,
						url: item.href
					}
				);
				e.preventDefault();
				e.stopPropagation();
			}
		}
	};
	GReaderEx.init();
})();
