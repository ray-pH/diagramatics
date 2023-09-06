import { Diagram, polygon } from './diagram.js';
import { Vector2, V2 } from './linear_algebra.js';

// function helpers to create common shapes

export function rectangle(width : number, height : number) : Diagram {
    let points = [
        V2(-width/2,-height/2), V2(-width/2, height/2), 
        V2( width/2, height/2), V2( width/2,-height/2)
    ];
    return polygon(points);
}

export function square(side : number) : Diagram {
    return rectangle(side, side);
}

