import { Diagram, line as dgline, text, diagram_combine, empty  } from '../diagram.js';
import { circle, textvar } from '../shapes.js';
import { V2, Vector2, Vdir } from '../vector.js';

enum GeoType {
    LINE = 'LINE',
}
export type GeoCtx = {[key : string] : (GeoObj | Vector2 | number)}
export interface GeoObj { type : GeoType; }

export interface GeoLine extends GeoObj {
    type : GeoType.LINE;
    p : Vector2
    dir : Vector2 // not necessarily a unit vector
}
// TODO : CeoCircle

export function intersect(o1 : GeoObj, o2 : GeoObj) : Vector2[] {
    if (o1.type === GeoType.LINE && o2.type === GeoType.LINE) {
        let l1 = o1 as GeoLine;
        let l2 = o2 as GeoLine;
        let p = line_intersection(l1, l2);
        return [p]
    }
    return [];
}


/**
 * Get a point that is `d` distance away from `p` in the direction of `dir`
 * *ideally, point `p` should be in line `l`*
 */
export function point_onLine_atDistance_from(l : GeoLine, d : number, p : Vector2) : Vector2 {
    let dir = l.dir.normalize();
    return p.add(dir.scale(d));
}

/**
 * Get a point
 * - that is collinear with `p1` and `p2`
 * - that is `len` away from `p2` in the direction away from `p1`
 */
export function point_collinear_extend_length(p1 : Vector2, p2 : Vector2, len : number) : Vector2 {
    let dir = p2.sub(p1).normalize();
    return p2.add(dir.scale(len));
}

/** Get a point that is `t` fraction of the way from `p1` to `p2` */
export function point_collinear_fraction(p1 : Vector2, p2 : Vector2, t : number) : Vector2 {
    let dir = p2.sub(p1);
    return p1.add(dir.scale(t));
}

/** Get a point on line `l` with x-coordinate `x` */
export function point_onLine_with_x(l : GeoLine, x : number) : Vector2 {
    let m = l.dir.y / l.dir.x;
    let c = l.p.y - m * l.p.x;
    return V2(x, m * x + c);
}

/** Get a point on line `l` with y-coordinate `y` */
export function point_onLine_with_y(l : GeoLine, y : number) : Vector2 {
    let m = l.dir.y / l.dir.x;
    let c = l.p.y - m * l.p.x;
    return V2((y - c) / m, y);
}


/** Get the intersection point of two lines */
export function line_intersection(l1 : GeoLine, l2 : GeoLine) : Vector2 {
    let a1 = l1.p; let b1 = l1.p.add(l1.dir);
    let a2 = l2.p; let b2 = l2.p.add(l2.dir);

    let x1 = a1.x; let y1 = a1.y; let x2 = b1.x; let y2 = b1.y;
    let x3 = a2.x; let y3 = a2.y; let x4 = b2.x; let y4 = b2.y;

    let d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    let x = ((x1*y2 - y1*x2)*(x3-x4) - (x1-x2)*(x3*y4 - y3*x4))/d;
    let y = ((x1*y2 - y1*x2)*(y3-y4) - (y1-y2)*(x3*y4 - y3*x4))/d;
    return V2(x, y);
}


// Constructing lines
export function line(p : Vector2, dir : Vector2) : GeoLine {
    return {type:GeoType.LINE, p, dir};
}
export function line_from_points(p1 : Vector2, p2 : Vector2) : GeoLine {
    return line(p1, p2.sub(p1));
}
export function line_from_slope(p : Vector2, slope : number) : GeoLine {
    return line(p, V2(1, slope));
}
export function line_from_angle(p : Vector2, angle : number) : GeoLine {
    return line(p, Vdir(angle));
}

