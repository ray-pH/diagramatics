import { Diagram, polygon, line, curve, diagram_combine } from './diagram.js';
import { Vector2, V2, linspace } from './linear_algebra.js';
import { arrow2 } from './shapes.js'

/**
 * Options for axes
 * Since axes, plot, etc. are separate objects.
 * Axes options is used so that it's easier to have consistent
 * setting for multiple objects.
 */
export type axes_options = {
    bbox    : [Vector2, Vector2],
    xrange  : [number, number],
    yrange  : [number, number],
    xticks? : number[],
    yticks? : number[],
}

export let default_axes_options : axes_options = {
    bbox : [V2(-100,-100), V2(100,100)],
    xrange : [-2, 2],
    yrange : [-2, 2],
    xticks : undefined,
    yticks : undefined,
}

/**
 * Draw xy axes without ticks
 * @param axes_options options for the axes
 * example: opt = {
 *    bbox   : [V2(-100,-100), V2(100,100)],
 * }
 * @returns a Diagram object
 */
export function axes_empty(axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined

    let [lowerleft, upperright] = opt.bbox;

    let xaxis = arrow2(V2(lowerleft.x,0), V2(upperright.x,0));
    let yaxis = arrow2(V2(0,lowerleft.y), V2(0,upperright.y));
    return diagram_combine([xaxis, yaxis]).stroke('gray').fill('gray');
    // return xaxis;
}

// TODO : 
// export function axes(axes_options? : axes_options) : Diagram {
//     let opt = {...default_axes_options, ...axes_options}; // use default if not defined
// }

/**
 * Plot a curve given a list of points
 * @param data list of points
 * @param axes_options options for the axes
 * example: opt = {
 *  bbox   : [V2(-100,-100), V2(100,100)],
 *  xrange : [-2, 2],
 *  yrange : [-2, 2],
 * }
 */
export function plotv(data : Vector2[], axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined

    let [lowerleft, upperright] = opt.bbox;
    let [xmin, xmax] = opt.xrange;
    let [ymin, ymax] = opt.yrange;

    // map xdata and ydata to axes coordinates
    let x = data.map(v => lowerleft.x + (v.x-xmin)/(xmax-xmin)*(upperright.x-lowerleft.x));
    let y = data.map(v => lowerleft.y + (v.y-ymin)/(ymax-ymin)*(upperright.y-lowerleft.y));
    let v = x.map((x,i) => V2(x,y[i]));

    // split v into segments that are within the bbox
    let segments : Vector2[][] = [];
    let current_segment : Vector2[] = [];
    for (let i=0; i<v.length; i++) {
        let p = v[i];
        let is_inside = (p.x >= lowerleft.x && p.x <= upperright.x && p.y >= lowerleft.y && p.y <= upperright.y);
        if (!is_inside) {
            if (current_segment.length > 1) segments.push(current_segment);
            current_segment = [];
        } else {
            current_segment.push(p);
        }
    }
    if (current_segment.length > 1) segments.push(current_segment);

    // create separate paths for each segment
    let paths = segments.map(segment => curve(segment));
    return diagram_combine(paths).stroke('black').fill('none');
}

/**
 * Plot a curve given xdata and ydata
 * @param xdata x coordinates of the data
 * @param ydata y coordinates of the data
 * @param axes_options options for the axes
 * example: opt = {
 *   bbox   : [V2(-100,-100), V2(100,100)],
 *   xrange : [-2, 2],
 *   yrange : [-2, 2],
 * }
 */
export function plot(xdata : number[], ydata : number[], axes_options? : axes_options) : Diagram {
    if (xdata.length != ydata.length) throw new Error('xdata and ydata must have the same length');
    let vdata = xdata.map((x,i) => V2(x,ydata[i]));
    return plotv(vdata, axes_options);
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
