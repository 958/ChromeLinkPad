window.addEventListener('load', function(e){
    chrome.runtime.sendMessage({ action: 'config.get' }, (bgConfig) => {
        Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]')).forEach(function(elm) {
            elm.checked = bgConfig[elm.id];
            elm.addEventListener('click', function(e){
                bgConfig[e.target.id] = e.target.checked;
                chrome.runtime.sendMessage({
                    action: 'config.save',
                    config: bgConfig
                });
            }, false);
        });
        Array.prototype.slice.call(document.querySelectorAll('input[type="range"]')).forEach(function(elm) {
            elm.value = bgConfig[elm.id];
            var output = document.getElementById(elm.id + '_val');
            output.textContent = elm.value;
            elm.addEventListener('change', function(e){
                bgConfig[e.target.id] = e.target.value;
                output.textContent = e.target.value;
                chrome.runtime.sendMessage({
                    action: 'config.save',
                    config: bgConfig
                });
            }, false);
        });

        document.getElementById('ResetLinks').addEventListener('click', function(e) {
            if (confirm('Are you sure you want to delete all of the saved links ?')) {
                chrome.runtime.sendMessage({
                    action: 'link.init'
                });
            }
        }, false);

        document.getElementById('ResetConfig').addEventListener('click', function(e) {
            if (confirm('Are sure you want to delete this config ?')) {
                chrome.runtime.sendMessage({
                    action: 'config.init'
                }, function(){
                    location.reload();
                });
            }
        }, false);

        (function L10N(){
            var labels = document.querySelectorAll('label');
            for (var i = 0; i < labels.length; i++){
                var message = chrome.i18n.getMessage('option_label_' + labels[i].htmlFor);
                if (message)
                    labels[i].innerHTML = message;
            }
            var buttons = document.querySelectorAll('input[type=button]');
            for (var i = 0; i < buttons.length; i++){
                var message = chrome.i18n.getMessage('option_button_' + buttons[i].id);
                if (message)
                    buttons[i].value = message;
            }
            var tips = document.querySelectorAll('span.tips');
            for (var i = 0; i < tips.length; i++){
                var message = chrome.i18n.getMessage('option_' + tips[i].id);
                if (message)
                    tips[i].innerHTML = message;
            }
            var titles = document.querySelectorAll('h2');
            for (var i = 0; i < titles.length; i++){
                var message = chrome.i18n.getMessage('option_title_' + titles[i].id);
                if (message)
                    titles[i].innerHTML = message;
            }
            var legends = document.querySelectorAll('legend');
            for (var i = 0; i < legends.length; i++){
                var message = chrome.i18n.getMessage('option_legend_' + legends[i].id);
                if (message)
                    legends[i].textContent = message;
            }
        })();
    });
}, false);

