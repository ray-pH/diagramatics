import { Diagram, polygon, line, diagram_combine, curve } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { linspace, from_degree } from '../utils.js';

// ============================= utilities
/**
 * Get the radius of a circle
 * @param circle a circle Diagram
 * @returns radius of the circle
 */
export function circle_radius(circle : Diagram) : number {
    let tags = circle.tags;
    if (!tags.includes('circle')) return -1;

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
    if (!tags.includes('line')) return l;
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
