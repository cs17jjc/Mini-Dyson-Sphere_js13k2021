//?CANVAS
var rCanv = document.getElementById("canvas");
var ctx = rCanv.getContext("2d");

const getBoundRect = () => { return document.getElementById("c").getBoundingClientRect(); }
var dspCanvRect = getBoundRect();

window.onload = (e) => { dspCanvRect = getBoundRect(); };
window.onresize = (e) => { dspCanvRect = getBoundRect(); };

//?OBJECTS
const defObejct = (type, x, y, data) => { return { type, x, y, data }; }

const emitter = (x, y, dir, frameSpawned, angOrigin) => { return defObejct("emitter", x, y, { dir, r: 16, ray: [], calcRay: true, frameSpawned, angOrigin }); }

const attractor = (x, y) => { return defObejct("attractor", x, y, { r: 6, m: 200 }); }

const cloud = (x, y, r, c) => { return defObejct("cloud", x, y, { r, c }); }

const cloudCluster = (x, y, r, clouds, img) => { return defObejct("cloudCluster", x, y, { r, clouds, img }); }

const reciver = (x, y) => { return defObejct("reciver", x, y, { r: 10, power: false, activated: false, lastVia: 0, running: false }); }

const star = (x, y, r) => { return defObejct("star", x, y, { r }); }

const indicator = (x, y, vx, vy, txt, lifetime, frameCreated, c) => { return defObejct("indicator", x, y, { vx, vy, txt, lifetime, frameCreated, c }); }

//is point in rectangle
const isPinR = (obj, rect) => {
    return (obj.x >= rect.x && obj.x <= rect.x + rect.w && obj.y >= rect.y && obj.y <= rect.y + rect.h);
}

//euclid dist
const dist = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

//normalise
const norm = (p) => {
    var mag = Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2));
    return { x: p.x / mag, y: p.y / mag };
};

const angleBetw = (p1, p2) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

const mag = (p) => { return Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2)); }

const lerp = (a, b, t) => { return a + (b - a) * t; }

const rnd = (a, b) => { return lerp(a, b, Math.random()); }

const rndPick = (arr) => {
    return arr[Math.floor(rnd(0, arr.length))];
}

var gArr = (n) => Array.from(new Array(n).keys());

var tmpCanv = (width, height) => {
    var r = document.createElement("canvas");
    r.width = width;
    r.height = height;
    return { canv: r, ctx: r.getContext("2d") };
}

var clamp = (n, min, max) => { return Math.min(Math.max(n, min), max); }

//?Perlin
class Grad {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    dot2(x, y) {
        return this.x * x + this.y * y;
    }
}

var grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
    new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
    new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
];
var p = gArr(256).map(i => Math.trunc(Math.random() * 255));
var perm = new Array(512);
var gradP = new Array(512);

function seed(seed) {
    seed *= seed > 0 && seed < 1 ? 65536 : 1;
    seed = Math.floor(seed);
    seed = seed < 256 ? seed |= seed << 8 : seed;
    gArr(256).forEach(i => {
        var v = i & 1 ? p[i] ^ (seed & 255) : p[i] ^ ((seed >> 8) & 255);
        perm[i] = perm[i + 256] = v;
        gradP[i] = gradP[i + 256] = grad3[v % 12];
    });
};

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function perlin2(x, y) {
    var X = Math.floor(x),
        Y = Math.floor(y);
    x = x - X;
    y = y - Y;
    X = X & 255;
    Y = Y & 255;
    var u = fade(x);
    var n00 = gradP[X + perm[Y]].dot2(x, y);
    var n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
    var n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
    var n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);
    return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
        fade(y));
};

seed(Math.random());


