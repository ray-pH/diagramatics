import { Diagram, polygon, line, diagram_combine } from '../diagram.js';
import { Vector2, V2, linspace } from '../linear_algebra.js';

export function inclined_plane(length : number, angle : number) : Diagram {
    return polygon([V2(0,0), V2(length, length*Math.tan(angle)), V2(length,0)]);
}
