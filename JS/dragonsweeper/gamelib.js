/* eslint-disable no-unused-vars */
// @ts-nocheck
"use_strict"

class WindowMode
{
    static FitScreen = "fit_screen";
    static RealPixels = "real_pixels";
}

/** @type {HTMLCanvasElement} */
let canvas;
let ZOOMX = 1;
let ZOOMY = 1;
let WORLDW = 600;
let WORLDH = 600;
let backBuffer;
let smoothing = false;
let playerInteracted = false;
let allSounds = [];
let pendingStuffToLoad = 0;
let initializedPostLoad = false;
let mouseScreenX = 0;
let mouseScreenY = 0;
let mousex = 0;
let mousey = 0;
let mousePressed = false;
let mouseJustPressed = false;
let mousePressedRight = false;
let mouseJustPressedRight = false;
let screenMode = WindowMode.RealPixels;
// let pressedR = false;
// let pressedD = false;
// let pressedS = false;
let keysJustPressed = [];
let isLeftPressed = false;
let isRightPressed = false;
let isUpPressed = false;
let isDownPressed = false;
let lastUpdateTime = Date.now();
let timeElapsed = 0;

class UpdatePhase
{
    static Init= "init";
    static Loading = "loading";
    static DoneLoading = "done_loading";
    static Updating = "updating";
}

class Strip
{
    constructor()
    {
        /** @type {StripFrame[]} */
        this.frames = [];
    }
}

class StripFrame
{
    constructor()
    {
        this.img = null;
        this.rect = new Rect();
        this.pivotx = 0;
        this.pivoty = 0;
    }
}

function loadSound(path)
{
    pendingStuffToLoad += 1;
    let ret = new Audio(path);
    ret.preload = "auto";
    ret.load();
    ret.onloadeddata = function()
    {
        allSounds.push(ret);
        pendingStuffToLoad -= 1;
    };
    return ret;
}

function loadImage(path, fnAfterLoad)
{
    pendingStuffToLoad += 1;
    let ret = new Image();
    ret.src = "data/"+path;
    ret.onload = function()
    {
        pendingStuffToLoad -= 1;
        if(fnAfterLoad != null) fnAfterLoad(ret);
    };
    return ret;    
}

function loadStrip(path, cellw, cellh, pivotx, pivoty, colorMultiplier = 0xffffff, fnAfterLoad)
{
    let ret = new Strip();
    loadImage(path, function(img)
    {
        let framesW = Math.floor(img.width / cellw);
        let framesH = Math.floor(img.height / cellh);
        for(let i = 0; i < framesH; i++) 
        {
            for(let j = 0; j < framesW; j++) 
            {
                let frame = new StripFrame();
                frame.pivotx = pivotx;
                frame.pivoty = pivoty;
                frame.rect.set(j * cellw, i * cellh, cellw, cellh);
                ret.frames.push(frame);

                let frameImage = document.createElement("canvas");
                frameImage.width = cellw;
                frameImage.height = cellh;
                let ctx = frameImage.getContext("2d");
                ctx.drawImage(img, frame.rect.x, frame.rect.y, frame.rect.w, frame.rect.h, 0, 0, frame.rect.w, frame.rect.h);
                if(colorMultiplier != 0xffffff)
                {
                    let r = (colorMultiplier >> 16 & 0xff)/0xff;
                    let g = (colorMultiplier >> 8 & 0xff)/0xff;
                    let b = (colorMultiplier >> 0 & 0xff)/0xff;
                    let imgData = ctx.getImageData(0, 0, cellw, cellh);
                    for(let i = 0; i < imgData.data.length; i += 4) 
                    {
                        imgData.data[i + 0] *= r;
                        imgData.data[i + 1] *= g;
                        imgData.data[i + 2] *= b;
                    }
                    ctx.putImageData(imgData, 0, 0);                
                }
                frame.img = frameImage;
                // console.log("r "+(j + i*framesW)+" es "+frame.rect.toString());
            }
        }
        if(fnAfterLoad != null) fnAfterLoad(ret);
    });
    return ret;
}

