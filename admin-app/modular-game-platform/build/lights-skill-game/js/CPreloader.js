function CPreloader() {
    var _iMaskWidth;
    var _iMaskHeight;
    var _oLoadingText;
    var _oProgressBar;
    var _oMaskPreloader;
    var _oFade;
    var _oIcon;
    var _oIconMask;
    var _oContainer;
    var _oStageLabel;

    var _oBackgroundConfig = null;

    var _loadConfig = function(callback) {
        fetch('./config/ui-config.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Config file missing');
                }
                return response.json();
            })
            .then(function(config) {
                _oBackgroundConfig = (config && config.preloader && config.preloader.background) || null;
                callback();
            })
            .catch(function() {
                _oBackgroundConfig = null;
                callback();
            });
    };

    var _drawBackground = function() {
        if (!_oBackgroundConfig) {
            var defaultBg = new createjs.Shape();
            defaultBg.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            _oContainer.addChild(defaultBg);
            return;
        }

        if (_oBackgroundConfig.type === 'image') {
            var img = new Image();
            img.onload = function() {
                var bmp = new createjs.Bitmap(img);
                bmp.x = _oBackgroundConfig.position ? _oBackgroundConfig.position.x || 0 : 0;
                bmp.y = _oBackgroundConfig.position ? _oBackgroundConfig.position.y || 0 : 0;
                bmp.scaleX = _oBackgroundConfig.scale ? _oBackgroundConfig.scale.x || 1 : 1;
                bmp.scaleY = _oBackgroundConfig.scale ? _oBackgroundConfig.scale.y || 1 : 1;
                bmp.alpha = _oBackgroundConfig.alpha == null ? 1 : _oBackgroundConfig.alpha;
                _oContainer.addChild(bmp);
            };
            img.src = _oBackgroundConfig.url;
            return;
        }

        if (_oBackgroundConfig.type === 'video') {
            var videoEl = document.createElement('video');
            videoEl.src = _oBackgroundConfig.url;
            videoEl.loop = _oBackgroundConfig.loop !== false;
            videoEl.muted = _oBackgroundConfig.muted !== false;
            videoEl.autoplay = _oBackgroundConfig.autoplay !== false;
            videoEl.playsInline = true;
            videoEl.style.display = 'none';
            document.body.appendChild(videoEl);
            var videoBitmap = new createjs.Bitmap(videoEl);
            videoBitmap.x = _oBackgroundConfig.position ? _oBackgroundConfig.position.x || 0 : 0;
            videoBitmap.y = _oBackgroundConfig.position ? _oBackgroundConfig.position.y || 0 : 0;
            videoBitmap.scaleX = _oBackgroundConfig.scale ? _oBackgroundConfig.scale.x || 1 : 1;
            videoBitmap.scaleY = _oBackgroundConfig.scale ? _oBackgroundConfig.scale.y || 1 : 1;
            videoBitmap.alpha = _oBackgroundConfig.alpha == null ? 1 : _oBackgroundConfig.alpha;
            _oContainer.addChild(videoBitmap);
            videoEl.play();
            return;
        }

        var fallbackBg = new createjs.Shape();
        fallbackBg.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(fallbackBg);
    };

    this._init = function () {
        var initSprites = function() {
            s_oSpriteLibrary.init(self._onImagesLoaded, self._onAllImagesLoaded, self);
            s_oSpriteLibrary.addSprite("progress_bar", "./sprites/progress_bar.png");
            s_oSpriteLibrary.addSprite("200x200", "./sprites/200x200.jpg");

            s_oSpriteLibrary.loadSprites();
        };

        var self = this;

        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);

        _loadConfig(function(){
            _drawBackground();
            initSprites();
        });
    };

    this.unload = function () {

        _oContainer.removeAllChildren();
    };

    this._onImagesLoaded = function () {

    };

    this._onAllImagesLoaded = function () {
        this.attachSprites();

        s_oMain.preloaderReady();
    };

    this.attachSprites = function () {
        var oBg = new createjs.Shape();
        // oBg.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // _oContainer.addChild(oBg);

        var oSprite = s_oSpriteLibrary.getSprite('200x200');
        _oIcon = createBitmap(oSprite);
        _oIcon.regX = oSprite.width * 0.5;
        _oIcon.regY = oSprite.height * 0.5;
        _oIcon.x = CANVAS_WIDTH_HALF;
        _oIcon.y = CANVAS_HEIGHT_HALF - 180;
        _oContainer.addChild(_oIcon);

        _oIconMask = new createjs.Shape();
        _oIconMask.graphics.beginFill("rgba(0,0,0,0.01)").drawRoundRect(_oIcon.x - 95, _oIcon.y - 95, 190, 190, 10);
        _oContainer.addChild(_oIconMask);
        
        _oIcon.mask = _oIconMask;

        _oStageLabel = new createjs.Text("Loading Screen", "26px " + PRIMARY_FONT, "#facc15");
        _oStageLabel.textAlign = "left";
        _oStageLabel.textBaseline = "top";
        _oStageLabel.x = 30;
        _oStageLabel.y = 30;
        _oContainer.addChild(_oStageLabel);

        var oSprite = s_oSpriteLibrary.getSprite('progress_bar');
        _oProgressBar = createBitmap(oSprite);
        _oProgressBar.x = CANVAS_WIDTH_HALF - (oSprite.width / 2);
        _oProgressBar.y = CANVAS_HEIGHT_HALF + 50;
        _oContainer.addChild(_oProgressBar);

        _iMaskWidth = oSprite.width;
        _iMaskHeight = oSprite.height;
        _oMaskPreloader = new createjs.Shape();
        _oMaskPreloader.graphics.beginFill("rgba(0,0,0,0.01)").drawRect(_oProgressBar.x, _oProgressBar.y, 1, _iMaskHeight);

        _oContainer.addChild(_oMaskPreloader);

        _oProgressBar.mask = _oMaskPreloader;

        _oLoadingText = new createjs.Text("", "30px " + PRIMARY_FONT, PRIMARY_FONT_COLOUR);
        _oLoadingText.x = CANVAS_WIDTH_HALF;
        _oLoadingText.y = CANVAS_HEIGHT_HALF + 100;
        _oLoadingText.textBaseline = "alphabetic";
        _oLoadingText.textAlign = "center";
        _oContainer.addChild(_oLoadingText);
        
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(_oFade);
        
        createjs.Tween.get(_oFade).to({alpha: 0}, 500).call(function () {            
            createjs.Tween.removeTweens(_oFade);
            _oContainer.removeChild(_oFade);
        });        
    };

    this.refreshLoader = function (iPerc) {
        _oLoadingText.text = iPerc + "%";
        
        if (iPerc === 100) {
            s_oMain._onRemovePreloader();
            _oLoadingText.visible = false;
            _oProgressBar.visible = false;
            
            s_oMain._onRemovePreloader();
        };     

        _oMaskPreloader.graphics.clear();
        var iNewMaskWidth = Math.floor((iPerc * _iMaskWidth) / 100);
        _oMaskPreloader.graphics.beginFill("rgba(0,0,0,0.01)").drawRect(_oProgressBar.x, _oProgressBar.y, iNewMaskWidth, _iMaskHeight);
    };

    this._init();
}