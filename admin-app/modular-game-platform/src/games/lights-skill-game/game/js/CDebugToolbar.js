function CDebugToolbar() {
    var _oToolbar;

    this._init = function () {
        var doc = document;
        try {
            if (!doc.body && window.parent && window.parent.document) {
                doc = window.parent.document;
            }
        } catch (err) {
            doc = document;
        }
        if (!doc.body) {
            document.addEventListener('DOMContentLoaded', this._init.bind(this));
            return;
        }

        _oToolbar = doc.createElement('div');
        _oToolbar.id = 'debug-toolbar';
        _oToolbar.style.position = 'fixed';
        _oToolbar.style.bottom = '24px';
        _oToolbar.style.left = '24px';
        _oToolbar.style.transform = 'none';
        _oToolbar.style.background = 'rgba(8, 15, 31, 0.92)';
        _oToolbar.style.border = '1px solid rgba(255,255,255,0.2)';
        _oToolbar.style.borderRadius = '16px';
        _oToolbar.style.padding = '16px 12px';
        _oToolbar.style.display = 'flex';
        _oToolbar.style.flexDirection = 'column';
        _oToolbar.style.gap = '10px';
        _oToolbar.style.zIndex = '9999';
        _oToolbar.style.boxShadow = '0 10px 25px rgba(0,0,0,0.35)';
        _oToolbar.style.fontFamily = '"DM Sans", "Segoe UI", sans-serif';

        var buttonConfigs = [
            { label: 'Win Panel', callback: this._showWinPanel },
            { label: 'End Panel', callback: this._showEndPanel },
            { label: 'Help Panel', callback: this._showHelpPanel },
            { label: 'Are You Sure', callback: this._showAreYouSure },
            { label: 'Credits', callback: this._showCredits },
            { label: 'Close All', callback: this._closeAll }
        ];

        buttonConfigs.forEach(function (config) {
            _oToolbar.appendChild(_createButton(config, doc));
        });

        doc.body.appendChild(_oToolbar);
    };

    var _createButton = function (config, doc) {
        var oButton = doc.createElement('button');
        oButton.textContent = config.label;
        oButton.style.background = 'linear-gradient(135deg, #00b4d8, #0077b6)';
        oButton.style.border = 'none';
        oButton.style.borderRadius = '999px';
        oButton.style.color = '#fff';
        oButton.style.padding = '10px 18px';
        oButton.style.fontWeight = '600';
        oButton.style.cursor = 'pointer';
        oButton.style.boxShadow = '0 6px 12px rgba(0, 119, 182, 0.35)';
        oButton.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        oButton.addEventListener('mouseenter', function () {
            oButton.style.transform = 'translateY(-2px)';
            oButton.style.boxShadow = '0 10px 15px rgba(0, 119, 182, 0.45)';
        });
        oButton.addEventListener('mouseleave', function () {
            oButton.style.transform = 'translateY(0)';
            oButton.style.boxShadow = '0 6px 12px rgba(0, 119, 182, 0.35)';
        });
        oButton.addEventListener('click', config.callback.bind(this));
        return oButton;
    }.bind(this);

    this._showWinPanel = function () {
        console.log('Debug: Showing Win Panel');
        if (s_oWinPanel) {
            s_oWinPanel.unload();
        }
        window.s_bInstantPanel = true;
        new CWinPanel(0, 5000, 0, 3);
    };

    this._showEndPanel = function () {
        console.log('Debug: Showing End Panel');
        if (s_oEndPanel) {
            s_oEndPanel.unload();
        }
        window.s_bInstantPanel = true;
        new CEndPanel(0);
    };

    this._showHelpPanel = function () {
        console.log('Debug: Showing Help Panel');
        if (s_oHelpPanel) {
            s_oHelpPanel.unload();
        }
        new CHelpPanel();
    };

    this._showAreYouSure = function () {
        console.log('Debug: Showing Are You Sure Panel');
        if (s_oAreYouSurePanel) {
            s_oAreYouSurePanel.unload();
        }
        window.s_bInstantPanel = true;
        new CAreYouSurePanel(function () {
            console.log('User confirmed exit');
        });
    };

    this._showCredits = function () {
        console.log('Debug: Showing Credits Panel');
        if (s_oCreditsPanel) {
            s_oCreditsPanel.unload();
        }
        window.s_bInstantPanel = true;
        new CCreditsPanel();
    };

    this._closeAll = function () {
        console.log('Debug: Closing all panels');
        if (s_oWinPanel) {
            s_oWinPanel.unload();
        }
        if (s_oEndPanel) {
            s_oEndPanel.unload();
        }
        if (s_oHelpPanel) {
            s_oHelpPanel.unload();
        }
        if (s_oAreYouSurePanel) {
            s_oAreYouSurePanel.unload();
        }
        if (s_oCreditsPanel) {
            s_oCreditsPanel.unload();
        }
    };

    this.unload = function () {
        if (_oToolbar && _oToolbar.parentNode) {
            _oToolbar.parentNode.removeChild(_oToolbar);
        }
    };

    this._init();
}

var s_oDebugToolbar = null;
