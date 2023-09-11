import { Diagram, polygon, line, text, diagram_combine } from './diagram.js';
import { Vector2, V2, linspace } from './linear_algebra.js';
import { str_to_mathematical_italic } from './unicode_utils.js'

// function helpers to create common shapes

/**
 * Create rectange centered at origin
 * @param width width of the rectangle
 * @param height height of the rectangle
 * @returns a Diagram object
 */
export function rectangle(width : number, height : number) : Diagram {
    let points = [
        V2(-width/2,-height/2), V2(-width/2, height/2), 
        V2( width/2, height/2), V2( width/2,-height/2)
    ];
    return polygon(points);
}

/**
 * Create square centered at origin
 * @param side side length of the square
 * @returns a Diagram object
 */
export function square(side : number) : Diagram {
    return rectangle(side, side);
}

/**
 * Create regular polygon centered at origin
 * @param n number of sides
 * @param radius radius of the polygon
 * @returns a Diagram object
 */
export function regular_polygon(n : number, radius : number) : Diagram {
    let points : Vector2[] = [];
    for (let i = 0; i < n; i++) {
        points.push(V2(0,radius).rotate(i*2*Math.PI/n));
    }
    return polygon(points);
}

/**
 * Create circle centered at origin
 * *currently implemented as a regular polygon with 20 sides*
 * @param radius radius of the circle
 * @returns a Diagram object
 */
export function circle(radius : number) : Diagram {
    return regular_polygon(20, radius);
}


/**
 * Create arrow from start to end
 * @param start start point of the arrow
 * @param end end point of the arrow
 * @param headsize size of the arrow head
 * @returns a Diagram object
 */
export function arrow(start : Vector2, end : Vector2, headsize : number = 3) : Diagram {
    let line_diagram = line(start, end);
    let direction    = end.sub(start);
    let raw_triangle = polygon([V2(0,0), V2(-headsize, headsize/2), V2(-headsize, -headsize/2)]);
    let head_triangle = raw_triangle.rotate(direction.angle()).position(end);
    return diagram_combine([line_diagram, head_triangle]);
}

export function arrow2(start : Vector2, end : Vector2, headsize : number = 3) : Diagram {
    let line_diagram = line(start, end);
    let direction    = end.sub(start);
    let raw_triangle = polygon([V2(0,0), V2(-headsize, headsize/2), V2(-headsize, -headsize/2)]);
    let head_triangle  = raw_triangle.rotate(direction.angle()).position(end);
    let head_triangle2 = raw_triangle.rotate(direction.angle()+Math.PI).position(start);
    return diagram_combine([line_diagram, head_triangle, head_triangle2]);
}

/**
 * Create a text object with mathematical italic font
 * @param str text to be displayed
 * @returns a Diagram object
 */
export function textvar(str : string) : Diagram {
    return text(str_to_mathematical_italic(str));
}
