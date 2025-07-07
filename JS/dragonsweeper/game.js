/* eslint-disable no-unused-vars */
// @ts-check
"use_strict"

let debugOn = false;
let debugLines = [];
let fontDebug;
/** @type {BitmapFont} */
let fontUINumbers;
let fontHUD;
let fontUIOrange;
let fontUIGray;
let fontUIBlackDark;
let fontBook;
let fontUIRed;
let fontUIYellow;
let fontUIBook;
let fontCredits;
let fontWinscreen;

let nomiconWasEverRead = false;
let soundOn = true;
let musicOn = true;
let runningMusic = null;
let runningMusicId = null;
let musicToRun = null;

let imgJuliDragon;
let stripHint;
let stripHintLevelup;
let stripUI;
let stripScanlines;
let stripLevelup;
let stripWalls;
let stripIcons;
let stripIconsBig;
let stripHero;
let stripMonsters;
let stripHUD;
let stripBook;
let stripLevelupButtons;
let stripFX;
/** @type {GameState} */
let state;

let sndEvents = {};

const version = "v1.0.0";
const BOOK_MOVEMENT_DURATION = 1;
const MAX_LEVEL = 18;
const HEART_GROWING = [60, 61, 62, 63, 64, 65, 66].reverse();
const HEART_DRAINING = [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
const HEART_NEW = [100, 101, 102, 103, 104, 105, 106].reverse();
const XP_GROWING = [70, 71, 72, 73, 74].reverse();
const XP_SHRINKING = [70, 71, 72, 73, 74];
const XP_SPINNING = [120, 121, 122, 123, 124, 125, 126, 127, 128, 129];
const HERO_IDLE = [0];
const HERO_DEAD = [1];
const HERO_EMPOWERED = [10, 11];
const HERO_NAKED = [20, 21, 22];
const HERO_ITS_A_ME = [40, 41, 40];
const HERO_LEVELING = [32, 33, 34, 35, 36, 37];
const HERO_STABBING = [50];
const HERO_CELEBRATING = [70, 71];
let LEVELUP_FRAMES = [];
for(let i = 0; i < 113;i++) LEVELUP_FRAMES.push(i);


class IndexedAnimation
{
    constructor(heartIndex, frames)
    {
        this.index = heartIndex;
        this.frames = frames;
        this.timer = new FrameTimer();
    }
}

class PlacedAnimation
{
    constructor(frames, x, y)
    {
        this.timer = new FrameTimer();
        this.frames = frames;
        this.x = x;
        this.y = y;
    }
}

class FrameAnimation
{
    constructor()
    {
        this.timer = new FrameTimer();
        this.frames = [];
    }

    stop()
    {
        this.timer.stop();
    }

    once(frames, fps)
    {
        this.frames = frames;
        this.timer.once(this.frames.length, fps);
    }

    loop(frames, fps)
    {
        this.frames = frames;
        this.timer.loop(this.frames.length, fps);
    }

    running()
    {
        return this.timer.running();
    }

    update(dt)
    {
        this.timer.update(dt);
    }

    frame()
    {
        return this.frames[this.timer.frame];
    }
}

class PlayerState
{
    constructor()
    {
        this.maxHP = 4;
        this.hp = this.maxHP;
        this.xp = 0;
        this.level = 1;
        this.score = 0;
    }
}

class GameStatus
{
    static None = "none";
    static Playing = "playing";
    static Dead = "dead";
    static DragonDefeated = "dragon_defeated";
    static WinScreen = "win_screen";
}

class ActorId
{
    static None = "none";
    static Empty = "empty";
    static Orb = "orb";
    static SpellMakeOrb = "spell_reveal";
    static SpellNuke = "spell_nuke";
    static Mine = "mine";
    static Lich = "lich";
    static Dragon = "dragon";
    static Wall = "wall";
    static Mimic = "mimic";
    static Medikit = "medikit";
    static RatKing = "rat king";
    static Rat = "rat";
    static Slime = "slime";
    static Gargoyle = "gargoyle";
    static Minotaur = "minotaur";
    static Chest = "chest";
    static Skeleton = "skeleton";
    static Treasure = "treasure";
    static Snake = "snake";
    static Giant = "giant";
    static Decoration = "decoration";
    static Elemental = "elemental";
    static Wizard = "warlock";
    static Gazer = "gazer";
    static Puddle = "puddle";
    static MiniElemental = "puddle";
    static SpellAnger = "spell_anger";
    static SpellDisarm = "spell_disarm";
    static AngrySnake = "supersnake";
    static BigSlime = "big slime";
    static SpellRevealRats = "spell_reveal_rats";
    static SpellRevealSlimes = "spell_reveal_slimes";
    static Gnome = "gnome";
    static Bat = "bat";
    static Minion = "minion";
}

class Actor
{
    constructor()
    {
        this.tx = 0;
        this.ty = 0;
        this.fixed = false;

        this.id = ActorId.None;
        this.strip = null;
        this.stripFrame = 0;
        this.deadStripFrame = 0;
        this.revealed = false;
        this.monsterLevel = 0;
        this.xp = 0;
        this.mimicMimicking = false; // TODO: necessary?
        this.defeated = false;
        this.mark = 0;
        this.trapDisarmed = false;
        this.contains = null;
        this.wallHP = 0;
        this.wallMaxHP = 0;
        this.markOrbWithHealing = false;
        this.isMonster = false;
        this.gargoyleTwinNumber = 0;
    }

    reset()
    {
        this.id = ActorId.None;
        this.strip = null;
        this.stripFrame = 0;
        this.deadStripFrame = 0;
        this.revealed = false;
        this.monsterLevel = 0;
        this.xp = 0;
        this.mimicMimicking = false; // TODO: necessary?
        this.defeated = false;
        this.mark = 0;
        this.trapDisarmed = false;
        this.contains = null;
        this.wallHP = 0;
        this.wallMaxHP = 0;
        this.markOrbWithHealing = false;
        this.isMonster = false;
        this.gargoyleTwinNumber = 0;
    }
}

class GameStats
{
    constructor()
    {
        this.total = 0;
        this.empties = 0;
        this.totalXP = 0;
        this.xpRequiredToMax = 0;
        this.excessXP = 0;
    }
}

class GameState
{
    constructor()
    {
        this.gridW = 0;
        this.gridH = 0;
        /** @type {Actor[]} */
        this.actors = [];
        this.player = new PlayerState();
        this.showingMonsternomicon = false;
        this.buttonFrames =[];
        /** @type {PlacedAnimation[]} */
        this.animationsFX = [];
        this.tempHeroAnim = new FrameAnimation();
        this.heroAnim = new FrameAnimation();
        this.status = GameStatus.None;
        /** @type {ActorId} */
        this.lastActorTypeClicked = ActorId.None;

        /** @type {FrameAnimation} */
        this.levelupAnimation = new FrameAnimation();
        /** @type {IndexedAnimation[]} */
        this.heartAnimations = [];
        /** @type {IndexedAnimation[]} */
        this.xpAnimations = [];
        this.lastTileClicked = null;
        this.screenShakeTimer = 0;
        /** @type {GameStats} */
        this.stats = new GameStats();
        this.bookLocationElapsed = 0;
    }
}

function stripXYToFrame(x, y)
{
    return Math.floor(x/16) + Math.floor(y/16) * 16;
}

function stripXYToFrame24(x, y)
{
    return Math.floor(x/24) + Math.floor(y/24) * 10;
}

function nextLevelXP(level)
{
    // let table = [0, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    // let index = Math.min(level, table.length - 1);
    // return table[index] + level;
    // return level + 4;
    // let table = [0, 5, 9, 12, 15, 18, 21];
    // let index = Math.min(level, table.length - 1);
    // return table[index];
    let table = [0, 5, 9, 12, 15, 18, 21, 24, 27];
    let index = Math.min(level, table.length - 1);
    return table[index];
}

function loadSettings()
{
    let nomicon = localStorage.getItem("nomicon");
    if(nomicon == null)
    {
        localStorage.setItem("nomicon", "no");
        nomiconWasEverRead = false;
    }
    else
    {
        nomiconWasEverRead = nomicon == "yes";
    }

    let soundSetting = localStorage.getItem("sound");
    if(soundSetting == null)
    {
        localStorage.setItem("sound", "on");
        soundOn = true;
    }
    else
    {
        soundOn = soundSetting == "on";
    }

    let musicSetting = localStorage.getItem("music");
    if(soundSetting == null)
    {
        localStorage.setItem("music", "on");
        musicOn = true;
    }
    else
    {
        musicOn = musicSetting == "on";
    }
}

function saveSettings()
{
    localStorage.setItem("sound", soundOn ? "on" : "off");
    localStorage.setItem("music", musicOn ? "on" : "off");
    localStorage.setItem("nomicon", nomiconWasEverRead ? "yes" : "no");
}

function newGame()
{
    state = new GameState();
    state.status = GameStatus.Playing;
    state.gridW = 13;
    state.gridH = 10;

    state.player.level = 1;
    state.player.maxHP = 5 + 1;
    state.player.hp = state.player.maxHP;

    // generator
    let randomized = [];
    addRandom(12, makeRat1);
    addRandom(10, makeBat2);
    addRandom( 10, makeSkeleton3);
    addRandom( 6, makeSlime5);
    addRandom( 4, makeSnake6);
    addRandom( 3, makeMinotaur7);
    // addRandom( 3, makeMinion9);

    // gargoyles
    addRandom( 2, makeGargoyle4).forEach(a => a.gargoyleTwinNumber = 1);
    addRandom( 2, makeGargoyle4).forEach(a => a.gargoyleTwinNumber = 2);
    addRandom( 2, makeGargoyle4).forEach(a => a.gargoyleTwinNumber = 3);
    addRandom( 2, makeGargoyle4).forEach(a => a.gargoyleTwinNumber = 4);

    addRandom( 2, makeGazer);
    addRandom( 1, makeMimic);

    addRandom( 9, makeMine);

    addRandom( 3, makeWall).forEach(a => a.contains = makeTreasure1);
    addRandom( 4, makeWall).forEach(a => a.contains = makeTreasure3);

    addRandom( 5, makeMedikit);
    addRandom( 2, makeChest);
    addRandom( 1, makeChest).forEach(a => a.contains = makeSpellOrb);
    addRandom( 2, makeChest).forEach(a => a.contains = makeMedikit);
    addRandom(1, makeOrb).forEach(a => a.revealed = true);
    addRandom(1, makeOrb).forEach(a => {a.revealed = true; a.markOrbWithHealing = true;});
    addRandom(2, makeMedikit);//.forEach(a => a.revealed = true);
    addRandom(1, makeGnome);

    let dragon = addFixed(makeDragon, Math.floor(state.gridW/2), 4);
    dragon.revealed = true;


    let corners = [[0,0], [state.gridW - 1, 0], [0, state.gridH - 1], [state.gridW-1, state.gridH-1]];
    shuffle(corners);

    { // place the lich
        let coords = corners[0];
        addFixed(makeLich, coords[0], coords[1]);
    }

    // place corner xp
    // {
    //     for(let corner of corners)
    //     {
    //         if(getActorAt(corner[0], corner[1]) != undefined) continue;
    //         addFixed(makeTreasure5, corner[0], corner[1]);
    //         break;
    //     }
    //     let coords = corners[0];
    //     addFixed(makeLich, coords[0], coords[1]);
    // }

    { // place the rat king
        let available = [];
        for(let y = 0; y < state.gridH; y++)
        {
            for(let x = 0; x < state.gridW; x++)
            {
                if(getActorAt(x, y) != undefined) continue;
                if(x == 0 || y == 0 || x == state.gridW - 1 || y == state.gridH - 1) continue;
                available.push([x,y]);
            }
        }

        shuffle(available); // TODO: slow
        if(available.length > 0)
        {
            let x = available[0][0];
            let y = available[0][1];
            for(let ty = - 1; ty < 2; ty++)
            {
                for(let tx = - 1; tx < 2; tx++)
                {
                    let cx = x + tx;
                    let cy = y + ty;
                    if(!isInside(cx, cy)) continue;
                    if(distance(tx, ty, 0, 0) > 1) continue;
                    if(tx == 0 && ty == 0) addFixed(makeRatKing, x, y);
                    else if(getActorAt(x + tx, y + ty) == undefined) addFixed(makeRat1, x + tx, y + ty);
                }
            }
        }
    }

    { // place the wizard
        let available = [];
        for(let y = 0; y < state.gridH; y++)
        {
            for(let x = 0; x < state.gridW; x++)
            {
                if(getActorAt(x, y) != undefined) continue;
                if(state.actors.find(a => a.id == ActorId.RatKing && distance(a.tx, a.ty, x, y) < 4) != undefined) continue;
                if(x == 0 && y == 0) continue;
                if(x == (state.gridW-1) && y == (state.gridH-1)) continue;
                if(x == (state.gridW-1) && y == 0) continue;
                if(x == 0 && y == (state.gridH-1)) continue;
                if(x != 0 && y != 0 && x != (state.gridW - 1) && y != (state.gridH - 1)) continue;
                available.push([x,y]);
            }
        }

        shuffle(available); // TODO: slow

        // first make sure this is a good position
        let availableIndex = 0;
        while(available.length > 0 && availableIndex < available.length)
        {
            let x = available[availableIndex][0];
            let y = available[availableIndex][1];
            if(state.actors.find(a => distance(x, y, a.tx, a.ty) < 2) == undefined)
            {
                for(let ty = - 1; ty < 2; ty++)
                {
                    for(let tx = - 1; tx < 2; tx++)
                    {
                        let cx = x + tx;
                        let cy = y + ty;
                        if(!isInside(cx, cy)) continue;
                        // if(distance(tx, ty, 0, 0) > 1) continue;
                        if(tx == 0 && ty == 0) addFixed(makeWizard, x, y);
                        else if(getActorAt(x + tx, y + ty) == undefined) addFixed(makeBigSlime8, x + tx, y + ty);
                    }
                }        
                break;
            }
            else
            {
                availableIndex++;
            }
        }
    }

    let empties = state.gridW * state.gridH - (randomized.length + state.actors.length);
    console.assert(empties >= 0);
    addRandom(empties, makeEmpty);
    shuffle(randomized);

    let randomIndex = 0;
    state.buttonFrames = [];
    let buttonFrameBag = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19, 20, 21, 22, 23, 24];
    let currentButtonBag = [];
    for(let y = 0; y < state.gridH; y++)
    {
        for(let x = 0; x < state.gridW; x++)
        {
            if(currentButtonBag.length == 0)
            {
                currentButtonBag = buttonFrameBag.slice();
                shuffle(currentButtonBag);
            }

            if(x == dragon.tx && y == dragon.ty) state.buttonFrames[x + y * state.gridW] = 0;
            else if(x == 0 && y == 0) state.buttonFrames[x + y * state.gridW] = 25;
            else if(x == state.gridW - 1 && y == 0) state.buttonFrames[x + y * state.gridW] = 26;
            else state.buttonFrames[x + y * state.gridW] = currentButtonBag.pop();
    
            if(state.actors.find(a => a.tx == x && a.ty == y)) continue;

            console.assert(randomIndex < randomized.length);
            let a = randomized[randomIndex++];
            a.tx = x;
            a.ty = y;
            state.actors.push(a);
        }
    }

    let bestHappiness = happiness();
    for(let a of state.actors)
    {
        if(a.fixed) continue;
        let happiestReplacement = null;
        for(let b of state.actors)
        {
            if(b.fixed) continue;
            if(a === b) continue;
            swapPlaces(a, b);
            let newHappiness = happiness();
            swapPlaces(a, b);
            if(newHappiness > bestHappiness)
            {
                bestHappiness = newHappiness;
                happiestReplacement = b;
            }
        }

        if(happiestReplacement != null)
        {
            swapPlaces(a, happiestReplacement);
        }
    }

    let wallHPs = [1, 2, 3, 4];
    let wallHPCounter = 0;
    for(let a of state.actors)
    {
        // special initialization
        if(a.id == ActorId.Gargoyle)
        {
            let twin = state.actors.find(b => b.id == a.id && b.gargoyleTwinNumber == a.gargoyleTwinNumber && b !== a);
            if(twin != undefined)
            {
                if(a.tx < twin.tx) a.stripFrame = stripXYToFrame(0, 210);
                else if(a.tx > twin.tx) a.stripFrame = stripXYToFrame(0, 210)+3;
                else if(a.ty < twin.ty) a.stripFrame = stripXYToFrame(0, 210)+1;
                else if(a.ty > twin.ty) a.stripFrame = stripXYToFrame(0, 210)+2;
            }
            else
            {
                console.assert(false);
            }
        }
        else
        if(a.id == ActorId.Wall)
        {
            a.wallHP = a.wallMaxHP = wallHPs[wallHPCounter];
            wallHPCounter = (wallHPCounter + 1) % wallHPs.length;
        }            
    }

    computeStats();

    function swapPlaces(a, b)
    {
        let tempx = a.tx;
        let tempy = a.ty;
        a.tx = b.tx;
        a.ty = b.ty;
        b.tx = tempx;
        b.ty = tempy;
    }

    function happiness()
    {
        let ret = 0;
        for(let a of state.actors)
        {
            if(a.id == ActorId.Gnome)
            {
                for(let b of state.actors)
                {
                    if(a === b) continue;
                    let dist = distance(a.tx, a.ty, b.tx, b.ty);
                    if(dist <= 3 && b.id == ActorId.Orb)
                    {
                        ret -= 1000;
                    }
                }        
            }
            else
            if(a.id == ActorId.Rat)
            {
                let king = state.actors.find(b => b.id == ActorId.RatKing);
                if(king != undefined)
                {
                    if(king.tx == a.tx)
                    {
                        ret -= 1000;
                    }
                }
            }
            else
            if(a.id == ActorId.Gargoyle)
            {
                let foundTwin = false;
                let neighborCount = 0;
                for(let b of state.actors)
                {
                    if(a === b) continue;
                    let dist = distance(a.tx, a.ty, b.tx, b.ty);
                    if(dist <= 1 && b.id == ActorId.Gargoyle)
                    {
                        neighborCount += 1;
                        if(b.gargoyleTwinNumber == a.gargoyleTwinNumber)
                        {
                            foundTwin = true;
                        }
                    }
                }    

                if(foundTwin && neighborCount == 1)
                {
                    ret += 1000;
                }
            }
            else
            if(a.id == ActorId.Orb)
            {
                ret += -1000 * countNearMeWithSameId(a, 5);

                if(isCloseToEdge(a.tx, a.ty))
                {
                    ret += -10000;
                }

                // ret += -getAttackNumber(a.tx, a.ty)*10;

                let medikitsClose = 0;
                for(let b of state.actors)
                {
                    if(a === b) continue;
                    let dist = distance(a.tx, a.ty, b.tx, b.ty);
                    if(b.id == ActorId.Medikit && dist <= 1.5) medikitsClose++;
                    if(dist < 1.5)
                    {
                        if(b.id == ActorId.Dragon || 
                            b.id == ActorId.Gazer || 
                            b.id == ActorId.Chest || 
                            b.id == ActorId.Lich ||
                            b.id == ActorId.Mine ||
                            b.id == ActorId.RatKing ||
                            b.id == ActorId.Wizard ||
                            b.id == ActorId.Mimic) ret -= 1000;
                        else if(b.id == ActorId.Medikit && medikitsClose > 1) ret -= 1000;
                        else if(a.markOrbWithHealing && b.id == ActorId.Medikit) ret += 800;
                        else if(!a.markOrbWithHealing && b.id == ActorId.Medikit) ret -= 1000;
                    }
                    else
                    if(dist < 2.5)
                    {
                        if( b.id == ActorId.RatKing ||
                            b.id == ActorId.Wizard) ret -= 1000;
                    }

                    // if(!a.markOrbWithHealing)
                    // {
                    //     ret -= getAttackNumber(b.tx, b.ty);
                    // }

                    // ret -= getNeighborsWithDiagonals(b.tx, b.ty).filter(c => !isEmpty(c)).length * 1000;
                }
            }
            else
            if(a.id == ActorId.Minion)
            {
                ret += -100 * countNearMeWithSameId(a, 2.5);
            }
            else
            if(a.id == ActorId.Medikit)
            {
                ret += -10 * countNearMeWithSameId(a, 2.5);
            }
            else
            if(a.id == ActorId.Gazer)
            {
                ret += -1000 * countNearMeWithSameId(a, 5);
                if(isCorner(a.tx, a.ty)) ret -= 100;
            }
            else
            if(a.id == ActorId.Wall)
            {
                if(isEdge(a.tx, a.ty))
                {
                    ret += -10;
                }

                ret += -100 * countNearMeWithSameId(a, 3);
            }
        }
        return ret;

        function countNearMeWithSameId(a, minDistance)
        {
            let count = 0;
            for(let b of state.actors)
            {
                if(a.id == b.id && b !== a && distance(a.tx, a.ty, b.tx, b.ty) < minDistance)
                {
                    count += 1;
                }
            }
            // let list = state.actors.filter(b => a.id == b.id && b !== a && distance(a.tx, a.ty, b.tx, b.ty) < minDistance);
            return count;
        }

        function isEdge(tx, ty)
        {
            return tx == 0 || ty == 0 || tx == state.gridW - 1 || ty == state.gridH - 1;
        }

        function isCorner(tx, ty)
        {
            return  (tx == 0 && ty == 0) || 
                    (tx == 0 && ty == state.gridH - 1) ||
                    (tx == state.gridW - 1 && ty == state.gridH - 1) ||
                    (tx == state.gridW - 1 && ty == 0);
        }

        function isCloseToEdge(tx, ty)
        {
            return tx <= 1 || ty <= 1 || tx >= state.gridW - 2 || ty >= state.gridH - 2;
        }
    }

    function addFixed(fn, tx, ty)
    {
        let a = getActorAt(tx, ty);
        if(a == undefined)
        {
            a = new Actor();
            a.tx = tx;
            a.ty = ty;
            state.actors.push(a);
        } 
        fn(a);
        a.fixed = true;
        return a;
    }

    function addRandom(amount, fn)
    {
        let ret = [];
        for(let i = 0; i < amount; i++)
        {
            let a = new Actor();
            fn(a);
            randomized.push(a);
            ret.push(a);
        }
        return ret;
    }
}

