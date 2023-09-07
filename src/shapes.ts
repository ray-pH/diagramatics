import { Diagram, polygon } from './diagram.js';
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
