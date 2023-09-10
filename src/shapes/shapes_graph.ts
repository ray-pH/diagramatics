import { Diagram, polygon, line, curve, diagram_combine } from '../diagram.js';
import { Vector2, V2, linspace } from '../linear_algebra.js';
import { arrow2 } from '../shapes.js'

/**
 * Options for axes
 * Since axes, plot, etc. are separate objects.
 * Axes options is used so that it's easier to have consistent
 * setting for multiple objects.
 */
export type axes_options = {
    xrange  : [number, number],
    yrange  : [number, number],
    bbox?   : [Vector2, Vector2],
    xticks? : number[],
    yticks? : number[],
    n?      : number,
}

export let default_axes_options : axes_options = {
    // bbox   : [V2(-100,-100), V2(100,100)],
    bbox   : undefined,
    xrange : [-2, 2],
    yrange : [-2, 2],
    xticks : undefined,
    yticks : undefined,
    n      : 100,
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
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let [lowerleft, upperright] = opt.bbox;
    // get the intersection point
    let xorigin = lowerleft.x + (upperright.x-lowerleft.x)/(opt.xrange[1]-opt.xrange[0])*(0-opt.xrange[0]);
    let yorigin = lowerleft.y + (upperright.y-lowerleft.y)/(opt.yrange[1]-opt.yrange[0])*(0-opt.yrange[0]);

    let xaxis = arrow2(V2(lowerleft.x,yorigin), V2(upperright.x,yorigin), 0.05);
    let yaxis = arrow2(V2(xorigin,lowerleft.y), V2(xorigin,upperright.y), 0.05);
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
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

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
    let path_diagrams = segments.map(segment => curve(segment));
    if (path_diagrams.length == 1){
        return path_diagrams[0];
    } else {
        return diagram_combine(path_diagrams).stroke('black').fill('none');
    }
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

/**
 * Plot a function
 * @param f function to plot
 * @param n number of points to plot
 * @param axes_options options for the axes
 */
export function plotf(f : (x:number)=>number, axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let xdata = linspace(...opt.xrange, opt.n);
    let vdata = xdata.map(x => V2(x,f(x)));
    return plotv(vdata, axes_options);
}

export function under_curvef(f : (x:number)=>number, x_start : number, x_end : number,  axes_options? : axes_options ) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let new_opt = {...opt}; // copy opt

    new_opt.xrange = [x_start, x_end];

    // map bbox from the original value in opt into the new value from x_start and x_end
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }
    let [lowerleft, upperright] = opt.bbox;
    let [xmin, xmax] = opt.xrange;
    let lowerleft_new  = V2(lowerleft.x + (x_start-xmin)/(xmax-xmin)*(upperright.x-lowerleft.x), lowerleft.y);
    let upperright_new = V2(lowerleft.x + (x_end-xmin)/(xmax-xmin)*(upperright.x-lowerleft.x), upperright.y);
    new_opt.bbox = [lowerleft_new, upperright_new];

    // find y = 0 from the opt.yrange and opt.bbox
    let [ymin, ymax] = opt.yrange;
    let y0 = lowerleft.y + (0-ymin)/(ymax-ymin)*(upperright.y-lowerleft.y);

    // define left and right points in y0
    let y0left  = V2(lowerleft_new.x, y0);
    let y0right = V2(upperright_new.x, y0);

    return plotf(f, new_opt).add_points([y0right, y0left]).to_polygon();
}