function computeStats()
{
    state.stats = new GameStats();
    state.stats.total = state.actors.length;
    for(let a of state.actors)
    {
        if(a.id == ActorId.Empty) state.stats.empties++;
        state.stats.totalXP += a.xp;
        if(a.id == ActorId.Chest)
        {
            let placeholder = new Actor();
            a.contains(placeholder);
            state.stats.totalXP += placeholder.xp;
        }
    }

    for(let i = 1; i < MAX_LEVEL; i++)
    {
        state.stats.xpRequiredToMax += nextLevelXP(i);
    }
    state.stats.excessXP = state.stats.totalXP - state.stats.xpRequiredToMax;
}

function drawLineOutlineCentered(ctx, text, x, y, centering)
{
    fontUIGray.drawLine(ctx, text, x+1, y, centering);
    fontUIGray.drawLine(ctx, text, x, y+1, centering);
    fontUIGray.drawLine(ctx, text, x-1, y, centering);
    fontUIGray.drawLine(ctx, text, x, y-1, centering);
    fontUIGray.drawLine(ctx, text, x+1, y+1, centering);
    fontUIGray.drawLine(ctx, text, x-1, y+1, centering);
    fontUIGray.drawLine(ctx, text, x-1, y-1, centering);
    fontUIGray.drawLine(ctx, text, x+1, y-1, centering);
    fontUIOrange.drawLine(ctx, text, x, y, centering);
}