function createFontVariant(otherFont, colorMultiplier)
{
    let ret = new BitmapFont();
    ret.chars = otherFont.chars;
    ret.glyphs = otherFont.glyphs;
    ret.lineh = otherFont.lineh;
    ret.max_char_height = otherFont.max_char_height;
    ret.char_sep = otherFont.char_sep;
    ret.hasCapitalization = otherFont.hasCapitalization;
    ret.strip = new Strip();
    for(let otherFrame of otherFont.strip.frames)
    {
        let f = new StripFrame();
        f.rect = otherFrame.rect;
        f.pivotx = otherFrame.pivotx;
        f.pivoty = otherFrame.pivoty;
        f.img = createElement("canvas");
        f.img.width = otherFrame.img.width;
        f.img.height = otherFrame.img.height;
        let ctx = f.img.getContext("2d");
        ctx.drawImage(f.img, 0, 0);
        ret.strip.frames.push(f);
    }
    return ret;
}

function createFont(image, cellw, cellh, pivotx, pivoty, charMap, hasCapitalization, colorMultiplier = 0xffffff, fnAfterLoad = null)
{
    let strip = new Strip();
    strip.lo

    let ret = new BitmapFont();
    ret.loadFromStrip()

    loadStrip(imagePath, cellw, cellh, pivotx, pivoty, colorMultiplier, function(strip)
    {
        ret.loadFromStrip(strip, charMap, hasCapitalization);
        if(fnAfterLoad != null) fnAfterLoad(ret);
    });
    return ret;
}

function loadFont(imagePath, cellw, cellh, pivotx, pivoty, charMap, hasCapitalization, colorMultiplier = 0xffffff, fnAfterLoad = null)
{
    let ret = new BitmapFont();
    loadStrip(imagePath, cellw, cellh, pivotx, pivoty, colorMultiplier, function(strip)
    {
        ret.loadFromStrip(strip, charMap, hasCapitalization);
        if(fnAfterLoad != null) fnAfterLoad(ret);
    });
    return ret;
}

function fitCanvas()
{
    let windowW = window.innerWidth;
    let windowH = window.innerHeight;
    let targetW = windowW;
    let targetH = windowH;
    let widthOverHeight = backBuffer.width / backBuffer.height;
    if(screenMode == WindowMode.FitScreen)
    {
        targetH = windowH * 0.95;
        targetW = targetH * widthOverHeight;
        smoothing = true;
    }
    else
    if(screenMode == WindowMode.RealPixels)
    {
        targetW = backBuffer.width * ZOOMX;// / window.devicePixelRatio;
        targetH = backBuffer.height * ZOOMY;// / window.devicePixelRatio;
    }
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.bottom = "0";
    canvas.style.left = "0";
    canvas.style.right = "0";
    canvas.style.margin = "auto";
    canvas.style.imageRendering = "pixelated;crisp-edges";
}

