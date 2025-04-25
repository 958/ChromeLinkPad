class LinkPadManager {
    constructor() {
        this.links = [];
        this.bookmarksParentId = null;
        this.config = { ...defaultConfig };
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadConfig();
            await this.loadLinks();
            await this.updateContextMenus();
            this.initialized = true;
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    async loadConfig() {
        try {
            const result = await chrome.storage.local.get(['config']);
            this.config = { ...defaultConfig, ...result.config };
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    async loadLinks() {
        try {
            const items = await chrome.bookmarks.getTree();
        const othersItem = items[0].children[1];
        const bookmarksParent = othersItem.children.find(item => item.title === bookmarkName);

        if (!bookmarksParent) {
                const item = await chrome.bookmarks.create({
                parentId: othersItem.id,
                title: bookmarkName,
            });
                this.bookmarksParentId = item.id;
        } else {
                this.bookmarksParentId = bookmarksParent.id;
                this.links = bookmarksParent.children.map(item => ({
                    text: item.title,
                    url: item.url,
                    id: item.id
                }));
                await this.updateBadge();
            }
        } catch (error) {
            console.error('Error loading links:', error);
        }
    }

    async updateBadge() {
        try {
            await chrome.action.setBadgeText({ text: this.links.length.toString() });
            await chrome.action.setBadgeBackgroundColor({ color: '#7cb342' });
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    async updateContextMenus() {
        try {
            await chrome.contextMenus.removeAll();
            
            if (this.config.LinkMenuAdd) {
                await chrome.contextMenus.create({
                    id: 'linkAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadLink') || 'Save to &Link Pad',
                    contexts: ['link'],
                });
            }

            if (this.config.DocumentMenuAdd) {
                await chrome.contextMenus.create({
                    id: 'documentAdd',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPage') || 'Save this page to &Link Pad',
                    contexts: ['page'],
                });
            }

            if (this.config.DocumentMenuAddClose) {
                await chrome.contextMenus.create({
                    id: 'documentAddClose',
                    title: chrome.i18n.getMessage('menu_AddLinkpadPageAndClose') || 'Save this page to Link Pad and &close tab',
                    contexts: ['page'],
                });
            }
        } catch (error) {
            console.error('Error updating context menus:', error);
        }
    }

    async addLink(text, url) {
        try {
            if (!url || !/^(https?|ftp):\/\//.test(url)) {
                return { status: 'error', number: -1, message: 'Invalid or unsupported URL.' };
            }

            if (this.links.some(item => item.url === url)) {
                return { status: 'error', number: -2, message: 'This URL has already been saved.' };
            }

            const item = await chrome.bookmarks.create({
                parentId: this.bookmarksParentId,
                title: text,
                url: url,
            });

            this.links.push({ text, url, id: item.id });
            await this.updateBadge();
            return { status: 'success', number: 0 };
        } catch (error) {
            console.error('Error adding link:', error);
            return { status: 'error', number: -3, message: 'Failed to add link.' };
        }
    }

    async removeLink(url) {
        try {
            const link = this.links.find(link => link.url === url);
            if (link) {
                await chrome.bookmarks.remove(link.id);
                this.links = this.links.filter(l => l.url !== url);
                await this.updateBadge();
            }
        } catch (error) {
            console.error('Error removing link:', error);
        }
    }

    async resetLinks() {
        try {
            this.links = [];
            await chrome.bookmarks.removeTree(this.bookmarksParentId);
            await this.loadLinks();
        } catch (error) {
            console.error('Error resetting links:', error);
        }
    }

    async saveConfig(newConfig) {
        try {
            this.config = newConfig;
            await chrome.storage.local.set({ config: this.config });
            await this.updateContextMenus();
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    async resetConfig() {
        try {
            this.config = { ...defaultConfig };
            await chrome.storage.local.remove('config');
            await this.updateContextMenus();
        } catch (error) {
            console.error('Error resetting config:', error);
        }
    }
}

// Define constants
const bookmarkName = "Link Pad";
const defaultConfig = {
    ToRemove: true,
    LinkMenuAdd: true,
    DocumentMenuAdd: true,
    DocumentMenuAddClose: true,
};

// Create instance
const linkPadManager = new LinkPadManager();

// Set up message handler
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (!req || !req.action) {
        res?.({ status: 'error', message: 'Invalid request' });
        return;
    }

    // Initialize before processing any message
    linkPadManager.initialize().then(() => {
        const [namespace, method] = req.action.split('.');
        
        switch (namespace) {
            case 'link':
                switch (method) {
                    case 'add':
                        linkPadManager.addLink(req.text, req.url).then(res);
                        break;
                    case 'del':
                        linkPadManager.removeLink(req.url).then(() => res?.({ status: 'success' }));
                        break;
                    case 'init':
                        linkPadManager.resetLinks().then(() => res?.({ status: 'success' }));
                        break;
                    case 'get':
                        res?.({ links: linkPadManager.links, config: linkPadManager.config });
                        break;
                }
                break;
            case 'config':
                switch (method) {
                    case 'get':
                        res?.(linkPadManager.config);
                        break;
                    case 'save':
                        linkPadManager.saveConfig(req.config).then(() => res?.({ status: 'success' }));
                        break;
                    case 'init':
                        linkPadManager.resetConfig().then(() => res?.({ status: 'success' }));
                        break;
                }
                break;
            case 'tab':
                if (method === 'current-close') {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.remove(tabs[0].id);
                        }
                    });
                }
                break;
        }
    });

    return true;
});

// Context menu event listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    await linkPadManager.initialize();
    
    if (info.menuItemId === 'linkAdd') {
        linkPadManager.addLink(info.linkText, info.linkUrl);
    } else if (info.menuItemId === 'documentAdd') {
        linkPadManager.addLink(tab.title, tab.url);
    } else if (info.menuItemId === 'documentAddClose') {
        linkPadManager.addLink(tab.title, tab.url).then(() => {
            chrome.tabs.remove(tab.id);
        });
    }
});

// Keyboard shortcut event listener
chrome.commands.onCommand.addListener(async (command) => {
    await linkPadManager.initialize();
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (command === 'documentAdd') {
            linkPadManager.addLink(tab.title, tab.url);
        } else if (command === 'documentAddClose') {
            linkPadManager.addLink(tab.title, tab.url).then(() => {
                chrome.tabs.remove(tab.id);
            });
        }
    });
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        await linkPadManager.initialize();
    }
});

// Initialize on browser startup or extension re-enabling
chrome.runtime.onStartup.addListener(async () => {
    await linkPadManager.initialize();
});
linkPadManager.initialize();

