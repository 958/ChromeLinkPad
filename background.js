chrome.runtime.onInstalled.addListener(() => {
    contextMenus.update();
});

chrome.runtime.onMessage.addListener((req, sender, res) => {
    actions.execute(req, sender, res);
});

Array.prototype.isUnique = function (url) {
    return !this.some(item => item.url === url);
};

const bookmarkName = "Link Pad";

const defaultConfig = {
    ToRemove: true,
    LinkMenuAdd: true,
    DocumentMenuAdd: true,
    DocumentMenuAddClose: true,
};

let config = { ...defaultConfig };
chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
        config = { ...defaultConfig, ...result.config };
    }
});

let links = [];
let bookmarksParentId = null;

function LoadLinks() {
    if (bookmarksParentId) return;
    chrome.bookmarks.getTree((items) => {
        const othersItem = items[0].children[1];
        const bookmarksParent = othersItem.children.find(item => item.title === bookmarkName);

        if (!bookmarksParent) {
            chrome.bookmarks.create({
                parentId: othersItem.id,
                title: bookmarkName,
            }, (item) => {
                bookmarksParentId = item.id;
            });
        } else {
            bookmarksParentId = bookmarksParent.id;
            bookmarksParent.children.forEach(item => {
                links.push({ text: item.title, url: item.url, id: item.id });
            });
            chrome.action.setBadgeText({ text: links.length.toString() });
        }
    });
}

chrome.action.setBadgeBackgroundColor({ color: '#7cb342' });

const actions = {
    execute(req, sender, res) {
        const [namespace, method] = req.action.split('.');
        if (actions[namespace]?.[method]) {
            const result = actions[namespace][method](req, sender);
            if (res) res(result);
        }
    },
    config: {
        get: () => config,
        save: (req) => {
            config = req.config;
            chrome.storage.local.set({ config }, () => {
                contextMenus.update();
            });
        },
        init: () => {
            config = { ...defaultConfig };
            chrome.storage.local.remove('config');
        },
    },
    link: {
        add: (req) => {
            if (!req.url || !/^(https?|ftp):\/\//.test(req.url)) {
                return { status: 'error', number: -1, message: 'Invalid or unsupported URL.' };
            }
            if (links.isUnique(req.url)) {
                links.push({ text: req.text, url: req.url });
                chrome.bookmarks.create({
                    parentId: bookmarksParentId,
                    title: req.text,
                    url: req.url,
                }, (item) => {
                    const link = links.find(link => link.url === item.url);
                    if (link) link.id = item.id;
                    chrome.action.setBadgeText({ text: links.length.toString() });
                });
                return { status: 'success', number: 0 };
            }
            return { status: 'error', number: -2, message: 'This URL has already been saved.' };
        },
        del: (req) => {
            links = links.filter(link => {
                if (req.url === link.url) chrome.bookmarks.remove(link.id);
                return req.url !== link.url;
            });
            chrome.action.setBadgeText({ text: links.length.toString() });
        },
        init: () => {
            links = [];
            chrome.bookmarks.removeTree(bookmarksParentId, () => {
                chrome.bookmarks.getTree((items) => {
                    const othersItem = items[0].children[1];
                    chrome.bookmarks.create({
                        parentId: othersItem.id,
                        title: bookmarkName,
                    }, (item) => {
                        bookmarksParentId = item.id;
                    });
                });
            });
            chrome.action.setBadgeText({ text: links.length.toString() });
        },
        get: () => ({ links, config }),
    },
    tab: {
        'current-close': () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.remove(tabs[0].id);
            });
        },
    },
};

const contextMenus = {
    update: () => {
        chrome.contextMenus.removeAll(() => {
            if (config.LinkMenuAdd) {
                chrome.contextMenus.create({
                    id: 'linkAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadLink') || 'Save to &Link Pad',
                    contexts: ['link'],
                });
            }

            if (config.DocumentMenuAdd) {
                chrome.contextMenus.create({
                    id: 'documentAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPage') || 'Save this page to &Link Pad',
                    contexts: ['page'],
                });
            }

            if (config.DocumentMenuAddClose) {
                chrome.contextMenus.create({
                    id: 'documentAddClose',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPageAndClose') || 'Save this page to Link Pad and &close tab',
                    contexts: ['page'],
                });
            }
        });
    },
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

