function CMenu() {
    var _oMenuContainer;
    var _oBg;
    var _oGameLogo;
    var _oButPlay;
    var _oPlayText;
    var _oFade;
    var _oAudioToggle;
    var _oButCredits;
    var _oCreditsPanel = null;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    var _pStartPosAudio;
    var _pStartPosCredits;
    var _pStartPosFullscreen;
    var _oConfig;
    var _oVideoElement;
    var _oVideoBitmap;
    var _oOrbitContainer;
    var _oParticlesContainer;
    var _oStageLabel;

    var bringStageLabelToFront = function() {
        if (_oStageLabel && _oMenuContainer && _oMenuContainer.contains(_oStageLabel)) {
            _oStageLabel.mouseEnabled = false;
            _oStageLabel.mouseChildren = false;
            _oMenuContainer.setChildIndex(_oStageLabel, _oMenuContainer.getNumChildren() - 1);
        }
    };

    var parsePositionValue = function(val, defaultVal, isWidthAxis) {
        if (typeof val === 'string') {
            var baseValue = 0;
            var baseString = '';
            if (val.indexOf(isWidthAxis ? 'CANVAS_WIDTH_HALF' : 'CANVAS_HEIGHT_HALF') !== -1) {
                baseValue = isWidthAxis ? CANVAS_WIDTH_HALF : CANVAS_HEIGHT_HALF;
                baseString = isWidthAxis ? 'CANVAS_WIDTH_HALF' : 'CANVAS_HEIGHT_HALF';
            } else if (val.indexOf(isWidthAxis ? 'CANVAS_WIDTH' : 'CANVAS_HEIGHT') !== -1) {
                baseValue = isWidthAxis ? CANVAS_WIDTH : CANVAS_HEIGHT;
                baseString = isWidthAxis ? 'CANVAS_WIDTH' : 'CANVAS_HEIGHT';
            } else {
                return parseInt(val) || defaultVal;
            }

            var remaining = val.replace(baseString, '').trim();
            if (remaining === '') {
                return baseValue;
            }

            if (remaining.startsWith('-')) {
                var subtractOffset = parseInt(remaining.replace('-', '').trim()) || 0;
                return baseValue - subtractOffset;
            } else if (remaining.startsWith('+')) {
                var addOffset = parseInt(remaining.replace('+', '').trim()) || 0;
                return baseValue + addOffset;
            }

            return baseValue;
        } else if (typeof val === 'number') {
            return val;
        }

        return defaultVal;
    };
    
    this._init = function () {
        //localStorage.clear();            // TO DELETE EVERYTHING SAVED IN LOCALSTORAGE
        _oMenuContainer = new createjs.Container();
        s_oStage.addChild(_oMenuContainer);
        
        // Fallback background (will be replaced by config if loaded)
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_menu'));
        _oMenuContainer.addChild(_oBg);

        this.initLeds();

        _oStageLabel = new createjs.Text("Lobby Screen", "28px " + PRIMARY_FONT, "#f9fafb");
        _oStageLabel.textAlign = "left";
        _oStageLabel.textBaseline = "top";
        _oStageLabel.x = 30;
        _oStageLabel.y = 30;
        _oMenuContainer.addChild(_oStageLabel);

        var oGameLogo = s_oSpriteLibrary.getSprite('logo_menu');
        _oGameLogo = createBitmap(oGameLogo);
        _oGameLogo.regX = oGameLogo.width/2;
        _oGameLogo.regY = oGameLogo.height/2;
        _oGameLogo.x = CANVAS_WIDTH_HALF;
        _oGameLogo.y = -150;
        _oMenuContainer.addChild(_oGameLogo);

        var oSpritePlay = s_oSpriteLibrary.getSprite('but_play');
        _oButPlay = new CGfxButton((CANVAS_WIDTH_HALF), CANVAS_HEIGHT + 150, oSpritePlay, _oMenuContainer);
        _oButPlay.addEventListener(ON_MOUSE_UP, this._onButPlayRelease, this);

        // Load and apply background and animations from config
        // This will apply the initial positions and start the tweens
        this._loadConfigAndApplyBackground();

        var oSprite = s_oSpriteLibrary.getSprite('but_credits');
        _pStartPosCredits = {x:20 + oSprite.width/2,y:(oSprite.height / 2) + 10};
        _oButCredits = new CGfxButton(_pStartPosCredits.x, _pStartPosCredits.y, oSprite, _oMenuContainer);
        _oButCredits.addEventListener(ON_MOUSE_UP, this._onCredits, this);

        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            var oSprite = s_oSpriteLibrary.getSprite('audio_icon');
            _pStartPosAudio = {x: CANVAS_WIDTH - oSprite.width/4 -20, y: (oSprite.height / 2) + 10};
            _oAudioToggle = new CToggle(_pStartPosAudio.x, _pStartPosAudio.y, oSprite, s_bAudioActive,_oMenuContainer);
            _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
        }
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
            _pStartPosFullscreen = {x:_pStartPosCredits.x + oSprite.width/2 + 10,y:_pStartPosCredits.y};

            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,_oMenuContainer);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oMenuContainer.addChild(_oFade);

        createjs.Tween.get(_oFade).to({alpha: 0}, 1000).call(function () {
            _oMenuContainer.removeChild(_oFade);
        });
        
        if(!s_bStorageAvailable){
            new CMsgBox(TEXT_ERR_LS,_oMenuContainer);
        }else{
            var iTotalScore = getItem("lights_total_score");
            if (iTotalScore !== null && iTotalScore !== undefined) {
                s_iTotalScore = parseInt(iTotalScore);
            } else {
                s_iTotalScore = 0;
            };
            
            var aBestScore = getItemJson("lights_best_score");
            if (aBestScore !== null && aBestScore !== undefined) {
                s_aBestScore = aBestScore;
            } else {
                s_aBestScore = [0,0,0,0];
            };
            
            var aLastLevel = getItemJson("lights_last_level");
            if (aLastLevel !== null && s_aLastLevel !== undefined) {
                s_aLastLevel = aLastLevel;
            } else {
                s_aLastLevel = [1,1,1,1];
            };
            
            if (s_aLevelStars === undefined || s_aLevelStars === null) {
                s_aLevelStars = new Array;
                
                for (var i = 0; i < 4; i++) {
                    for (var j = 0; j < MATRIX_SETTINGS[i].length; j++) {
                        s_aLevelStars[i].push(0);
                    };
                };                
            };
            
            var aLevelStars = getItemJson("lights_level_stars");
            if (aLevelStars !== null && s_aLevelStars !== undefined) {
                s_aLevelStars = aLevelStars;
            };
        }
        
        this.refreshButtonPos(s_iOffsetX, s_iOffsetY);
        bringStageLabelToFront();
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
            _oMenuContainer.addChild(oLed);
        };
    };

    this.unload = function () {
        _oButPlay.unload();
        _oButPlay = null;

        _oButCredits.unload();
        
        _oMenuContainer.removeChild(_oBg);

        if (_oOrbitContainer) {
            _oMenuContainer.removeChild(_oOrbitContainer);
            _oOrbitContainer = null;
        }
        if (_oParticlesContainer) {
            _oMenuContainer.removeChild(_oParticlesContainer);
            _oParticlesContainer = null;
        }

        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oAudioToggle.unload();
            _oAudioToggle = null;
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.unload();
        }
        s_oMenu = null;
    };

    this.refreshButtonPos = function (iNewX, iNewY) {
        if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
            _oAudioToggle.setPosition(_pStartPosAudio.x - iNewX, _pStartPosAudio.y + iNewY);
        }
        if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x + iNewX,_pStartPosFullscreen.y + iNewY);
        }

        _oButCredits.setPosition(_pStartPosCredits.x + iNewX,_pStartPosCredits.y + iNewY);
    };
    
    this.resetFullscreenBut = function(){
	if (_fRequestFullScreen &&  screenfull.isEnabled){
            _oButFullscreen.setActive(s_bFullscreen);
	};
    };
    
    this.exitFromCredits = function(){
        _oCreditsPanel = null;
    };

    this._onAudioToggle = function () {
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
    };
    
    this._onCredits = function(){
        _oCreditsPanel = new CCreditsPanel();
    };

    this._onButPlayRelease = function () {
        this.unload();
        s_oMain.gotoMenuMode();
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
            }
        };
        
        // Check for localStorage override first (from config editor)
        var overrideConfig = null;
        try {
            var stored = localStorage.getItem('ui-config-override');
            if (stored) {
                overrideConfig = JSON.parse(stored);
                console.log('Menu: Using config from editor override');
            }
        } catch (e) {
            console.log('Menu: No valid config override found');
        }
        
        if (overrideConfig && overrideConfig.menu) {
            _oConfig = overrideConfig.menu;
            self._applyAllConfigs();
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
                    _oConfig = config.menu || defaultConfig;
                    self._applyAllConfigs();
                })
                .catch(function(error) {
                    console.log('Menu: Using default config:', error.message);
                    _oConfig = defaultConfig;
                    self._applyAllConfigs();
                });
        }
    };

    this._applyAllConfigs = function() {
        this._applyBackgroundFromConfig();
        this._applyOrbitEffects();
        this._applyLogoConfig();
        this._applyPlayBtnConfig();
        bringStageLabelToFront();
    };

    this._applyBackgroundFromConfig = function() {
        var bgConfig = _oConfig.background;
        
        // 1. Handle Background
        if (bgConfig && bgConfig.type === 'video') {
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
            
            // Remove default background and add video
            if (_oBg) {
                _oMenuContainer.removeChild(_oBg);
            }
            _oMenuContainer.addChildAt(_oVideoBitmap, 0);
            
            // Play video
            _oVideoElement.play();
        } else if (bgConfig.type === 'image') {
            // Load custom image background
            var oImg = new Image();
            oImg.onload = function() {
                var oBitmap = new createjs.Bitmap(oImg);
                oBitmap.x = bgConfig.position.x;
                oBitmap.y = bgConfig.position.y;
                oBitmap.scaleX = bgConfig.scale.x;
                oBitmap.scaleY = bgConfig.scale.y;
                oBitmap.alpha = bgConfig.alpha || 1;
                
                // Remove default background and add custom
                if (_oBg) {
                    _oMenuContainer.removeChild(_oBg);
                }
                _oMenuContainer.addChildAt(oBitmap, 0);
                _oBg = oBitmap;
            };
            oImg.src = bgConfig.url;
        }
        // If type is 'none', remove background
        else if (bgConfig && bgConfig.type === 'none' && _oBg) {
            _oMenuContainer.removeChild(_oBg);
        }
        
        // 2. Handle scattered lights
        if (_oConfig.scatteredLights && _oConfig.scatteredLights.visible === false) {
            // We need to hide the LEDs initialized by this.initLeds()
            // Since initLeds adds them to _oMenuContainer without saving references to an array,
            // we'll filter children by checking if they are instances of createjs.Sprite
            // and their current animation names start with 'led_' or they use led spritesheets
            for (var i = _oMenuContainer.getNumChildren() - 1; i >= 0; i--) {
                var child = _oMenuContainer.getChildAt(i);
                if (child instanceof createjs.Sprite && 
                    child.spriteSheet && 
                    child.spriteSheet._images && 
                    child.spriteSheet._images.length > 0 && 
                    child.spriteSheet._images[0].src && 
                    child.spriteSheet._images[0].src.indexOf('led_') !== -1) {
                    child.visible = false;
                }
            }
        }
    };

    this._applyOrbitEffects = function() {
        if (_oOrbitContainer) {
            _oMenuContainer.removeChild(_oOrbitContainer);
            _oOrbitContainer = null;
        }
        if (_oParticlesContainer) {
            _oMenuContainer.removeChild(_oParticlesContainer);
            _oParticlesContainer = null;
        }

        if (!_oConfig) {
            return;
        }

        if (_oConfig.orbitEffect && _oConfig.orbitEffect.visible !== false) {
            var orbitPos = _oConfig.orbitEffect.position || {};
            var orbitX = parsePositionValue(orbitPos.x !== undefined ? orbitPos.x : CANVAS_WIDTH_HALF, CANVAS_WIDTH_HALF, true);
            var orbitY = parsePositionValue(orbitPos.y !== undefined ? orbitPos.y : CANVAS_HEIGHT_HALF - 200, CANVAS_HEIGHT_HALF - 200, false);
            _oOrbitContainer = this._createOrbitAnimation(orbitX, orbitY);
        }

        if (_oConfig.floatingParticles && _oConfig.floatingParticles.visible !== false) {
            _oParticlesContainer = this._createFloatingParticles();
        }
    };

    this._createOrbitAnimation = function(x, y) {
        var orbitContainer = new createjs.Container();
        orbitContainer.x = x;
        orbitContainer.y = y;

        var ring1 = new createjs.Shape();
        ring1.graphics.setStrokeStyle(2).beginStroke("rgba(124,58,237,0.5)").drawCircle(0, 0, 55);
        orbitContainer.addChild(ring1);
        createjs.Tween.get(ring1, {loop: true})
            .to({scaleX: 0.85, scaleY: 0.85, alpha: 0.7}, 0)
            .to({scaleX: 1.3, scaleY: 1.3, alpha: 0}, 1260, createjs.Ease.quadOut)
            .wait(540);

        var ring2 = new createjs.Shape();
        ring2.graphics.setStrokeStyle(2).beginStroke("rgba(219,39,119,0.4)").drawCircle(0, 0, 55);
        orbitContainer.addChild(ring2);
        createjs.Tween.get(ring2, {loop: true})
            .wait(600)
            .to({scaleX: 0.85, scaleY: 0.85, alpha: 0.7}, 0)
            .to({scaleX: 1.3, scaleY: 1.3, alpha: 0}, 1260, createjs.Ease.quadOut)
            .wait(540);

        var centerText = new createjs.Text("🏆", "40px Arial", "#ffffff");
        centerText.textAlign = "center";
        centerText.textBaseline = "middle";
        orbitContainer.addChild(centerText);

        var createDot = function(color, size, radius, duration, angleOffset) {
            var dotContainer = new createjs.Container();
            var dot = new createjs.Shape();
            dot.graphics.beginFill(color).drawCircle(0, 0, size/2);
            dot.x = radius;
            dot.shadow = new createjs.Shadow(color, 0, 0, 10);
            dotContainer.addChild(dot);
            dotContainer.rotation = angleOffset;
            createjs.Tween.get(dotContainer, {loop: true}).to({rotation: angleOffset + 360}, duration, createjs.Ease.linear);
            return dotContainer;
        };

        orbitContainer.addChild(createDot("#7c3aed", 10, 47, 3000, 0));
        orbitContainer.addChild(createDot("#db2777", 8, 55, 4000, 120));
        orbitContainer.addChild(createDot("#38bdf8", 6, 65, 5000, 240));

        var insertIndex = 0;
        if (_oBg && _oMenuContainer.contains(_oBg)) {
            insertIndex = _oMenuContainer.getChildIndex(_oBg) + 1;
        }
        _oMenuContainer.addChildAt(orbitContainer, insertIndex);
        return orbitContainer;
    };

    this._createFloatingParticles = function() {
        var particlesContainer = new createjs.Container();
        var emojis = ['✨','⭐','💡','🎯','🌟'];
        emojis.forEach(function(em) {
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

        var insertIndex = 0;
        if (_oBg && _oMenuContainer.contains(_oBg)) {
            insertIndex = _oMenuContainer.getChildIndex(_oBg) + 1;
        }
        _oMenuContainer.addChildAt(particlesContainer, insertIndex + 1);
        return particlesContainer;
    };

    this._applyLogoConfig = function() {
        if (!_oConfig || !_oConfig.logo || !_oGameLogo) {
            return;
        }

        var logoConfig = _oConfig.logo;

        if (logoConfig.visible === false) {
            _oGameLogo.visible = false;
            return;
        }

        if (logoConfig.position) {
            _oGameLogo.x = parsePositionValue(logoConfig.position.x, _oGameLogo.x, true);
            _oGameLogo.y = parsePositionValue(logoConfig.position.y, _oGameLogo.y, false);
        }

        if (logoConfig.scale) {
            _oGameLogo.scaleX = logoConfig.scale.x !== undefined ? logoConfig.scale.x : 1;
            _oGameLogo.scaleY = logoConfig.scale.y !== undefined ? logoConfig.scale.y : 1;
        }

        if (logoConfig.target) {
            var targetY = parsePositionValue(logoConfig.target.y, CANVAS_HEIGHT_HALF - 150, false);
            createjs.Tween.removeTweens(_oGameLogo);
            createjs.Tween.get(_oGameLogo, {loop: false}).to({y: targetY}, 1000, createjs.Ease.cubicOut);
        }
    };

    this._applyPlayBtnConfig = function() {
        if (!_oConfig || !_oConfig.playButton || !_oButPlay) {
            return;
        }

        var playBtnConfig = _oConfig.playButton;
        var oSprite = _oButPlay.getSprite();

        if (playBtnConfig.visible === false) {
            oSprite.visible = false;
            return;
        }

        if (playBtnConfig.position) {
            var startX = parsePositionValue(playBtnConfig.position.x, oSprite.x, true);
            var startY = parsePositionValue(playBtnConfig.position.y, oSprite.y, false);
            _oButPlay.setPosition(startX, startY);
        }

        if (playBtnConfig.scale) {
            oSprite.scaleX = playBtnConfig.scale.x !== undefined ? playBtnConfig.scale.x : 1;
            oSprite.scaleY = playBtnConfig.scale.y !== undefined ? playBtnConfig.scale.y : 1;
        }

        if (playBtnConfig.target) {
            var targetY = parsePositionValue(playBtnConfig.target.y, CANVAS_HEIGHT_HALF + 250, false);
            createjs.Tween.removeTweens(oSprite);
            createjs.Tween.get(oSprite, {loop: false}).to({y: targetY}, 1000, createjs.Ease.cubicOut);
        }
    };

    this._onFullscreenRelease = function(){
	if(s_bFullscreen) { 
        _fCancelFullScreen.call(window.document);
	}else{
        _fRequestFullScreen.call(window.document.documentElement);
	}
	
	sizeHandler();
    };
    
    this.update = function () {

    };
    
    s_oMenu = this;

    this._init();
}

var s_oMenu = null;