//?QUADTREE
const qTree = (w, h, objects) => {

    var defQuad = (x, y, w, h) => {
        return {
            x: x,
            y: y,
            w: w,
            h: h,
            topLeft: null,
            topRight: null,
            bottomLeft: null,
            bottomRight: null,
            objects: []
        };
    }

    var root = defQuad(0, 0, w, h);

    var insert = (quad, obj) => {
        if (isPinR(obj, quad)) {
            if (quad.objects.length < 5) {
                quad.objects.push(obj);
            } else {
                if (quad.topLeft == null) {
                    quad.topLeft = defQuad(quad.x, quad.y, quad.w / 2, quad.h / 2);
                    quad.topRight = defQuad(quad.x + quad.w / 2, quad.y, quad.w / 2, quad.h / 2);
                    quad.bottomLeft = defQuad(quad.x, quad.y + quad.h / 2, quad.w / 2, quad.h / 2);
                    quad.bottomRight = defQuad(quad.x + quad.w / 2, quad.y + quad.h / 2, quad.w / 2, quad.h / 2);
                }
                insert(quad.topLeft, obj);
                insert(quad.topRight, obj);
                insert(quad.bottomLeft, obj);
                insert(quad.bottomRight, obj);
            }
        }
    }

    objects.forEach(obj => {
        //Insert into quadtree
        insert(root, obj);
    });

    return root;
}

const queryTree = (tree, rect) => {
    if (tree.x <= rect.x + rect.w && tree.x + tree.w >= rect.x && tree.y <= rect.y + rect.h && tree.y + tree.h >= rect.y) {
        var ret = tree.objects.filter(o => isPinR(o, rect));
        if (tree.topLeft != null) {
            ret = ret.concat(queryTree(tree.topLeft, rect));
            ret = ret.concat(queryTree(tree.topRight, rect));
            ret = ret.concat(queryTree(tree.bottomLeft, rect));
            ret = ret.concat(queryTree(tree.bottomRight, rect));
        }
        return ret;
    }
    return [];
}

//?CONSTANTS
const PHOTON_MASS = 0.1; //Yeah I know this sounds odd 
const MAP_WIDTH = 960 * 2;
const MAP_HEIGHT = 540 * 2;
const MOVE_SPEED = 0.3;
const EMITTER_BAND = 60;

//Radius
const EMITTER_LAYOUT = [5, 10, 15];
//[min radius,max radius, number, minR, maxR]
const CLOUD_LAYOUT = [
    [200, 200, 6, 20, 20],
    [400, 400, 8, 50, 50],
    [540, 540, 10, 80, 80],
    [680, 540, 10, 100, 100],
];
const GRAV_RECT = { x: -50, y: -50, w: 100, h: 100 };
const CLOUD_COLOURS = ["f72585", "b5179e", "7209b7", "560bad", "480ca8", "3a0ca3", "3f37c9", "4361ee", "4895ef", "4cc9f0"];

const UI_OBJS = new Map();
UI_OBJS.set("via", document.getElementById("dsp-via-val"));
UI_OBJS.set("bh", document.getElementById("btn-bh"));
UI_OBJS.set("dsp", document.getElementById("dsp-prog"));
UI_OBJS.set("scrn", document.getElementById("screen"));

const configCtx = (ctx, tmpR) => {
    ctx.translate(tmpR, tmpR);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"
}

const regPoly = (ctx, n, x, y, r) => {
    ctx.beginPath();
    gArr(n).forEach(i => {
        ctx.lineTo(x + r * Math.cos(i * 2 * Math.PI / n), y + r * Math.sin(i * 2 * Math.PI / n));
    });
    ctx.closePath();
}

const IMGS = new Map();
var tmpR = emitter(0, 0, 0, 0, 0).data.r;
var tmpCanvCtx = tmpCanv(tmpR * 3, tmpR * 3);
configCtx(tmpCanvCtx.ctx, tmpR * 3 * 0.5);

tmpCanvCtx.ctx.fillStyle = "blue";
regPoly(tmpCanvCtx.ctx, 6, 0, 0, tmpR * 0.8);
tmpCanvCtx.ctx.fill();


