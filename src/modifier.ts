import { Path, Diagram, DiagramType, polygon, line, curve, text, diagram_combine } from './diagram.js';
import { arc } from './shapes.js';
import { Vector2, V2, Vdir} from './vector.js';
import { linspace, range, from_degree } from './utils.js';
import { str_to_mathematical_italic } from './unicode_utils.js'
import { array_repeat } from './utils.js'

type modifierFunction = (d : Diagram) => Diagram

/**
 * convert a function that modifies a path of a diagram to a function that modifies a diagram
 * if the diagram is a polygon or curve, the function is applied directly to the diagram
 * if the diagram is a diagram, the function is recursively applied to all children
 * if the diagram is empty or text, the function is not applied
 * @param func function that modifies a path of a diagram
*/
function function_handle_path_type(func : modifierFunction) : modifierFunction {
    function modified_func(d : Diagram) : Diagram {
        if (d.type == DiagramType.Polygon || d.type == DiagramType.Curve ) {
            // apply directly
            d = func(d);
        } else if (d.type == DiagramType.Diagram) {
            // recursively apply to all children
            d.children = d.children.map(c => modified_func(c));
        } else if (d.type == DiagramType.Empty || d.type == DiagramType.Text) {
            // do nothing
        } else {
            throw new Error("Unreachable, unknown diagram type : " + d.type);
        }
        return d;
    }
    return modified_func;
}

function get_round_corner_arc_points(radius : number, points : [Vector2,Vector2,Vector2]) : Vector2[] {
    let [p1, p2, p3] = points;

    let v1 = p1.sub(p2).normalize();
    let v3 = p3.sub(p2).normalize();
    let corner_angle = Math.abs((v1.angle() - v3.angle()) % Math.PI);
    let s_dist  = radius/Math.tan(corner_angle/2);

    // s_dist can only be as long as half the distance to the closest point
    let d1 = p1.sub(p2).length();
    let d3 = p3.sub(p2).length();
    // recalculate
    s_dist = Math.min(s_dist, d1/2, d3/2);
    radius = s_dist * Math.tan(corner_angle/2);

    let pa = p2.add(v1.scale(s_dist));
    let pb = p2.add(v3.scale(s_dist));
    let distc = Math.sqrt(radius*radius + s_dist*s_dist);
    let pc = p2.add(
        v1.add(v3).normalize().scale(distc)
    );

    let angle_a = pa.sub(pc).angle();
    let angle_b = pb.sub(pc).angle();
    // if we just use angle_a and angle_b as is, the arc might be drawn in the wrong direction
    // find out which direction is the correct one
    // check whether angle_a is closer to angle_b, angle_b + 2π, or angle_b - 2π
    let angle_b_plus  = angle_b + 2*Math.PI;
    let angle_b_minus = angle_b - 2*Math.PI;
    let angle_a_b       = Math.abs(angle_a - angle_b);
    let angle_a_b_plus  = Math.abs(angle_a - angle_b_plus);
    let angle_a_b_minus = Math.abs(angle_a - angle_b_minus);
    if (angle_a_b_plus < angle_a_b)  angle_b = angle_b_plus;
    if (angle_a_b_minus < angle_a_b) angle_b = angle_b_minus;

    let arc_points = linspace(angle_a, angle_b, 40).map(a => pc.add(Vdir(a).scale(radius)));
    return arc_points;
}

/**
 * Create a function that modifies a diagram by rounding the corners of a polygon or curve
 * @param radius radius of the corner
 * @param point_indices indices of the points to be rounded
 * @returns function that modifies a diagram
 *
 * @example
 * ```javascript
 * let s = square(5).apply(mod.round_corner(2, [0,2]))
 * ```
 */
export function round_corner(radius : number | number[] =  1, point_indices? : number[]) : modifierFunction {
    // if radius is a number, create an array of length one
    if (typeof radius == "number") radius = [radius];

    // create a function that modify the path of a diagram, (only works for polygon and curve)
    // later we will convert it to a function that modifies any diagram using function_handle_path_type
    function func(d : Diagram) : Diagram {
        if (d.path == undefined) return d;
        let diagram_point_indices = range(0, d.path.points.length);
        if (point_indices == undefined) point_indices = diagram_point_indices;

        // filter only the points that are in diagram_point_indices
        point_indices = point_indices.filter(i => diagram_point_indices.includes(i));
        // repeat the radius array to match the number of points
        radius = array_repeat(radius as number[], point_indices.length);

        let new_points : Vector2[] = [];
        for (let i in d.path.points){
            let curr_i = parseInt(i);
            if (!point_indices.includes(curr_i)) {
                new_points.push(d.path.points[i]);
                continue;
            }
            let prev_i = (curr_i - 1 + d.path.points.length) % d.path.points.length;
            let next_i = (curr_i + 1) % d.path.points.length;
            let prev_p = d.path.points[prev_i];
            let curr_p = d.path.points[i];
            let next_p = d.path.points[next_i];
            let arc_points = get_round_corner_arc_points(
                radius[point_indices.indexOf(curr_i)], [prev_p, curr_p, next_p]);
            new_points = new_points.concat(arc_points);
        }

        // copy the diagram so that the style and other data is intact
        let newd = d.copy();
        newd.path = new Path(new_points);
        return newd;
    }
    return function_handle_path_type(func);
}
