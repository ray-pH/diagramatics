import { Path, Diagram, DiagramType, diagram_combine, } from './diagram.js';
import { Vector2, V2, Vdir} from './vector.js';
import { linspace, linspace_exc, range } from './utils.js';
import { array_repeat } from './utils.js'
import { arrow1 } from './shapes.js';
import { TAG } from './tag_names.js';

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
            return func(d);
        } else if (d.type == DiagramType.Diagram) {
            // recursively apply to all children
            d.children = d.children.map(c => modified_func(c));
            return d;
        } else if (d.type == DiagramType.Text || d.type == DiagramType.MultilineText) {
            // do nothing
            return d;
        } else {
            throw new Error("Unreachable, unknown diagram type : " + d.type);
        }
    }
    return modified_func;
}


/**
 * Resample a diagram so that it has `n` points
 * @param n number of points
 * @returns function that modifies a diagram
 */
export function resample(n : number) : modifierFunction{
    // TODO : this function uses Diagram.parametric_point,
    // which might be slow for large n
    // for performance reason, we might want to implement it directly by calculating
    // the points of the path here
    function func(d : Diagram) : Diagram {
        if (d.path == undefined) return d;
        let ts = (d.type == DiagramType.Curve) ? linspace(0, 1, n) : linspace_exc(0, 1, n);
        let new_points = ts.map(t => d.parametric_point(t));
        d.path = new Path(new_points);
        return d;
    }
    return function_handle_path_type(func);
}

/**
 * Subdivide each segment of a diagram into n segments
 * @param n number of segments to subdivide each segment into
 * @returns function that modifies a diagram
 */
export function subdivide(n : number = 100) : modifierFunction {
    function func(d : Diagram) : Diagram {
        if (d.path == undefined) return d;

        let new_points : Vector2[] = [];
        for (let i = 0; i < d.path.points.length; i++){
            let curr_i = i;
            let next_i = (curr_i + 1) % d.path.points.length;
            let curr_p = d.path.points[i];
            let next_p = d.path.points[next_i];

            let xs = linspace(curr_p.x, next_p.x, n+1);
            let ys = linspace(curr_p.y, next_p.y, n+1);
            let subdivide_points = xs.map((x,i) => V2(x, ys[i]));
            // ignore the last point
            subdivide_points.pop();
            new_points = new_points.concat(subdivide_points);
        }

        d.path = new Path(new_points);
        return d;
    }
    return function_handle_path_type(func);
}

/**
 * Get a slice of a diagram from `t_start` to `t_end`
 * @param t_start starting point of the slice
 * @param t_end ending point of the slice
 * @param n number of points in the slice
 * @returns function that modifies a diagram
 */
export function slicepath(t_start : number, t_end : number, n : number = 100) : modifierFunction {
    if (t_start > t_end) [t_start, t_end] = [t_end, t_start];
    if (t_start < 0) t_start = 0;
    if (t_end > 1) t_end = 1;

    let n_total = Math.floor(n / (t_end - t_start));
    function func(d : Diagram) : Diagram {
        if (d.path == undefined) return d;
        let dnew = d.apply(resample(n_total));
        if (dnew.path == undefined) return d;
        // take slice of the path
        let new_points = dnew.path.points.slice(
            Math.floor(t_start * n_total),
            Math.floor(t_end * n_total) + 1
        );
        dnew.path = new Path(new_points);
        return dnew;
    }
    return function_handle_path_type(func);
}


function get_round_corner_arc_points(radius : number, points : [Vector2,Vector2,Vector2], count : number) : Vector2[] {
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

    let arc_points = linspace(angle_a, angle_b, count).map(a => pc.add(Vdir(a).scale(radius)));
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
export function round_corner(radius : number | number[] =  1, point_indices? : number[], count : number = 40) : modifierFunction {
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
        for (let i = 0; i < d.path.points.length; i++){
            let curr_i = i;
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
                radius[point_indices.indexOf(curr_i)], [prev_p, curr_p, next_p], count);
            new_points = new_points.concat(arc_points);
        }

        d.path = new Path(new_points);
        return d;
    }
    return function_handle_path_type(func);
}


/**
 * Add an arrow to the end of a curve
 * Make sure the diagram this modifier is applied to is a curve
 * @param headsize size of the arrow head
 * @param flip flip the arrow position
 */
export function add_arrow(headsize : number, flip = false) : modifierFunction {
    function func(c : Diagram) : Diagram {
        if (c.path == undefined) return c;
        let p1 = flip ? c.path.points[0] : c.path.points[c.path.points.length - 1];
        let p0 = flip ? c.path.points[1] : c.path.points[c.path.points.length - 2];
        let arrow = arrow1(p0, p1, headsize);
        return diagram_combine(c, arrow).clone_style_from(c);
    }
    return function_handle_path_type(func);
}

function arrowhead_angle(d : Diagram) : number {
    if (!d.contain_tag(TAG.ARROW_HEAD)) return NaN;
    let points = d.path?.points
    if (points == undefined) return NaN;
    if (points.length != 3) return NaN;
    let v_tip   = points[0];
    let v_base1 = points[1];
    let v_base2 = points[2];
    let v_base  = v_base1.add(v_base2).scale(0.5)
    let v_dir   = v_tip.sub(v_base);
    return v_dir.angle();
}

/**
* Replace arrowhead inside a diagram with another diagram
* @param new_arrowhead diagram to replace the arrowhead with
* The arrow will be rotated automatically,
* The default direction is to the right (+x) with the tip at the origin
*/
export function arrowhead_replace(new_arrowhead : Diagram) : modifierFunction {
    return function func(d : Diagram) : Diagram {
        return d.apply_to_tagged_recursive(TAG.ARROW_HEAD, (arrowhead : Diagram) => {
            let angle = arrowhead_angle(arrowhead);
            return new_arrowhead.copy().rotate(angle).position(arrowhead.origin);
        })
    }
}
