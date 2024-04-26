import { Diagram, polygon, line, curve, text, diagram_combine } from './diagram.js';
import { Vector2, V2 } from './vector.js';
import { to_radian } from './utils.js';
import { TAG } from './tag_names.js';

// function helpers to create common shapes

/**
 * Create rectange centered at origin
 * @param width width of the rectangle
 * @param height height of the rectangle
 * @returns a Diagram object
 */
export function rectangle(width : number, height : number) : Diagram {
    let points = [
        V2(-width/2,-height/2), V2( width/2,-height/2), 
        V2( width/2, height/2), V2(-width/2, height/2)
    ];
    return polygon(points);
}

/**
 * Create rectange with a given bottom left corner and top right corner
 * @param bottomleft bottom left corner of the rectangle
 * @param topright top right corner of the rectangle
 * @returns a Diagram object
 */
export function rectangle_corner(bottomleft : Vector2, topright : Vector2) : Diagram {
    let points = [
        bottomleft, V2(topright.x, bottomleft.y),
        topright, V2(bottomleft.x, topright.y),
    ];
    return polygon(points);
}

/**
 * Create square centered at origin
 * @param side side length of the square
 * @returns a Diagram object
 */
export function square(side : number = 1) : Diagram {
    return rectangle(side, side);
}

/**
 * Create regular polygon centered at origin with a given radius
 * @param n number of sides
 * @param radius radius of the polygon
 * @returns a Diagram object
 * \* if you want to create a regular polygon with a given side length, use regular_polygon_side
 */
export function regular_polygon(n : number, radius : number = 1) : Diagram {
    let points : Vector2[] = [];
    for (let i = 0; i < n; i++) {
        points.push(V2(0,radius).rotate(i*2*Math.PI/n));
    }
    return polygon(points);
}

/**
 * Create regular polygon centered at origin with a given side length
 * @param n number of sides
 * @param sidelength side length of the polygon
 * @returns a Diagram object
 * \* if you want to create a regular polygon with a given radius, use regular_polygon
 */
export function regular_polygon_side(n : number, sidelength : number = 1) : Diagram {
    let radius = sidelength/(2*Math.sin(Math.PI/n));
    return regular_polygon(n, radius);
}

/**
 * Create circle centered at origin
 * *currently implemented as a regular polygon with 50 sides*
 * @param radius radius of the circle
 * @returns a Diagram object
 */
export function circle(radius : number = 1) : Diagram {
    return regular_polygon(50, radius).append_tags(TAG.CIRCLE);
}

/**
 * Create an arc centered at origin
 * @param radius radius of the arc
 * @param angle angle of the arc
 * @returns a Diagram object
 */
export function arc(radius : number = 1, angle : number = to_radian(360)) : Diagram {
    let n = 100;
    let points : Vector2[] = [];
    for (let i = 0; i < n; i++) {
        points.push(V2(radius,0).rotate(i*angle/(n-1)));
    }
    return curve(points);
}

/**
 * Create an arrow from origin to a given point
 * @param v the end point of the arrow
 * @param headsize size of the arrow head
 * @returns a Diagram object
 */
export function arrow(v : Vector2, headsize : number = 1) : Diagram {
    let line_diagram = line(V2(0,0), v).append_tags(TAG.ARROW_LINE);
    let raw_triangle = polygon([V2(0,0), V2(-headsize, headsize/2), V2(-headsize, -headsize/2)]);
    let head_triangle = raw_triangle.rotate(v.angle()).position(v).append_tags(TAG.ARROW_HEAD);
    return diagram_combine(line_diagram, head_triangle);
}

/**
 * Create an arrow from a given point to another given point
 * @param start the start point of the arrow
 * @param end the end point of the arrow
 * @param headsize size of the arrow head
 * @returns a Diagram object
 */
export function arrow1(start : Vector2, end : Vector2, headsize : number = 1) : Diagram {
    return arrow(end.sub(start), headsize).position(start);
}

/**
 * Create a two-sided arrow from a given point to another given point
 * @param start the start point of the arrow
 * @param end the end point of the arrow
 * @param headsize size of the arrow head
 * @returns a Diagram object
 */
export function arrow2(start : Vector2, end : Vector2, headsize : number = 1) : Diagram {
    let line_diagram = line(start, end).append_tags(TAG.ARROW_LINE);
    let direction    = end.sub(start);
    let raw_triangle = polygon([V2(0,0), V2(-headsize, headsize/2), V2(-headsize, -headsize/2)]);
    let head_triangle  = raw_triangle.rotate(direction.angle()).position(end).append_tags(TAG.ARROW_HEAD);
    let head_triangle2 = raw_triangle.rotate(direction.angle()+Math.PI).position(start).append_tags(TAG.ARROW_HEAD);
    return diagram_combine(line_diagram, head_triangle, head_triangle2);
}

/**
 * Create a text object with mathematical italic font
 * @param str text to be displayed
 * @returns a Diagram object
 */
export function textvar(str : string) : Diagram {
    return text(str).append_tags(TAG.TEXTVAR);
}
