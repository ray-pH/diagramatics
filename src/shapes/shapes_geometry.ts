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
    let tags = circle.tag.split(' ');
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

