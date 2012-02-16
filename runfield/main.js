magF = (400/512);
getImageFirstY = function(img) {
  if (img.firstY == null) {
    try {
      var h = img.height;
      var w = img.width;
      var c = document.createElement('canvas');
      c.id = img.src;
      c.width = w;
      c.height = h;
      var cx = c.getContext('2d')
      cx.drawImage(img, 0,0);
      var id = cx.getImageData(0,0,w,h);
      top: for (var y=0; y<h; y++) {
        for (var x=0; x<w; x++) {
          if (id.data[y*w*4+x*4+3] > 0) {
            img.firstY = y;
            break top;
          }
        }
      }
      if (img.firstY == null)
        img.firstY = h-1;
    } catch(e) {
      // security exception
      img.firstY = 0;
    }
  }
  return img.firstY;
}
drawBg = function(ctx, img, offset, f, yoff, yFunc, maxH) {
  if (yFunc) {
    drawFg(ctx, img, offset*f, function(t) {
      return (50-100*f)*magF + yFunc(t/f, false) * f;
    }, yoff, null, maxH, 40);
  } else {
    getImageFirstY(img);
    var w = img.width
    var off = -(Math.floor(offset*f) % w);
    if (off > 0) off = -w+off;
    var sh = Math.max(0, (maxH || img.height) - img.firstY);
    var y = -yoff*f+img.firstY;
    if (y > 512*magF) return;
    for (var i=0; i+off<1024*magF; i+=w) {
      var x = i+off;
      if (x > 1024*magF || x+w <= 0 || w <= 0 || sh <= 0) continue;
      ctx.drawImage(img,
                    0, img.firstY, w, sh,
                    x, y, w, sh
                   );
    }
  }
}
drawFg = function(ctx, img, offset, yFunc, yoff, gap, maxH, segWidth) {
  if (!img.segCache) img.segCache = {};
  var off = -(Math.floor(offset) % (512*magF));
  var segW = segWidth || 4;
  var ih = img.height;
  var h = maxH || ih;
  var w = img.width;
  getImageFirstY(img);
  for (var i=0; i<1536*magF;) {
    var delta = segW;
    var y = yFunc(offset+off+i,gap,true);
    var dy = Math.abs(yFunc(offset+off+i+40, gap, true)-y);
    var dy2 = Math.abs(yFunc(offset+off+i-40, gap, true)-y);
    if (gap && Math.max(dy,dy2) > 40) {
      delta = 4;
    }
    var e = i+segW;
    for (; i<e; i+=delta) {
      var x = off + i;
      var y = Math.floor(yFunc(offset+off+i, gap, true)-yoff);
      var sh = Math.max(0, h - Math.max(0, y+h-442) - img.firstY);
      var sw = Math.max(0, Math.min(w-(i%w),delta));
      var imw = i % w;
      if (y > 442 || x > 1024*magF || x+sw <= 0 || sw <= 0 || sh <= 0) continue;
      ctx.drawImage(img,
                    imw, img.firstY, sw, sh,
                    x, y+img.firstY, sw, sh);
                    if (y+ih < 442) {
                      for (var j=0; j<442-y+ih; j+=40) {
                        ctx.drawImage(img, imw, ih-40, sw, 40, x, y+ih+j, sw, 40);
                      }
                    }
    }
  }
}
drawShadow = function(ctx, img, offset, yFunc, yoff, gap, segWidth) {
  var segW = segWidth || 40;
  var h = img.height;
  var w = img.width;
  for (var i=0; i<w; i+=segW) {
    var x = i+25;
    var y = 264*magF+Math.floor(yFunc(offset+x, gap)-yoff);
    if (y > 512*magF) continue;
    var sw = Math.min(w-i,segW);
    ctx.drawImage(img,
                  i, 0, sw, h,
                  x, y, sw, h
                 );
  }
}

function drawTrail(ctx, locations, ox, oy, lineWidth, offset, xoff, yoff) {
  var tx = locations[locations.length-1].x-offset+xoff+ox;
  var ty = locations[locations.length-1].y-yoff+80*magF+oy;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineWidth = lineWidth;
  for (var i=locations.length-2; i>=0; i--) {
    tx = locations[i].x-offset+xoff+ox;
    ty = locations[i].y-yoff+80*magF+oy;
    ctx.quadraticCurveTo(tx,ty,tx,ty);
  }
  ctx.stroke();
}

ImageObj = function(image) {this.image=image;};
ImageObj.prototype.getImage = function() {
  return this.image;
};

