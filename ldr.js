(function(){
	var LdrEx = {
		init: function(){
			var f = function(){
				var id = setTimeout(function(){
					if (id) clearTimeout(id);
					if (typeof Keybind != 'undefined') {
						Keybind.add('I', function(){
							var item = get_active_item(true);
							var e = document.createEvent('MessageEvent');
							e.initMessageEvent('Linkpad.add', true, false, Object.toJSON({ text: item.title, url: item.link }), location.protocol+"//"+location.host, "", window);
							window.dispatchEvent(e);
						});
					} else {
						id = setTimeout(arguments.callee, 100);
					}
				}, 0);
			};
			location.href = "javascript:void (" + encodeURIComponent(f.toString()) + ")()";
			window.addEventListener('Linkpad.add', LdrEx.addLinkPad, false);
		},
		addLinkPad: function(e){
			var item = JSON.parse(e.data);
			if (item)
				chrome.extension.sendMessage(
					{
						action: 'link.add',
						text: item.text,
						url: item.url
					}
				);
		}
	};
	LdrEx.init();
})();
