window.addEventListener('load', function(e){
    const CHROME_GESTURES = 'jpkfjicglakibpenojifdiepckckakgk';
    const CHROME_KEYCONFIG = 'okneonigbfnolfkmfgjmaeniipdjkgkl';
    const ACTION_GROUP = 'ChromeLinkPad';
    const dragLinkAction = {
        group: ACTION_GROUP,
        type: 'drag-link',
        actions:[
            {
                'name':'ChromeLinkPad.addTargetLink'
            }
        ]
    };
    const pageAction = {
        group: ACTION_GROUP,
        actions:[
            {
                'name':'ChromeLinkPad.addCurrentPage'
            },
            {
                'name':'ChromeLinkPad.addCurrentPageAndClose'
            }
        ]
    };
    const keyAction = {
        group: ACTION_GROUP,
        actions:[
            {
                'name':'ChromeLinkPad.addActiveLink'
            },
            {
                'name':'ChromeLinkPad.addCurrentPage'
            },
            {
                'name':'ChromeLinkPad.addCurrentPageAndClose'
            }
        ]
    };

    var REGISTER = {
        'CHROME_GESTURES_DRAG_LINK' : false,
        'CHROME_GESTURES' : false,
        'CHROME_KEYCONFIG' : false
    };

    chrome.extension.sendRequest(CHROME_GESTURES, dragLinkAction, function(res){
        REGISTER['CHROME_GESTURES_DRAG_LINK'] = true;
    });
    chrome.extension.sendRequest(CHROME_GESTURES, pageAction, function(res){
        REGISTER['CHROME_GESTURES'] = true;
    });
    chrome.extension.sendRequest(CHROME_KEYCONFIG, keyAction, function(res){
        REGISTER['CHROME_KEYCONFIG'] = true;
    });
    setTimeout(function(){
        if (!REGISTER['CHROME_GESTURES_DRAG_LINK']) {
            chrome.extension.sendRequest(CHROME_GESTURES, dragLinkAction, function(res){
                REGISTER['CHROME_GESTURES_DRAG_LINK'] = true;
            });
        }
        if (!REGISTER['CHROME_GESTURES']) {
            chrome.extension.sendRequest(CHROME_GESTURES, pageAction, function(res){
                REGISTER['CHROME_GESTURES'] = true;
            });
        }
        if (!REGISTER['CHROME_KEYCONFIG']) {
            chrome.extension.sendRequest(CHROME_KEYCONFIG, keyAction, function(res){
                REGISTER['CHROME_KEYCONFIG'] = true;
            });
        }
    }, 1000 * 10);

    contextMenus.update();
    tabManager.update();
}, false);

Array.prototype.isUnique = function(url) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].url === url)
            return false;
    }
    return true;
};

function notify(ttl, message) {
    if (window.webkitNotifications) {
        var notify = window.webkitNotifications;
        var popup = notify.createNotification(chrome.extension.getURL('icon.png'), ttl, message);
        popup.show();
        setTimeout(function(){ popup.cancel(); }, 2000);
    } else {
        alert(message);
    }
}

var animateIcon = {
    _tbl: [
        {
            pos: 3,
            size: 4,
        },
        {
            pos: 0,
            size: 10,
        },
        {
            pos: 3,
            size: 4,
        },
        {
            pos: 0,
            size: 10,
        },
        {
            pos: 3,
            size: 4,
        },
    ],
    _cnt: 0,
    _star: function(c, x, y, w, h){
        c.fillStyle = '#FFF688';
        c.strokeStyle = 'DFD668';
        c.lineWidth = 1;
    
        var x2 = x + (w / 2);
        var x3 = x + w;
        var y2 = y + (h / 2);
        var y3 = y + h;
    
        c.beginPath();
        c.moveTo(x, y2);
        c.quadraticCurveTo(x2, y2, x2, y3);
        c.quadraticCurveTo(x2, y2, x3, y2);
        c.quadraticCurveTo(x2, y2, x2, y);
        c.quadraticCurveTo(x2, y2, x, y2);
        c.stroke();
        c.fill();
    },
    _anim: function(){
        if (!this._canvasContext) {
            this._canvasContext = canvas.getContext('2d');
        }

        if (this._cnt >= this._tbl.length) {
            chrome.browserAction.setIcon({path:gfx.src});
            return;
        }
        this._canvasContext.clearRect(0, 0, 19, 19);
        this._canvasContext.drawImage(gfx, 0, 0);
        this._star(this._canvasContext, this._tbl[this._cnt].pos, this._tbl[this._cnt].pos, this._tbl[this._cnt].size, this._tbl[this._cnt].size);

        chrome.browserAction.setIcon({
            imageData: this._canvasContext.getImageData(0, 0, 19,19)
        });

        this._cnt++;

        var self = this;
        setTimeout(function(){
            self._anim();
        }, 300);
    },
    start: function(){
        this._cnt = 0;
        this._anim();
    }
};