toLoad = 0;
loads = [];
loadPrefix = '';
load = function(src, prefix) {
  toLoad++;
  if (prefix == null)
    prefix = loadPrefix;
  var img = new Image();
  var obj = new ImageObj(img);
  img.onload = function(){
    toLoad--;
    if (toLoad == 0)
      loaded();
  }
  img.loadsrc = prefix + src;
  loads.push(img);
  return obj;
}
startLoad = function() {
  loads.forEach(function(img){ img.src = img.loadsrc; });
}

window.onload = function() {
  var c = document.getElementById('c');

  var ctx = c.getContext('2d');
  //ctx.fillText = function() {};
  var lowres = false;
  var trailergradient = ctx.createLinearGradient(200*magF,0,0,0);
  trailergradient.addColorStop(0, 'rgba(255,255,255,0.5)');
  trailergradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,800,442);
  ctx.fillStyle = 'white';
  ctx.font = 30*magF+'px Ubuntu';
  ctx.fillText("Loading...", 16*magF, 44*magF);
  var fox_right = load('run_frames.png');
  var fox_boost = load('boost_frames.png');
  var shadow = load('shadow.png');
  var bg_forest = load('bg_forest_field.png');
  var fg = load('fg_field.png');
  var fg_front = load('fg_field_front.png');
  var title = load('Runfield.png');
  var instructions = load('instructions.png');
  var musicOn = false; // localStorage.musicOn != "false";
  var makeAudios = function(){
    var a = [];
    for (var i=0; i<arguments.length; i++) {
      var arg = arguments[i];
      if (arg instanceof Array) {
        arg.forEach(function(e) {
          a.push(createAudio(e));
        });
      } else {
        a.push(createAudio(arg));
      }
    }
    return a;
  };
  var sfxVolume = 1;
  var playSfx = function(a) {
    var sfx = a.shift();
    a.push(sfx);
    if (musicOn) {
      sfx.volume = sfxVolume;
      sfx.play();
    }
    return sfx;
  };
  var stopAllSfx = function(sfxs) {
    for (var i in sfxs) {
      if (i != 'fall')
        sfxs[i].forEach(function(s){ s.pause(); });
    }
  }
  setSfxVolume = function(v) {
    sfxVolume = v;
  };
  setSfxVolume(0.4);
  var sfx = {
    jumps: makeAudios('hyppy'),
    landings: makeAudios('hyppy'),
    fall: makeAudios('hyppy'),
    boosts: makeAudios('hyppy'),
    boom: makeAudios('hyppy')
  };
  var music = createAudio('hyppy');
  music.loop = true;
  music.volume = 0;
  targetOrigin = '*';
  var DemoState = {
    running: false,
    started: false
  };
  loaded = function() {
    if (window.parent == window) {
      DemoState.running = true;
      startGame();
      DemoState.started = true;
    } else {
      window.parent.postMessage('loaded', targetOrigin);
    }
  }
  window.addEventListener("message", function(e) {
    if ("start_demo" == e.data) {
      DemoState.running = true;
      if (DemoState.started) {
        draw();
      } else {
        startGame();
        DemoState.started = true;
      }
    } else if ("stop_demo" == e.data) {
      DemoState.running = false;
      music.pause();
      window.parent.postMessage('finished_exit', targetOrigin);
    }
  }, false);


  startGame = function() {
    if (fox_right.frameCache == null) {
      var img = fox_right.getImage(lowres);
      var w = img.width / 4;
      var h = img.height / 5;
      var fc = [];
      var i = 0;
      for (var x=0; x<4; x++) {
        for (var y=0; y<5; y++) {
          var cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          cv.setAttribute('id', 'c-'+i);
          var cx = cv.getContext('2d');
          cx.globalCompositeOperation = 'copy';
          cx.drawImage(img, -x*w, -y*h);
          fc[i] = cv;
          i++;
        }
      }
      fox_right.frameCache = fc;
    }
    if (fox_boost.frameCache == null) {
      var img = fox_boost.getImage(lowres);
      var w = img.width / 4;
      var h = img.height;
      var fc = [];
      var i = 0;
      for (var x=0; x<4; x++) {
        for (var y=0; y<1; y++) {
          var cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          cv.setAttribute('id', 'c-'+i);
          var cx = cv.getContext('2d');
          cx.globalCompositeOperation = 'copy';
          cx.drawImage(img, -x*w, -y*h);
          fc[i] = cv;
          i++;
        }
      }
      fox_boost.frameCache = fc;
    }
    music.play();
    var randomFactors = function() {
      var a = [];
      for (var i=1; i<5; i++) {
        var p = Math.pow(5, i);
        a.push({
          phase: Math.randomMT()*Math.PI*2,
          amplitude: i*11,
          wavelength: 200 + p + Math.randomMT()*p
        });
      }
      return a;
    }
    var randomPlatform = function() {
      return {
        width: 1500 + Math.floor(Math.randomMT()*1500),
        gap: 200 + Math.floor(Math.randomMT()*150),
        factors: randomFactors()
      };
    };
    var platforms = [];
    var po = 0;
    var offset = 1000;
    var speed = 1.5;
    var y = 0;
    var vy = 0;
    var jump = 0;
    var onground = false;
    var points = 0;
    var gameStarted = false;
    var gameOver = false;
    var record = localStorage.recordSD || 0;
    var oldRecord = record;
    var wasBoosting = false;
    var wasBooming = false;

    var reset = function() {
      Math.seedMT(new Date().getTime());
      if (points > record) {
        record = points;
        localStorage.recordSD = points;
      }
      oldRecord = record;
      po = 0;
      points = 0;
      offset = 1000;
      speed = 0.6;
      y = 0;
      vy = 0;
      jump = 0;
      onground = false;
      wasBoosting = false;

      platforms = [];
      var p = {
        width: 5000,
        gap: 200,
        factors: [
          {phase: -1,
            wavelength: 5000/(Math.PI+1.5),
            amplitude: 100}
        ],
        offset: 0
      };
      platforms.push(p);
      po += p.width+p.gap;
      for (var i=0; i<100; i++) {
        var p = randomPlatform();
        var last = false;
        if (po > 35000) {
          last = true;
        }
        p.offset = po;
        po += p.width + p.gap;
        platforms.push(p);
        if (last)
          break;
      }
    }
    reset();
    var fn = function(x, gap, straightGap) {
      x = x % po;
      var p = null;
      var i = platforms.length-1;
      var min = 0;
      var max = platforms.length-1;
      while (min <= max) {
        var mid = min + Math.floor((max-min) / 2);
        p = platforms[mid];
        if (p.offset <= x && p.offset + p.width + p.gap > x) {
          i = mid;
          break;
        } else if (p.offset <= x) {
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }
      x = x - p.offset;
      var y = 110;
      for (var j=0; j<p.factors.length; j++) {
        var f = p.factors[j];
        y += Math.sin(f.phase + x/f.wavelength)*f.amplitude;
      }
      var d = x - p.width;
      if (d > 0) {
        if (gap != false)
          return 9999;
        var next = platforms[i+1] || platforms[0];
        var nextY = 110;
        var dp = d-p.gap;
        for (var j=0; j<next.factors.length; j++) {
          var f = next.factors[j];
          nextY += Math.sin(f.phase + dp/f.wavelength)*f.amplitude;
        }
        var f = (d/p.gap)
        var df = straightGap ? 0 : 1-(Math.cos(f*2*Math.PI)*0.5+0.5);
        y = (1-f)*y + f*nextY + df*96;
      } else if (gap) {
        var xd = 0;
        var taper = 64;
        if (x < taper) {
          xd = 1-(x/taper);
        } else if (-d < taper) {
          xd = 1-(-d/taper);
        }
        y += xd*xd*xd*48;
      }
      return y*magF;
    };
    var lastFrameTime = new Date().getTime();
    var fps = 0;
    var avgFps = 0;
    var slow = false;
    var forceslow = true;
    var totalFrameTime = 0;
    var frame = 0;
    var down = false;

    endJump = function(ev) {
      if (down) {
        jump = 0;
        down = false;
        ev.preventDefault();
      }
    };
    startJump = function(ev) {
      if (!gameStarted) {
        gameOver = false;
        gameStarted = true;
        reset();
        window.parent.postMessage('hide_exit_ui', targetOrigin);
      } else if (onground && !down) {
        jump = 20;
        onground = false;
        down = true;
        playSfx(sfx.jumps);
      }
      ev.preventDefault();
    };
    c.onmousemove = c.onclick = c.ondblclick = c.onmouseup = function(ev) {
      ev.preventDefault();
    };
    window.onmousedown = function(ev) {
      startJump(ev);
      down = false;
    };
    c.onmousedown = c.ontouchstart = startJump;
    window.onmouseup = window.ontouchend = endJump;
    c.addEventListener('MozTouchStart', startJump, false);
    c.addEventListener('MozTouchRelease', endJump, false);
    window.onkeydown = function(ev) {
      if (ev.which == 32) {
        startJump(ev);
      }
    };
    window.onkeyup = function(ev) {
      if (ev.which == 32) {
        endJump(ev);
      }
    };

    var drawLevel = function(st, offset, yoff, gap, lowres) {
      ctx.clearRect(0,0,800,442);
      if (!slow && !forceslow) {
        drawBg(ctx, bg_forest.getImage(lowres), offset, 0.75, yoff, fn, null);
      }
      drawFg(ctx, fg.getImage(lowres), offset, fn, yoff, gap, null, 40);
    }

    var animFrame = 0;
    var animTime = 0;
    var lastAnimTime = 0;
    var lastAnimFrameTime = new Date().getTime();
    var lastY = 0;
    var lastYoff = 0;
    var locations = [];
    var gameOverTime = 0;
    var titleScreenTime = 0;

    var tweeter = document.getElementById('tweeter');

    draw = function() {
      if (!DemoState.running) return;
      var st = new Date().getTime();
      animTime += st - lastAnimFrameTime;
      var animElapsed = st - lastAnimFrameTime;
      lastAnimFrameTime = st;
      var timeF = (animElapsed/16);
      var t, drawTime, elapsed;
      if (!gameStarted) {
        stopAllSfx(sfx);
        if (avgFps > 0)
          slow = (slow && avgFps < 50) || (!slow && avgFps < 25);
        var ground = 40*magF+fn(offset+512*magF, false, true);
        var yoff = ground - 160*magF - (512-480)*magF;
        if (ground > 400*magF) yoff = lastYoff;
        yoff = lastYoff + (yoff-lastYoff)*0.05;
        lastYoff = yoff;
        drawLevel(st, offset, yoff, false, lowres);
        var sb = (Math.sin(st/150) + 1) * 0.5;
        var sb4 = Math.pow(sb,4);
        if (sb4 < (1/256)) sb4 = 0;
        if (sb4 > (255/256)) sb4 = 1;
        if (gameOver) {
          if (!gameOverTime) gameOverTime = st;
          if (st-gameOverTime > 30000) {
            gameOver = false;
            titleScreenTime = st-1000;
          }
          if (points > record) {
            record = points;
            localStorage.recordSD = points;
          }
          gameStarted = false;
          //                 drawBg(ctx, fg_front.getImage(lowres), offset, 1.15, yoff-30*magF, fn, null);
          var a = Math.max(0,Math.min(1,(29000-(st-gameOverTime))/1000));
          a = 0.5-Math.cos(a*Math.PI)*0.5;
          var b = Math.max(0,Math.min(1,(30000-(st-gameOverTime))/1000));
          b = 0.5-Math.cos(b*Math.PI)*0.5;
          ctx.fillStyle = 'rgba(0,0,0,'+(0.5*b)+')';
          ctx.fillRect(0,0,c.width,c.height);
          ctx.fillStyle = 'rgba(255,255,255,'+(a)+')';
          ctx.fillText('Points: '+points, 24*magF, 44*magF);
          var rtxt = 'Record: ' + record;
          var rw = ctx.measureText(rtxt).width;
          ctx.fillText(rtxt, (800-rw-24*magF), 44*magF);
          var overText = 'You fell in a ditch.';
          var gw = ctx.measureText(overText).width;
          ctx.fillText(overText, (400-gw/2), 240*magF);
          var againText = 'Click to Retry';
          var rtw = ctx.measureText(againText).width;
          ctx.fillText(againText, (400-rtw/2), 420*magF);
          if (points > oldRecord) {
            ctx.fillStyle = 'rgba(255,0,0,'+((1-sb4)*a)+')';
            var rcw = ctx.measureText('New Record!').width;
            ctx.fillText('New Record!', (400-rcw/2), 288*magF);
          }
          var src = (
            'http://platform.twitter.com/widgets/tweet_button.html?via=mozhacks&count=horizontal&lang=en'
              + '&url=' + encodeURIComponent(document.location.toString())
          ) + '&text='+encodeURIComponent('Ran into a ditch after amassing '+points+' points in #RunfieldSD');
          if (tweeter.currentSrc != src) {
            tweeter.currentSrc = src;
            tweeter.contentWindow.location.replace(src);
          }
          tweeter.style.display = a == 1 ? 'inline' : 'none';
        } else {
          tweeter.style.display = 'none';
          if (!titleScreenTime) {
            titleScreenTime = st;
          }
          speed = 0.2;
          var titleY = 120*magF;
          var titleA = 1;
          var e = 2500;
          if (e < 2500) {
            titleA = 0;
            if (e >= 1000) {
              var toff = Math.min(1,(e-1000)/1000);
              toff = 0.5-Math.cos(toff*Math.PI)*0.5;
              titleY = titleY + (1-toff)*30;
              titleA = toff;
            }
          }
          ctx.drawImage(title.getImage(lowres), 400-title.getImage().width/2, titleY);
          drawBg(ctx, fg_front.getImage(lowres), offset, 1.15, yoff-30*magF, fn, null);
          if (e >= 2500) {
            var toff = Math.min(1,(e-2500)/500);
            toff = 0.5-Math.cos(toff*Math.PI)*0.5;
            var s = (Math.sin(+Math.PI/2+(e-2500)/300) + 1) * 0.5;
            var s4 = Math.pow(s,4);
            if (s4 < (1/256)) s4 = 0;
            if (s4 > (255/256)) s4 = 1;
            var w = ctx.measureText('Click to Play').width;
            ctx.fillStyle = 'rgba(255,255,255,'+(1-s4)+')';
            ctx.fillText('Click to Play', 400-w/2, (420-10*(1-toff))*magF);
          }
        }
        if (frame <= 90) {
        }
        t = new Date().getTime();
        drawTime = t-st;
        elapsed = t - lastFrameTime;
        offset += elapsed*speed;
        speed = speed + (0.2-speed)*0.02;
      } else {
        tweeter.style.display = 'none';
        var ground = 40*magF+fn((offset+50+116));
        if (y > 400) {
          ctx.fillStyle = 'rgba(255,255,255,'+((y-400) / 720)+')';
          ctx.fillRect(0,0,800,400);
        }
        if (y > 400+512) {
          playSfx(sfx.fall);
          gameOver = true;
          gameOverTime = st;
          gameStarted = false;
          window.parent.postMessage('show_exit_ui', targetOrigin);
        } else {
          var landing = false;
          if (y-ground < 30 && ground-y < 10 && vy > 0) {
            y = ground;
            landing = landing || vy > 10;
            vy = 0;
          }
          var wasAbove = y < ground;
          if (jump > 0) {
            vy = -jump;
            jump -= timeF;
          }
          y += vy*timeF;
          vy += timeF*speed;
          var isBelow = y >= ground;
          if ((y-ground < 50 && ground-y < 10 && jump <= 0) || (isBelow && wasAbove) ||
              (onground && jump <= 0 && ground < 720))
            {
              y = ground;
              landing = landing || vy > 10;
              vy = 0;
            }
            if (landing) playSfx(sfx.landings);
            onground = Math.abs(y-ground) < 30 && jump <= 0;
        }
        lastY = y;
        var trailers = offset > 1*po+800;
        var boosting = offset > 1*po+200;
        var booming = offset > 2*po+200;
        if (!wasBoosting && boosting) playSfx(sfx.boosts);
        if (!wasBooming && booming) {
          stopAllSfx(sfx);
          playSfx(sfx.boom);
        }
        if (booming && sfx.boom[0].currentTime > 3) {
          setSfxVolume(0);
        }
        wasBoosting = boosting;
        wasBooming = booming;
        var animI = (boosting ? fox_boost : fox_right);
        var anim = animI.getImage(lowres);
        var xoff = boosting ? -15 : 50;
        var w = Math.floor(anim.width/4);
        var af = boosting ? 1 : 1/5;
        var h = anim.height*af;
        var animframeduration = boosting ? 160 : 160;
        var framesElapsed = (animTime - lastAnimTime) / (animframeduration*af/speed);
        if (framesElapsed >= 1) {
          lastAnimTime = animTime;
          animFrame += Math.floor(framesElapsed);
        }
        var fr = onground ? animFrame % (4/af) : 0;
        var f = Math.floor(fr / (1/af));
        var hf = Math.floor(fr % (1/af));
        var yoff = y - 160*magF - (512-480)*magF;
        yoff = lastYoff + (yoff-lastYoff)*0.2;
        yoff = Math.min(Math.max(yoff, -50), 50);
        lastYoff = yoff;
        drawLevel(st, offset, yoff, true, lowres);
        points = Math.floor(offset-1000);
        var lap = Math.floor(Math.max(0, (offset-1500)/po))+1;
        var rtxt = 'Record: ' + record;
        var rw = ctx.measureText(rtxt).width;
        ctx.fillStyle = 'rgba(81,65,30, 1)';
        //ctx.fillText('Points: '+points, 24*magF, 45*magF);
        //ctx.fillText(rtxt, 800-rw-24*magF, 45*magF);
        if (y <= ground)
          drawShadow(ctx, shadow.getImage(lowres), offset, fn, yoff);
        ctx.drawImage(animI.frameCache[fr % animI.frameCache.length], Math.floor(xoff*magF), Math.floor(y-yoff+80*magF));
        //               ctx.drawImage(anim,
        //                 w*f, h*hf, w, h,
        //                 Math.floor(xoff*magF), Math.floor(y-yoff+80*magF), w, h
        //               );
        if (locations.length == 20) {
          locations.splice(0,10);
        }
        locations.push({x:offset, y:y+(f%2)*5});
        if (trailers) {
          ctx.strokeStyle = trailergradient;
          drawTrail(ctx, locations, 180*magF, 74*magF, 5*magF, offset, xoff, yoff);
          drawTrail(ctx, locations, 197*magF, 46*magF, 3*magF, offset, xoff, yoff);
          drawTrail(ctx, locations, 205*magF, 56*magF, 2*magF, offset, xoff, yoff);
        }
        if (offset%po < 1500) {
          // draw starting line
          //ctx.fillStyle = 'rgba(255,255,255,0.5)';
          //ctx.fillRect(1500-(offset%po)-1, 0, 3, 512);
        }
        if (!slow)
          drawBg(ctx, fg_front.getImage(lowres), offset, 1.15, yoff-30*magF, fn, null);
        if (offset < 0) {
          var a = 1;//Math.max(0,offset-5000)/1000;
          a = 0.5-0.5*Math.cos(a*Math.PI);
          var inst = instructions.getImage();
          ctx.globalAlpha = 1-a;
          ctx.drawImage(inst, 400-inst.width/2, 400-inst.height-120*magF);
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,255,255,'+(1-a)+')';
          var againText = 'Click to jump over ditches';
          var rtw = ctx.measureText(againText).width;
          ctx.fillText(againText, 400-rtw/2, 420*magF);
        }
        t = new Date().getTime();
        drawTime = t-st;
        elapsed = t - lastFrameTime;
        if (speed < 1)
          speed += elapsed/30000;
        else if (speed < 1.25)
          speed += elapsed/50000;
        else if (speed < 1.5)
          speed += elapsed/60000;
        else if ((offset%po) < 6000)
          speed += elapsed/7000;
        else
          speed += elapsed/70000;
        offset += elapsed*speed;
      }
      ctx.fillStyle = '#ffffff'
      //ctx.fillText(Math.floor(avgFps) + " fps", 20, 60);
      lastFrameTime = t;
      totalFrameTime += elapsed;
      if (frame % 30 == 0 || frame == 11) {
        fps = parseInt(1000/elapsed);
        if (frame == 11) totalFrameTime *= 3;
        if (frame == 0) totalFrameTime *= 30;
        avgFps = 1000 / (totalFrameTime / 30);
        totalFrameTime = 0;
      }
      frame++;
      if (booming && musicOn) {
        music.volume = 0;
      } else if (!music.paused) {
        if (musicOn) music.volume = Math.min((0.01+music.volume)*(1.0+elapsed/1000), 1);
        else music.volume = Math.max(music.volume*(1.0-elapsed/200),0);
        if (music.volume < 0.01) music.volume = 0;
        if (!musicOn && music.volume == 0) music.pause();
      }
      if (musicOn && (music.paused || music.currentTime == music.duration || music.currentTime == 0))
        music.play();
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(draw);
      } else if (window.mozRequestAnimationFrame) {
        window.mozRequestAnimationFrame(draw);
      } else if (window.webkitRequestAnimationFrame) {
        window.webkitRequestAnimationFrame(draw);
      } else {
        setTimeout(draw, Math.floor(15-(t % 15)));
      }
    }
    draw();
  }

  startLoad();

};


function addFullScreeButton(query) {
  var elt = document.querySelector(query);
  if (elt.mozRequestFullScreen) {
    var button = document.createElement("button");
    button.setAttribute("style", "position:fixed;bottom:0;right:0;height:50px");
    button.textContent = "fullscreen";
    button.id = "fullscreenbutton";
    button.onclick = function() {elt.mozRequestFullScreen()}
    document.body.appendChild(button);
  }
}
//window.addEventListener("load", function() {addFullScreeButton("canvas")}, true);