tmpCanvCtx.ctx.lineWidth = 1;
tmpCanvCtx.ctx.strokeStyle = "gray";
regPoly(tmpCanvCtx.ctx, 6, 0, 0, tmpR * 0.8 - 2);
tmpCanvCtx.ctx.stroke();

tmpCanvCtx.ctx.strokeStyle = "gray";
regPoly(tmpCanvCtx.ctx, 6, 0, 0, tmpR * 0.8 + 2);
tmpCanvCtx.ctx.stroke();

tmpCanvCtx.ctx.lineWidth = 2;
tmpCanvCtx.ctx.strokeStyle = "white";
regPoly(tmpCanvCtx.ctx, 6, 0, 0, tmpR * 0.8);
tmpCanvCtx.ctx.stroke();


IMGS.set("emtr", tmpCanvCtx.canv);

const { canv: starCanv, ctx: starCtx } = tmpCanv(MAP_WIDTH, MAP_HEIGHT);
gArr(500).forEach(i => {
    starCtx.fillStyle = rndPick(["white", "yellow", "blue", "red", "orange"])
    var s = rnd(1, 3);
    starCtx.fillRect(rnd(0, MAP_WIDTH), rnd(0, MAP_HEIGHT), s, s);
});
//?GAMEDATA
var emitters = [];
var lastEmitSpawn = 0;
var setCalcEms = [];
var connectedEms = [];
var emitterHeight = 45;
var emittersInBand = 0;
var emitterBand = 0;
var emitterRate = 400;

var attractors = [];
var justPlacedAttractor = false;

var cloudClusters = [];

var recivers = [];
var reciverRate = 400;
var lastRecSpawn = 0;
var reciverSpwnRect = { x: 0, y: 0, w: 0, h: 0 };
var reciverViabilityRate = 200;
var reciverViabilityIncr = 0.02;

var stars = [];

var indicators = [];

var quadTree;

var isRotating = false;
var isMoving = false;

var rotatingEmitter = null;
var movingAttractor = null;

var target = { x: 0, y: 0 };
var fineMidpoint = { x: 0, y: 0 };
var targetValid = false;

var startScale = 1.5;
var scale = startScale;
var maxScale = startScale;
var wOff;
var scrnRect;

var viability = 0.5;
var lerpVia = viability;
var lastViaUpdate = 0;

var attractorCount = 3;
var attractorChance = 0.1;

var nextComponent = "emitter"
var componentProgress = 0;

var failed = false;

var completed = false;

const calcScaleDependants = () => {
    wOff = { x: MAP_WIDTH / 2 - (rCanv.width * scale) - rCanv.width / 2, y: MAP_HEIGHT / 2 - (rCanv.height * scale) - rCanv.height / 2 };
    scrnRect = { x: MAP_WIDTH / 2 - rCanv.width / scale * 0.5, y: MAP_HEIGHT / 2 - rCanv.height / scale * 0.5, w: rCanv.width / scale, h: rCanv.height / scale };
}
calcScaleDependants();

var paused = false;
var frame = 0;