const bookmarkName = "Link Pad";

var defaultConfig = {
    ToRemove: true,
    AutoSave: false,
    AutoSaveTime: 5,
    AutoSaveDupplicateClose: false,
    ExcludeURLs: [ 'http://www.google.com/search?' ],
    LinkMenuAdd: true,
    DocumentMenuAdd: true,
    DocumentMenuAddClose: true,
    UseBookmark: true,
};

var config = defaultConfig;
if (localStorage.config) {
    config = JSON.parse(localStorage.config);
    if (!config.AutoSaveTime)
        config.AutoSaveTime = defaultConfig.AutoSaveTime;
    if (!config.ExcludeURLs)
        config.ExcludeURLs = defaultConfig.ExcludeURLs;
    if (typeof (config.LinkMenuAdd) == 'undefined')
        config.LinkMenuAdd = defaultConfig.LinkMenuAdd;
    if (typeof (config.DocumentMenuAdd) == 'undefined')
        config.DocumentMenuAdd = defaultConfig.DocumentMenuAdd;
    if (typeof (config.DocumentMenuAddClose) == 'undefined')
        config.DocumentMenuAddClose = defaultConfig.DocumentMenuAddClose;
}

var links = [];
var bookmarksParentId = null;

function LoadLinks(){
/*
    if (localStorage.links) {
        links = JSON.parse(localStorage.links);
    }
*/

    chrome.bookmarks.getTree(function(items){
        var bookmarksParent = null;
        var othersItem = items[0].children[1];
        for (var i = 0; i < othersItem.children.length; i++) {
            var item = othersItem.children[i];
            if (item.title === bookmarkName) {
                bookmarksParent = item;
                break;
            }
        }
        if (bookmarksParent === null) {
            chrome.bookmarks.create(
                {
                    parentId: othersItem.id,
                    title: bookmarkName
                },
                function(item) {
                    bookmarksParentId = item.id;
    
                    if (localStorage.links) {
                        var linksTemp = JSON.parse(localStorage.links);
                        for (var i = 0; i < linksTemp.length; i++) {
                            chrome.bookmarks.create(
                                {
                                    parentId: bookmarksParentId,
                                    title: linksTemp[i].text,
                                    url: linksTemp[i].url
                                },
                                function(item) {
                                    links.push({ text: item.title, url: item.url, id: item.id });
                                }
                            );
                        }
                        delete localStorage.links;
                        chrome.browserAction.setBadgeText({ text: linksTemp.length.toString() });
                    }
                }
            );
        } else {
            bookmarksParentId = bookmarksParent.id;
            for (var i = 0; i < bookmarksParent.children.length; i++) {
                var item = bookmarksParent.children[i];
                links.push({ text: item.title, url: item.url, id: item.id });
            }
            chrome.browserAction.setBadgeText({ text: links.length.toString() });
        }
    });
}

chrome.browserAction.setBadgeBackgroundColor({ color: [128, 255, 0, 255] });

