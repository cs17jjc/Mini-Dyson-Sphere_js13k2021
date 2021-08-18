//?CANVAS
var rCanv = document.getElementById("canvas");
var ctx = rCanv.getContext("2d");

const getBoundRect = () => { return document.getElementById("c").getBoundingClientRect(); }
var dspCanvRect = getBoundRect();

window.onload = (e) => { dspCanvRect = getBoundRect(); };
window.onresize = (e) => { dspCanvRect = getBoundRect(); };

//?OBJECTS
const defObejct = (type, x, y, data) => { return { type, x, y, data }; }

const emitter = (x, y, dir) => { return defObejct("emitter", x, y, { dir, r: 10 }); }

const attractor = (x, y) => { return defObejct("attractor", x, y, { r: 10, m: 100 }); }

const cloud = (x, y, r) => { return defObejct("cloud", x, y, { r }); }

const reciver = (x, y) => { return defObejct("reciver", x, y, { r: 10 }); }

const star = (x, y, r) => { return defObejct("star", x, y, { r }); }

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

//?GAMEDATA
var emitters = [];

var attractors = [];

var clouds = [];

var recivers = [];

var stars = [];

var rays = [];

var quadTree;

var isRotating = false;
var isMoving = false;

var rotatingEmitter = null;
var movingAttractor = null;

var target = { x: 0, y: 0 };

var scale = 1;
var wOff = { x: MAP_WIDTH / 2 - (rCanv.width * scale) / 2, y: MAP_HEIGHT / 2 - (rCanv.height * scale) / 2 };

var paused = false;
var frame = 0;

const genCloudCluster = (x, y, r) => {
    var cloudCluster = [];
    var n = Math.floor(rnd(5, 8));
    for (var i = 0; i < n; i++) {
        var tempR = rnd(r * 0.5, r * 0.8);
        var cx = Math.cos((Math.PI * 2) / n * i) * tempR;
        var cy = Math.sin((Math.PI * 2) / n * i) * tempR;
        cloudCluster.push(cloud(cx + x, cy + y, mag({ x: cx, y: cy })));
    }
    return cloudCluster;
}

//?GENERATE MAP


stars.push(star(MAP_WIDTH / 2, MAP_HEIGHT / 2, 25));

//Generate clouds
//[radius, number, minR, maxR]
[
    [270, 2, 50, 50],
    [200, 5, 20, 20],
    [380, 2, 80, 80],
].forEach(layout => {
    for (var i = 0; i < layout[1]; i++) {
        var counter = 0;
        var hasPlace = false;
        while (counter < 100 && !hasPlace) {
            var ang = rnd(0, Math.PI * 2);
            var r = layout[0];
            var nextP = { x: MAP_WIDTH / 2 + Math.cos(ang) * r, y: MAP_HEIGHT / 2 + Math.sin(ang) * r };

            var radius = rnd(layout[2], layout[3]);
            if (!clouds.some(c => { return dist(c, nextP) < c.data.r * 2 + radius * 2; })) {
                clouds = clouds.concat(genCloudCluster(nextP.x, nextP.y, radius));
                hasPlace = true;
            }

            counter++;
        }
    }
});