function isEmpty(a)
{
    return a.id == ActorId.Empty;
}

function isInside(tx, ty)
{
    return tx >= 0 && ty >= 0 && tx < state.gridW && ty < state.gridH;
}

function getActorAt(tx ,ty)
{
    return state.actors.find(a => a.tx == tx && a.ty == ty);
}

function revealIsolatedGroupsOfMines(actors)
{
    let taboo = [];
    let reveals = 0;
    for(let a of actors)
    {
        if(a.revealed) continue;
        if(taboo.includes(a)) continue;
        let group = flood(a);
        let hasNonMine = group.find(c => c.id != ActorId.Mine) != undefined;
        if(!hasNonMine)
        {
            for(let c of group)
            {
                if(!c.revealed)
                {
                    reveals++;
                    c.revealed = true;
                    startFXReveal(c.tx, c.ty);
                }
            }
        }
    }

    if(reveals > 0)
    {
        play("reveal");
    }

    function flood(pivotActor)
    {
        let ret = [pivotActor];
        for(let b of getNeighborsWithDiagonals(pivotActor.tx, pivotActor.ty))
        {
            if(isEmpty(b)) continue;
            if(taboo.includes(b)) continue;
            taboo.push(b);
            ret = ret.concat(flood(b));
        }
        return ret;
    }
}

function floodCross(pivotActor, filterFn)
{
    return internalFlood(pivotActor, filterFn, []);

    function internalFlood(pivotActor, filterFn, taboo)
    {
        let ret = [];
        if(filterFn(pivotActor))
        {
            ret.push(pivotActor);
            // taboo.push(pivotActor);
            for(let b of getNeighborsCross(pivotActor.tx, pivotActor.ty))
            {
                if(taboo.includes(b)) continue;
                taboo.push(b);
                ret = ret.concat(internalFlood(b, filterFn, taboo));
            }
        }
        return ret;
    }
}

function recursiveReveal(a, tabooArray = [])
{
    // note: I don't reveal all empty tiles because it feels too automated and boring
    // let group = floodCross(a, b => b === a || (b.id == ActorId.Empty && !b.revealed));
    let group = floodCross(a, b => b === a || (b.id == ActorId.Empty && !b.revealed && getAttackNumber(b.tx, b.ty) == 0));
    for(let g of group)
    {
        g.revealed = true;
    }
}

function getNeighborsWithDiagonals(tx, ty)
{
    let ret = [];
    for(let a of state.actors)
    {
        if(a.tx == tx && a.ty == ty) continue;
        if(distance(a.tx, a.ty, tx, ty) < 2)
        {
            ret.push(a);
        }
    }
    return ret;
}

function getNeighborsCross(tx, ty)
{
    let ret = [];
    for(let a of state.actors)
    {
        if(a.tx == tx && a.ty == ty) continue;
        let dist = distance(a.tx, a.ty, tx, ty);
        if(dist == 1)
        {
            ret.push(a);
        }
    }
    return ret;
}

function getRectForTile(tx, ty)
{
    let r = new Rect();
    r.w = 30;
    r.h = 30;
    r.x = tx * r.w;
    r.y = ty * r.h;
    return r;
}

function startHeartAnimation(heartIndex, frames)
{
    let a = new IndexedAnimation(heartIndex, frames);
    a.timer.once(frames.length, 60);
    state.heartAnimations.push(a);
}

function loopXPAnimation(heartIndex, frames)
{
    let a = new IndexedAnimation(heartIndex, frames);
    a.timer.loop(frames.length, 20);
    state.xpAnimations.push(a);
}

function startXPAnimation(heartIndex, frames)
{
    let a = new IndexedAnimation(heartIndex, frames);
    a.timer.once(frames.length, 60);
    state.xpAnimations.push(a);
}

function startTempHeroAnim(frames)
{
    state.tempHeroAnim.once(frames, 3);
}

function startHeroAnim(frames)
{
    if(state.heroAnim.frames != null && arraysEqual(state.heroAnim.frames, frames)) return;
    state.heroAnim.loop(frames, 3);
}

// function startFXExposeMinion(a)
// {
//     let rect = getRectForTile(a.tx, a.ty);
//     startFX([27, 28, 29, 30], rect.centerx(), rect.centery());
// }

function startFXChangeNumber(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([10, 11, 12], rect.centerx(), rect.centery()); // TODO: replace
}

function startFXAddOrb(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([20, 21, 22, 23, 24, 25, 26, 27], rect.centerx(), rect.centery()); // TODO: replace
}

function startFXGnomeJumping(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    // startFX([27, 28, 29, 30], rect.centerx(), rect.centery() - 5);
    startFX([14, 15], rect.centerx(), rect.centery());
}

function startFXReveal(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    // startFX([27, 28, 29, 30], rect.centerx(), rect.centery() - 5);
    startFX([60, 61, 62, 63, 64, 65, 66], rect.centerx(), rect.centery());
}

function startFXDisarmMine(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([10, 11, 12], rect.centerx(), rect.centery() - 5);
}

function startFXAngerMonster(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([70, 71, 72, 73, 74, 75, 76, 77], rect.centerx(), rect.centery() - 5);
}

function startFXDragonDead(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([70, 71, 72, 73, 74, 75, 76, 77], rect.centerx(), rect.centery() - 5);
}

function startFXMineExploding(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([40, 41, 42, 43], rect.centerx(), rect.centery() - 5);
}

function startFXWeakenDragon(tx, ty)
{
    let rect = getRectForTile(tx, ty);
    startFX([80, 81, 82, 83, 84], rect.centerx(), rect.centery() - 5);
}

function startFXMonsterHit(rect)
{
    startFX([3, 4, 5], rect.centerx(), rect.centery() - 5);
}

function startFX(framesArray, x, y, fps = 10)
{
    let a = new PlacedAnimation(framesArray, x, y);
    a.timer.once(framesArray.length, fps);
    state.animationsFX.push(a);
}

function play(sndEventId)
{
    if(!soundOn) return;
    let sounds = sndEvents[sndEventId];
    let sound = sounds[rnd(0, sounds.length)];
    sound.volume = 0.33;
    sound.play();
    return sound;
}

function grantXP(xp)
{
    state.player.xp += xp;
    state.player.score += xp;
}

function makeEmptyAndReveal(a)
{
    recursiveReveal(a);
    makeEmpty(a);
}

