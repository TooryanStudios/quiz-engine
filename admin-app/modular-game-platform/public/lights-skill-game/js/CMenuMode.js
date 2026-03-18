function CMenuMode() {
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;

    var _oContainer;
    var _oBg;
    var _oFade;
    var _oAudioToggle;
    var _oButExit;
    var _oButFullscreen;
    var _oTextTitle;
    var _oTextTitleBack;
    var _oButPlayEasy;
    var _oButPlayMedium;
    var _oButPlayHard;
    var _oButPlayExtreme;
    var _oConfig;
    var _oVideoElement;
    var _oVideoBitmap;
    var _oStageLabel;

    var createPillButton = function(options) {
        var width = options.width || 320;
        var height = options.height || 90;
        var radius = options.radius || 32;
        var fontSize = options.fontSize || 36;
        var fontFamily = options.fontFamily || PRIMARY_FONT;
        var palettes = options.palettes || {
            default: ["#0ea5e9", "#1d4ed8"],
            hover: ["#38bdf8", "#2563eb"],
            active: ["#0284c7", "#1e3a8a"]
        };

        var container = new createjs.Container();
        container.cursor = "pointer";

        var bg = new createjs.Shape();
        bg.shadow = new createjs.Shadow("rgba(15,23,42,0.65)", 0, 8, 18);

        var label = new createjs.Text(options.text || "", fontSize + "px " + fontFamily, options.textColor || "#f8fafc");
        label.textAlign = "center";
        label.textBaseline = "middle";

        container.addChild(bg, label);

        var applyState = function(stateName) {
            var colors = palettes[stateName] || palettes.default;
            bg.graphics.clear()
                .beginLinearGradientFill(colors, [0, 1], 0, -height / 2, 0, height / 2)
                .drawRoundRect(-width / 2, -height / 2, width, height, radius);
        };

        container.on("mouseover", function () { applyState("hover"); });
        container.on("mouseout", function () { applyState("default"); });
        container.on("mousedown", function () { applyState("active"); });
        container.on("pressup", function () { applyState("hover"); });

        container.setText = function(newText) {
            label.text = newText;
        };

        container.setFontSize = function(newSize) {
            label.font = newSize + "px " + fontFamily;
        };

        applyState("default");
        return container;
    };

    var updateAudioToggleVisual = function() {
        if (_oAudioToggle && _oAudioToggle.setText) {
            _oAudioToggle.setText(s_bAudioActive ? "🔊" : "🔇");
        }
    };

    var updateFullscreenVisual = function() {
        if (_oButFullscreen && _oButFullscreen.setText) {
            _oButFullscreen.setText(s_bFullscreen ? "⤢" : "⤡");
        }
    };

    var bringStageLabelToFront = function() {
        if (_oStageLabel && _oContainer && _oContainer.contains(_oStageLabel)) {
            _oStageLabel.mouseEnabled = false;
            _oStageLabel.mouseChildren = false;
            _oContainer.setChildIndex(_oStageLabel, _oContainer.getNumChildren() - 1);
        }
    };
    
    var _pStartPosExit;
    var _pStartPosAudio;
    var _pStartPosFullscreen;

    this._init = function () {
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Load config first, which will draw background and UI elements
        this._loadConfigAndApplyBackground();
    };

    this._drawOrbitAnimation = function(x, y) {
        var orbitContainer = new createjs.Container();
        orbitContainer.x = x;
        orbitContainer.y = y;
        
        // Ring 1 (Pulse)
        var ring1 = new createjs.Shape();
        ring1.graphics.setStrokeStyle(2).beginStroke("rgba(124,58,237,0.5)").drawCircle(0, 0, 55);
        orbitContainer.addChild(ring1);
        
        createjs.Tween.get(ring1, {loop: true})
            .to({scaleX: 0.85, scaleY: 0.85, alpha: 0.7}, 0)
            .to({scaleX: 1.3, scaleY: 1.3, alpha: 0}, 1800 * 0.7, createjs.Ease.quadOut)
            .wait(1800 * 0.3);

        // Ring 2 (Pulse delayed)
        var ring2 = new createjs.Shape();
        ring2.graphics.setStrokeStyle(2).beginStroke("rgba(219,39,119,0.4)").drawCircle(0, 0, 55);
        orbitContainer.addChild(ring2);
        
        createjs.Tween.get(ring2, {loop: true})
            .wait(600)
            .to({scaleX: 0.85, scaleY: 0.85, alpha: 0.7}, 0)
            .to({scaleX: 1.3, scaleY: 1.3, alpha: 0}, 1800 * 0.7, createjs.Ease.quadOut)
            .wait(1800 * 0.3);

        // Center Logo (trophy or logo icon)
        var centerText = new createjs.Text("🏆", "40px Arial", "#ffffff");
        centerText.textAlign = "center";
        centerText.textBaseline = "middle";
        orbitContainer.addChild(centerText);

        // Dots orbiting
        var createDot = function(color, size, radius, duration, angleOffset) {
            var dotContainer = new createjs.Container();
            
            var dot = new createjs.Shape();
            dot.graphics.beginFill(color).drawCircle(0, 0, size/2);
            dot.x = radius; // Set initial radius
            dot.shadow = new createjs.Shadow(color, 0, 0, 10);
            
            dotContainer.addChild(dot);
            dotContainer.rotation = angleOffset;
            
            // Animate orbit
            createjs.Tween.get(dotContainer, {loop: true})
                .to({rotation: angleOffset + 360}, duration, createjs.Ease.linear);
                
            return dotContainer;
        };

        orbitContainer.addChild(createDot("#7c3aed", 10, 47, 3000, 0));
        orbitContainer.addChild(createDot("#db2777", 8, 55, 4000, 120));
        orbitContainer.addChild(createDot("#38bdf8", 6, 65, 5000, 240));

        _oContainer.addChildAt(orbitContainer, _oContainer.getChildIndex(_oBg) + 1);
        return orbitContainer;
    };

    this._drawParticles = function() {
        var particlesContainer = new createjs.Container();
        var emojis = ['✨','⭐','💡','🎯','🌟'];
        
        emojis.forEach(function(em, i) {
            var particle = new createjs.Text(em, "24px Arial", "#ffffff");
            particle.x = CANVAS_WIDTH_HALF + (Math.random() * 400 - 200);
            particle.y = CANVAS_HEIGHT_HALF + (Math.random() * 400 - 200);
            particle.alpha = 0.8;
            
            var moveY = particle.y - 100 - Math.random() * 50;
            var moveX = particle.x + (Math.random() * 100 - 50);
            var duration = 3000 + Math.random() * 2000;
            var delay = Math.random() * 2000;
            
            createjs.Tween.get(particle, {loop: true})
                .wait(delay)
                .to({y: moveY, x: moveX, alpha: 0}, duration, createjs.Ease.sineOut);
                
            particlesContainer.addChild(particle);
        });
        
        _oContainer.addChildAt(particlesContainer, _oContainer.getChildIndex(_oBg) + 1);
        return particlesContainer;
    };

    this._loadConfigAndApplyBackground = function() {
        var self = this;
        
        // Default config (fallback)
        var defaultConfig = {
            background: {
                type: 'image',
                url: './sprites/bg_menu.png',
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                alpha: 1
            },
            scatteredLights: { visible: false }
        };
        
        // Check for localStorage override first
        var overrideConfig = null;
        try {
            var stored = localStorage.getItem('ui-config-override');
            if (stored) {
                overrideConfig = JSON.parse(stored);
            }
        } catch (e) {}
        
        if (overrideConfig && overrideConfig.menuMode) {
            _oConfig = overrideConfig.menuMode;
            self._applyConfigAndDrawUI();
        } else {
            // Try to load config from JSON file
            fetch('./config/ui-config.json')
                .then(function(response) {
                    if (!response.ok) throw new Error('Config file not found');
                    return response.json();
                })
                .then(function(config) {
                    _oConfig = config.menuMode || defaultConfig;
                    self._applyConfigAndDrawUI();
                })
                .catch(function(error) {
                    console.log('MenuMode: Using default config:', error.message);
                    _oConfig = defaultConfig;
                    self._applyConfigAndDrawUI();
                });
        }
    };

    this.initLeds = function(){
        var oLed;
        var iLedWidth = 141;
        var iLedHeight = 165;
        var iStartY = CANVAS_HEIGHT_HALF - 10;
        var iOffsetX = 300;
        var iOffsetY = 250;

        var aX = [CANVAS_WIDTH_HALF - iOffsetX, CANVAS_WIDTH_HALF, CANVAS_WIDTH_HALF + iOffsetX, CANVAS_WIDTH_HALF - iOffsetX, CANVAS_WIDTH_HALF, CANVAS_WIDTH_HALF + iOffsetX];
        var aY = [iStartY, iStartY, iStartY, iStartY - iOffsetY, iStartY - iOffsetY, iStartY - iOffsetY];

        for (var i = 0; i < 6; i++) {
            var iRandomN = Math.floor((Math.random() * 4) + 1);
            var szAnimation = "led_" + iRandomN;
            var iX = aX[i];
            var iY = aY[i];

            var data = {
                images: [s_oSpriteLibrary.getSprite(szAnimation)],
                frames: {width: iLedWidth, height: iLedHeight},
                animations: {PIPE_END_ON  : [1,9,"LED_TURN_OFF"],
                             LED_TURN_OFF : {
                                 frames:    [9,8,7,6,5,4,3,2,1],
                                 next: "PIPE_END_ON"
                             }},
                framerate: Math.floor((Math.random() * 30) + 15)
            };

            var oSpriteSheet = new createjs.SpriteSheet(data);
            oLed = createSprite(oSpriteSheet, 'PIPE_END_ON', 0, 0, iLedWidth, iLedHeight);
            oLed.regX = iLedWidth/2 - 2;
            oLed.regY = iLedHeight/2 + 20;
            oLed.scaleX = oLed.scaleY = 0.7;
            oLed.x = iX;
            oLed.y = iY;
            _oContainer.addChild(oLed);
        };
    };

    this._applyConfigAndDrawUI = function() {
        var bgConfig = _oConfig.background;
        
        // 1. Draw Background
        if (bgConfig && bgConfig.type === 'video') {
            _oVideoElement = document.createElement('video');
            _oVideoElement.src = bgConfig.url;
            _oVideoElement.loop = bgConfig.loop !== false;
            _oVideoElement.muted = bgConfig.muted !== false;
            _oVideoElement.autoplay = bgConfig.autoplay !== false;
            _oVideoElement.playsInline = true;
            _oVideoElement.style.display = 'none';
            document.body.appendChild(_oVideoElement);

            _oVideoBitmap = new createjs.Bitmap(_oVideoElement);
            _oVideoBitmap.x = bgConfig.position ? bgConfig.position.x : 0;
            _oVideoBitmap.y = bgConfig.position ? bgConfig.position.y : 0;
            _oVideoBitmap.regX = 0;
            _oVideoBitmap.regY = 0;
            _oVideoBitmap.scaleX = bgConfig.scale ? bgConfig.scale.x : 1;
            _oVideoBitmap.scaleY = bgConfig.scale ? bgConfig.scale.y : 1;
            _oVideoBitmap.alpha = bgConfig.alpha || 1;
            
            _oContainer.addChildAt(_oVideoBitmap, 0);
            _oBg = _oVideoBitmap;
            _oVideoElement.play();
        } else if (bgConfig && bgConfig.type === 'image') {
            var oImg = new Image();
            oImg.onload = function() {
                var oBitmap = new createjs.Bitmap(oImg);
                oBitmap.x = bgConfig.position ? bgConfig.position.x : 0;
                oBitmap.y = bgConfig.position ? bgConfig.position.y : 0;
                oBitmap.scaleX = bgConfig.scale ? bgConfig.scale.x : 1;
                oBitmap.scaleY = bgConfig.scale ? bgConfig.scale.y : 1;
                oBitmap.alpha = bgConfig.alpha || 1;
                _oContainer.addChildAt(oBitmap, 0);
                _oBg = oBitmap;
            };
            oImg.src = bgConfig.url;
        } else {
            // Fallback default
            _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
            _oContainer.addChildAt(_oBg, 0);
        }

        if (!_oStageLabel) {
            _oStageLabel = new createjs.Text("Play Levels Screen", "26px " + PRIMARY_FONT, "#f9fafb");
            _oStageLabel.textAlign = "left";
            _oStageLabel.textBaseline = "top";
            _oStageLabel.x = 30;
            _oStageLabel.y = 30;
            _oContainer.addChild(_oStageLabel);
        }
        bringStageLabelToFront();

        // 2. Add Scattered Lights and Orbits
        if (_oConfig.scatteredLights && _oConfig.scatteredLights.visible) {
            this.initLeds();
            this._drawOrbitAnimation(CANVAS_WIDTH_HALF, CANVAS_HEIGHT_HALF - 200);
            this._drawParticles();
        }

        // 3. Draw UI Elements
        this._drawUIElements();
        bringStageLabelToFront();
    };

    this._drawUIElements = function() {
        var iWidth = 600;
        var iHeight = 60;
        _oTextTitle = new CTLText(_oContainer, 
                    CANVAS_WIDTH/2-iWidth/2, -200 + CANVAS_HEIGHT/2 - iHeight/2, iWidth, iHeight, 
                    48, "center", PRIMARY_FONT_COLOUR, PRIMARY_FONT, 1,
                    2, 2,
                    TEXT_SELECT,
                    true, true, true,
                    false );
        
        var iButtonXPos = CANVAS_WIDTH_HALF;
        var iButtonYPosEasy = CANVAS_HEIGHT_HALF - 80;
        var iButtonYPosMedium = CANVAS_HEIGHT_HALF + 50;
        var iButtonYPosHard = CANVAS_HEIGHT_HALF + 180;
        var iButtonYPosExtreme = CANVAS_HEIGHT_HALF + 310;
        var iFontSize = 36;

        var self = this;
        var createDifficultyButton = function(text, yPos, mode) {
            var button = createPillButton({ text: text, width: 360, height: 96, fontSize: iFontSize, radius: 40 });
            button.x = iButtonXPos;
            button.y = yPos;
            button.on("click", function () {
                self._onButPlayRelease(mode);
            });
            _oContainer.addChild(button);
            return button;
        };

        _oButPlayEasy = createDifficultyButton(TEXT_EASY, iButtonYPosEasy, MODE_EASY);
        _oButPlayMedium = createDifficultyButton(TEXT_MEDIUM, iButtonYPosMedium, MODE_MEDIUM);
        _oButPlayHard = createDifficultyButton(TEXT_HARD, iButtonYPosHard, MODE_HARD);
        _oButPlayExtreme = createDifficultyButton(TEXT_EXTREME, iButtonYPosExtreme, MODE_EXTREME);

        var topButtonPalette = {
            default: ["#1e293b", "#0f172a"],
            hover: ["#334155", "#1e293b"],
            active: ["#0f172a", "#020617"]
        };
        var topButtonSize = { width: 84, height: 84 };

	_pStartPosExit = {x: CANVAS_WIDTH - topButtonSize.width / 2 - 20, y: topButtonSize.height / 2 + 20};
        _oButExit = createPillButton({
            text: "✕",
            width: topButtonSize.width,
            height: topButtonSize.height,
            radius: 24,
            fontSize: 34,
            palettes: topButtonPalette
        });
        _oButExit.x = _pStartPosExit.x;
        _oButExit.y = _pStartPosExit.y;
        _oButExit.on("click", function () {
            self._onExit();
        });
        _oContainer.addChild(_oButExit);

        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            _pStartPosAudio = {x: _pStartPosExit.x - topButtonSize.width - 16, y: _pStartPosExit.y};
            _oAudioToggle = createPillButton({
                text: s_bAudioActive ? "🔊" : "🔇",
                width: topButtonSize.width,
                height: topButtonSize.height,
                radius: 24,
                fontSize: 32,
                palettes: topButtonPalette
            });
            _oAudioToggle.x = _pStartPosAudio.x;
            _oAudioToggle.y = _pStartPosAudio.y;
            _oAudioToggle.on("click", function () {
                self._onAudioToggle();
            });
            _oContainer.addChild(_oAudioToggle);
            _pStartPosFullscreen = {x: topButtonSize.width / 2 + 20, y: topButtonSize.height / 2 + 20};
        }else{
            _pStartPosFullscreen = {x: _pStartPosExit.x - topButtonSize.width - 10, y: _pStartPosExit.y};
        }

        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || doc.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }

        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen = createPillButton({
                text: s_bFullscreen ? "⤢" : "⤡",
                width: topButtonSize.width,
                height: topButtonSize.height,
                radius: 24,
                fontSize: 32,
                palettes: topButtonPalette
            });
            _oButFullscreen.x = _pStartPosFullscreen.x;
            _oButFullscreen.y = _pStartPosFullscreen.y;
            _oButFullscreen.on("click", function () {
                self._onFullscreenRelease();
            });
            _oContainer.addChild(_oButFullscreen);
        }
        
        updateAudioToggleVisual();
        updateFullscreenVisual();
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        s_oStage.addChild(_oFade);

        createjs.Tween.get(_oFade).to({alpha: 0}, 1000).call(function () {
            s_oStage.removeChild(_oFade);
        });
    };

    this.unload = function () {
        if (_oVideoElement) {
            _oVideoElement.pause();
            _oVideoElement.removeAttribute('src');
            _oVideoElement.load();
            if (_oVideoElement.parentNode) {
                _oVideoElement.parentNode.removeChild(_oVideoElement);
            }
            _oVideoElement = null;
        }

        var disposeButton = function(button) {
            if (!button) {
                return;
            }
            button.removeAllEventListeners();
            if (_oContainer && _oContainer.contains(button)) {
                _oContainer.removeChild(button);
            }
        };

        disposeButton(_oButPlayEasy);
        disposeButton(_oButPlayMedium);
        disposeButton(_oButPlayHard);
        disposeButton(_oButPlayExtreme);
        _oButPlayEasy = null;
        _oButPlayMedium = null;
        _oButPlayHard = null;
        _oButPlayExtreme = null;

        _oContainer.removeChild(_oBg);
        _oBg = null;

        disposeButton(_oButExit);
        _oButExit = null;

        s_oStage.removeChild(_oContainer);

        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            disposeButton(_oAudioToggle);
            _oAudioToggle = null;
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            disposeButton(_oButFullscreen);
            _oButFullscreen = null;
        }
        s_oMenuMode = null;
    };

    this.refreshButtonPos = function (iNewX, iNewY) {
        if ((DISABLE_SOUND_MOBILE === false || s_bMobile === false) && _oAudioToggle) {
            _oAudioToggle.x = _pStartPosAudio.x - iNewX;
            _oAudioToggle.y = _pStartPosAudio.y + iNewY;
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled && _oButFullscreen){
            _oButFullscreen.x = _pStartPosFullscreen.x - iNewX;
            _oButFullscreen.y = _pStartPosFullscreen.y + iNewY;
        }
        
        if (_oButExit) {
            _oButExit.x = _pStartPosExit.x - iNewX;
            _oButExit.y = _pStartPosExit.y + iNewY;
        }
    };
    
    this._onAudioToggle = function () {
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
        updateAudioToggleVisual();
    };
    
    this._onButPlayRelease = function (iMode) {
        this.unload();
        s_oMain.gotoLevelSelect(iMode);
    };
    
    this._onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
    };
    
    this._onFullscreenRelease = function(){
	if(_fRequestFullScreen &&  screenfull.isEnabled){
            _fCancelFullScreen.call(window.document);
	}else{
            _fRequestFullScreen.call(window.document.documentElement);
	}

	sizeHandler();
        updateFullscreenVisual();
    };
    
    this.resetFullscreenBut = function(){
	if (_oButFullscreen){
            _oButFullscreen.setActive(s_bFullscreen);
	};
    };
    
    s_oMenuMode = this;

    this._init();
}

var s_oMenuMode = null;