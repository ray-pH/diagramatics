import { Diagram, polygon, curve } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { linspace } from '../utils.js';

/**
 * Create an inclined plane.
 * @param length The length of the inclined plane.
 * @param angle The angle of the inclined plane.
 * @returns A diagram of the inclined plane.
 */
export function inclined_plane(length : number, angle : number) : Diagram {
    return polygon([V2(0,0), V2(length, length*Math.tan(angle)), V2(length,0)]);
}

/**
 * Create a spring between two points.
 * @param p1 The first point.
 * @param p2 The second point.
 * @param radius The radius of the spring.
 * @param coil_number The number of coils in the spring.
 * @param separation_coefficient The coefficient of separation between coils.
 * \* at 0, no coils are overlapping. (there is no max value)
 * @param sample_number The number of points to sample in the spring.
 * @returns A diagram of the spring.
 */
export function spring(p1 : Vector2, p2 : Vector2, radius : number = 1, coil_number : number = 10,
    separation_coefficient : number = 0.5, sample_number : number = 100) : Diagram {

    // I got this equation from https://www.reddit.com/r/desmos/comments/i3m3yd/interactive_spring_graphic/

    let angle  = p2.sub(p1).angle();
    let length = p2.sub(p1).length();

    // abbrev
    let R = separation_coefficient;
    let n = coil_number;

    let k = radius/R; // k*R = radius

    let a = (2 * n + 1) * Math.PI;
    let b = (length - 2*R) / a;

    let parametric_function = (t : number) => V2(b*t + R - R*Math.cos(t), k*R*Math.sin(t));
    let points = linspace(0, a, sample_number).map(parametric_function);
    return curve(points).rotate(angle).translate(p1);
}
