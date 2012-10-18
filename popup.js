function EntryManager(id, links, config) {
    this._config = config || {};
    this._container = document.getElementById(id);

    if (links.length > 0) {
        var self = this;
        links.forEach(function(item){
            self._items.push(self._addElm(item));
        });
    }
}
EntryManager.prototype = {
    _container: null,
    _items: [],
    _config: { },
    _prevQuery: '',
    _open: function(item, focus) {
        var self = this;
        chrome.tabs.create(
            {
                url: item.href,
                selected: focus
            }
        );
    },
    remove: function(item) {
        chrome.extension.sendRequest({
            action: 'link.del',
            url: item.href
        });
        item.parentNode.parentNode.removeChild(item.parentNode);
    },
    add: function(item, cb) {
        var self = this;
        chrome.extension.sendRequest(
        {
            action: 'link.add',
            text: item.text,
            url: item.url
        },
        function(res){
            if (res.status == 'success') {
                self._items.push(self._addElm(item));
                if (cb) cb();
            }
        });
    },
    _addElm: function(item) {
        var self = this;
        var entry = document.createElement('li');
        var link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.text || item.url;
        link.title = item.url;
        link.target = '_blank';
        link.style.backgroundImage = 'url(chrome://favicon/' + item.url + ')';

        link.addEventListener('click', function(e){
            var target = e.target;
            self._open(target, (e.button != 1));
            if (self._config.ToRemove && !e.ctrlKey) {
                self.remove(target);
            }
            e.preventDefault();
        }, false);

        link.addEventListener('contextmenu', function(e){
            self.remove(e.target);
            e.preventDefault();
        }, false);

        entry.appendChild(link);
        this._container.appendChild(entry);
        return entry;
    },
    filter: function(q, deep) {
        if (deep) this._prevQuery = '';
        if (this._prevQuery == q) return;
        this._prevQuery = q;
        q = q.toLowerCase().split(' ');
        for (var i = 0; i < this._items.length; i++) {
            var item = this._items[i];
            var result = true;
            for (var j = 0; j < q.length; j++) {
                var text = q[j];
                if (!text) break;
                if (item.innerText.toLowerCase().indexOf(text) == -1) {
                    result = false;
                    break;
                }
            }
            if (result == false) {
                item.setAttribute('class', 'hidden');
            } else {
                item.setAttribute('class', '');
            }
        }
    }
};

window.addEventListener('load', function(e){
    var bg = chrome.extension.getBackgroundPage();

    var em = new EntryManager('entries', bg.links, bg.config);

    document.getElementById('save').addEventListener('click', function(e){
        bg.config.AddToClose = document.getElementById('close_tab').checked;
        chrome.extension.sendRequest({
            action: 'config.save'
        });

        chrome.tabs.getSelected(null, function(tab) {
            em.add({ 'text': tab.title, 'url': tab.url }, function(){
                if (bg.config.AddToClose)
                    chrome.extension.sendRequest({ action: 'tab.current-close' });
                em.filter(query.value.trim(), true);
            });
        });
    }, false);

    var query = document.getElementById('query');
    query.addEventListener('search', function(e) {
        em.filter(query.value.trim());
    }, false);

    if (bg.config.AddToClose) {
        document.getElementById('close_tab').checked = true;
    }

    (function L10N(){
        var labels = document.querySelectorAll('label')
        for (var i = 0; i < labels.length; i++){
            var message = chrome.i18n.getMessage('popup_label_' + labels[i].htmlFor);
            if (message)
                labels[i].innerHTML = message;
        }
        var buttons = document.querySelectorAll('input[type=button]')
        for (var i = 0; i < buttons.length; i++){
            var message = chrome.i18n.getMessage('popup_button_' + buttons[i].id);
            if (message)
                buttons[i].value = message;
        }
    })();
}, false);