//?UPDATE
const update = () => {
    //Handle pointing currently rotating emitter at mouse
    if (isRotating) {
        if (mKeys.get('shift')) {
            var s = 0.05;
            var deltaPos = { x: (mPos.x - target.x) * s, y: (mPos.y - target.y) * s };
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, { x: target.x + deltaPos.x, y: target.y + deltaPos.y });

        } else {
            target = mPos;
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, target);
        }
    }

    //Handle pointing currently rotating emitter at mouse
    if (isMoving) {
        if (mKeys.get('shift')) {
            var s = 0.05;
            var deltaPos = { x: (mPos.x - target.x) * s, y: (mPos.y - target.y) * s };
            movingAttractor.x = target.x + deltaPos.x;
            movingAttractor.y = target.y + deltaPos.y;

        } else {
            target = mPos;
            movingAttractor.x = target.x;
            movingAttractor.y = target.y;
        }
    }

    quadTree = qTree(MAP_WIDTH, MAP_HEIGHT, attractors.concat(emitters).concat(clouds).concat(recivers));

    //Populate rays list
    rays = [];
    emitters.forEach(em => {
        var ray = { points: [{ x: em.x, y: em.y, steps: 0 }] }
        var hasHit = false;
        var a = em.data.dir;
        var vel = { x: Math.cos(a) * 2, y: Math.sin(a) * 2 };
        while (!hasHit && ray.points.length < 1000) {

            var p = ray.points[ray.points.length - 1];
            var maxSteps = Math.max(1, Math.floor(1 / mag(vel)));
            for (var steps = 0; steps < maxSteps; steps++) {

                if (p.x < 0 || p.x > MAP_WIDTH || p.y < 0 || p.y > MAP_HEIGHT) {
                    hasHit = true;
                }

                if (hasHit) {
                    break;
                }

                var f = { x: 0, y: 0 };
                var near = queryTree(quadTree, { x: p.x - 100, y: p.y - 100, w: 200, h: 200 });

                near.forEach(o => {

                    switch (o.type) {
                        case 'attractor':
                            var d = dist(p, o);
                            var angle = angleBetw(p, o);
                            var force = 0.1 * ((o.data.m * PHOTON_MASS) / (d * d * (d * 0.01)));
                            f.x += force * Math.cos(angle);
                            f.y += force * Math.sin(angle);

                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                        case 'cloud':
                            var d = dist(p, o);
                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                        case 'reciver':
                            var d = dist(p, o);
                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                        default:
                            break;
                    }
                });

                vel.x += f.x / PHOTON_MASS;
                vel.y += f.y / PHOTON_MASS;

                p = { x: p.x + vel.x, y: p.y + vel.y };

            }
            p.steps = maxSteps;
            ray.points.push(p);
        }
        rays.push(ray);
    });


    //Handle emitter click
    if (click && !prevClick) {
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

        if (isMoving) {
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

    mKeysPrev = new Map(mKeys);
    prevMPos = mPos;
    prevClick = click;
    if (!paused) {
        frame++;
        scale = Math.max(0.5, 1 - 0.0001 * frame);
        wOff = { x: MAP_WIDTH / 2 - (rCanv.width * scale) - rCanv.width / 2, y: MAP_HEIGHT / 2 - (rCanv.height * scale) - rCanv.height / 2 };
        mPos = {
            x: ((rawMPos.x - dspCanvRect.left) / (dspCanvRect.right - dspCanvRect.left) * rCanv.width / scale) - wOff.x / scale,
            y: ((rawMPos.y - dspCanvRect.top) / (dspCanvRect.bottom - dspCanvRect.top) * rCanv.height / scale) - wOff.y / scale
        };
    }
}

//?RENDER

const render = () => {
    //Clear canvas
    ctx.clearRect(0, 0, rCanv.width, rCanv.height);

    ctx.translate(wOff.x, wOff.y);
    ctx.scale(scale, scale);

    //Draw map boundaries
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(MAP_WIDTH, 0);
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.lineTo(0, MAP_HEIGHT);
    ctx.closePath();
    ctx.stroke();

    //Render rays
    ctx.strokeStyle = "#FFFFFF";
    rays.forEach(ray => {
        ctx.beginPath();
        ctx.moveTo(ray.points[0].x, ray.points[0].y);
        ray.points.slice(1).forEach(p => {
            ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    });

    //Render emitters
    emitters.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FF0000";
        ctx.fill();
    });

    //Render attractors
    attractors.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#00FF00";
        ctx.fill();
    });

    //Render clouds
    clouds.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
    });

    //Render recivers
    recivers.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFAA00";
        ctx.fill();
    });

    //Render stars
    stars.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFF00";
        ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(mPos.x, mPos.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#00FF00";
    ctx.fill();

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

//?LOOP
setInterval(() => {
    update();
    render();
}, 1000 / 60);

const onPause = () => {
    paused = !paused;
    document.getElementById("btn-pause").innerHTML = paused ? "▶️" : "⏸️";
}