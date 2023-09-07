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
 * Draw xy axes
 * @param xmin minimum x value
 * @param xmax maximum x value
 * @param ymin minimum y value
 * @param ymax maximum y value
 * @returns a Diagram object
 */
export function axes(xmin : number = -50, xmax : number = 50, ymin : number = -50, ymax : number = 50) : Diagram {
    let xaxis = arrow2(V2(xmin,0), V2(xmax,0));
    let yaxis = arrow2(V2(0,ymin), V2(0,ymax));
    return diagram_combine([xaxis, yaxis]).stroke('gray').fill('gray');
    // return xaxis;
}