const genCloudCluster = (x, y, r) => {
    var clouds = [];
    var n = Math.floor(rnd(5, 8));
    for (var i = 0; i < n; i++) {
        var tempR = rnd(r * 0.5, r * 0.8);
        var cx = Math.cos((Math.PI * 2) / n * i) * tempR;
        var cy = Math.sin((Math.PI * 2) / n * i) * tempR;
        clouds.push(cloud(cx + x, cy + y, mag({ x: cx, y: cy }), rndPick(CLOUD_COLOURS)));
    }

    var { canv: tempCanvFill, ctx: tempCtx } = tmpCanv(r * 4, r * 4);
    //draw perlin noise
    seed(Math.random());
    var perlinScale = rnd(3, 3);
    for (var x2 = 0; x2 < tempCanvFill.width; x2++) {
        for (var y2 = 0; y2 < tempCanvFill.height; y2++) {
            var v = (perlin2(x2 * perlinScale / tempCanvFill.width, y2 * perlinScale / tempCanvFill.height) + 0.5);
            v += rnd(-0.05, 0.05);
            tempCtx.globalAlpha = lerp(0.8, 1, v);
            tempCtx.fillStyle = "#" + CLOUD_COLOURS[Math.min(CLOUD_COLOURS.length - 1, Math.floor(v * CLOUD_COLOURS.length))];
            tempCtx.fillRect(x2, y2, 1, 1);
        }
    }
    tempCtx.globalAlpha = 1;

    var { canv: tempCanvMask, ctx: tempCtxMask } = tmpCanv(r * 4, r * 4);
    //draw clouds
    tempCtxMask.fillStyle = "#FFFFFF";
    tempCtxMask.filter = 'blur(5px)';
    clouds.forEach(c => {
        tempCtxMask.beginPath();
        tempCtxMask.arc(r * 2 + c.x - x, r * 2 + c.y - y, c.data.r, 0, Math.PI * 2);
        tempCtxMask.fill();
    });

    tempCtxMask.filter = 'none';
    tempCtxMask.globalCompositeOperation = 'source-in';
    tempCtxMask.drawImage(tempCanvFill, 0, 0);
    tempCtxMask.globalCompositeOperation = 'source-over';

    tempCtxMask.globalAlpha = 0.1;
    tempCtxMask.filter = 'blur(1px)';
    clouds.forEach(c => {
        tempCtxMask.fillStyle = "#" + c.data.c;
        tempCtxMask.beginPath();
        tempCtxMask.arc(r * 2 + c.x - x, r * 2 + c.y - y, c.data.r + 5, 0, Math.PI * 2);
        tempCtxMask.fill();
    });


    return cloudCluster(x, y, r, clouds, tempCanvMask);
}

//?GENERATE MAP

stars.push(star(MAP_WIDTH / 2, MAP_HEIGHT / 2, 25));

//Generate clouds
CLOUD_LAYOUT.forEach(layout => {
    for (var i = 0; i < layout[2]; i++) {
        var counter = 0;
        var hasPlace = false;
        while (counter < 100 && !hasPlace) {
            var ang = rnd(0, Math.PI * 2);
            var r = rnd(layout[0], layout[1]);
            var nextP = { x: MAP_WIDTH / 2 + Math.cos(ang) * r, y: MAP_HEIGHT / 2 + Math.sin(ang) * r };
            var radius = rnd(layout[3], layout[4]);
            var clouds = cloudClusters.map(cc => cc.data.clouds).reduce((a, b) => a.concat(b), []);
            if (!clouds.some(c => { return dist(c, nextP) < c.data.r * 2 + radius * 2; })) {
                cloudClusters = cloudClusters.concat(genCloudCluster(nextP.x, nextP.y, radius));
                hasPlace = true;
            }

            counter++;
        }
    }
});

//Create first emitter - reciver pair

var recR = ((CLOUD_LAYOUT[0][0] + CLOUD_LAYOUT[0][1]) / 2) - 20;
var ang;
reciverSpwnRect = { x: scrnRect.x + 30, y: scrnRect.y + 20, w: scrnRect.w - 60, h: scrnRect.h - 40 };

var createdObj = false;
while (!createdObj) {
    ang = rnd(0, Math.PI * 2);
    var recP = { x: MAP_WIDTH / 2 + Math.cos(ang) * recR, y: MAP_HEIGHT / 2 + Math.sin(ang) * recR };
    var newReciver = reciver(recP.x, recP.y);
    if (!cloudClusters.reduce((a, b) => a.concat(b.data.clouds), []).some(c => { return dist(c, recP) < c.data.r + newReciver.data.r; })) {
        createdObj = true;
        recivers.push(newReciver);
    }

}
var emitP = { x: MAP_WIDTH / 2 + Math.cos(ang) * emitterHeight, y: MAP_HEIGHT / 2 + Math.sin(ang) * emitterHeight };
emitters.push(emitter(emitP.x, emitP.y, ang, frame, ang));
emittersInBand++;



