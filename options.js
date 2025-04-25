class OptionsManager {
    constructor() {
        this.config = {};
        this.initialize();
    }

    async initialize() {
        try {
            await this.loadConfig();
            this.setupEventListeners();
            this.setupI18n();
        } catch (error) {
            console.error('Error initializing options:', error);
        }
    }

    async loadConfig() {
        try {
            this.config = await chrome.runtime.sendMessage({ action: 'config.get' });
            this.updateUI();
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    updateUI() {
        // Update checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach((elm) => {
            elm.checked = this.config[elm.id];
        });

        // Update sliders
        document.querySelectorAll('input[type="range"]').forEach((elm) => {
            elm.value = this.config[elm.id];
            const output = document.getElementById(`${elm.id}_val`);
            if (output) {
                output.textContent = elm.value;
            }
        });
    }

    setupEventListeners() {
        // Checkbox event listeners
        document.querySelectorAll('input[type="checkbox"]').forEach((elm) => {
            elm.addEventListener('change', async (e) => {
                try {
                    this.config[e.target.id] = e.target.checked;
                    await this.saveConfig();
                } catch (error) {
                    console.error('Error saving checkbox config:', error);
                    // Revert to original state on error
                    e.target.checked = !e.target.checked;
                    this.config[e.target.id] = e.target.checked;
                }
            });
        });

        // Slider event listeners
        document.querySelectorAll('input[type="range"]').forEach((elm) => {
            elm.addEventListener('change', async (e) => {
                try {
                    this.config[e.target.id] = e.target.value;
                    const output = document.getElementById(`${e.target.id}_val`);
                    if (output) {
                        output.textContent = e.target.value;
                    }
                    await this.saveConfig();
                } catch (error) {
                    console.error('Error saving range config:', error);
                    // Revert to original state on error
                    e.target.value = this.config[e.target.id];
                    const output = document.getElementById(`${e.target.id}_val`);
                    if (output) {
                        output.textContent = e.target.value;
                    }
                }
            });
        });

        // Reset button event listeners
        document.getElementById('ResetLinks').addEventListener('click', async (e) => {
            try {
                if (await this.confirmAction('option_confirm_reset_links')) {
                    await chrome.runtime.sendMessage({ action: 'link.init' });
                }
            } catch (error) {
                console.error('Error resetting links:', error);
            }
        });

        document.getElementById('ResetConfig').addEventListener('click', async (e) => {
            try {
                if (await this.confirmAction('option_confirm_reset_config')) {
                    await chrome.runtime.sendMessage({ action: 'config.init' });
                    await this.loadConfig();
                }
            } catch (error) {
                console.error('Error resetting config:', error);
            }
        });
    }

    async confirmAction(messageKey) {
        const message = chrome.i18n.getMessage(messageKey) || 'Are you sure?';
        return confirm(message);
    }

    async saveConfig() {
        try {
            await chrome.runtime.sendMessage({
                action: 'config.save',
                config: this.config
            });
        } catch (error) {
            console.error('Error saving config:', error);
            throw error;
        }
    }

    setupI18n() {
        // Internationalize labels
        document.querySelectorAll('label').forEach((label) => {
            const message = chrome.i18n.getMessage(`option_label_${label.htmlFor}`);
            if (message) label.innerHTML = message;
        });

        // Internationalize buttons
        document.querySelectorAll('input[type=button]').forEach((button) => {
            const message = chrome.i18n.getMessage(`option_button_${button.id}`);
            if (message) button.value = message;
        });

        // Internationalize hints
        document.querySelectorAll('span.tips').forEach((tip) => {
            const message = chrome.i18n.getMessage(`option_${tip.id}`);
            if (message) tip.innerHTML = message;
        });

        // Internationalize titles
        document.querySelectorAll('h2').forEach((title) => {
            const message = chrome.i18n.getMessage(`option_title_${title.id}`);
            if (message) title.innerHTML = message;
        });

        // Internationalize legends
        document.querySelectorAll('legend').forEach((legend) => {
            const message = chrome.i18n.getMessage(`option_legend_${legend.id}`);
            if (message) legend.textContent = message;
        });
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    new OptionsManager();
});

