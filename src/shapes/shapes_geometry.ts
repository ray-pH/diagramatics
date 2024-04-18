import { Diagram, polygon, line, diagram_combine, curve } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { linspace } from '../utils.js';
import { arrow1 } from '../shapes.js';
import { TAG } from '../tag_names.js';

// ============================= utilities
/**
 * Get the radius of a circle
 * @param circle a circle Diagram
 * @returns radius of the circle
 */
export function circle_radius(circle : Diagram) : number {
    let tags = circle.tags;
    if (!tags.includes(TAG.CIRCLE)) return -1;

    let center = circle.get_anchor('center-center');
    if (circle.path == undefined) return -1;
    let p0 = circle.path.points[0];
    return center.sub(p0).length();
}

/**
 * Get the tangent points of a circle from a point
 * @param point a point
 * @param circle a circle Diagram
 */
export function circle_tangent_point_from_point(point : Vector2, circle : Diagram) : [Vector2, Vector2] {
    let radius = circle_radius(circle);
    if (radius == -1) return [V2(0,0), V2(0,0)];
    let center = circle.get_anchor('center-center');

    // https://en.wikipedia.org/wiki/Tangent_lines_to_circles
    
    let r = radius;
    let d0_2 = center.sub(point).length_sq();
    let r_2 = r*r;

    let v0 = point.sub(center);
    let sLeft  = r_2 / d0_2;
    let vLeft  = v0.scale(sLeft);
    let sRight = r * Math.sqrt(d0_2 - r_2) / d0_2;
    let vRight = V2(-v0.y, v0.x).scale(sRight);
    let P1 = vLeft.add(vRight).add(center);
    let P2 = vLeft.sub(vRight).add(center);
    return [P1, P2];
}

/**
 * Get the points of a line
 * @param l a line Diagram
 * @returns the two points of the line
 */
export function line_points(l : Diagram) : [Vector2, Vector2] {
    let tags = l.tags;
    if (!tags.includes(TAG.LINE)) return [V2(0,0), V2(0,0)];
    if (l.path == undefined) return [V2(0,0), V2(0,0)];

    let p0 = l.path.points[0];
    let p1 = l.path.points[1];
    return [p0, p1];
}

/**
 * Get the intersection of a line with a horizontal line at y = yi
 * @param l a line Diagram
 * @param yi y value of the horizontal line
 * @returns the intersection point
 */
export function line_intersection_y(l : Diagram, yi : number) : Vector2 {
    let [a, b] = line_points(l);
    let xi = a.x + (b.x - a.x) * (yi - a.y) / (b.y - a.y);
    return V2(xi, yi);
}

/**
 * Get the intersection of a line with a vertical line at x = xi
 * @param l a line Diagram
 * @param xi x value of the vertical line
 * @returns the intersection point
 */
export function line_intersection_x(l : Diagram, xi : number) : Vector2 {
    let [a, b] = line_points(l);
    let yi = a.y + (b.y - a.y) * (xi - a.x) / (b.x - a.x);
    return V2(xi, yi);
}

/**
 * Get the intersection of two lines
 * @param l1 a line Diagram
 * @param l2 a line Diagram
 * @returns the intersection point
 * if the lines are parallel, return V2(Infinity, Infinity)
 */
export function line_intersection(l1 : Diagram, l2 : Diagram) : Vector2 {
    if (!l1.tags.includes(TAG.LINE) || !l2.tags.includes(TAG.LINE)) return V2(Infinity, Infinity);
    let [a1, b1] = line_points(l1);
    let [a2, b2] = line_points(l2);

    let x1 = a1.x; let y1 = a1.y; let x2 = b1.x; let y2 = b1.y;
    let x3 = a2.x; let y3 = a2.y; let x4 = b2.x; let y4 = b2.y;

    let d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    if (d == 0) return V2(Infinity, Infinity);
    let x = ((x1*y2 - y1*x2)*(x3-x4) - (x1-x2)*(x3*y4 - y3*x4))/d;
    let y = ((x1*y2 - y1*x2)*(y3-y4) - (y1-y2)*(x3*y4 - y3*x4))/d;
    return V2(x, y);
}



// ============================= shapes

/**
 * Extend a line by a length on both ends
 * @param l a line Diagram
 * @param len1 length to extend on the first end
 * @param len2 length to extend on the second end
 * @returns a new line Diagram
 */
export function line_extend(l : Diagram, len1 : number, len2 : number) : Diagram {
    let tags = l.tags;
    if (!tags.includes(TAG.LINE)) return l;
    if (l.path == undefined) return l;

    let p0 = l.path.points[0];
    let p1 = l.path.points[1];
    let v = p1.sub(p0).normalize();
    let p0_new = p0.sub(v.scale(len1));
    let p1_new = p1.add(v.scale(len2));

    let newl = l.copy();
    if (newl.path == undefined) return l; // to surpress typescript error
    newl.path.points = [p0_new, p1_new];
    return newl;
}

/**
 * Get the size of a diagram
 * @param diagram a diagram
 * @returns the width and height of the diagram
 */
export function size(diagram : Diagram) : [number, number] {
    let bb = diagram.bounding_box();
    return [bb[1].x - bb[0].x, bb[1].y - bb[0].y];
}
