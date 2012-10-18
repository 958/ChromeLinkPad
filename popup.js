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
    _CURRENT_CLASS: 'current',
    _HIDDEN_CLASS: 'hidden',
    _container: null,
    _items: [],
    _config: { },
    _prevQuery: '',
    _open: function(link, focus) {
        chrome.tabs.create(
            {
                url: link.href,
                selected: focus
            }
        );
    },
    _remove: function(link) {
        chrome.extension.sendMessage({
            action: 'link.del',
            url: link.href
        });
        link.parentNode.parentNode.removeChild(link.parentNode);
        this._items.splice(this._items.indexOf(link.parentNode), 1);
    },
    add: function(item, cb) {
        var self = this;
        chrome.extension.sendMessage(
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
            if (self._config.ToRemove && !e.ctrlKey)
                self._remove(target);
            e.preventDefault();
        }, false);

        link.addEventListener('contextmenu', function(e){
            self._remove(e.target);
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
            if (result == false)
                item.classList.add(this._HIDDEN_CLASS);
            else
                item.classList.remove('hidden');
        }
        var cur = this.currentItem;
        if (cur)
            cur.classList.remove(this._CURRENT_CLASS);
    },
    select: function(increment) {
        var cur = this.currentIndex;
        if (cur >= 0)
            this._items[cur].classList.remove(this._CURRENT_CLASS);
        for (var i = 0; i < this._items.length; i++) {
            cur += increment;
            if (cur >= this._items.length) {
                cur = 0;
            } else if (cur < 0) {
                cur = this._items.length - 1;
            }
            if (this._items[cur].classList.contains(this._HIDDEN_CLASS))
                continue;
            break;
        }
        this._items[cur].classList.add(this._CURRENT_CLASS);
    },
    openCurrent: function(focus, remove) {
        var cur = this.currentItem;
        if (!cur) {
            for (var i = 0; i < this._items.length; i++) {
                if (!this._items[i].classList.contains(this._HIDDEN_CLASS)) {
                    cur = this._items[i];
                    break;
                }
            }
        }
        if (cur) {
            cur = cur.querySelector('a');
            if (cur) {
                this._open(cur, focus);
                if (this._config.ToRemove && remove)
                    this._remove(cur);
            }
        }
    },
    removeCurrent: function() {
        var cur = this.currentItem;
        if (cur) {
            cur = cur.querySelector('a');
            if (cur)
                this._remove(cur);
        }
    },
    get currentIndex() {
        for (var i = 0; i < this._items.length; i++) {
            if (this._items[i].classList.contains(this._CURRENT_CLASS))
                return i;
        }
        return -1;
    },
    get currentItem() {
        var cur = this.currentIndex;
        if (cur >= 0)
            return this._items[cur];
        else
            return null;
    }
};

window.addEventListener('load', function(e){
    var bg = chrome.extension.getBackgroundPage();

    var em = new EntryManager('entries', bg.links, bg.config);

    document.getElementById('save').addEventListener('click', function(e){
        bg.config.AddToClose = document.getElementById('close_tab').checked;
        chrome.extension.sendMessage({
            action: 'config.save'
        });

        chrome.tabs.getSelected(null, function(tab) {
            em.add({ 'text': tab.title, 'url': tab.url }, function(){
                if (bg.config.AddToClose)
                    chrome.extension.sendMessage({ action: 'tab.current-close' });
                em.filter(query.value.trim(), true);
            });
        });
    }, false);

    var query = document.getElementById('query');
    query.addEventListener('search', function(e) {
        em.filter(query.value.trim());
    }, false);
    query.addEventListener('keydown', function(e) {
        switch (e.keyIdentifier) {
            case 'Down':
                em.select(+1);
                break;
            case 'Up':
                em.select(-1);
                break;
            case 'U+007F':  // Delete
                em.removeCurrent();
                break;
            case 'Enter':
                em.openCurrent(e.shiftKey, !e.ctrlKey);
                break;
        }
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