function onLoadPage()
{
    document.addEventListener("touchstart", 
        function (evt)
        {
            evt.preventDefault();
            mousePressed = true;
            mouseJustPressed = true;
            var rect = canvas.getBoundingClientRect();
            for(var i = 0; i < evt.touches.length; i++)
            {
                let touch = evt.touches[i];
                mouseScreenX = touch.clientX - rect.x;
                mouseScreenY = touch.clientY - rect.y;
            }
        },
    { passive: false });

    document.addEventListener("touchmove",
        function (evt)
        {
            evt.preventDefault();
            var rect = canvas.getBoundingClientRect();
            for(var i = 0; i < evt.touches.length; i++)
            {
                let touch = evt.touches[i];
                mouseScreenX = touch.clientX - rect.x;
                mouseScreenY = touch.clientY - rect.y;
            }
        },
        { passive: false });

    document.addEventListener("touchend",
        function (evt)
        {
            evt.preventDefault();
            activatePlayerInteraction();
            mousePressed = false;
        },
        { passive: false });


    document.onmousemove = function (me) 
    {
        var rect = canvas.getBoundingClientRect();
        mouseScreenX = me.clientX - rect.x; 
        mouseScreenY = me.clientY - rect.y;
    };

    document.onclick = function(me) {activatePlayerInteraction();}

    document.addEventListener('contextmenu', (event) => 
    {
        // Prevent the default context menu from appearing
        event.preventDefault();
    });

    document.onmousedown = function (me) 
    {
        // TODO: why buttons == 1 here but 0 in mouseup?
        // console.log("mdown button:"+me.button+" buttons:"+me.buttons);
        if(me.buttons == 1)
        {
            mousePressed = true;
            mouseJustPressed = true;
        }
        else
        if(me.buttons == 2)
        {
            mousePressedRight = true;
            mouseJustPressedRight = true;
        }
        activatePlayerInteraction();
    };

    document.onmouseup = function (me) 
    {
        // console.log("mup button:"+me.button+" buttons:"+me.buttons + " target: "+me.target);
        if(me.buttons == 0)
        {
            mousePressed = false;
        }
        else if(me.buttons == 2)
        {
            mousePressedRight = false;
        }
    };

    document.onkeydown = function (keyEvent) 
    { 
        keysJustPressed.push(keyEvent.key);
        if(keyEvent.key == "ArrowLeft") isLeftPressed = true;
        if(keyEvent.key == "ArrowRight") isRightPressed = true;
        if(keyEvent.key == "ArrowUp") isUpPressed = true;
        if(keyEvent.key == "ArrowDown") isDownPressed = true;
    };

    document.onkeyup = function (keyEvent) 
    {
        if(keyEvent.key == "ArrowLeft") isLeftPressed = false;
        if(keyEvent.key == "ArrowRight") isRightPressed = false;
        if(keyEvent.key == "ArrowUp") isUpPressed = false;
        if(keyEvent.key == "ArrowDown") isDownPressed = false;
    };

    // schedule stuff to load
    onUpdate(UpdatePhase.Init, 0);

    document.body.style.margin = "0px 0px 0px 0px";
    document.body.style.backgroundColor = "black";

    backBuffer = document.createElement("canvas");
    backBuffer.width = WORLDW;
    backBuffer.height = WORLDH;

    canvas = document.createElement("canvas");
    fitCanvas();
    document.body.appendChild(canvas);
    window.onresize = fitCanvas;

    window.requestAnimationFrame(onInternalUpdate);
}

function onInternalUpdate(now)
{
    let dt = (Date.now() - lastUpdateTime) / 1000;
    dt = Math.min(dt, 1/60);
    lastUpdateTime = Date.now();
    timeElapsed += dt;

    mousex = (mouseScreenX / canvas.width) * backBuffer.width;
    mousey = (mouseScreenY / canvas.height) * backBuffer.height;

    if(pendingStuffToLoad > 0)
    {
        onUpdate(UpdatePhase.Loading, dt);
    }
    else
    {
        if(!initializedPostLoad)
        {
            onUpdate(UpdatePhase.DoneLoading, dt);
            initializedPostLoad = true;
        }
        onUpdate(UpdatePhase.Updating, dt);
    }

    let ctx = get2DContext(canvas);
    ctx.imageSmoothingEnabled = smoothing;
    ctx.drawImage(backBuffer, 0, 0, backBuffer.width, backBuffer.height, 0, 0, canvas.width, canvas.height);

    keysJustPressed = [];
    mouseJustPressed = false;
    mouseJustPressedRight = false;
    window.requestAnimationFrame(onInternalUpdate);
}

function get2DContext(img)
{
    return img.getContext("2d");
}

class Rect
{
    constructor(x = 0, y = 0, w = 0, h = 0)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    floor()
    {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.w = Math.floor(this.w);
        this.h = Math.floor(this.h);
    }

    contains(x, y)
    {
        return x >= this.x && x < this.right() && y >= this.y && y < this.bottom();
    }

    setR(r)
    {
        this.w = r - this.x;
    }

    setB(b)
    {
        this.h = b - this.y;
    }

    set(x, y, w, h)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    copyFrom(other)
    {
        this.x = other.x;
        this.y = other.y;
        this.w = other.w;
        this.h = other.h;
    }

    resizeBy(width, height)
    {
        this.w -= width;
        this.h -= height;
        this.x += width/2;
        this.y += height/2;
    }

    enclose(other)
    {
        this.x = Math.min(this.x, other.x);
        this.y = Math.min(this.y, other.y);
        this.w = Math.max(this.right(), other.right()) - this.x;
        this.h = Math.max(this.bottom(), other.bottom()) - this.y;
    }

    right()
    {
        return this.x + this.w;
    }

    bottom()
    {
        return this.y + this.h;
    }

    centerx()
    {
        return this.x + this.w * 0.5;
    }

    centery()
    {
        return this.y + this.h * 0.5;
    }