var actions = {
    link: {
        add: function(req) {
            var result = { };
            if (req.url == '') {
                result.status = 'error';
                result.number = -1;
                result.message = 'Invalid or unsupported URL.';
            } else if (!/^(https?|ftp):\/\//.test(req.url)) {
                result.status = 'error';
                result.number = -1;
                result.message = 'Invalid or unsupported URL.';
            } else if (links.isUnique(req.url)) {
                links.push({ 'text': req.text, 'url': req.url });
//              localStorage.links = JSON.stringify(links);
//              chrome.browserAction.setBadgeText({ text: links.length.toString() });
                chrome.bookmarks.create(
                    {
                        parentId: bookmarksParentId,
                        title: req.text,
                        url: req.url
                    },
                    function(item) {
                        for (var i = 0; i < links.length; i++) {
                            if (links[i].url == item.url) {
                                links[i].id = item.id;
                                break;
                            }
                        }
//                      links.push({ text: item.title, url: item.url, id: item.id });
                        chrome.browserAction.setBadgeText({ text: links.length.toString() });
                    }
                );
                result.status = 'success';
                result.number = 0;
                animateIcon.start();
            } else {
                result.status = 'error';
                result.number = -2;
                result.message = 'This URL has alrady saved.';
            }
            return result;
        },
        del: function(req) {
            links = links.filter(function(link) {
                if (req.url == link.url)
                    chrome.bookmarks.remove(link.id);
                return !(link.url == req.url);
            });
//          localStorage.links = JSON.stringify(links);
            chrome.browserAction.setBadgeText({ text: links.length.toString() });
            return { 'status': 'success', number: 0 };
        },
        init: function(){
            links = [];
//          localStorage.links = JSON.stringify(links);
            chrome.bookmarks.removeTree(
                bookmarksParentId,
                function() {
                    chrome.bookmarks.getTree(function(items){
                        var bookmarksParent;
                        var othersItem = items[0].children[1];
                        chrome.bookmarks.create(
                            {
                                parentId: othersItem.id,
                                title: bookmarkName
                            },
                            function(item) {
                                bookmarksParentId = item.id;
                            }
                        );
                    });
                }
            );
            chrome.browserAction.setBadgeText({ text: links.length.toString() });
            return { 'status': 'success', number: 0 };
        }
    },
    tab: {
        'current-close': function(req, sender) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.remove(tab.id);
            });
            return { 'status': 'success', number: 0 };
        }
    },
    config: {
        'save': function() {
            localStorage.config = JSON.stringify(config);
            tabManager.update();
            contextMenus.update();
            return { 'status': 'success', number: 0 };
        },
        'init': function(){
            config = defaultConfig;
            delete localStorage.config;
            tabManager.update();
            return { 'status': 'success', number: 0 };
        }
    },

    execute: function(req, sender, res) {
        var act = req.action.split('.');
        if (act.length == 2 && actions[act[0]][act[1]]) {
            var result = actions[act[0]][act[1]](req, sender);
            if (result.status != 'success') notify('Error', result.message);
            if (res) res(result);
        }
    }
};

chrome.extension.onMessage.addListener(function(req, sender, res){
    actions.execute(req, sender, res);
});