//?UPDATE
const update = () => {

    //Update inditacors
    indicators.forEach(i => {
        i.x = i.x + i.data.vx;
        i.y = i.y + i.data.vy;
    });
    indicators = indicators.filter(i => frame - i.data.frameCreated < i.data.lifetime);

    //Build quad tree for current objects
    var clouds = cloudClusters.map(cc => cc.data.clouds).reduce((a, b) => a.concat(b), []);
    quadTree = qTree(MAP_WIDTH, MAP_HEIGHT, attractors.concat(emitters).concat(clouds).concat(recivers).concat(stars));

    //Handle pointing currently rotating emitter at mouse
    if (isRotating) {
        if (mKeys.get('shift')) {
            var s = 0.02;
            var deltaPos = { x: (mPos.x - target.x) * s, y: (mPos.y - target.y) * s };
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, { x: target.x + deltaPos.x, y: target.y + deltaPos.y });
        } else {
            target = mPos;
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, target);
        }
        rotatingEmitter.data.calcRay = true;
    }

    //Create a quadtree specifically for ray points
    var rayPoints = emitters.map(em => { em.data.ray.map(p => p.emitter = em); return em.data.ray }).reduce((a, b) => a.concat(b), []);
    var rayQTree = qTree(MAP_WIDTH, MAP_HEIGHT, rayPoints);

    //Handle moving currently moving attractor to mouse
    if (isMoving) {
        if (mKeys.get('shift')) {
            var s = 0.02;
            target = { x: (mPos.x - fineMidpoint.x) * s + fineMidpoint.x, y: (mPos.y - fineMidpoint.y) * s + fineMidpoint.y };
        } else {
            target = mPos;
            fineMidpoint = mPos;
        }

        var near = queryTree(quadTree, { x: target.x - 100, y: target.y - 100, w: 200, h: 200 });
        targetValid = !near.filter(o => o != movingAttractor).some(o => { return dist(o, target) < o.data.r + movingAttractor.data.r; });
        movingAttractor.x = lerp(movingAttractor.x, target.x, MOVE_SPEED);
        movingAttractor.y = lerp(movingAttractor.y, target.y, MOVE_SPEED);

        var pointsInRange = queryTree(rayQTree, { x: movingAttractor.x + GRAV_RECT.x, y: movingAttractor.y + GRAV_RECT.y, w: GRAV_RECT.w, h: GRAV_RECT.h });
        setCalcEms.forEach(em => em.data.calcRay = true);
        setCalcEms = []
        pointsInRange.forEach(p => {
            if (setCalcEms.includes(p.emitter)) return;
            p.emitter.data.calcRay = true;
            setCalcEms.push(p.emitter);
        });
    }

    if (frame - lastEmitSpawn >= emitterRate) {
        var counter = 0;
        while (counter < 1 && emittersInBand <= EMITTER_LAYOUT[emitterBand]) {
            var ang = rnd(0, Math.PI * 2);
            var r = emitterHeight;
            var nextP = { x: MAP_WIDTH / 2 + Math.cos(ang) * r, y: MAP_HEIGHT / 2 + Math.sin(ang) * r };
            var nextEm = emitter(nextP.x, nextP.y, ang, frame, ang);
            var near = queryTree(quadTree, { x: nextP.x - 150, y: nextP.y - 150, w: 300, h: 300 }).filter(o => o.type != "star");
            if (!near.some(o => dist(o, nextP) < o.data.r + nextEm.data.r + 5)) {
                emitters.push(nextEm);
                emittersInBand += 1;
                lastEmitSpawn = frame;
                break;
            }
            counter++;
        }
        if (emitterBand < EMITTER_LAYOUT.length && emittersInBand >= EMITTER_LAYOUT[emitterBand]) {
            emitterHeight += EMITTER_BAND;
            emittersInBand = 0;
            emitterBand++;
        }
    }


    if (frame - lastRecSpawn >= reciverRate && emitters.length > recivers.length) {
        var counter = 0;
        reciverSpwnRect = { x: scrnRect.x + 30, y: scrnRect.y + 20, w: scrnRect.w - 60, h: scrnRect.h - 40 };
        while (counter < 50) {
            var nextP = { x: rnd(reciverSpwnRect.x, reciverSpwnRect.x + reciverSpwnRect.w), y: rnd(reciverSpwnRect.y, reciverSpwnRect.y + reciverSpwnRect.h) };
            var nextR = reciver(nextP.x, nextP.y);
            var near = queryTree(quadTree, { x: nextR.x - 150, y: nextR.y - 150, w: 300, h: 300 });
            if (!near.some(o => dist(o, nextR) < o.data.r + nextR.data.r + (o.type == "reciver" ? 80 : 10)) && dist(nextR, stars[0]) > 250) {
                recivers.push(nextR);
                lastRecSpawn = frame;
                break;
            }
            counter++;
        }
    }

    //Populate rays list
    emitters.filter(em => em.data.calcRay).forEach(em => {
        var ray = [{ x: em.x, y: em.y, steps: 0 }];
        var hasHit = false;
        var a = em.data.dir;
        var vel = { x: Math.cos(a) * 2, y: Math.sin(a) * 2 };
        while (!hasHit && ray.length < 1000) {

            var p = ray[ray.length - 1];
            var maxSteps = Math.max(1, Math.floor(1 / mag(vel)));
            for (var steps = 0; steps < maxSteps; steps++) {

                if (p.x < 0 || p.x > MAP_WIDTH || p.y < 0 || p.y > MAP_HEIGHT) {
                    hasHit = true;
                }

                if (hasHit) {
                    break;
                }

                var f = { x: 0, y: 0 };
                var near = queryTree(quadTree, { x: p.x + GRAV_RECT.x, y: p.y + GRAV_RECT.y, w: GRAV_RECT.w, h: GRAV_RECT.h });

                near.forEach(o => {

                    switch (o.type) {
                        case 'attractor':
                            var d = dist(p, o);
                            var angle = angleBetw(p, o);
                            var force = 0.1 * ((o.data.m * PHOTON_MASS) / (d * d * (d * 0.1)));
                            f.x += force * Math.cos(angle);
                            f.y += force * Math.sin(angle);

                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                        case 'emitter':
                            break;
                        default:
                            var d = dist(p, o);
                            if (d < o.data.r) {
                                hasHit = true;
                            }
                    }
                });

                vel.x += f.x / PHOTON_MASS;
                vel.y += f.y / PHOTON_MASS;

                p = { x: p.x + vel.x, y: p.y + vel.y };

            }
            if (!hasHit) ray.push(p);
        }
        em.data.ray = ray;
        em.data.calcRay = false;
    });

    connectedEms = [];
    recivers.forEach(r => {
        var raysNear = queryTree(rayQTree, { x: r.x - r.data.r, y: r.y - r.data.r, w: r.data.r * 2, h: r.data.r * 2 });
        var touches = raysNear.filter(p => dist(p, r) <= r.data.r);
        r.data.power = false;
        touches.sort((a, b) => a.emitter.frameSpawned - b.emitter.frameSpawned).forEach(p => {
            if (connectedEms.includes(p.emitter) || r.data.power) return;
            connectedEms.push(p.emitter);
            r.data.power = true;
            if (!r.data.activated) {
                r.data.activated = true;
            }
        });

        if (!r.data.power && r.data.running) { r.data.running = false; }

        if (Math.random() < 0.005 && !r.data.running && r.data.power) {
            r.data.running = true
            r.data.lastVia = frame;
        }

        if (r.data.power && r.data.running && frame - r.data.lastVia >= reciverViabilityRate) {
            viability += reciverViabilityIncr;
            r.data.lastVia = frame;
            indicators.push(indicator(r.x, r.y, 0, -1, "⚒", 50, frame, "#00FF00"));
            if (Math.random() <= attractorChance) {
                attractorCount++;
            }
            r.data.running = false;
        }
    });

    connectedEms.forEach(em => em.data.angOrigin += 0.01);

    if (click && !prevClick && !justPlacedAttractor) {
        //Handle emitter click
        if (isRotating) {
            isRotating = false;
            rotatingEmitter = null;
        } else if (!isMoving) {
            var near = queryTree(quadTree, { x: mPos.x - 50, y: mPos.y - 50, w: 100, h: 100 });
            var em = near.filter(o => o.type == 'emitter').find(o => {
                var d = dist(mPos, o);
                return d < o.data.r;
            });
            if (em != null) {
                isRotating = true;
                rotatingEmitter = em;
            }
        }
        //Handle attractor click
        if (isMoving && targetValid) {
            isMoving = false;
            movingAttractor = null;
        } else if (!isRotating) {
            var near = queryTree(quadTree, { x: mPos.x - 50, y: mPos.y - 50, w: 100, h: 100 });
            var at = near.filter(o => o.type == 'attractor').find(o => {
                var d = dist(mPos, o);
                return d < o.data.r;
            });
            if (at != null) {
                isMoving = true;
                movingAttractor = at;
            }
        }
    }

    UI_OBJS.get("bh").innerHTML = "" + attractorCount + "<br> Black Holes <br> <span style=\"font-size:0.8em;\">(Click To Place)</span>";
    UI_OBJS.get("dsp").innerHTML = emitters.length + "/" + EMITTER_LAYOUT.reduce((a, b) => a + b, 0) + "<br> Satelites";

    if (frame - lastViaUpdate >= 100) {
        viability = clamp(viability - (emitters.length - connectedEms.length) * 0.02, 0, 1);
        recivers.filter(r => !r.data.power).forEach(e => indicators.push(indicator(e.x, e.y, 0, +1, "⚒", 50, frame, "#FF0000")));
        lastViaUpdate = frame;
    }
    lerpVia = clamp(lerp(lerpVia, viability, 0.05), 0, 1);
    UI_OBJS.get("via").style.bottom = lerp(0, 98, lerpVia) + "%";
    failed = viability <= 0;
    completed = emitters.length >= EMITTER_LAYOUT.reduce((a, b) => a + b, 0) && viability >= 1 && recivers.filter(r => r.data.power).length == recivers.length;

    prevMPos = mPos;

    frame += 1;
    maxScale = Math.min(maxScale, startScale * Math.pow(0.95, connectedEms.length * 0.5));
    scale = lerp(scale, Math.max(0.5, maxScale), 0.01);
    calcScaleDependants();

    justPlacedAttractor = false;
}