    intersects(other)
    {
        if(this.w == 0 || this.h == 0 || other.w == 0 || other.h == 0) return false;
        if(other.x < this.x + this.w && this.x < other.x + other.w && other.y < this.y + this.h)
            return this.y < other.y + other.h;
        else
            return false;
    }

    toString()
    {
        return `(${this.x}, ${this.y}, ${this.w}, ${this.h})`;
    }
}

/** @param {CanvasRenderingContext2D} ctx*/
function drawFrame(ctx, strip, frameIndex, x, y, flipX = false)
{
    let frame = strip.frames[frameIndex];
    ctx.save();
    if(flipX)
    {
        ctx.translate(x + frame.pivotx, y - frame.pivoty);
        ctx.scale(-1, 1);
        ctx.drawImage(frame.img, 0, 0);
    }
    else
    {
        ctx.translate(x - frame.pivotx, y - frame.pivoty);
        ctx.drawImage(frame.img, 0, 0);
    }
    ctx.restore();
    return frame;
}

/** @param {CanvasRenderingContext2D} ctx*/
function drawRect(ctx, r)
{
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.stroke();
}

/** @param {CanvasRenderingContext2D} ctx*/
function drawRectAt(ctx, x, y, w, h)
{
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.rect(x, y, w, h);
    ctx.stroke();
}

class FrameTimer
{
    constructor()
    {
        this.elapsed = 0;
        this.looping = false;
        this.frame = 0;
        this.frameCount = 0;
        this.started = false;
        this.finished = false;
        this.fps = 1;
    }

    stop()
    {
        this.started = false;
        this.frame = 0;
        this.finished = false;
    }

    running()
    {
        return this.started && !this.finished;
    }

    once(frameCount, fps)
    {
        this.elapsed = 0;
        this.looping = false;
        this.frame = 0;
        this.frameCount = frameCount;
        this.started = true;
        this.finished = false;
        this.fps = fps;
    }

    loop(frameCount, fps)
    {
        this.elapsed = 0;
        this.looping = true;
        this.frame = 0;
        this.frameCount = frameCount;
        this.started = true;
        this.finished = false;
        this.fps = fps;
    }

    update(dt)
    {
        if(!this.started) return;
        this.elapsed += dt;
        let frameDuration = 1.0 / this.fps;
        while(this.elapsed >= frameDuration)
        {
            this.elapsed -= frameDuration;
            if(this.frame + 1 == this.frameCount)
            {
                if(this.looping)
                {
                    this.frame = 0;
                }
                else
                {
                    this.finished = true;
                }
            }
            else
            {
                this.frame += 1;
            }
        }
    }
}

function arraysEqual(a1, a2)
{
    if(a1.length != a2.length) return false;
    for(let i = 0; i < a1.length; i++)
    {
        if(a1[i] != a2[i]) return false;
    }
    return true;
}

function lerp( a, b, alpha ) 
{
    return a + alpha * ( b - a );
}

