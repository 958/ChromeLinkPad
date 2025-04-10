chrome.runtime.onInstalled.addListener(() => {
    contextMenus.update();
});

chrome.runtime.onMessage.addListener((req, sender, res) => {
    actions.execute(req, sender, res);
});

Array.prototype.isUnique = function(url) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].url === url)
            return false;
    }
    return true;
};

const bookmarkName = "Link Pad";

var defaultConfig = {
    ToRemove: true,
    LinkMenuAdd: true,
    DocumentMenuAdd: true,
    DocumentMenuAddClose: true,
};

var config = defaultConfig;
chrome.storage.local.get(['config'], function(result) {
    if (result.config) {
        config = result.config;
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
});

var links = [];
var bookmarksParentId = null;

function LoadLinks(){
    if (bookmarksParentId != null)
        return
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
                }
            );
        } else {
            bookmarksParentId = bookmarksParent.id;
            for (var i = 0; i < bookmarksParent.children.length; i++) {
                var item = bookmarksParent.children[i];
                links.push({ text: item.title, url: item.url, id: item.id });
            }
            chrome.action.setBadgeText({ text: links.length.toString() });
        }
    });
}

chrome.action.setBadgeBackgroundColor({ color: [128, 255, 0, 255] });

const actions = {
    execute: function(req, sender, res) {
        const act = req.action.split('.');
        if (act.length === 2 && actions[act[0]][act[1]]) {
            const result = actions[act[0]][act[1]](req, sender);
            if (res) res(result);
        }
    },
    config: {
        get: function(req, sender) {
            return config;
        },
        save: function(req) {
            config = req.config;
            chrome.storage.local.set({ config: config }, function() {
                contextMenus.update();
            });
        },
        init: function() {
            config = defaultConfig;
            chrome.storage.local.remove('config', function() {
            });
        }
    },
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
                        chrome.action.setBadgeText({ text: links.length.toString() });
                    }
                );
                result.status = 'success';
                result.number = 0;
            } else {
                result.status = 'error';
                result.number = -2;
                result.message = 'This URL has already been saved.';
            }
            return result;
        },
        del: function(req) {
            links = links.filter(function(link) {
                if (req.url == link.url)
                    chrome.bookmarks.remove(link.id);
                return !(link.url == req.url);
            });
            chrome.action.setBadgeText({ text: links.length.toString() });
        },
        init: function(){
            links = [];
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
            chrome.action.setBadgeText({ text: links.length.toString() });
        },
        get: function(req, sender) {
            return { links: links, config: config };
        }
    },
    tab: {
        'current-close': function(req, sender) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.remove(tabs[0].id);
            });
        }
    }
};

const contextMenus = {
    update: function() {
        chrome.contextMenus.removeAll(() => {
            if (config.LinkMenuAdd) {
                chrome.contextMenus.create({
                    id: 'linkAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadLink') || 'Save to &Link Pad',
                    contexts: ['link']
                });
            }

            if (config.DocumentMenuAdd) {
                chrome.contextMenus.create({
                    id: 'documentAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPage') || 'Save this page to &Link Pad',
                    contexts: ['page']
                });
            }

            if (config.DocumentMenuAddClose) {
                chrome.contextMenus.create({
                    id: 'documentAddClose',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPageAndClose') || 'Save this page to Link Pad and &close tab',
                    contexts: ['page']
                });
            }
        });
    }
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'linkAdd') {
        actions.execute({ action: 'link.add', url: info.linkUrl });
    } else if (info.menuItemId === 'documentAdd') {
        actions.execute({ action: 'link.add', text: tab.title, url: tab.url });
    } else if (info.menuItemId === 'documentAddClose') {
        actions.execute({ action: 'link.add', text: tab.title, url: tab.url });
        actions.execute({ action: 'tab.current-close' });
    }
});

LoadLinks();
chrome.runtime.onStartup.addListener(() => {
    LoadLinks();
});