/** Define a line that is parallel to `l` and passes through `p` */
export function line_parallel_at_point(l : GeoLine, p : Vector2) : GeoLine {
    return line(p, l.dir);
}
/** Define a line that is perpendicular to `l` and passes through `p` */
export function line_perpendicular_at_point(l : GeoLine, p : Vector2) : GeoLine {
    return line(p, V2(-l.dir.y, l.dir.x));
}
/** Define a line that has the direction of `l` rotated by `angle` and passes through `p` */
export function line_rotated_at_point(l : GeoLine, angle : number, p : Vector2) : GeoLine {
    return line(p, l.dir.rotate(angle));
}

function line_intersect_bbox(l : GeoLine, bbox : [Vector2, Vector2]) : Diagram | undefined {
    let [bottom_left, top_right] = bbox;
    let bl = bottom_left;
    let tr = top_right;
    let tl = V2(bl.x, tr.y);
    let br = V2(tr.x, bl.y);
    let intersections = [
        line_intersection(l, line_from_points(tl, tr)),
        line_intersection(l, line_from_points(tr, br)),
        line_intersection(l, line_from_points(br, bl)),
        line_intersection(l, line_from_points(bl, tl)),
    ];
    const tol = 1e-6; // tolerance
    const is_inside_bbox = (p : Vector2) => { 
        return p.x >= bl.x - tol && p.x <= tr.x + tol && p.y >= bl.y - tol && p.y <= tr.y + tol;
    }
    let points = intersections.filter(p => is_inside_bbox(p));
    if (points.length <= 1) return undefined;
    return dgline(points[0], points[1]);
}

// drawing
function normalize_padding(padding : number[] | number) : [number, number, number, number] {
    let p = (typeof padding === 'number') ? [padding] : padding;
    switch (p.length) {
        case 0: return [0, 0, 0, 0];
        case 1: return [p[0], p[0], p[0], p[0]];
        case 2: return [p[0], p[1], p[0], p[1]];
        case 3: return [p[0], p[1], p[2], p[1]];
        default: return [p[0], p[1], p[2], p[3]];
    }
}

/**
 * Get a preview diagram of the context
 * @param ctx the Geo context (a dictionary of GeoObj and Vector2)
 * @param pad padding around the diagram (determine how far away from the defined point the visible diagram is)
 */
export function get_preview_diagram(ctx : GeoCtx, pad? : number[] | number) : Diagram {
    let points : {name : string, p : Vector2}[] = [];
    let lines : {name : string, obj : GeoLine}[] = [];

    let typelist : {[key in GeoType] : {name: string, obj : GeoObj}[]} = {
        [GeoType.LINE] : lines
    }

    let object_names = Object.keys(ctx);
    for (let name of object_names) {
        let obj = ctx[name];
        if (typeof(obj) === 'number'){
            continue;
        }
        else if (obj instanceof Vector2) {
            points.push({name, p:obj});
        } else {
            typelist[obj.type].push({name, obj});
        }
    }

    let minx = Math.min(...points.map(p => p.p.x));
    let maxx = Math.max(...points.map(p => p.p.x));
    let miny = Math.min(...points.map(p => p.p.y));
    let maxy = Math.max(...points.map(p => p.p.y));

    if (pad == undefined) pad = Math.max(maxx - minx, maxy - miny) * 0.1;
    pad = normalize_padding(pad);
    let bbox = [V2(minx - pad[0], miny - pad[1]), V2(maxx + pad[2], maxy + pad[3])] as [Vector2, Vector2];

    let dg_lines = lines.map(l => line_intersect_bbox(l.obj, bbox)).filter(d => d !== undefined) as Diagram[];
    let r = Math.max(bbox[1].x - bbox[0].x, bbox[1].y - bbox[0].y) * 0.01 * 2/3;
    let dg_points = points.map(p => {
        let c = circle(r).translate(p.p).fill('black');
        let name = textvar(p.name).translate(p.p.add(V2(r*2, r*2))).move_origin_text('bottom-left');
        let namebg = name.copy().textfill('white').textstroke('white').textstrokewidth(10).opacity(0.7)
        return c.combine(namebg, name)
    });
    return diagram_combine(...dg_lines, ...dg_points);
}