//?RENDER

const render = () => {
    //Clear canvas
    ctx.clearRect(0, 0, rCanv.width, rCanv.height);

    ctx.translate(wOff.x, wOff.y);
    ctx.scale(scale, scale);

    ctx.drawImage(starCanv, 0, 0);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    //Render rays
    emitters.forEach(obj => {

        //Render rays
        if (connectedEms.includes(obj)) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#FF00FFAA";
            ctx.beginPath();
            ctx.moveTo(obj.data.ray[0].x, obj.data.ray[0].y);
            obj.data.ray.slice(1).forEach(p => {
                ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        } else {
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(obj.data.ray[0].x, obj.data.ray[0].y);
            obj.data.ray.slice(1).forEach(p => {
                ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
            ctx.closePath();
            ctx.setLineDash([]);
        }

    });
    //Render emitters
    emitters.forEach(obj => {
        //Render rays
        ctx.lineWidth = connectedEms.includes(obj) ? 3 : 1;
        ctx.strokeStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(obj.data.ray[0].x, obj.data.ray[0].y);
        obj.data.ray.slice(1).forEach(p => {
            ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    });
    emitters.forEach(obj => {
        //Render emitters
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.data.angOrigin);

        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, obj.data.r, 0, 2 * Math.PI);
        ctx.stroke();

        var img = IMGS.get("emtr");
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.rotate(-obj.data.angOrigin);
        ctx.translate(-obj.x, -obj.y);
    });

    //Render recivers
    recivers.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        if (obj.data.power) {
            ctx.fillStyle = "#AAFF00";
        } else {
            ctx.fillStyle = "#FFAA00";
        }
        ctx.fill();

        if (obj.data.running) {
            ctx.fillStyle = "#00000033";
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.arc(obj.x, obj.y, obj.data.r * 0.7, 0, lerp(0, 2 * Math.PI, (frame - obj.data.lastVia) / reciverViabilityRate));
            ctx.fill();
        }
    });

    //Render stars
    stars.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFF00";
        ctx.fill();
    });

    //Render clouds
    cloudClusters.forEach(obj => {
        ctx.drawImage(obj.data.img, obj.x - obj.data.img.width / 2, obj.y - obj.data.img.height / 2);
    });

    //Render attractors
    attractors.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#00FF00";
        ctx.fill();
    });

    //Render indicators
    ctx.font = "20px Arial";
    indicators.forEach(obj => {
        ctx.fillStyle = obj.data.c;
        ctx.fillText(obj.data.txt, obj.x, obj.y);
    });

    ctx.strokeWidth = 10;
    ctx.strokeRect(reciverSpwnRect.x, reciverSpwnRect.y, reciverSpwnRect.w, reciverSpwnRect.h);

    ctx.resetTransform();
}

