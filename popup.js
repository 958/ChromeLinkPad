// モダンなJavaScriptに書き換えを進めます。

class EntryManager {
    constructor(id, links, config) {
        this._config = config || {};
        this._container = document.getElementById(id);
        this._items = [];
        this._prevQuery = '';

        if (links.length > 0) {
            links.forEach((item) => {
                this._items.push(this._addElm(item));
            });
        }
    }

    _CURRENT_CLASS = 'current';
    _HIDDEN_CLASS = 'hidden';

    _open(link, focus) {
        chrome.tabs.create({
            url: link.href,
            selected: focus
        });
    }

    _remove(link) {
        chrome.runtime.sendMessage({
            action: 'link.del',
            url: link.href
        });
        link.parentNode.parentNode.removeChild(link.parentNode);
        this._items.splice(this._items.indexOf(link.parentNode), 1);
    }

    add(item, cb) {
        chrome.runtime.sendMessage({
            action: 'link.add',
            text: item.text,
            url: item.url
        }, (res) => {
            if (res.status === 'success') {
                this._items.push(this._addElm(item));
                if (cb) cb();
            }
        });
    }

    _addElm(item) {
        const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
        faviconUrl.searchParams.set("pageUrl", item.url);
        faviconUrl.searchParams.set("size", "16");

        const entry = document.createElement('li');
        const linkElement = document.createElement('a');
        linkElement.href = item.url;
        linkElement.textContent = item.text || item.url;
        linkElement.title = item.url;
        linkElement.target = '_blank';
        linkElement.style.backgroundImage = `url(${faviconUrl})`;

        linkElement.addEventListener('click', (e) => {
            this._open(e.target, e.button !== 1);
            if (this._config.ToRemove && !e.ctrlKey) this._remove(e.target);
            e.preventDefault();
        });

        linkElement.addEventListener('contextmenu', (e) => {
            this._remove(e.target);
            e.preventDefault();
        });

        entry.appendChild(linkElement);
        this._container.appendChild(entry);
        return entry;
    }

    filter(q, deep = false) {
        if (deep) this._prevQuery = '';
        if (this._prevQuery === q) return;
        this._prevQuery = q;
        const queries = q.toLowerCase().split(' ');
        this._items.forEach((item) => {
            const result = queries.every((text) => !text || item.innerText.toLowerCase().includes(text));
            item.classList.toggle(this._HIDDEN_CLASS, !result);
        });
        const cur = this.currentItem;
        if (cur) {
            cur.classList.remove(this._CURRENT_CLASS);
            window.scrollTo(0, 0);
        }
    }

    select(increment) {
        let cur = this.currentIndex;
        if (cur >= 0) this._items[cur].classList.remove(this._CURRENT_CLASS);
        for (let i = 0; i < this._items.length; i++) {
            cur += increment;
            if (cur >= this._items.length) {
                cur = 0;
            } else if (cur < 0) {
                cur = this._items.length - 1;
            }
            if (!this._items[cur].classList.contains(this._HIDDEN_CLASS)) break;
        }
        this._items[cur].classList.add(this._CURRENT_CLASS);
        this._items[cur].scrollIntoView(false);
    }

    openCurrent(focus, remove) {
        let cur = this.currentItem;
        if (!cur) {
            cur = this._items.find((item) => !item.classList.contains(this._HIDDEN_CLASS));
        }
        if (cur) {
            const linkElement = cur.querySelector('a');
            if (linkElement) {
                this._open(linkElement, focus);
                if (this._config.ToRemove && remove) this._remove(linkElement);
            }
        }
    }

    removeCurrent() {
        const cur = this.currentItem;
        if (cur) {
            const linkElement = cur.querySelector('a');
            if (linkElement) this._remove(linkElement);
        }
    }

    get currentIndex() {
        return this._items.findIndex((item) => item.classList.contains(this._CURRENT_CLASS));
    }

    get currentItem() {
        const cur = this.currentIndex;
        return cur >= 0 ? this._items[cur] : null;
    }
}

window.addEventListener('load', () => {
    chrome.runtime.sendMessage({ action: 'link.get' }, (res) => {
        const links = res.links || [];
        const config = res.config || {};
        const em = new EntryManager('entries', links, config);

        document.getElementById('save').addEventListener('click', () => {
            config.AddToClose = document.getElementById('close_tab').checked;
            chrome.runtime.sendMessage({
                action: 'config.save',
                config
            });

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                em.add({ text: tab.title, url: tab.url }, () => {
                    if (config.AddToClose) {
                        chrome.runtime.sendMessage({ action: 'tab.current-close' });
                    }
                    em.filter(query.value.trim(), true);
                });
            });
        });

        const query = document.getElementById('query');
        query.addEventListener('search', () => {
            em.filter(query.value.trim());
        });
        query.addEventListener('keydown', (e) => {
            let noDefault = false;
            switch (e.key) {
                case 'ArrowDown':
                    em.select(1);
                    noDefault = true;
                    break;
                case 'n':
                    if (e.ctrlKey) {
                        em.select(1);
                        noDefault = true;
                    }
                    break;
                case 'ArrowUp':
                    em.select(-1);
                    noDefault = true;
                    break;
                case 'p':
                    if (e.ctrlKey) {
                        em.select(-1);
                        noDefault = true;
                    }
                    break;
                case 'Delete':
                    if (e.shiftKey) {
                        em.removeCurrent();
                        noDefault = true;
                    }
                    break;
                case 'Enter':
                    em.openCurrent(e.shiftKey, !e.ctrlKey);
                    noDefault = true;
                    break;
                case 'Escape':
                    window.close();
                    break;
            }
            if (noDefault) e.preventDefault();
        });

        if (config.AddToClose) {
            document.getElementById('close_tab').checked = true;
        }

        (() => {
            const labels = document.querySelectorAll('label');
            labels.forEach((label) => {
                const message = chrome.i18n.getMessage(`popup_label_${label.htmlFor}`);
                if (message) label.innerHTML = message;
            });

            const buttons = document.querySelectorAll('input[type=button]');
            buttons.forEach((button) => {
                const message = chrome.i18n.getMessage(`popup_button_${button.id}`);
                if (message) button.value = message;
            });
        })();
    });
});

