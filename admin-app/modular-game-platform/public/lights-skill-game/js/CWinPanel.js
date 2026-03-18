function CWinPanel(iMode, iTimeSpent, iLevel, iLevelStars){    
    var _oContainer;
    var _oFade;
    var _oBg;
    var _oButExit;
    var _oButNext;
    var _oVideoElement;
    var _oVideoBitmap;
    var _oConfig;
    
    var _oInterface;
    
    var _iMode;
    var _iTimeSpent;
    var _iScore;
    var _iBestScore;
    var _iLevel;
    var _iLevelStars;

    this._init = function(){
        _iMode = iMode;
        _iTimeSpent = iTimeSpent;
        _iLevel = iLevel;
        _iLevelStars = iLevelStars;
        _iBestScore = s_aBestScore[_iMode];
        
        var iPositionLine0 = CANVAS_HEIGHT_HALF - 200;
        var iPositionLine1 = CANVAS_HEIGHT_HALF - 160;
        var iPositionLine2 = CANVAS_HEIGHT_HALF - 80;
        var iPositionLine3 = CANVAS_HEIGHT_HALF - 50;
        var iPositionLine4 = CANVAS_HEIGHT_HALF - 20;
        
        _iScore = Math.ceil((TIME[_iMode] - _iTimeSpent)/100) * SCORE_MULTIPLIER[_iMode];
        var bInstantPanel = !!window.s_bInstantPanel;
        if (bInstantPanel) {
            window.s_bInstantPanel = false;
        }
        
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);

        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.alpha = 0.3;
        _oFade.on("mousedown",function(){});
        _oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_end_panel"));
        _oContainer.addChild(_oBg, _oFade);
        
        // Load UI config and apply background settings
        this._loadConfigAndApplyBackground();
        
        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        var oPanel = createBitmap(oSprite);  
        oPanel.regX = oSprite.width/2;
        oPanel.regY = oSprite.height/2;
        oPanel.x = CANVAS_WIDTH_HALF;
        oPanel.y = CANVAS_HEIGHT_HALF;
        _oContainer.addChild(oPanel);

        var iWidth = 500;
        var iHeight = 200;
        var oMsgText = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine0 - iHeight/2, iWidth, iHeight, 
                    30, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_CONGRATS,
                    true, true, true,
                    false );

        var oMsgText1 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine1 - iHeight/2, iWidth, iHeight, 
                    30, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_YOU_MADE + " " + Math.ceil((TIME[_iMode] - _iTimeSpent)/100) + " " + TEXT_PTS + "!",
                    true, true, true,
                    false );

        var oMsgText2 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine2 - iHeight/2, iWidth, iHeight, 
                    24, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_MULTIPLIER + "x" + SCORE_MULTIPLIER[_iMode],
                    true, true, true,
                    false );

        var oMsgText3 = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, iPositionLine3 - iHeight/2, iWidth, iHeight, 
                    24, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_TOTAL_SCORE + s_iTotalScore,
                    true, true, true,
                    false );

        this.addStars();

        _oButExit = new CGfxButton(CANVAS_WIDTH_HALF - 170, 850, s_oSpriteLibrary.getSprite('but_home'), _oContainer);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        _oButNext = new CGfxButton(CANVAS_WIDTH_HALF + 170, 850, s_oSpriteLibrary.getSprite('but_next'), _oContainer);
        _oButNext.addEventListener(ON_MOUSE_UP, this._onNext, this);

        _oInterface = new CInterface(_iMode);

        if (bInstantPanel) {
            _oContainer.alpha = 1;
        } else {
            _oContainer.alpha = 0;
	    createjs.Tween.get(_oContainer)
                .wait(1500)
                .to({alpha: 1}, 2000, createjs.Ease.cubicOut)
                .call(function(){$(s_oMain).trigger("show_interlevel_ad");});
        }

        setVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME );
    };
    
    this.addStars = function(){
        var iX = CANVAS_WIDTH_HALF;
        var iY = CANVAS_HEIGHT_HALF + 100;
        
        for (var i = 0; i < 3; i++) {
            var oData = {
                images: [s_oSpriteLibrary.getSprite('star')],
                // width, height & registration point of each sprite
                frames: {width: 70, height: 70, regX: 70/2, regY: 70/2},
                animations: {off: [0], on: [1]}
            };

            var oSpriteSheet = new createjs.SpriteSheet(oData);
            var oStar = createSprite(oSpriteSheet, "off", 70/2, 70/2, 70, 70);
            
            var aOffsetX = [-60, 0, 60];
            oStar.x = iX + aOffsetX[i];
            oStar.y = iY - 55;
            
            if (_iLevelStars > i) {
                oStar.gotoAndPlay("on");
            }

            var iRandomRotation = Math.random(200)+50;
            var iRandomTime = Math.random(1000)+1000;
            var iScale = 0.5;

            createjs.Tween.get(oStar, {loop:true})
                .to({rotation: -1*iRandomRotation, scaleX: iScale, scaleY: iScale}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: 0, scaleX: 1, scaleY: 1}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: iRandomRotation, scaleX: iScale, scaleY: iScale}, iRandomTime, createjs.Ease.quadOut)
                .to({rotation: 0, scaleX: 1, scaleY: 1}, iRandomTime, createjs.Ease.quadOut);
        
            _oContainer.addChild(oStar);
        };
    };
    
    this.unload = function(){
        _oButExit.unload(); 
        _oButNext.unload();
        
        // Clean up video element
        if (_oVideoElement) {
            _oVideoElement.pause();
            _oVideoElement.src = '';
            if (_oVideoElement.parentNode) {
                _oVideoElement.parentNode.removeChild(_oVideoElement);
            }
            _oVideoElement = null;
        }
        
        // Clean up debug panel
        var oDebugPanel = document.getElementById('video-debug-panel');
        if (oDebugPanel && oDebugPanel.parentNode) {
            oDebugPanel.parentNode.removeChild(oDebugPanel);
        }
        
        // Save current settings to config if debug panel was used
        if (_oVideoBitmap && window.localStorage) {
            try {
                var settings = {
                    x: _oVideoBitmap.x,
                    y: _oVideoBitmap.y,
                    scaleX: _oVideoBitmap.scaleX,
                    scaleY: _oVideoBitmap.scaleY
                };
                localStorage.setItem('winPanelVideoSettings', JSON.stringify(settings));
            } catch(e) {
                console.log('Could not save settings:', e);
            }
        }
                
        s_oStage.removeChild(_oContainer);
        s_oWinPanel = null;
    };
    
    this._onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._onNext = function(){
        this.unload();
        
        if (_iLevel+1 < MATRIX_SETTINGS[_iMode].length) {
            s_oMain.gotoGame(_iMode, _iLevel+1);
        // IF THERE'S NO MORE LEVELS FOR THIS MODE, GO TO MENU
        } else {
            s_oGame.unload();
            s_oMain.gotoLevelSelect(_iMode);
        };
    };
    
    this._loadConfigAndApplyBackground = function() {
        var self = this;
        
        // Default config (fallback)
        var defaultConfig = {
            background: {
                type: 'video',
                url: './sprites/ba5aa73d88e980cd712a6ad1216260a4_720w.mp4',
                position: { x: -5, y: 0 },
                scale: { x: 1.09, y: 1.09 },
                alpha: 0.7,
                loop: true,
                muted: false,
                autoplay: true
            }
        };
        
        // Check for localStorage override first (from config editor)
        var overrideConfig = null;
        try {
            var stored = localStorage.getItem('ui-config-override');
            if (stored) {
                overrideConfig = JSON.parse(stored);
                console.log('Using config from editor override');
            }
        } catch (e) {
            console.log('No valid config override found');
        }
        
        if (overrideConfig) {
            _oConfig = overrideConfig.winPanel || defaultConfig;
            self._applyBackgroundFromConfig();
        } else {
            // Try to load config from JSON file
            fetch('./config/ui-config.json')
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Config file not found');
                    }
                    return response.json();
                })
                .then(function(config) {
                    _oConfig = config.winPanel || defaultConfig;
                    self._applyBackgroundFromConfig();
                })
                .catch(function(error) {
                    console.log('Using default config:', error.message);
                    _oConfig = defaultConfig;
                    self._applyBackgroundFromConfig();
                });
        }
    };
    
    this._applyBackgroundFromConfig = function() {
        var bgConfig = _oConfig.background;
        
        if (bgConfig.type === 'video') {
            // Create video element
            _oVideoElement = document.createElement('video');
            _oVideoElement.src = bgConfig.url;
            _oVideoElement.loop = bgConfig.loop !== false;
            _oVideoElement.muted = bgConfig.muted !== false;
            _oVideoElement.autoplay = bgConfig.autoplay !== false;
            _oVideoElement.playsInline = true;
            _oVideoElement.style.display = 'none';
            document.body.appendChild(_oVideoElement);

            // Create bitmap from video
            _oVideoBitmap = new createjs.Bitmap(_oVideoElement);
            _oVideoBitmap.x = bgConfig.position.x;
            _oVideoBitmap.y = bgConfig.position.y;
            _oVideoBitmap.regX = 0;
            _oVideoBitmap.regY = 0;
            _oVideoBitmap.scaleX = bgConfig.scale.x;
            _oVideoBitmap.scaleY = bgConfig.scale.y;
            _oVideoBitmap.alpha = bgConfig.alpha || 1;
            
            _oContainer.addChild(_oVideoBitmap);
            
            // Play video
            _oVideoElement.play();
            
            // Debug preset buttons (DOM overlay)
            this._createDebugPresetsDOM();
        } else if (bgConfig.type === 'image') {
            // Load image background
            var oImg = new Image();
            oImg.onload = function() {
                var oBitmap = new createjs.Bitmap(oImg);
                oBitmap.x = bgConfig.position.x;
                oBitmap.y = bgConfig.position.y;
                oBitmap.scaleX = bgConfig.scale.x;
                oBitmap.scaleY = bgConfig.scale.y;
                oBitmap.alpha = bgConfig.alpha || 1;
                _oContainer.addChildAt(oBitmap, 1);
            };
            oImg.src = bgConfig.url;
        }
        // If type is 'none', no background is added
    };
    
    this._createDebugPresetsDOM = function() {
        var oDebugPanel = document.createElement('div');
        oDebugPanel.id = 'video-debug-panel';
        oDebugPanel.style.position = 'fixed';
        oDebugPanel.style.top = '50%';
        oDebugPanel.style.right = '20px';
        oDebugPanel.style.transform = 'translateY(-50%)';
        oDebugPanel.style.background = 'rgba(0,0,0,0.85)';
        oDebugPanel.style.padding = '15px';
        oDebugPanel.style.borderRadius = '12px';
        oDebugPanel.style.zIndex = '10000';
        oDebugPanel.style.border = '2px solid #FF5722';
        oDebugPanel.style.fontFamily = 'Arial, sans-serif';
        oDebugPanel.style.width = '200px';
        
        var oTitle = document.createElement('div');
        oTitle.textContent = 'VIDEO CONTROLS';
        oTitle.style.color = '#FF5722';
        oTitle.style.fontSize = '12px';
        oTitle.style.fontWeight = 'bold';
        oTitle.style.marginBottom = '15px';
        oTitle.style.textAlign = 'center';
        oDebugPanel.appendChild(oTitle);

        function createSlider(label, min, max, step, initialValue, onChange) {
            var oContainer = document.createElement('div');
            oContainer.style.marginBottom = '10px';
            
            var oLabelRow = document.createElement('div');
            oLabelRow.style.display = 'flex';
            oLabelRow.style.justifyContent = 'space-between';
            oLabelRow.style.alignItems = 'center';
            oLabelRow.style.color = '#FFF';
            oLabelRow.style.fontSize = '11px';
            oLabelRow.style.marginBottom = '5px';
            
            var oName = document.createElement('span');
            oName.textContent = label;
            
            var oValueContainer = document.createElement('div');
            oValueContainer.style.display = 'flex';
            oValueContainer.style.alignItems = 'center';
            oValueContainer.style.gap = '5px';

            var oBtnMinus = document.createElement('button');
            oBtnMinus.textContent = '-';
            oBtnMinus.style.padding = '0 5px';
            oBtnMinus.style.background = '#4CAF50';
            oBtnMinus.style.color = '#FFF';
            oBtnMinus.style.border = 'none';
            oBtnMinus.style.borderRadius = '3px';
            oBtnMinus.style.cursor = 'pointer';

            var oValue = document.createElement('span');
            oValue.textContent = initialValue;
            oValue.style.minWidth = '30px';
            oValue.style.textAlign = 'center';

            var oBtnPlus = document.createElement('button');
            oBtnPlus.textContent = '+';
            oBtnPlus.style.padding = '0 5px';
            oBtnPlus.style.background = '#4CAF50';
            oBtnPlus.style.color = '#FFF';
            oBtnPlus.style.border = 'none';
            oBtnPlus.style.borderRadius = '3px';
            oBtnPlus.style.cursor = 'pointer';
            
            oValueContainer.appendChild(oBtnMinus);
            oValueContainer.appendChild(oValue);
            oValueContainer.appendChild(oBtnPlus);

            oLabelRow.appendChild(oName);
            oLabelRow.appendChild(oValueContainer);
            oContainer.appendChild(oLabelRow);
            
            var oSlider = document.createElement('input');
            oSlider.type = 'range';
            oSlider.min = min;
            oSlider.max = max;
            oSlider.step = step;
            oSlider.value = initialValue;
            oSlider.style.width = '100%';
            
            var updateValue = function(val) {
                // Ensure val is within min/max
                val = Math.max(min, Math.min(max, val));
                // Round based on step to avoid floating point issues
                var factor = 1 / step;
                val = Math.round(val * factor) / factor;
                oSlider.value = val;
                oValue.textContent = val;
                onChange(val);
            };

            oSlider.addEventListener('input', function(e) {
                var val = parseFloat(e.target.value);
                oValue.textContent = val;
                onChange(val);
            });

            oBtnMinus.addEventListener('click', function() {
                var currentVal = parseFloat(oSlider.value);
                updateValue(currentVal - step);
            });

            oBtnPlus.addEventListener('click', function() {
                var currentVal = parseFloat(oSlider.value);
                updateValue(currentVal + step);
            });
            
            oContainer.appendChild(oSlider);
            // Return container but also expose functions to update it externally if needed
            oContainer._updateValue = updateValue;
            oContainer._valueElement = oValue;
            return oContainer;
        }

        var oPosX = createSlider('X Position', -1000, 1000, 1, _oVideoBitmap.x, function(val) {
            _oVideoBitmap.x = val;
        });
        
        var oPosY = createSlider('Y Position', -1000, 1000, 1, _oVideoBitmap.y, function(val) {
            _oVideoBitmap.y = val;
        });
        
        var oScaleX = createSlider('Scale X', 0.1, 5, 0.01, _oVideoBitmap.scaleX, function(val) {
            _oVideoBitmap.scaleX = val;
            if (document.getElementById('link-scales').checked) {
                _oVideoBitmap.scaleY = val;
                oScaleY._updateValue(val);
            }
        });
        
        var oScaleY = createSlider('Scale Y', 0.1, 5, 0.01, _oVideoBitmap.scaleY, function(val) {
            _oVideoBitmap.scaleY = val;
            if (document.getElementById('link-scales').checked) {
                _oVideoBitmap.scaleX = val;
                oScaleX._updateValue(val);
            }
        });
        
        // Removed IDs as we use _updateValue now
        
        var oLinkRow = document.createElement('div');
        oLinkRow.style.display = 'flex';
        oLinkRow.style.alignItems = 'center';
        oLinkRow.style.marginBottom = '15px';
        oLinkRow.style.color = '#FFF';
        oLinkRow.style.fontSize = '11px';
        
        var oLinkCheck = document.createElement('input');
        oLinkCheck.type = 'checkbox';
        oLinkCheck.id = 'link-scales';
        oLinkCheck.checked = true;
        oLinkCheck.style.marginRight = '5px';
        
        var oLinkLabel = document.createElement('label');
        oLinkLabel.htmlFor = 'link-scales';
        oLinkLabel.textContent = 'Lock Aspect Ratio';
        
        oLinkRow.appendChild(oLinkCheck);
        oLinkRow.appendChild(oLinkLabel);

        oDebugPanel.appendChild(oPosX);
        oDebugPanel.appendChild(oPosY);
        oDebugPanel.appendChild(oScaleX);
        oDebugPanel.appendChild(oLinkRow);
        oDebugPanel.appendChild(oScaleY);
        
        var oPrintBtn = document.createElement('button');
        oPrintBtn.textContent = 'Print Settings to Console';
        oPrintBtn.style.display = 'block';
        oPrintBtn.style.width = '100%';
        oPrintBtn.style.padding = '8px';
        oPrintBtn.style.marginTop = '15px';
        oPrintBtn.style.background = '#4CAF50';
        oPrintBtn.style.color = '#FFF';
        oPrintBtn.style.border = 'none';
        oPrintBtn.style.borderRadius = '5px';
        oPrintBtn.style.cursor = 'pointer';
        oPrintBtn.addEventListener('click', function() {
            var msg = 'FINAL VIDEO SETTINGS:\n' +
                      'x: ' + _oVideoBitmap.x + '\n' +
                      'y: ' + _oVideoBitmap.y + '\n' +
                      'scaleX: ' + _oVideoBitmap.scaleX + '\n' +
                      'scaleY: ' + _oVideoBitmap.scaleY;
            console.log(msg);
            alert(msg);
        });
        oDebugPanel.appendChild(oPrintBtn);
        
        document.body.appendChild(oDebugPanel);
    };
    
    s_oWinPanel = this;
    
    this._init();
}

var s_oWinPanel = null;