function makeAngrySnake(a)
{
    a.reset();
    a.id = ActorId.AngrySnake;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(250, 250);
    a.monsterLevel = 4;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeEmpty(a)
{
    a.reset();
    a.id = ActorId.Empty;
    a.strip = stripMonsters;
    a.stripFrame = 1; // empty sprite
    return a;
}

/** @param {Actor} a*/
function makeDecoration(a, strip, frame)
{
    a.reset();
    a.id = ActorId.Decoration;
    a.strip = strip;
    a.stripFrame = frame;
}

/** @param {Actor} a*/
function makeDragon(a)
{
    a.reset();
    a.id = ActorId.Dragon;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(200, 311);
    a.deadStripFrame = stripXYToFrame(230, 310);
    a.isMonster = true;
    a.monsterLevel = 15;
    // a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeSpellRevealSlimes(a)
{
    a.reset();
    a.id = ActorId.SpellRevealSlimes;
    a.strip = stripIcons;
    a.stripFrame = 19;
}

/** @param {Actor} a*/
function makeSpellRevealRats(a)
{
    a.reset();
    a.id = ActorId.SpellRevealRats;
    a.strip = stripIcons;
    a.stripFrame = 29;
}

/** @param {Actor} a*/
function makeSpellDisarm(a)
{
    a.reset();
    a.id = ActorId.SpellDisarm;
    a.strip = stripIcons;
    a.stripFrame = 35;
}

/** @param {Actor} a*/
function makeSpellNuke(a)
{
    a.reset();
    a.id = ActorId.SpellNuke;
    a.strip = stripIcons;
    a.stripFrame = 17;
}

/** @param {Actor} a*/
function makeOrb(a)
{
    a.reset();
    a.id = ActorId.Orb;
    a.strip = stripIcons;
    a.stripFrame = 23;
}

function makeSpellAngerMonsters(a)
{
    a.reset();
    a.id = ActorId.SpellAnger;
    a.strip = stripIcons;
    a.stripFrame = 39;
}

/** @param {Actor} a*/
function makeSpellOrb(a)
{
    a.reset();
    a.id = ActorId.SpellMakeOrb;
    a.strip = stripIcons;
    a.stripFrame = 10;
}

/** @param {Actor} a*/
function makeMedikit(a)
{
    a.reset();
    a.id = ActorId.Medikit;
    // a.strip = stripItems;
    // a.stripFrame = stripXYToFrame(22, 22);
    // a.heal = 4;
    a.strip = stripIcons;
    a.stripFrame = 22;
}

/** @param {Actor} a*/
function makeRatKing(a)
{
    a.reset();
    a.id = ActorId.RatKing;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(70, 265);
    a.isMonster = true;
    a.monsterLevel = 5;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeRat1(a)
{
    a.reset();
    a.id = ActorId.Rat;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(90, 265);
    a.isMonster = true;
    a.monsterLevel = 1;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeBat2(a)
{
    a.reset();
    a.id = ActorId.Bat;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(134, 231);
    a.isMonster = true;
    a.monsterLevel = 2;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeSkeleton3(a)
{
    a.reset();
    a.id = ActorId.Skeleton;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(70, 134);
    // a.stripFrame = stripXYToFrame(55, 100);
    // a.stripFrame = stripXYToFrame(250, 230);
    a.isMonster = true;
    a.monsterLevel = 3;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeSnake6(a)
{
    a.reset();
    a.id = ActorId.Snake;
    a.strip = stripMonsters;
    // a.stripFrame = stripXYToFrame(70, 134);
    // a.stripFrame = stripXYToFrame(55, 100);
    // a.stripFrame = stripXYToFrame(250, 230); // small snake
    a.stripFrame = stripXYToFrame(250, 250); // red snake
    a.isMonster = true;
    a.monsterLevel = 6;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeMinion9_(a)
{
    a.reset();
    a.id = ActorId.Minion;
    a.strip = stripMonsters;
    // a.stripFrame = stripXYToFrame(70, 134);
    // a.stripFrame = stripXYToFrame(55, 100);
    // a.stripFrame = stripXYToFrame(250, 230); // small snake
    a.stripFrame = stripXYToFrame(250, 250); // red snake
    a.isMonster = true;
    a.monsterLevel = 9;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeLich(a)
{
    a.reset();
    a.id = ActorId.Lich;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(250, 135);
    a.isMonster = true;
    a.monsterLevel = 11;
    a.xp = a.monsterLevel;
    return a;
}

// /** @param {Actor} a*/
// function makeDarkKnight7(a)
// {
//     a.reset();
//     a.id = ActorId.DarkKnight;
//     a.strip = stripMonsters;
//     a.stripFrame = stripXYToFrame(200, 100);
//     a.monsterLevel = 7;
//     a.xp = a.monsterLevel;
// }

/** @param {Actor} a*/
function makeGazer(a)
{
    a.reset();
    a.id = ActorId.Gazer;
    a.strip = stripMonsters;
    // a.stripFrame = stripXYToFrame(10, 170);
    // a.stripFrame = stripXYToFrame(70, 70);
    a.stripFrame = stripXYToFrame(135, 180);
    a.isMonster = true;
    a.monsterLevel = 5;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeSlime5(a)
{
    a.reset();
    a.id = ActorId.Slime;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(86, 473);
    a.isMonster = true;
    a.monsterLevel = 5;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeWizard(a)
{
    a.reset();
    a.id = ActorId.Wizard;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(72, 76);
    a.isMonster = true;
    a.monsterLevel = 1;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeElemental8(a)
{
    a.reset();
    a.id = ActorId.Elemental;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(200, 200);
    a.isMonster = true;
    a.monsterLevel = 8;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeBigSlime8(a)
{
    a.reset();
    a.id = ActorId.BigSlime;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(120, 455);
    a.isMonster = true;
    a.monsterLevel = 8;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeMiniElemental4(a)
{
    a.reset();
    a.id = ActorId.MiniElemental;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(134, 264);
    a.isMonster = true;
    a.monsterLevel = 4;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makePuddle(a)
{
    a.reset();
    a.id = ActorId.Puddle;
    a.strip = stripIcons;
    a.stripFrame = 25;
}

/** @param {Actor} a*/
function makeMinotaur7(a)
{
    a.reset();
    a.id = ActorId.Minotaur;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(200, 326);
    // a.stripFrame = stripXYToFrame(180, 170);
    a.isMonster = true;
    a.monsterLevel = 7;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeGargoyle4(a)
{
    a.reset();
    a.id = ActorId.Gargoyle;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(0, 210);
    a.isMonster = true;
    a.monsterLevel = 4;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeGiant7(a)
{
    a.reset();
    a.id = ActorId.Giant;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(0, 487);
    a.isMonster = true;
    a.monsterLevel = 7;
    a.xp = a.monsterLevel;
}

/** @param {Actor} a*/
function makeGnome(a)
{
    a.reset();
    a.id = ActorId.Gnome;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(135, 408);
    a.isMonster = true;
    a.monsterLevel = 0;
    a.xp = 10;
}


// /** @param {Actor} a*/
// function makeDeath9(a)
// {
//     a.reset();
//     a.id = ActorId.Death;
//     a.strip = stripMonsters;
//     a.stripFrame = stripXYToFrame(130, 340);
//     a.monsterLevel = 9;
//     a.xp = a.monsterLevel;
// }

// /** @param {Actor} a*/
// function makeDarkKnight5(a)
// {
//     a.reset();
//     a.id = ActorId.DarkKnight;
//     a.strip = stripMonsters;
//     a.stripFrame = stripXYToFrame(200, 168);
//     a.monsterLevel = 5;
//     a.xp = a.monsterLevel;
// }

// /** @param {Actor} a*/
// function makeEye5(a)
// {
//     a.reset();
//     a.id = ActorId.Eye;
//     a.strip = stripMonsters;
//     a.stripFrame = stripXYToFrame(135, 167);
//     a.monsterLevel = 5;
//     a.xp = a.monsterLevel;
// }

/** @param {Actor} a*/
function makeChest(a)
{
    a.reset();
    a.id = ActorId.Chest;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(70, 360);
    a.contains = makeTreasure5;
}

/** @param {Actor} a*/
function makeTreasure1(a)
{
    a.reset();
    a.id = ActorId.Treasure;
    a.strip = stripIcons;
    a.stripFrame = 30;
    a.xp = 1;
}

/** @param {Actor} a*/
function makeTreasure3(a)
{
    a.reset();
    a.id = ActorId.Treasure;
    a.strip = stripIcons;
    a.stripFrame = 31;
    a.xp = 3;
}

function makeTreasure5(a)
{
    a.reset();
    a.id = ActorId.Treasure;
    a.strip = stripIcons;
    a.stripFrame = 24;
    a.xp = 5;
}

/** @param {Actor} a*/
function makeMimic(a)
{
    a.reset();
    a.id = ActorId.Mimic;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(70, 360);
    a.isMonster = true;
    a.monsterLevel = 10;
    a.xp = a.monsterLevel;
    a.mimicMimicking = true;
}

/** @param {Actor} a*/
function makeWall(a)
{
    a.reset();
    a.id = ActorId.Wall;
    // a.strip = stripIcons;
    // a.stripFrame = stripXYToFrame(70, 7);
    a.strip = stripIcons;
    a.stripFrame = 11;
}

/** @param {Actor} a*/
function makeMine(a)
{
    a.reset();
    a.id = ActorId.Mine;
    a.strip = stripMonsters;
    a.stripFrame = stripXYToFrame(150, 455);
    a.deadStripFrame = stripXYToFrame(170, 455);
    a.isMonster = true;
    a.monsterLevel = 100;
    a.xp = 2;
}

function getAttackNumber(tx, ty)
{
    let ret = 0;
    for(let a of getNeighborsWithDiagonals(tx, ty))
    {
        if(a.monsterLevel > 0/* && !a.defeated*/)
        {
            ret += a.monsterLevel;
        }
    }
    return ret;
}

function updatePlaying(ctx, dt)
{
    let worldR = new Rect();
    worldR.w = backBuffer.width;
    worldR.h = backBuffer.height;
    let HUDRect = new Rect();
    HUDRect.w = backBuffer.width;
    HUDRect.h = 41;
    HUDRect.y = backBuffer.height - HUDRect.h;
    let oldPlayerHP = state.player.hp;
    let oldPlayerXP = state.player.xp;
    /** @type {Actor[]} */
    let activeActors = [];
    let actorRects = [];
    let hoveringActorIndex = -1;
    let pressedActorIndex = -1;
    let clickedActorIndex = -1;
    let cycleMarkerActorIndex = -1;
    for(let a of state.actors)
    {
        activeActors.push(a);

        let r = new Rect();
        r.w = 30;
        r.h = 30;
        r.x = a.tx * 30;
        r.y = a.ty * 30;
        actorRects.push(r);

        if((!a.revealed || !isEmpty(a)) && state.status == GameStatus.Playing && r.contains(mousex, mousey) && !state.showingMonsternomicon)
        {
            hoveringActorIndex = actorRects.length - 1;
            if(mousePressed) pressedActorIndex = actorRects.length - 1;
            if(mouseJustPressed) clickedActorIndex = actorRects.length - 1;
            if(mouseJustPressedRight) cycleMarkerActorIndex = actorRects.length - 1;
        }
    }

    // marker
    if(cycleMarkerActorIndex >= 0)
    {
        let marked = activeActors[cycleMarkerActorIndex];
        if(!marked.revealed)
        {
            marked.mark = (marked.mark + 1) % 12;
            play(marked.mark == 11 ? "mark_mine": "mark");
        }
    }

    // turn
    if(clickedActorIndex >= 0)
    {
        let pushed = activeActors[clickedActorIndex];
        let pushedR = actorRects[clickedActorIndex];

        // special case for the gnome
        if(pushed.id == ActorId.Gnome)
        {
            // if I have room, move away!
            let candidates = state.actors.filter(a => isEmpty(a) && !a.revealed);
            if(candidates.length > 0)
            {
                // move away!
                shuffle(candidates);
                makeGnome(candidates[0]);
                makeEmpty(pushed);
                play("gnome_jump");
                // startFXGnomeJumping(pushed.tx, pushed.ty);
            }
        }
        
        // if(pushed.id == ActorId.Puddle)
        // {
        //     if(pushed.revealed)
        //     {
        //         makeEmptyAndReveal(pushed);
        //         // TODO: splash
        //     }
        // }
        // else
        if(pushed.id == ActorId.SpellRevealSlimes)
        {
            if(pushed.revealed)
            {
                let foundOne = false;
                for(let a of state.actors)
                {
                    if(a.id == ActorId.Slime || a.id == ActorId.BigSlime)
                    {
                        foundOne = true;
                        a.revealed = true;
                        startFXReveal(a.tx, a.ty);
                    }
                }    
                
                makeEmptyAndReveal(pushed);
                play(foundOne ? "spell" : "wrong");
            }    
        }
        else
        if(pushed.id == ActorId.SpellRevealRats)
        {
            if(pushed.revealed)
            {
                let foundOne = false;
                for(let a of state.actors)
                {
                    if(a.id == ActorId.Rat)
                    {
                        foundOne = true;
                        a.revealed = true;
                        startFXReveal(a.tx, a.ty);
                    }
                }    
                
                makeEmptyAndReveal(pushed);
                play(foundOne ? "spell" : "wrong");
            }    
        }
        else
        if(pushed.id == ActorId.SpellDisarm)
        {
            if(pushed.revealed)
            {
                let candidates = state.actors.filter(a => !a.defeated && a.id == ActorId.Mine);
                for(let mine of candidates)
                {
                    mine.defeated = true;
                    mine.monsterLevel = 0;
                    if(mine.revealed)
                    {
                        // startFXDisarmMine(mine.tx, mine.ty);
                        startFXMineExploding(mine.tx, mine.ty);
                    }

                    for(let n of getNeighborsWithDiagonals(mine.tx, mine.ty))
                    {
                        if(isEmpty(n) && n.revealed)
                        {
                            startFXChangeNumber(n.tx, n.ty);
                        }
                    }
                }

                // let candidates = state.actors.filter(a => !a.defeated && a.id == ActorId.Mine && a.revealed);
                // for(let mine of candidates)
                // {
                //     mine.defeated = true;
                //     if(mine.revealed)
                //     {
                //         startFXDisarmMine(mine.tx, mine.ty);
                //     }
                // }
                makeEmptyAndReveal(pushed);
                play(candidates.length > 0 ? "earthquake" : "wrong");
                if(candidates.length > 0)
                {
                    state.screenShakeTimer = 1;
                }
            }    
        }
        else
        if(pushed.id == ActorId.SpellAnger)
        {
            if(pushed.revealed)
            {
                let candidates = state.actors.filter(a => !a.defeated && a.id == ActorId.Snake);
                for(let snake of candidates)
                {
                    let revealed = snake.revealed;
                    makeAngrySnake(snake);
                    snake.revealed = revealed;
                    if(revealed)
                    {
                        startFXAngerMonster(snake.tx, snake.ty);
                    }
                }
                makeEmptyAndReveal(pushed);
                play(candidates.length > 0 ? "spell" : "wrong");
            }    
        }
        else
        if(pushed.id == ActorId.SpellMakeOrb)
        {
            if(pushed.revealed)
            {
                let candidates = state.actors.filter(a => !a.revealed && isEmpty(a));
                shuffle(candidates);
                if(candidates.length > 0)
                {
                    let a = candidates[0];
                    makeOrb(a);
                    a.revealed = true;
                    startFXAddOrb(a.tx, a.ty);
                }
                makeEmptyAndReveal(pushed);
                play(candidates.length > 0 ? "spell" : "wrong");
            }
        }
        else
        if(pushed.id == ActorId.Treasure)
        {
            if(pushed.revealed)
            {
                grantXP(pushed.xp);
                makeEmptyAndReveal(pushed);
                play("pick_xp");
            }
        }
        else
        if(pushed.id == ActorId.Wall)
        {
            if(pushed.revealed)
            {
                if(state.player.hp == 1)
                {
                    // do not kill the player
                    play("wrong");
                }
                else
                {
                    state.player.hp -= 1;
                    pushed.wallHP--;
                    if(pushed.wallHP == 0)
                    {
                        recursiveReveal(pushed);
                        pushed.contains(pushed); // add whatever is inside the wall
                        play("wall_down");
                    }
                    else
                    {
                        play("hit_wall");
                        if(pushed.wallHP == pushed.wallMaxHP) pushed.stripFrame = 0;
                        else if(pushed.wallHP == 1) pushed.stripFrame = 2;
                        else pushed.stripFrame = 1;
                        pushed.stripFrame += 11;
                    }
                }
            }
        }
        else
        if(pushed.id == ActorId.Chest)
        {
            if(pushed.revealed)
            {
                pushed.contains(pushed);
                play("chest_open");
            }
        }
        else
        if(pushed.id == ActorId.SpellNuke)
        {
            if(pushed.revealed)
            {
                // destroy a cross
                let tiles = state.actors.filter(a => a.ty == pushed.ty);
                for(let a of tiles)
                {
                    if(a.id == ActorId.Dragon) continue;
                    makeEmptyAndReveal(a);
                    // TODO: debug why I need this
                    a.revealed = true;
                }
            }
        }
        else
        if(pushed.id == ActorId.Orb)
        {
            if(pushed.revealed)
            {
                makeEmptyAndReveal(pushed);

                // method: reveal around the spell
                let candidates = activeActors.filter(a => !a.revealed && distance(a.tx, a.ty, pushed.tx, pushed.ty) < 2);
                let index = 0;
                while(index < candidates.length)
                {
                    let pick = candidates[index++];
                    pick.revealed = true;
                    if(pick != pushed) startFXReveal(pick.tx, pick.ty);
                }

                if(candidates.length > 0)
                {
                    play("reveal");
                }
                else
                {
                    play("wrong");
                }
            }
        }
        else
        if(pushed.isMonster)
        {
            // combat
            // mimic acts mimicky
            if(pushed.mimicMimicking && !pushed.revealed)
            {
                // act dumb
            }
            else
            if(!pushed.defeated)
            {
                if(pushed.mimicMimicking)
                {
                    pushed.mimicMimicking = false;
                }

                state.player.hp -= pushed.monsterLevel;
                if(state.player.hp > 0)
                {
                    pushed.defeated = true;
                    startTempHeroAnim(HERO_STABBING);
                }
    
                if(pushed.id == ActorId.Dragon)
                {
                    state.screenShakeTimer = 0.8;
                    startFXDragonDead(pushed.tx, pushed.ty);
                    play("dragon_dead");
                }
                else
                if(pushed.id == ActorId.Mine)
                {
                    pushed.stripFrame = stripXYToFrame(130, 455);
                    startFXMineExploding(pushed.tx, pushed.ty);
                    play("explode");
                }
                else
                if(pushed.id == ActorId.Gnome)
                {
                    play("disappointed");
                }
                else
                if(pushed.id == ActorId.RatKing || pushed.id == ActorId.Lich || pushed.id == ActorId.Wizard || pushed.id == ActorId.Gazer)
                {
                    startFXMonsterHit(pushedR);
                    play("fight_special");
                }
                else
                if(pushed.id == ActorId.Minion)
                {
                    // weaken the dragon
                    let dragon = state.actors.find(a => a.id == ActorId.Dragon && !a.defeated);
                    if(dragon != undefined && pushed.defeated)
                    {
                        dragon.monsterLevel -= 1;
                        startFXWeakenDragon(dragon.tx, dragon.ty);
                        play("dragon_hurt");
                    }
                }
                else
                {
                    startFXMonsterHit(pushedR);
                    play("fight");
                }
            }
            else
            if(state.player.hp > 0 && pushed.revealed)
            {
                grantXP(pushed.xp);
                if(pushed.id == ActorId.RatKing)
                {
                    makeSpellRevealRats(pushed);
                }
                else
                if(pushed.id == ActorId.Wizard)
                {
                    makeSpellRevealSlimes(pushed);
                    // makeSpellOrb(pushed);
                }
                else
                if(pushed.id == ActorId.Lich)
                {
                    makeSpellDisarm(pushed);
                }
                else
                {
                    makeEmptyAndReveal(pushed);
                }

                play("pick_xp");
            }
            // pushed.revealed = true;
        }
        else
        if(pushed.id == ActorId.Medikit)
        {
            if(pushed.revealed)
            {
                if(state.player.hp < state.player.maxHP)
                {
                    state.player.hp = state.player.maxHP;
                    play("heal");
                }
                else
                {
                    play("wrong");
                }
                makeEmptyAndReveal(pushed);
            }
        }
        
        if(!pushed.revealed)
        {
            // pushed.revealed = true;
            if(isEmpty(pushed)) recursiveReveal(pushed);
            else pushed.revealed = true;
            play("uncover");
        }

        state.lastActorTypeClicked = pushed.id;
        state.lastTileClicked = pushed;
    }

    // update all the actors
    for(let a of state.actors)
    {
        if(a.id == ActorId.Rat)
        {
            let king = state.actors.find(b => b.id == ActorId.RatKing);
            if(king != undefined)
            {
                if(distance(king.tx, king.ty, a.tx, a.ty) == 1 && a.tx == king.tx) a.stripFrame = stripXYToFrame(90, 260) + 3;
                else if(king.tx > a.tx) a.stripFrame = stripXYToFrame(90, 260);
                else a.stripFrame = stripXYToFrame(90, 260)+2;
                // if(king.tx < a.tx) a.stripFrame = stripXYToFrame(90, 260);
                // else if(king.tx == a.tx) a.stripFrame = stripXYToFrame(90, 260)+1;
                // else if(king.tx < a.tx) a.stripFrame = stripXYToFrame(90, 260)+2;
                // else stripXYToFrame(90, 260)+2;
            }
            else
            {
                a.stripFrame = stripXYToFrame(90, 260) + 3; // standing
            }
        }
        else
        if(a.id == ActorId.Mimic && !a.mimicMimicking)
        {
            a.stripFrame = stripXYToFrame(70, 375);
        }
        // else
        // if(a.id == ActorId.Lich && !a.defeated)
        // {
        //     // lich has extra health given by skeletons
        //     a.monsterLevel = makeLich(new Actor()).monsterLevel;
        //     for(let b of state.actors)
        //     {
        //         if(b.id == ActorId.Skeleton && !b.defeated)
        //         {
        //             a.monsterLevel += 1;
        //         }
        //     }
        // }
        // if(a.isTrap && !a.trapDisarmed)
        // {
        //     let neighs = getNeighborsCross(a.tx, a.ty);
        //     if(neighs.find(b => !b.revealed) == undefined)
        //     {
        //         a.revealed = true;
        //     }
        // }
    }

    // TODO: slow to do all the time
    // revealIsolatedGroupsOfMines(activeActors);

    let heroR = new Rect();
    heroR.w = 32;
    heroR.h = 32;
    heroR.y = HUDRect.centery() - heroR.h * 0.5 - 3;
    heroR.x = 55;

    let levelupButtonR = new Rect();
    levelupButtonR.w = 30;
    levelupButtonR.h = HUDRect.h;
    levelupButtonR.y = heroR.y;
    levelupButtonR.x = heroR.x;

    let isLevelupButtonEnabled = state.player.hp > 0 && state.player.xp >= nextLevelXP(state.player.level) && state.status == GameStatus.Playing;
    let mustLevelup = levelupButtonR.contains(mousex, mousey) && mouseJustPressed && isLevelupButtonEnabled;

    if(debugOn)
    {
        if(keysJustPressed.includes('w'))
        {
            localStorage.clear();
            loadSettings();
            musicToRun = null;
        }
        
        if(keysJustPressed.includes('l'))
        {
            state.player.xp += nextLevelXP(state.player.level);
            mustLevelup = true;
        }

        if(keysJustPressed.includes('k'))
        {
            for(let a of state.actors.filter(a => a.id == ActorId.Dragon || a.id == ActorId.Lich))
            {
                a.monsterLevel = 1;
            }
        }

        if(keysJustPressed.includes('i'))
        {
            state.player.hp = 2;
            state.status = GameStatus.Playing;
        }
    }        

    if(mustLevelup)
    {
        // leveling
        state.player.xp -= nextLevelXP(state.player.level);
        state.player.level += 1;
        if(state.player.maxHP < MAX_LEVEL)
        {
            state.player.maxHP += 1;
            startHeartAnimation(state.player.maxHP-2, HEART_NEW);
        }
        state.player.hp = state.player.maxHP;
        play("level_up");
        state.levelupAnimation.once(LEVELUP_FRAMES, 60);
        state.xpAnimations = [];
        startTempHeroAnim(HERO_LEVELING);
    }
        
    // win/lose
    if(state.player.hp <= 0)
    {
        state.player.hp = 0;
        if(oldPlayerHP > 0)
        {
            state.tempHeroAnim.stop();
            play("lose");
            state.screenShakeTimer = 0.7;
            // reveal everything that needs revealing
            for(let a of state.actors)
            {
                // a.revealed = true;
                if(a.id == ActorId.Mimic) a.mimicMimicking = false;
                // else if(a.id == ActorId.Chest) a.contains(a);
            }
        }
    }
    else
    {
        if(oldPlayerHP > 1 && state.player.hp == 1 && state.player.xp < nextLevelXP(state.player.level))
        {
            play("alarm");
        }

        // run any relevant heart animations
        if(oldPlayerHP < state.player.hp)
        {
            for(let i = oldPlayerHP-1; i < state.player.hp; i++)
            {
                startHeartAnimation(i, HEART_GROWING);
            }
        }
        else
        if(oldPlayerHP > state.player.hp)
        {
            for(let i = state.player.hp-1; i < oldPlayerHP - 1; i++)
            {
                startHeartAnimation(i, HEART_DRAINING);
            }    
        }
    }

    if(oldPlayerXP < state.player.xp && state.player.xp >= nextLevelXP(state.player.level))
    {
        play("can_level");
    }

    if(state.player.xp >= nextLevelXP(state.player.level))
    {
        for(let i = 0; i < state.player.xp; i++)
        {
            if(state.xpAnimations.find(a => a.frames == frames && a.index == i) == undefined)
            {
                loopXPAnimation(i, XP_SPINNING);
            }
        }            
    }
    else
    {
        state.xpAnimations = state.xpAnimations.filter(a => a.frames != XP_SPINNING);
        if(oldPlayerXP < state.player.xp)
        {
            for(let i = oldPlayerXP; i < state.player.xp; i++)
            {
                startXPAnimation(i, XP_GROWING);
            }
        }
        else
        if(oldPlayerXP > state.player.xp)
        {
            for(let i = state.player.xp; i < oldPlayerXP; i++)
            {
                startXPAnimation(i, XP_SHRINKING);
            }
        }
    }

    // debugLines.push("hover "+hoveringActorIndex+ " click:"+clickedActorIndex + " hp "+state.player.hp+ " xp "+state.player.xp + " next "+nextLevelXP(state.player.level));
    // debugLines.push("level "+state.player.level+ " next "+nextLevelXP(state.player.level));
    // debugLines.push("maxhp "+state.player.maxHP+ " hp "+state.player.hp);
    if(debugOn)
    {
        let stats = state.stats;
        debugLines.push("tiles "+(stats.total)+" empties "+stats.empties +" totalXP "+stats.totalXP + " xpToMax "+stats.xpRequiredToMax+ " excessXP "+stats.excessXP);
    }

    // { 
    //     let xpStr = "";
    //     for(let i = 1; i < 19; i++)
    //     {
    //         xpStr += ""+i+": " + nextLevelXP(i)+" ";
    //     }
    //     debugLines.push(xpStr);
    // }

    if(state.status == GameStatus.Playing)
    {
        if(state.player.hp == 0)
        {
            state.status = GameStatus.Dead;
        }
        else
        if(activeActors.find(a => a.id == ActorId.Dragon && !a.defeated) == undefined)
        {
            state.status = GameStatus.DragonDefeated;
        }
    }

    let isRestartButtonEnabled = state.status == GameStatus.Dead;
    let isWinButtonEnabled = state.status == GameStatus.DragonDefeated;

    if(mouseJustPressed && levelupButtonR.contains(mousex, mousey) && !isLevelupButtonEnabled && !isRestartButtonEnabled && !isWinButtonEnabled)
    {
        startTempHeroAnim(HERO_ITS_A_ME);
        play("peachus");
    }
    

    let resetGame = false;
    if(keysJustPressed.includes('r')) resetGame = true;
    if(mouseJustPressed && levelupButtonR.contains(mousex, mousey) && isRestartButtonEnabled)
    {
        resetGame = true;
    }
    
    if(mouseJustPressed && levelupButtonR.contains(mousex, mousey) && isWinButtonEnabled)
    {
        state.status = GameStatus.WinScreen;
        play("win");
    }

    // update book movement
    if(state.player.level > 11)
    {
        state.bookLocationElapsed = Math.min(BOOK_MOVEMENT_DURATION, state.bookLocationElapsed + dt);
    }
    
    let nomiconR = new Rect();
    nomiconR.w = 32;
    nomiconR.h = 32;
    nomiconR.x = lerp(13, worldR.right() - nomiconR.w - 5, 1 - state.bookLocationElapsed/BOOK_MOVEMENT_DURATION);
    nomiconR.y = HUDRect.centery() - nomiconR.h * 0.5;

    if(mouseJustPressed && nomiconR.contains(mousex, mousey))
    {
        state.showingMonsternomicon = !state.showingMonsternomicon;
        nomiconWasEverRead = true;
        saveSettings();
        play("book");
    }

    let jorgeR = new Rect();
    jorgeR.h = HUDRect.h;
    jorgeR.w = 50;
    jorgeR.y = HUDRect.y;

    // animations
    for(let ha of state.heartAnimations)
    {
        ha.timer.update(dt);
    }
    state.heartAnimations = state.heartAnimations.filter(anim => !anim.timer.finished);

    for(let ha of state.xpAnimations)
    {
        ha.timer.update(dt);
    }
    state.xpAnimations = state.xpAnimations.filter(anim => !anim.timer.finished);
    
    state.tempHeroAnim.update(dt);
    state.heroAnim.update(dt);

    for(let anim of state.animationsFX)
    {
        anim.timer.update(dt);
    }
    state.animationsFX = state.animationsFX.filter(anim => !anim.timer.finished);

    let clickedHUD = mouseJustPressed && HUDRect.contains(mousex, mousey);

    // hero animations
    if(state.status == GameStatus.DragonDefeated)
    {
        startHeroAnim(HERO_CELEBRATING);
    }
    else
    if(state.player.hp == 0)
    {
        startHeroAnim(HERO_DEAD);
    }
    else
    if(isLevelupButtonEnabled)
    {
        startHeroAnim(HERO_EMPOWERED);
    }
    else
    if(state.player.hp == 1)
    {
        startHeroAnim(HERO_NAKED);
    }
    else
    {
        startHeroAnim(HERO_IDLE);
    }        

    // if(state.status == GameStatus.Dead)
    // {
    //     if(clickedHUD) resetGame = true;
    // }
    // else
    // if(state.status == GameStatus.DragonDefeated)
    // {
    //     if(clickedHUD)
    //     {
    //         state.status = GameStatus.WinScreen;
    //     }
    // }

    // screen shake
    let screenx = 0;
    let screeny = 0;
    if(state.screenShakeTimer > 0)
    {
        state.screenShakeTimer -= dt;
        screenx = rnd(-2, 2);
        screeny = rnd(-1, 1);
    }

    // rendering
    ctx.save();
    ctx.translate(screenx, screeny);
    ctx.fillStyle = "#30291f";
    ctx.fillRect(0, 0, worldR.w, worldR.h);
    let showEverything = state.status == GameStatus.Dead;
    for(let i = 0; i < activeActors.length; i++)
    {
        let a = activeActors[i];
        let r = actorRects[i];
        let centerx = r.centerx();
        let centery = r.centery();
        let pressed = pressedActorIndex >= 0 && activeActors[pressedActorIndex] === a;
        let icon = pressed ? 1 : 0;
        if(isEmpty(a) && a.revealed) icon = 1;
        if(showEverything) icon = 1;
        if(icon == 0 && a.xp > 0 && a.revealed && (!a.isMonster || a.defeated)) icon = 2;
        // do not lower tile with killer monster
        if(state.player.hp == 0 && state.lastTileClicked == a) icon = 0;
        drawFrame(ctx, stripUI, icon, centerx, centery);
        if(icon != 1 && icon != 2) drawFrame(ctx, stripUI, state.buttonFrames[a.tx + a.ty*state.gridW], centerx, centery);
        if(a.revealed || debugOn || showEverything)
        {
            if(isEmpty(a))
            {
                let neighbors = getAttackNumber(a.tx, a.ty);
                
                {
                    // if(getNeighborsWithDiagonals(a.tx, a.ty).find(b => b.id == ActorId.Gnome && !b.defeated) != undefined)
                    
                    if(state.actors.find(b => b.id == ActorId.Gazer && !b.defeated && distance(b.tx, b.ty, a.tx, a.ty) <= 2) != undefined)
                    {
                        fontUINumbers.drawLine(ctx, "?", centerx, centery, FONT_CENTER|FONT_VCENTER);
                    }
                    else
                    if(neighbors > 0)
                    {
                        fontUINumbers.drawLine(ctx, ""+neighbors, centerx, centery, FONT_CENTER|FONT_VCENTER);
                    }
                }    
            }
            else
            if(a.isMonster)
            {
                let monsterY = centery - 5;
                if(a.defeated && a.xp == 0) monsterY += 5;
                if(a.defeated && a.deadStripFrame > 0) drawFrame(ctx, a.strip, a.deadStripFrame, centerx, monsterY);
                else if(a.mimicMimicking) drawFrame(ctx, a.strip, a.stripFrame, centerx, centery);
                else drawFrame(ctx, a.strip, a.stripFrame, centerx, monsterY);

                if(a.defeated)
                {
                    if(a.xp > 0)
                    {
                        drawXPIndicator(ctx, r, a.xp);
                    }
                    else
                    {
                        monsterY += 5;
                    }
                }
                else
                if(!a.mimicMimicking || debugOn)
                {
                    // fontUI.drawLine(ctx, ""+a.monsterLevel, r.centerx() + 1, r.bottom() - 4, FONT_CENTER|FONT_BOTTOM);
                    drawLineOutlineCentered(ctx, ""+a.monsterLevel, r.centerx() + 1, r.bottom() - 4, FONT_CENTER|FONT_BOTTOM)
                }
            }
            else
            if(a.id == ActorId.Treasure)
            {
                drawFrame(ctx, a.strip, a.stripFrame, centerx, centery - 4);
                drawXPIndicator(ctx, r, a.xp);
            }
            else
            {
                drawFrame(ctx, a.strip, a.stripFrame, centerx, centery);
                if(debugOn)
                {
                    if(a.id == ActorId.Wall)
                    {
                        drawLineOutlineCentered(ctx, a.wallHP + "/" + a.wallMaxHP, r.centerx() + 1, r.bottom() - 3, FONT_CENTER|FONT_BOTTOM)
                    }
                }
            }        
        }
        
        if(a.mark > 0 && !a.revealed && !showEverything)
        {
            let str = a.mark == 11 ? "&" : ""+a.mark;
            let x = Math.floor(centerx);
            let y = Math.floor(centery);
            let centering = FONT_CENTER|FONT_VCENTER;
            let text = str;
            fontUIBlackDark.drawLine(ctx, text, x+1, y, centering);
            fontUIBlackDark.drawLine(ctx, text, x, y+1, centering);
            fontUIBlackDark.drawLine(ctx, text, x-1, y, centering);
            fontUIBlackDark.drawLine(ctx, text, x, y-1, centering);
            fontUIBlackDark.drawLine(ctx, text, x+1, y+1, centering);
            fontUIBlackDark.drawLine(ctx, text, x-1, y+1, centering);
            fontUIBlackDark.drawLine(ctx, text, x-1, y-1, centering);
            fontUIBlackDark.drawLine(ctx, text, x+1, y-1, centering);
            fontUIRed.drawLine(ctx, text, x, y, centering);
        }
    }

    // fx
    for(let a of state.animationsFX)
    {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.scale(2,2);
        drawFrame(ctx, stripFX, a.frames[a.timer.frame], 0, 0);
        ctx.restore();
    }
    

    // monsternomicon
    if(state.showingMonsternomicon)
    {
        let bookR = new Rect();
        bookR.w = worldR.w;
        bookR.h = worldR.h - HUDRect.h;
        let bookLeft = new Rect();
        bookLeft.copyFrom(bookR);
        bookLeft.w = bookR.w * 0.5;
        let bookRight = new Rect();
        bookRight.copyFrom(bookR);
        bookRight.w = bookR.w * 0.5;
        bookRight.x = bookR.w * 0.5;

        // ctx.fillStyle = "#c7a381";
        // ctx.fillRect(bookR.x, bookR.y, bookR.w, bookR.h);
        drawFrame(ctx, stripBook, 0, worldR.centerx(), worldR.centery() - 13);
        let top = 30;
        fontBook.drawLine(ctx, "Monsternomicon", bookLeft.centerx(), top, FONT_CENTER);

        let lines = [];
        lines.push("* jorge must defeat dragon");
        lines.push("* safe to use all hearts");
        lines.push("* observe patterns when dead");
        // lines.push("* guessing means death");
        // lines.push("* walls can be taken down");
        // lines.push("crowned monsters reveal minions");
        // lines.push("* press \"S\" to toggle sound");
        lines.push("* right click to mark");
        // lines.push("* fear the mimic");
        lines.push("* numbers are sum of");
        lines.push("  monster level");

        drawFrame(ctx, stripHint, 0, bookLeft.centerx(), bookLeft.bottom() - 108 - 15);
        drawFrame(ctx, stripHintLevelup, 0, bookLeft.x + 35, bookLeft.bottom() - 40 - 15);
        fontUIBook.drawLine(ctx, "touch jorge to level up", 55, bookRight.bottom() - 35 - 15);

        fontBook.drawLine(ctx, "* fear the mimic *", bookRight.centerx(), bookRight.bottom() - 35, FONT_CENTER);

        let soundR = new Rect();
        soundR.w = 16;
        soundR.h = 16;
        soundR.x = bookLeft.x + 20;
        soundR.y = bookLeft.bottom() - 25;
        if(mouseJustPressed && soundR.contains(mousex, mousey))
        {
            soundOn = !soundOn;
            if(soundOn)
            {
                play("spell");
            }
        }
        drawFrame(ctx, stripIcons, soundOn ? 58 : 57, soundR.centerx(), soundR.centery());

        let musicR = new Rect();
        musicR.w = 16;
        musicR.h = 16;
        musicR.x = soundR.right() + 10;
        musicR.y = bookLeft.bottom() - 25;
        if(mouseJustPressed && musicR.contains(mousex, mousey))
        {
            musicOn = !musicOn;
        }
        drawFrame(ctx, stripIcons, musicOn ? 151 : 150, musicR.centerx(), musicR.centery());

        let offy = 0;
        for(let line of lines)
        {
            fontUIBook.drawLine(ctx, line, 15, 20 + offy + top);
            offy += 15;    
        }

        let bookRightBody = new Rect();
        bookRightBody.copyFrom(bookRight);
        bookRightBody.h = bookRight.w  - 20;
        bookRightBody.y = 40 + 10;
        bookRightBody.w *= 0.85;
        bookRightBody.x += 20;
        // fontUIBook.drawLine(ctx, "fear the mimic", bookRightBody.centerx(), bookRightBody.centery(), FONT_CENTER);

        // monster list
        let showCountY = bookRightBody.y;
        let showCountX = bookRightBody.x + 25;
        let showLineCounter = 0;
        showCount(makeRat1);
        showCount(makeBat2);
        showCount(makeSkeleton3);
        showCount(makeGargoyle4);
        // showCount(makeEye5);
        showCount(makeSlime5);
        showCount(makeSnake6);
        showCount(makeMinotaur7);
        // showCount(makeGiant7);
        showCount(makeBigSlime8);
        // showCount(makeMinion9);
        // showCount(makeAngrySnake);
        // showCount(makeDeath9);
        showCount(makeLich); 

        // showCount(makeLich); // 9
        showCount(makeRatKing);
        showCount(makeGazer);
        // showCount(makeSlimeKing);
        // showCount(makeLich);
        
        showCount(makeWizard);
        showCount(makeMimic, stripXYToFrame(70, 375));
        // showCount(makeDragon);
        showCount(makeMine);
        showCount(makeGnome);
        showCount(makeMedikit);
        showCount(makeSpellOrb);
        showCount(makeSpellDisarm);
        // showCount(makeSpellAngerMonsters);
        // showCount(makeChest);

        fontUIBook.drawLine(ctx, version, bookLeft.right() - 45, bookRight.bottom() - 12);

        function showCount(makerFn, overrideFrame = -1)
        {
            let placeholder = new Actor();
            makerFn(placeholder);

            let count = 0;
            for(let a of state.actors)
            {
                if(placeholder.id == a.id) count += 1;
                else if(placeholder.id == ActorId.SpellMakeOrb && a.contains == makeSpellOrb) count += 1;
                else if(placeholder.id == ActorId.Medikit && a.contains == makeMedikit) count += 1;
                else if(placeholder.id == ActorId.SpellDisarm && a.id == ActorId.Lich) count += 1;
                else if(placeholder.id == ActorId.SpellRevealRats && a.id == ActorId.RatKing) count += 1;
                else if(placeholder.id == ActorId.SpellRevealSlimes && a.id == ActorId.Wizard) count += 1;
            }


            // if(all.length > 0)
            {
                let frame = placeholder.stripFrame;
                if(overrideFrame >= 0) frame = overrideFrame;
                drawFrame(ctx, stripIcons, 14, showCountX, showCountY);
                drawFrame(ctx, placeholder.strip, frame, showCountX, showCountY);

                let level = placeholder.monsterLevel;
                if(placeholder.id == ActorId.Lich)
                {
                    let lich = state.actors.find(a => a.id == ActorId.Lich);
                    if(lich != undefined)
                    {
                        level = lich.monsterLevel;
                    }
                }

                let str = "$"+count;
                if(placeholder.isMonster) fontUIBook.drawLine(ctx, "L"+level, showCountX - 10, showCountY, FONT_VCENTER|FONT_RIGHT);
                if(makerFn == makeGazer) str = "$?";
                fontUIBook.drawLine(ctx, str, showCountX + 12, showCountY, FONT_VCENTER);
                showCountY += 20;
                showLineCounter += 1;
                if(showLineCounter == 9)
                {
                    showCountX += 90;
                    showCountY = bookRightBody.y;
                }
            }
        }
    }

    // hud
    drawFrame(ctx, stripHUD, 0, HUDRect.centerx(), HUDRect.centery());

    // hero
    let heroButtonEnabled = isLevelupButtonEnabled || isWinButtonEnabled || isRestartButtonEnabled;
    drawFrame(ctx, stripLevelupButtons, heroButtonEnabled ? 0 : 1, levelupButtonR.centerx(), levelupButtonR.centery() + 1);
    fontHUD.drawLine(ctx, "Peach", 10, heroR.centery() + 1, FONT_VCENTER);

    ctx.save();
    ctx.translate(heroR.centerx() - 1, heroR.centery());
    ctx.scale(2,2);
    if(state.tempHeroAnim.running()) drawFrame(ctx, stripHero, state.tempHeroAnim.frame(), 0, 0);
    else if(state.heroAnim.running()) drawFrame(ctx, stripHero, state.heroAnim.frame(), 0, 0);
    ctx.restore();

    // hp
    if(state.status == GameStatus.Playing)
    {
        let hpCenterY = worldR.h - 29;
        let heartOffsetsX = [];
        let hpx = 0;
        for(let i = 0; i < state.player.maxHP - 1; i++)
        {
            heartOffsetsX.push(hpx);
            let w = 16;
            if(i > 0 && (i+1) % 3 == 0 && i < (state.player.maxHP - 2) && state.player.maxHP > 1) w += 4;
            hpx += w;
        }

        let offx = heroR.right() + 10;//(worldR.w - heartOffsetsX[heartOffsetsX.length - 1])/2;
        for(let i = 0; i < heartOffsetsX.length; i++)
        {
            let icon = i < state.player.hp - 1 ? 0 : 1;
            let anim = state.heartAnimations.find(anim => anim.index == i);
            if(anim != undefined) icon = anim.frames[anim.timer.frame];
            let hx = heartOffsetsX[i] + offx;
            let hy = hpCenterY;
            if(i == 17)
            {
                hx = heartOffsetsX[i-1] + offx;
                hy += 15;
            }
            drawFrame(ctx, stripIcons, icon, hx, hy);
        }
    }

    // xp
    if(state.status == GameStatus.Playing)
    {
        let xpTotal = nextLevelXP(state.player.level);
        let xpOffsetsX = [];
        let xpX = 0;
        let xp = Math.min(state.player.xp, xpTotal);
        for(let i = 0; i < xpTotal; i++)
        {
            xpOffsetsX.push(xpX);
            let w = 8;
            if(i > 0 && (i+1) % 3 == 0 && i < (xpTotal - 1) && xpTotal > 3) w += 4;
            xpX += w;
        }

        let offx = heroR.right() + 10;//(worldR.w - xpOffsetsX[xpOffsetsX.length - 1])/2;
        for(let i = 0; i < xpOffsetsX.length; i++)
        {
            let icon = i < xp ? 6 : 7;
            let anim = state.xpAnimations.find(anim => anim.index == i);
            if(anim != undefined) icon = anim.frames[anim.timer.frame];
            let offy = worldR.h - 14;
            if((i % 2) == 0) offy += 6;
            drawFrame(ctx, stripIcons, icon, xpOffsetsX[i] + offx, offy);
        }
        offx += xpOffsetsX[xpOffsetsX.length - 1] + 12;

        if(state.player.xp > nextLevelXP(state.player.level))
        {
            drawFrame(ctx, stripIcons, 56, offx, worldR.h - 12);
        }
    }

    { // levelup button
        // let levelupButtonFrame = isLevelupButtonEnabled ? 0 : 1;
        // drawFrame(ctx, stripLevelupButtons, levelupButtonFrame, levelupButtonR.centerx(), levelupButtonR.centery());
        // drawFrame(ctx, stripLevelupButtons, 2, levelupButtonR.centerx(), levelupButtonR.centery());
    }

    // book icon
    let bookSine = (Math.sin(timeElapsed*5)+1)*0.5 * 5 * (nomiconWasEverRead ? 0 : 1);
    
    ctx.save();
    ctx.translate(nomiconR.centerx(), nomiconR.centery() + 3);
    ctx.scale(1,1);
    drawFrame(ctx, stripIconsBig, 1, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(nomiconR.centerx(), nomiconR.centery() - bookSine);
    ctx.scale(1,1);
    drawFrame(ctx, stripIconsBig, 0, 0, 0);
    ctx.restore();

    if(state.status == GameStatus.Dead)
    {
        let deathCause = "KILLED BY A "+state.lastActorTypeClicked;
        if(state.lastActorTypeClicked == ActorId.RatKing) deathCause = "KILLED BY THE RAT KING";
        else if(state.lastActorTypeClicked == ActorId.Lich) deathCause = "KILLED BY THE LICH";
        else if(state.lastActorTypeClicked == ActorId.Dragon) deathCause = "KILLED BY THE DRAGON";

        drawMultiline(ctx, fontHUD, [deathCause, "< restart"], levelupButtonR.right() + 5, HUDRect.centery(), FONT_VCENTER);
    }
    else if(state.status == GameStatus.DragonDefeated)
    {
        drawMultiline(ctx, fontHUD, ["DRAGON DEFEATED!!!", "< win the game"], levelupButtonR.right() + 5, HUDRect.centery(), FONT_VCENTER);
    }

    if(state.levelupAnimation.running())
    {
        state.levelupAnimation.update(dt);
        ctx.save();
        ctx.translate(70, HUDRect.bottom() - 60);
        ctx.scale(0.4, 0.4);
        drawFrame(ctx, stripLevelup, state.levelupAnimation.frame(), 0, 0);
        ctx.restore();
    }
    
    ctx.restore();

    if(resetGame)
    {
        newGame();
        play("restart");
    }    
}

function updateWinscreen(ctx, dt)
{
    musicToRun = "music_win";

    let r = new Rect();
    r.w = backBuffer.width;
    r.h = backBuffer.height;
    
    ctx.fillStyle = "#000000";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.drawImage(imgJuliDragon, r.centerx() - imgJuliDragon.width/2, -10);
    // fontHUD.drawLine(ctx, "you win the gaem!!!", 100, 100);

    let lines = [];
    lines.push("As the deadly beast finally expires");
    lines.push("Jorge's thoughts get clouded");
    lines.push("By his troubled desires.");
    lines.push("");
    lines.push("\"Is this the end? Shall I too say farewell");
    lines.push("To the battlefields, and let my body rest");
    lines.push("And be part of the bonfire?\"");

    // lines.push("sitting next to the smoking corpse");
    // lines.push("jorge admires the glimmer of its scales");
    // lines.push("oblivious to the celebrations of men");
    // lines.push("a hunter without the bond of his prey");
    // lines.push("feeling the bitter sting of loneliness");
    lines.push("");
    lines.push("final score: "+state.player.score);
    drawMultiline(ctx, fontWinscreen, lines, r.centerx(), 200, FONT_CENTER|FONT_VCENTER);

    let offy = r.bottom() - 20;
    fontCredits.drawLine(ctx, "por Daniel Benmergui - musica: hernan rozenwasser", r.centerx(), offy, FONT_BOTTOM|FONT_CENTER);
    offy += 7;
    fontCredits.drawLine(ctx, "imagen: julieta romero - poema: dani renton", r.centerx(), offy, FONT_BOTTOM|FONT_CENTER);
    offy += 7;
    fontCredits.drawLine(ctx, "gracias: mer grazzini, mademoiselle ^lin, antonio uribe", r.centerx(), offy, FONT_BOTTOM|FONT_CENTER);
    offy += 7;
    fontCredits.drawLine(ctx, "inspirado en mamono sweeper - hecho en #", r.centerx(), offy, FONT_BOTTOM|FONT_CENTER);
}

function onUpdate(phase, dt)
{
    if(phase == UpdatePhase.Init)
    {
        WORLDW = 390;// + 30*2;
        WORLDH = 330 + 10;
        ZOOMX = 2;
        ZOOMY = 2;

        stripIconsBig = loadStrip("icons24x24.png", 24, 24, 24/2, 24/2);
        stripHintLevelup = loadStrip("hint_levelup.png", 32, 32, 32/2, 32/2);
        stripHint = loadStrip("hint.png", 90, 90, 90/2, 90/2);
        stripHero = loadStrip("hero.png", 16, 16, 16/2, 16/2);
        stripUI = loadStrip("buttons30x30.png", 30, 30, 15, 15);
        stripLevelupButtons = loadStrip("levelup_buttons.png", 30, 29, 15, 29/2);
        stripIcons = loadStrip("icons16x16.png", 16, 16, 8, 8);
        stripMonsters = loadStrip("tiny_dungeon_monsters.png", 16, 16, 8, 8);
        stripHUD = loadStrip("hud.png", 390, 41, 390/2, 41/2);
        stripBook = loadStrip("book.png", 450, 300, 450*0.5, 300*0.5);
        stripFX = loadStrip("uf_FX_impact.png", 48, 48, 48/2, 48/2);
        stripScanlines = loadStrip("scanlines.png", 450, 335, 0, 0);
        stripLevelup = loadStrip("levelup.png", 225, 125, 225/2, 125/2);
        imgJuliDragon = loadImage("juli_dragon.png");

        fontDebug = loadFont("font_small_white.png", 6, 6, 0, 6, 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-+=:;,\"<>.?/\\[]_| ",
            false);
        fontDebug.spaceWidth = 5;

        fontCredits = loadFont("font_small_gray.png", 6, 6, 0, 6, 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-+=:;,\"<>.?/\\[]_| ",
            false);
        fontCredits.spaceWidth = 5;
    
        fontUIBook = loadFont("font_small_white.png", 6, 6, 0, 6, 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-+=:;,\"<>.?/\\[]_| ",
            false, 0x4f2a07);
        fontUIBook.spaceWidth = 5;

        fontUINumbers = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0xd9d9d9);
        fontUINumbers.char_sep -= 2;
        fontUINumbers.spaceWidth = 5;

        fontHUD = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0xd9d9d9);
        fontHUD.spaceWidth = 5;
        // fontHUD.char_sep -= 1;

        fontWinscreen = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0x8a8a8a);
        // fontHUD.char_sep -= 1;
        fontWinscreen.spaceWidth = 5;

        fontUIOrange = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0xffb700);
        fontUIOrange.char_sep -= 1;
        fontUIOrange.spaceWidth = 5;

        fontUIGray = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0x454545);
        fontUIGray.char_sep -= 1;
        fontUIGray.spaceWidth = 5;

        fontUIYellow = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0xf7e26b);
        fontUIYellow.char_sep -= 1;
        fontUIYellow.spaceWidth = 5;
    
        fontUIBlackDark = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0x000000);
        fontUIBlackDark.char_sep -= 1;
        fontUIBlackDark.spaceWidth = 5;

        fontBook = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0x4f2a07);
            fontBook.char_sep -= 0;
        fontBook.spaceWidth = 5;

        fontUIRed = loadFont("ingame_font.png", 8, 8, 0, 8, 
            "1234567890!#$%&*()-+=[]:;\"'<>,.?/ABCDEFGHIJKLMNOPQRSTUVWXYZ _",
            false, 0xff0d31);
        fontUIRed.char_sep -= 1;
        fontUIRed.spaceWidth = 5;
    
        addSound("dragon_hurt", "dragon_complaining.wav");
        addSound("dragon_dead", "dragon_death.wav");
        addSound("music_win", "Dragon_Final.mp3");
        addSound("music", "Dragon_ingame.mp3");
        addSound("gnome_jump", "gnome_jumping.wav");
        addSound("disappointed", "disappointed.wav");
        addSound("earthquake", "shake.wav");
        addSound("can_level", "level_ready.wav");
        addSound("alarm", "alarm.wav");
        addSound("lose", "death.wav");
        addSound("win", "win.wav");
        addSound("explode", "death.wav");
        addSound("hit_wall", "hitWall.wav");
        addSound("hit_wall", "hit_wall2.wav");
        addSound("chest_open", "chestOpen.wav");
        addSound("uncover", "click.wav");
        addSound("uncover", "click2.wav");
        addSound("uncover", "click3.wav");
        addSound("uncover", "click4.wav");
        addSound("uncover", "click5.wav");
        addSound("uncover", "click6.wav");
        addSound("pick_xp", "pickupCoin.wav");
        addSound("reveal", "orb1.wav");
        addSound("reveal", "orb2.wav");
        addSound("restart", "restart.wav");
        addSound("heal", "healnew.wav");
        addSound("fight", "fight1.wav");
        addSound("fight", "fight2.wav");
        addSound("fight", "fight3.wav");
        addSound("fight_special", "hit_hard.wav");
        addSound("spell", "spell2.wav");
        addSound("wall_down", "wall_down.wav");
        addSound("level_up", "level_up.wav");
        addSound("book", "book.wav");
        addSound("mark", "mark.wav");
        addSound("mark_mine", "mark_highpitch.wav");
        addSound("wrong", "wrong.wav");
        addSound("jorge", "jorge.wav");

        function addSound(eventId, path)
        {
            if(!(eventId in sndEvents))
            {
                sndEvents[eventId] = [];
            }
            sndEvents[eventId].push(loadSound("data/"+path));
        }
    }
    else if(phase == UpdatePhase.Loading)
    {
        let ctx = backBuffer.getContext("2d");
        let r = new Rect(0, 0, backBuffer.width, backBuffer.height);
        showLoadingC64(ctx, r);
    }
    else if(phase == UpdatePhase.DoneLoading)
    {
        loadSettings();
        musicToRun = "music";
        newGame();
    }
    else if(phase == UpdatePhase.Updating)
    {
        // handle music
        if(playerInteracted)
        {
            if(musicOn && musicToRun != null)
            {
                if(runningMusic == null || runningMusic.paused || runningMusicId != musicToRun)
                {
                    if(runningMusicId != musicToRun && runningMusic != null)
                    {
                        runningMusic.pause();
                    }
                    runningMusicId = musicToRun;
                    let tracks = sndEvents[musicToRun];
                    runningMusic = tracks[rnd(0, tracks.length)];
                    runningMusic.volume = 0.5;
                    runningMusic.play();
                }
            }
            else
            if(runningMusic != null && !runningMusic.paused)
            {
                runningMusic.pause();
            }
        }

        let ctx = get2DContext(backBuffer);
        ctx.imageSmoothingEnabled = false;

        if(state.status == GameStatus.Playing || state.status == GameStatus.Dead || state.status == GameStatus.DragonDefeated)
        {
            updatePlaying(ctx, dt);
        }
        else
        if(state.status == GameStatus.WinScreen)
        {
            updateWinscreen(ctx, dt);
        }

        drawFrame(ctx, stripScanlines, 0, 0, 0);

        if(keysJustPressed.includes('d'))
        {
            debugOn = !debugOn;
        }

        if(debugOn)
        {
            // TODO: use internal font in common code
            ctx.save();
            // ctx.fillStyle = "black";
            // ctx.fillRect(0, 20, canvas.width, canvas.height - 20);
            ctx.fillStyle = "white";
            ctx.font = '32px serif';
            let offy = 20;
            for(let line of debugLines)
            {
                fontDebug.drawLine(ctx, line, 5, offy);
                // ctx.fillText(line, 5, offy);
                offy += fontDebug.lineh;
            }
            ctx.restore();
        }
        debugLines = [];
    }
}

function drawXPIndicator(ctx, rect, xp)
{
    let offx = rect.centerx() - 5;
    if(xp >= 10) offx -= 4;
    drawFrame(ctx, stripIcons, 8, offx, rect.bottom() - 7);
    fontUIYellow.drawLine(ctx, ""+xp, rect.centerx() + 4, rect.bottom() - 4, FONT_CENTER|FONT_BOTTOM);
}

function drawMultiline(ctx, font, lines, x, y, centering)
{
    let vsep = 3;

    let textR = new Rect();
    textR.h = 24;
    textR.y = y - textR.h/2;

    let offy = 0;
    for(let line of lines)
    {
        let lineR = font.processLine(ctx, line, x, offy + y, 100000, false);
        textR.w = Math.max(textR.w, lineR.w);
        offy += font.lineh + vsep;
    }
    textR.x = x - textR.w/2;

    offy = 0;
    for(let line of lines)
    {
        font.drawLine(ctx, line, x, offy + textR.y + font.lineh - 2, centering);
        offy += font.lineh + vsep;
    }
}