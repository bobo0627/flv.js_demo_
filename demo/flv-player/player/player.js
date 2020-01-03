const INIT = 'init', 
    START = 'start', 
    PAUSE = 'pause', 
    DESTORY = 'destory', 
    DISCONNECT = 'disconnect',
    CURRENTTIME = 'currentTime',
    SHOTIMAGE = 'shotImage',
    BSERURL = 'http://33.95.241.120:8008';

function Player(config) {
    this.stream = config.stream;
    this.appid = config.appid;
    this.deviceid = config.deviceid;
}
Player.prototype = {
    constructor: Player,
    init: function() {
        var player = document.getElementById('player');
        if (flvjs.isSupported()) {
            if (this.pInstance) {
                this.destory();
            }
            this.pInstance = flvjs.createPlayer({
                type: 'flv',
                url: this.stream,
                hasVideo: true,
                hasAudio: false,
                isLive: true,
                cors: true
            },{
                enableWorker: true,
                enableStashBuffer: false,
                stashInitialSize: 120,
                autoCleanupSourceBuffer: true,
                autoCleanupMaxBackwardDuration: 5,
                autoCleanupMinBackwardDuration: 3,
                lazyLoadMaxDuration: 3 * 60,
                seekType: 'range'
            });
            this.pInstance.attachMediaElement(player);
            this.load();
            this.start();
        }
    },
    load: function() {
        this.pInstance.load();
    },
    start: function() {
        this.pInstance.play();
    },
    pause: function() {
        this.pInstance.pause();
    },
    reconnect: function() {
        var _this = this;
        var times = 0;
        var interval = setInterval(function(){
            console.log(++times+'times reconnect...');
            var xhr = new XMLHttpRequest();
            var data = JSON.stringify({
                appId: _this.appid,
                deviceId: _this.deviceid,
                type: "flv"
            });
            xhr.open('POST', BSERURL+'/v1/gb/stream/start', true);
            xhr.setRequestHeader('Content-Type','application/json;charset=utf-8');
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    clearInterval(interval);
                    var response = JSON.parse(xhr.response);
                    _this.stream = response.data[0].playUrl;
                    _this.init();
                }
                if(times>100 && interval){
                    clearInterval(interval);
                }
            };
            xhr.send(data);
        }, 2000);
    },
    destory: function() {
        this.pInstance.pause();
        this.pInstance.unload();
        this.pInstance.detachMediaElement();
        this.pInstance.destroy();
        this.pInstance = null;
    },
    getCurrentTime() {
        window.parent.postMessage({
            action: 'currentTime',
            result: {
                time: document.getElementById('player').currentTime
            }
        }, '*');
    },
    screenshot: function() {
        const canvas = document.createElement("canvas");
        const video = document.getElementById('player');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const canvasCtx = canvas.getContext("2d");
        canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const shotUrl = canvas.toDataURL("image/png");
        window.parent.postMessage({
            action: 'shotImage',
            result: {
                imageBase64: shotUrl
            }
        }, '*');
        // var aLink = document.createElement('a');
        // var blob = Util.base64ToBlob(shotUrl); 
        // aLink.download = '截图.png';
        // aLink.href = URL.createObjectURL(blob);
        // aLink.click();
    }
}

var Util = {
    checkStream: function(stream) {
        var index = stream.lastIndexOf('.');
        var suffix = stream.substring(index+1);
        if(suffix==='flv'){
            return true;
        }else{
            alert('格式不支持');
            return false;
        }
    },
    base64ToBlob: function (code) {
        var parts = code.split(';base64,');
        var contentType = parts[0].split(':')[1];
        var raw = window.atob(parts[1]);
        var rawLength = raw.length;
        var uInt8Array = new Uint8Array(rawLength);
        for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], {type: contentType});
    }

};

var searchs = window.location.search;
if(searchs){
    searchs = searchs.substring(1).split('&');
    var config = new Object();
    searchs.forEach(function(item){
        var param = item.split('=');
        config[param[0].toLowerCase()] = param[1];
    });
    if(config.stream){
        var szPlayer = new Player(config);
        szPlayer.init();
    }else{
        alert('没有流地址');
    }
}

window.addEventListener('message', function(event){
    switch(event.data.action) {
        case INIT:  szPlayer.init();
            break;
        case START: szPlayer.start();
            break;
        case PAUSE: szPlayer.pause();
            break;
        case DESTORY: szPlayer.destory();
            break;
        case DISCONNECT: szPlayer.reconnect();
            break;
        case CURRENTTIME: szPlayer.getCurrentTime();
            break;
        case SHOTIMAGE: szPlayer.screenshot();
            break;
        default: 
            break;
    }  
}, false);

document.addEventListener('visibilitychange',function(){ //浏览器切换事件
    if(document.visibilityState=='visible') {
        szPlayer.init();
    }
});