//?INPUT
var rawMPos = { x: 0, y: 0 };
var mPos = { x: 0, y: 0 };
var prevMPos = { x: 0, y: 0 };
window.onmousemove = (e) => {
    rawMPos = { x: e.clientX, y: e.clientY };
    mPos = {
        x: ((e.clientX - dspCanvRect.left) / (dspCanvRect.right - dspCanvRect.left) * rCanv.width / scale) - wOff.x / scale,
        y: ((e.clientY - dspCanvRect.top) / (dspCanvRect.bottom - dspCanvRect.top) * rCanv.height / scale) - wOff.y / scale
    };
}
var click = false;
var prevClick = false;
window.onmousedown = (e) => {
    click = true;
}
window.onmouseup = (e) => {
    click = false;
}

var mKeys = new Map();
var mKeysPrev = new Map();
window.onkeydown = (e) => {
    mKeys.set(e.key.toLowerCase(), true);
}
window.onkeyup = (e) => {
    mKeys.set(e.key.toLowerCase(), false);
}

UI_OBJS.get("scrn").classList.remove("show");
//?LOOP
setInterval(() => {
    if (mKeys.get('escape') && !mKeysPrev.get('escape')) {
        onPause();
    }
    var tempFailed = failed;
    var tempCompleted = completed;
    if (!paused && !failed && !completed) {
        update();
    }
    if (!tempFailed && failed) {
        UI_OBJS.get("scrn").innerHTML = "That wasn't very poggers of you comrade! <br> <span style=\"text-size:0.8em;\"> Click anywhere to restart.</span>";
        UI_OBJS.get("scrn").classList.add("show");
    }
    if (!tempCompleted && completed) {
        UI_OBJS.get("scrn").innerHTML = "Congratualtions comrade! <br> <span style=\"text-size:0.8em;\"> Click anywhere to replay.</span>";
        UI_OBJS.get("scrn").classList.add("show");
    }
    if ((failed || completed) && click) {
        window.location.reload();
    }

    prevClick = click;
    mKeysPrev = new Map(mKeys);
    render();
}, 1000 / 60);

const onPause = () => {
    paused = !paused;
    document.getElementById("btn-pause").innerHTML = paused ? "▶️" : "⏸️";
}

const placeAttractor = () => {
    if (!paused && attractorCount > 0) {
        target = mPos;
        var newAttractor = attractor(target.x, target.y);
        attractors.push(newAttractor);
        isMoving = true;
        movingAttractor = newAttractor;
        justPlacedAttractor = true;
        attractorCount--;
    }
};