var contextMenus = {
    _menus: { linkAdd: null, documentAdd: null, documentAddClose: null },
    update: function(){
        if (this._menus.linkAdd != null) {
            chrome.contextMenus.remove(this._menus.linkAdd);
            this._menus.linkAdd = null;
        }
        if (config.LinkMenuAdd)
            this._menus.linkAdd = chrome.contextMenus.create({
                title: chrome.i18n.getMessage('menu_AddLinkpadLink') || 'Save to &Link Pad',
                contexts: ['link'],
                onclick: function(info, tab){
                    try {
                        if (!links.isUnique(info.linkUrl)) {
                            // 登録済みの場合はアクションを実行してエラー表示
                            actions.execute({ action: 'link.add', url: info.linkUrl });
                        } else {
                            chrome.tabs.executeScript(tab.id, {
                                code: '(' + function(url){
                                    var req = { action: 'link.add', url: url };
                                    var link = document.querySelector('a[href="'+url+'"]');
                                    if (link)
                                        req.text = link.innerText || link.textContent;
                                    chrome.extension.sendMessage(req);
                                }.toString() + ')("' + info.linkUrl + '")'
                            },function(res){
                                // コールバック時に登録されていない場合は、textを指定せずに登録
                                setTimeout(function(){
                                    if (links.isUnique(info.linkUrl))
                                        actions.execute({ action: 'link.add', url: info.linkUrl });
                                }, 500);
                            });
                        }
                    } catch(e) {
                        actions.execute({ action: 'link.add', url: info.linkUrl });
                    }
                }
            });

        if (this._menus.documentAdd != null) {
            chrome.contextMenus.remove(this._menus.documentAdd);
            this._menus.documentAdd = null;
        }
        if (config.DocumentMenuAdd)
            this._menus.documentAdd = chrome.contextMenus.create({
                title: chrome.i18n.getMessage('menu_AddLinkpadPage') || 'Save this page to &Link Pad',
                contexts: ['page'],
                onclick: function(info, tab){
                    actions.execute({ action: 'link.add', text: tab.title, url: tab.url });
                }
            });

        if (this._menus.documentAddClose != null) {
            chrome.contextMenus.remove(this._menus.documentAddClose);
            this._menus.documentAddClose = null;
        }
        if (config.DocumentMenuAddClose)
            this._menus.documentAddClose = chrome.contextMenus.create({
                title: chrome.i18n.getMessage('menu_AddLinkpadPageAndClose') || 'Save this page to Link Pad and &close tab',
                contexts: ['page'],
                onclick: function(info, tab){
                    actions.execute({ action: 'link.add', text: tab.title, url: tab.url });
                    actions.execute({ action: 'tab.current-close' });
                }
            });
    }
};

var tabManager = {
    tabs: [],
    timer: null,
    init: function(){
        this.tabs = [];
        chrome.tabs.onCreated.addListener(tabManager.onCreated);
        chrome.tabs.onRemoved.addListener(tabManager.onRemoved);
        var self = this;
        chrome.windows.getAll({ populate: true }, function(windows) {
            windows.forEach(function(window) {
                window.tabs.forEach(function(tab) {
                    self._add(tab);
                });
            });
        });
        this.startTimer();
    },
    kill: function(){
        this.tabs = [];
        chrome.tabs.onCreated.removeListener(tabManager.onCreated);
        chrome.tabs.onRemoved.removeListener(tabManager.onRemoved);
        this.stopTimer();
    },
    update: function(){
        if (this.tabs.length > 0)
            this.kill();
        if (config.AutoSave)
            this.init();
    },
    startTimer: function(){
        var self = this;
        if (config.AutoSave & config.AutoSaveTime > 0) {
            this.timer = setInterval(function(){
                self.onTimer();
            }, 1000);
        }
    },
    stopTimer: function(){
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    },
    _add: function(tab) {
        this.tabs.push({
            tabId: tab.id,
            timer: 0
        });
    },
    _search: function(tabId) {
        for (var i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].tabId == tabId) {
                return i;
            }
        }
        return -1;
    },
    onCreated: function(tab) {
        tabManager._add(tab);
    },
    onRemoved: function(tabId) {
        tabManager.tabs = tabManager.tabs.filter(function(tabItem) {
            return (tabItem.tabId != tabId);
        });
    },
    _checkExclude: function(url) {
        for (var i = 0; i < config.ExcludeURLs.length; i++) {
            if (url.indexOf(config.ExcludeURLs[i]) == 0) {
                return true;
            }
        }
        return false;
    },
    onTimer: function() {
        var self = this;
        self.tabs.forEach(function(tabItem) {
            chrome.tabs.get(tabItem.tabId, function(tab) {
                if (tab && (tab.selected || tab.pinned || !/^(https?|ftp):\/\//.test(tab.url) || self._checkExclude(tab.url))) {
                    tabItem.timer = 0;
                } else {
                    tabItem.timer++;
                    if (tabItem.timer >= config.AutoSaveTime * 60) {
                        var res = actions.link.add({
                            text: tab.title,
                            url: tab.url
                        });
                        if (res.status == 'success' || (res.number == -2 && config.AutoSaveDupplicateClose))
                            chrome.tabs.remove(tab.id);
                    }
                }
            });
        });
    }
};

window.addEventListener('load', function(){
    LoadLinks();
}, false);


