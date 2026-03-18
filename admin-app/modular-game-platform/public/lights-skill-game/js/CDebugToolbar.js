function CDebugToolbar() {
    var _oToolbar;
    var _oConfigEditor;
    var _oCurrentConfig;

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
            { label: 'Edit Config', callback: this._showConfigEditor, color: '#f59e0b' },
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
        var bgColor = config.color || '#0077b6';
        var bgColorLight = config.color ? (config.color === '#f59e0b' ? '#fbbf24' : config.color) : '#00b4d8';
        oButton.style.background = 'linear-gradient(135deg, ' + bgColorLight + ', ' + bgColor + ')';
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

    this._showConfigEditor = function () {
        console.log('Debug: Opening Config Editor');
        var self = this;
        
        // Load current config
        fetch('./config/ui-config.json')
            .then(function(response) { return response.json(); })
            .then(function(config) {
                _oCurrentConfig = config;
                self._createConfigEditorModal(config);
            })
            .catch(function(error) {
                console.error('Failed to load config:', error);
                alert('Failed to load config file');
            });
    };

    this._createConfigEditorModal = function(config) {
        var doc = document;
        
        // Create modal overlay
        _oConfigEditor = doc.createElement('div');
        _oConfigEditor.style.position = 'fixed';
        _oConfigEditor.style.top = '0';
        _oConfigEditor.style.left = '0';
        _oConfigEditor.style.width = '100%';
        _oConfigEditor.style.height = '100%';
        _oConfigEditor.style.background = 'rgba(0,0,0,0.8)';
        _oConfigEditor.style.zIndex = '99999';
        _oConfigEditor.style.display = 'flex';
        _oConfigEditor.style.alignItems = 'center';
        _oConfigEditor.style.justifyContent = 'center';
        _oConfigEditor.style.padding = '10px';
        _oConfigEditor.style.overflow = 'auto';
        
        // Create modal content
        var oModal = doc.createElement('div');
        oModal.style.background = '#1e293b';
        oModal.style.borderRadius = '12px';
        oModal.style.padding = '16px';
        oModal.style.maxWidth = '800px';
        oModal.style.width = '90vw';
        oModal.style.height = '85vh'; // Use fixed height to ensure textarea has space
        oModal.style.maxHeight = '800px';
        oModal.style.display = 'flex';
        oModal.style.flexDirection = 'column';
        oModal.style.boxShadow = '0 25px 50px rgba(0,0,0,0.5)';
        oModal.style.margin = 'auto';
        
        // Title
        var oTitle = doc.createElement('h2');
        oTitle.textContent = 'Edit UI Configuration';
        oTitle.style.color = '#fff';
        oTitle.style.margin = '0 0 12px 0';
        oTitle.style.fontFamily = '"DM Sans", sans-serif';
        oTitle.style.fontSize = '20px';
        oTitle.style.flexShrink = '0';
        oModal.appendChild(oTitle);
        
        // Textarea container (scrollable)
        var oTextareaContainer = doc.createElement('div');
        oTextareaContainer.style.flex = '1';
        oTextareaContainer.style.minHeight = '150px'; // Give it a sensible minimum
        oTextareaContainer.style.marginBottom = '12px';
        oTextareaContainer.style.display = 'flex';
        oTextareaContainer.style.flexDirection = 'column';
        
        // Textarea for JSON
        var oTextarea = doc.createElement('textarea');
        oTextarea.value = JSON.stringify(config, null, 2);
        oTextarea.style.width = '100%';
        oTextarea.style.flex = '1';
        oTextarea.style.height = '100%';
        oTextarea.style.background = '#0f172a';
        oTextarea.style.color = '#e2e8f0';
        oTextarea.style.border = '1px solid #334155';
        oTextarea.style.borderRadius = '8px';
        oTextarea.style.padding = '10px';
        oTextarea.style.fontFamily = '"Consolas", "Monaco", monospace';
        oTextarea.style.fontSize = '12px';
        oTextarea.style.lineHeight = '1.4';
        oTextarea.style.resize = 'vertical'; // Allow vertical resize just in case
        oTextarea.style.boxSizing = 'border-box';
        oTextareaContainer.appendChild(oTextarea);
        oModal.appendChild(oTextareaContainer);
        
        // Button container
        var oButtonContainer = doc.createElement('div');
        oButtonContainer.style.display = 'flex';
        oButtonContainer.style.gap = '8px';
        oButtonContainer.style.justifyContent = 'flex-end';
        oButtonContainer.style.flexShrink = '0';
        oButtonContainer.style.flexWrap = 'wrap';
        
        // Save & Apply button
        var oSaveBtn = doc.createElement('button');
        oSaveBtn.textContent = 'Apply';
        oSaveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        oSaveBtn.style.color = '#fff';
        oSaveBtn.style.border = 'none';
        oSaveBtn.style.borderRadius = '6px';
        oSaveBtn.style.padding = '8px 16px';
        oSaveBtn.style.fontWeight = '600';
        oSaveBtn.style.cursor = 'pointer';
        oSaveBtn.style.fontFamily = '"DM Sans", sans-serif';
        oSaveBtn.style.fontSize = '14px';
        oSaveBtn.style.flex = '1';
        oSaveBtn.style.minWidth = '80px';
        oSaveBtn.addEventListener('click', function() {
            try {
                var newConfig = JSON.parse(oTextarea.value);
                _oCurrentConfig = newConfig;
                
                // Store in localStorage for persistence
                localStorage.setItem('ui-config-override', JSON.stringify(newConfig));
                
                alert('Config applied! Changes will take effect on next panel load.\n\nNote: To make permanent, copy this JSON and save to:\nconfig/ui-config.json');
                
                // Close modal
                if (_oConfigEditor && _oConfigEditor.parentNode) {
                    _oConfigEditor.parentNode.removeChild(_oConfigEditor);
                }
            } catch (e) {
                alert('Invalid JSON: ' + e.message);
            }
        });
        oButtonContainer.appendChild(oSaveBtn);
        
        // Copy to Clipboard button
        var oCopyBtn = doc.createElement('button');
        oCopyBtn.textContent = 'Copy';
        oCopyBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        oCopyBtn.style.color = '#fff';
        oCopyBtn.style.border = 'none';
        oCopyBtn.style.borderRadius = '6px';
        oCopyBtn.style.padding = '8px 16px';
        oCopyBtn.style.fontWeight = '600';
        oCopyBtn.style.cursor = 'pointer';
        oCopyBtn.style.fontFamily = '"DM Sans", sans-serif';
        oCopyBtn.style.fontSize = '14px';
        oCopyBtn.style.flex = '1';
        oCopyBtn.style.minWidth = '80px';
        oCopyBtn.addEventListener('click', function() {
            oTextarea.select();
            document.execCommand('copy');
            oCopyBtn.textContent = 'Copied!';
            setTimeout(function() {
                oCopyBtn.textContent = 'Copy';
            }, 2000);
        });
        oButtonContainer.appendChild(oCopyBtn);
        
        // Cancel button
        var oCancelBtn = doc.createElement('button');
        oCancelBtn.textContent = 'Cancel';
        oCancelBtn.style.background = 'linear-gradient(135deg, #64748b, #475569)';
        oCancelBtn.style.color = '#fff';
        oCancelBtn.style.border = 'none';
        oCancelBtn.style.borderRadius = '6px';
        oCancelBtn.style.padding = '8px 16px';
        oCancelBtn.style.fontWeight = '600';
        oCancelBtn.style.cursor = 'pointer';
        oCancelBtn.style.fontFamily = '"DM Sans", sans-serif';
        oCancelBtn.style.fontSize = '14px';
        oCancelBtn.style.flex = '1';
        oCancelBtn.style.minWidth = '80px';
        oCancelBtn.addEventListener('click', function() {
            if (_oConfigEditor && _oConfigEditor.parentNode) {
                _oConfigEditor.parentNode.removeChild(_oConfigEditor);
            }
        });
        oButtonContainer.appendChild(oCancelBtn);
        
        oModal.appendChild(oButtonContainer);
        _oConfigEditor.appendChild(oModal);
        doc.body.appendChild(_oConfigEditor);
    };

    this.unload = function () {
        if (_oToolbar && _oToolbar.parentNode) {
            _oToolbar.parentNode.removeChild(_oToolbar);
        }
    };

    this._init();
}

var s_oDebugToolbar = null;