function distance(x1, y1, x2, y2)
{
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function distanceSq(x1, y1, x2, y2)
{
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

const FONT_TOP = 4;
const FONT_CENTER = 1;
const FONT_VCENTER = 2;
const FONT_RIGHT = 8;
const FONT_BOTTOM = 16;

class Glyph
{
    constructor()
    {
        this.rect = new Rect();
        this.pivotx = 0;
        this.pivoty = 0;
        this.offsetx = 0;
        this.offsety = 0;
    }
}

class BitmapFont
{
    constructor()
    {
        this.chars = null;
        this.glyphs = [];
        this.lineh = 0;
        this.max_char_height = 0;
        this.char_sep = 0;
        this.hasCapitalization = true;
        /** @type {Strip} */
        this.strip = null;
        this.spaceWidth = 0;
    }

    loadFromStrip(strip, textMap, hasCapitalization)
    {
        this.strip = strip;
        this.hasCapitalization = hasCapitalization;
        this.chars = textMap;
        this.lineh = strip.frames[0].rect.h;
        this.max_char_height = this.lineh;
        for(let i = 0; i < textMap.length; i++) 
        {
            const c = textMap[i];
            let fr = strip.frames[i];
            let g = new Glyph();
            g.rect.copyFrom(fr.rect);
            g.pivotx = fr.pivotx;
            g.pivoty = fr.pivoty;
            this.glyphs.push(g);
        }
    }

    drawLine(ctx, text, x, y, centering = 0, clip = null)
    {
        let area = new Rect();
        area.w = 10000;
        area.h = 10000;
        area.x = x;
        area.y = y;

        let startx = area.x;
        let starty = area.y;
        let size = this.processLine(ctx, text, startx, starty, area.w, false, clip);
        if((centering & FONT_CENTER) != 0)
        {
            startx = x - size.w * 0.5;
        }
        else
            if((centering & FONT_RIGHT) != 0)
            {
                startx = x - size.w;
            }

        if((centering & FONT_VCENTER) != 0)
        {
            starty = y + this.max_char_height * 0.5;
        }
        if((centering & FONT_TOP) != 0)
        {
            starty = y + this.lineh;
        }
        return this.processLine(ctx, text, startx, starty, area.w, true, clip);
    }

    paragraphSize(text, width)
    {
        let ret = [0,0];
        let lines = this.wordwrap(text, width);
        for(let curline of lines)
        {
            let rect = this.processLine(null, curline, 0, 0, width, false, null);
            ret[0] = Math.max(ret[0], rect.w);
            ret[1] += rect.h;
        }
        return ret;
    }

    drawParagraph(ctx, text, area, clip = null)
    {
        let lines = this.wordwrap(text, area.w);
        let offy = area.y + this.lineh; // move the baseline into the area
        for(let curline of lines)
        {
            this.drawLine(ctx, curline, area.x, offy, 0, clip);
            offy += this.lineh;
        }
    }

    wordwrap(text, width)
    {
        // TODO: hack
        if(!this.hasCapitalization)
        {
            text = text.toUpperCase();
        }

        let wordstart = 0;
        let linebegin = 0;
        let offx = 0;
        let lines = [];
        let i = 0;
        while(i < text.length)
        {
            let char = text.charAt(i);
            if(char == "\n")
            {
                // TODO: duplicated code
                let line = text.substring(linebegin, i).trim();
                if(line.length == 0) return ["STRING OVERFLOW"]; // fail
                lines.push(line);
                i += 1;
                linebegin = i;
                wordstart = i;
                offx = 0;
                continue;
            }

            let index = this.chars.indexOf(char);
            console.assert(index >= 0, "character "+char+" not found");
            let g = this.glyphs[index];

            offx += g.rect.w + g.offsetx + this.char_sep;
            if(char == " ")
            {
                wordstart = i + 1;
                i++;
                continue;
            }

            if(offx > width)
            {
                offx = 0;
                let line = text.substring(linebegin, wordstart - 1).trim();
                if(line.length == 0) return ["STRING OVERFLOW"]; // fail
                lines.push(line);
                linebegin = wordstart;
                i = wordstart;
            }
            else
            {
                i++;
            }
        }

        if(linebegin < i)
        {
            lines.push(text.substring(linebegin, text.length));
        }
        return lines;
    }

    /** @param ctx {CanvasRenderingContext2D} */
    processLine(ctx, text, x, y, width, render, clip)
    {
        if(!this.hasCapitalization) text = text.toUpperCase();
        let offx = 0;
        let maxW = 0;
        let startx = x;
        let starty = y;
        for (let i = 0; i < text.length; i++) 
        {
            const char = text[i];
            let index = this.chars.indexOf(char);
            console.assert(index >= 0, "invalid char: "+char + " in string:"+text);
            let g = this.glyphs[index];
            let glyphW = g.rect.w;
            if(char == " " && this.spaceWidth > 0) glyphW = this.spaceWidth; 
            if(render)
            {
                let frame = this.strip.frames[index];
                ctx.drawImage(frame.img, 0, 0, frame.img.width, frame.img.height, startx + offx + g.offsetx - g.pivotx, starty - g.offsety - g.pivoty, frame.img.width, frame.img.height);
                // ctx.drawImage(this.atlas, g.rect.x, g.rect.y, g.rect.w, g.rect.h, startx + offx + g.offsetx - g.pivotx, starty - g.offsety - g.pivoty, g.rect.w, g.rect.h);
            }
            if(offx + glyphW + g.offsetx + this.char_sep > width)
            {
                break; // truncate
            }
            offx += glyphW;
            if(i < text.length - 1)
            {
                offx += g.offsetx + this.char_sep;
            }
            maxW = Math.max(maxW, offx);
        }
        let ret = new Rect();
        ret.x = x;
        ret.y = y - this.lineh;
        ret.w = maxW;
        ret.h = this.lineh;
        return ret;
    }
}

function stopSound(snd)
{
    // snd.stop();
    snd.pause(); // TODO: is this right??
    snd.currentTime = 0;
}

function pauseSound(snd)
{
    snd.pause();
    snd.currentTime = 0;
}

function playSound(snd, volume = 1, loop = false)
{
    if(!playerInteracted) return;
    if(!snd.paused) return;
    snd.volume = volume;
    snd.loop = loop;
    let promise = snd.play();
    if(promise !== undefined)
    {
        promise.then(_ =>
        {
            // Autoplay started!
        }).catch(error =>
        {
            console.log(error + " trying to play " + snd.src);
            // Autoplay was prevented.
            // Show a "Play" button so that user can start playback.
        });
    }
}

function canvasFromImage(image)
{
    let ret = document.createElement("canvas");
    ret.width = image.width;
    ret.height = image.height;
    let ctx = get2DContext(ret);
    ctx.drawImage(image, 0, 0);
    return ret;
}

function shuffle(array) 
{
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
}

function rnd(start, end)
{
    return Math.floor(Math.random() * (end - start) + start);
}

function r2d(r)
{
    return 180 * r / Math.PI;
}

function clamp01(v)
{
    return Math.max(0, Math.min(1, v));
}

function randomColor()
{
    return Math.floor(Math.random() * 16777215).toString(16);
}

function pickRandomArrayElement(theArray)
{
    let index = rnd(0, theArray.length);
    return theArray[index];
}

function activatePlayerInteraction()
{
    if(!playerInteracted)
    {
        // console.log("activating player interaction");
        playerInteracted = true;
        for(let snd of allSounds)
        {
            snd.play();
            snd.pause();
            snd.currentTime = 0;
        }
    }
}

function tintImage(image, color)
{
    let r = color >> 16 & 0xff;
    let g = color >> 8 & 0xff;
    let b = color >> 0 & 0xff;
    let ctx = get2DContext(image);
    let imgData = ctx.getImageData(0, 0, image.width, image.height);
    for(let i = 0; i < imgData.data.length; i += 4) 
    {
        
        imgData.data[i + 0] = r;
        imgData.data[i + 1] = g;
        imgData.data[i + 2] = b;
    }
    ctx.putImageData(imgData, 0, 0);
}

function multiplyImageColor(image, colorMultiplier)
{
    let r = (colorMultiplier >> 16 & 0xff)/0xff;
    let g = (colorMultiplier >> 8 & 0xff)/0xff;
    let b = (colorMultiplier >> 0 & 0xff)/0xff;
    let ctx = image.getContext("2d");
    let imgData = ctx.getImageData(0, 0, image.width, image.height);
    for(let i = 0; i < imgData.data.length; i += 4) 
    {
        imgData.data[i + 0] *= r;
        imgData.data[i + 1] *= g;
        imgData.data[i + 2] *= b;
    }
    ctx.putImageData(imgData, 0, 0);
}

/** @param ctx {CanvasRenderingContext2D} */
function showLoadingC64(ctx, rect)
{
    // c64 colors
    let colorsWeb = ["#000000", "#FFFFFF", "#880000", "#AAFFEE", "#CC44CC", "#00CC55", "#0000AA", "#EEEE77", "#DD8855", "#664400", "#FF7777", "#333333", "#777777", "#AAFF66", "#0088FF", "BBBBBB"];
    let colors = ["#000000", "#3e31a2", "#574200", "#8c3e34", "#545454", "#8d47b3", "#905f25", "#7c70da", "#808080", "#68a941", "#bb776d", "#7abfc7", "#ababab", "#d0dc71", "#acea88", "ffffff"];
    let bandH = 6;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    let bandCount = Math.floor(rect.h / bandH) + 1;
    let offy = 0;
    for(let i = 0; i < bandCount; i++) 
    {
        ctx.fillStyle = pickRandomArrayElement(colors);
        ctx.fillRect(rect.x, rect.y + offy, rect.w, bandH);
        offy += bandH;
    }
    ctx.restore();
}