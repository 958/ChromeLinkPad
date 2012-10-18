window.addEventListener('load', function(e){
    var bg = chrome.extension.getBackgroundPage();
    Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]')).forEach(function(elm) {
        elm.checked = bg.config[elm.id];
        elm.addEventListener('click', function(e){
            bg.config[e.target.id] = e.target.checked;
            chrome.extension.sendRequest({
                action: 'config.save'
            });
        }, false);
    });
    Array.prototype.slice.call(document.querySelectorAll('input[type="range"]')).forEach(function(elm) {
        elm.value = bg.config[elm.id];
        var output = document.getElementById(elm.id + '_val');
        output.textContent = elm.value;
        elm.addEventListener('change', function(e){
            bg.config[e.target.id] = e.target.value;
            output.textContent = e.target.value;
            chrome.extension.sendRequest({
                action: 'config.save'
            });
        }, false);
    });

    var autoSaveControl = function(){
        if (document.getElementById('AutoSave').checked) {
            document.getElementById('AutoSaveTime').disabled = false;
            document.getElementById('AutoSaveDupplicateClose').disabled = false;
        } else {
            document.getElementById('AutoSaveTime').disabled = true;
            document.getElementById('AutoSaveDupplicateClose').disabled = true;
        }
    };
    autoSaveControl();
    document.getElementById('AutoSave').addEventListener('click', function(e) {
        autoSaveControl();
    }, false);

    var AddExcludeURL = function(item, index) {
        var li = document.createElement('li');
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'url';
        input.value = item;
        input.addEventListener('input',function(e){
            bg.config.ExcludeURLs[index] = input.value;
            chrome.extension.sendRequest({
                action: 'config.save'
            });
        }, false);
        li.appendChild(input);
        var del = document.createElement('button');
        del.textContent = 'Del';
        del.addEventListener('click',function(e){
            li.parentNode.removeChild(li);
            bg.config.ExcludeURLs = bg.config.ExcludeURLs.filter(function(item, i){
                return (i != index);
            });
            chrome.extension.sendRequest({
                action: 'config.save'
            });
        }, false);
        li.appendChild(del);
        list.appendChild(li);
    };

    var list = document.getElementById('ExcludeURLs');
    var text = document.getElementById('ExcludeURL_text');
    document.getElementById('ExcludeURL_add').addEventListener('click', function(e) {
        var url = document.getElementById('ExcludeURL_text').value;
        if (url) {
            AddExcludeURL(text.value, bg.config.ExcludeURLs.length);
            bg.config.ExcludeURLs.push(url);
            chrome.extension.sendRequest({
                action: 'config.save'
            });
            text.value = '';
        }
    }, false);
    bg.config.ExcludeURLs.forEach(AddExcludeURL);

    document.getElementById('ResetLinks').addEventListener('click', function(e) {
        if (confirm('Are you sure you want to delete all of the saved links ?')) {
            chrome.extension.sendRequest({
                action: 'link.init'
            });
        }
    }, false);

    document.getElementById('ResetConfig').addEventListener('click', function(e) {
        if (confirm('Are sure you want to delete this config ?')) {
            chrome.extension.sendRequest({
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
}, false);

