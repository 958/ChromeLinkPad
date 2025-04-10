window.addEventListener('load', (e) => {
    chrome.runtime.sendMessage({ action: 'config.get' }, (bgConfig) => {
        Array.from(document.querySelectorAll('input[type="checkbox"]')).forEach((elm) => {
            elm.checked = bgConfig[elm.id];
            elm.addEventListener('click', (e) => {
                bgConfig[e.target.id] = e.target.checked;
                chrome.runtime.sendMessage({
                    action: 'config.save',
                    config: bgConfig
                });
            });
        });

        Array.from(document.querySelectorAll('input[type="range"]')).forEach((elm) => {
            elm.value = bgConfig[elm.id];
            const output = document.getElementById(`${elm.id}_val`);
            output.textContent = elm.value;
            elm.addEventListener('change', (e) => {
                bgConfig[e.target.id] = e.target.value;
                output.textContent = e.target.value;
                chrome.runtime.sendMessage({
                    action: 'config.save',
                    config: bgConfig
                });
            });
        });

        document.getElementById('ResetLinks').addEventListener('click', (e) => {
            if (confirm('Are you sure you want to delete all of the saved links?')) {
                chrome.runtime.sendMessage({
                    action: 'link.init'
                });
            }
        });

        document.getElementById('ResetConfig').addEventListener('click', (e) => {
            if (confirm('Are sure you want to delete this config?')) {
                chrome.runtime.sendMessage({
                    action: 'config.init'
                }, () => {
                    location.reload();
                });
            }
        });

        (() => {
            const labels = document.querySelectorAll('label');
            labels.forEach((label) => {
                const message = chrome.i18n.getMessage(`option_label_${label.htmlFor}`);
                if (message) label.innerHTML = message;
            });

            const buttons = document.querySelectorAll('input[type=button]');
            buttons.forEach((button) => {
                const message = chrome.i18n.getMessage(`option_button_${button.id}`);
                if (message) button.value = message;
            });

            const tips = document.querySelectorAll('span.tips');
            tips.forEach((tip) => {
                const message = chrome.i18n.getMessage(`option_${tip.id}`);
                if (message) tip.innerHTML = message;
            });

            const titles = document.querySelectorAll('h2');
            titles.forEach((title) => {
                const message = chrome.i18n.getMessage(`option_title_${title.id}`);
                if (message) title.innerHTML = message;
            });

            const legends = document.querySelectorAll('legend');
            legends.forEach((legend) => {
                const message = chrome.i18n.getMessage(`option_legend_${legend.id}`);
                if (message) legend.textContent = message;
            });
        })();
    });
});

