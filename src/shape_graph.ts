import { Diagram, polygon, line, diagram_combine } from './diagram.js';
import { Vector2, V2, linspace } from './linear_algebra.js';
import { arrow2 } from './shapes.js'

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

function plot(axes : Diagram, xarr : number[], yarr : number[]) : Diagram {
}
// export function plot_function(f : (x:number)=>number, 
//     xmin : number =-50, xmax : number = 50, n : number = 100,
//     yboundmin : number = -50, yboundmax : number = 50
// ) : Diagram {
//     let x = linspace(xmin, xmax, n);
//     let y = x.map(f);
//     let points = x.map((x,i) => V2(x,y[i]));
//     return polygon(points).fill('none').stroke('black');
// }
