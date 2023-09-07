import { Diagram, polygon, line, diagram_combine } from './diagram.js';
import { Vector2, V2 } from './linear_algebra.js';

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
export function arrow(start : Vector2, end : Vector2, headsize : number = 3) : Diagram {
    let line_diagram = line(start, end);
    let direction    = end.sub(start);
    let raw_triangle = polygon([V2(0,0), V2(-headsize, headsize/2), V2(-headsize, -headsize/2)]);
    let head_triangle = raw_triangle.rotate(direction.angle()).translate(direction);
    return diagram_combine([line_diagram, head_triangle]);
}
