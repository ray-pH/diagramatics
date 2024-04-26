import { Diagram, line, curve, diagram_combine } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { linspace, range_inc } from '../utils.js';
import { arrow1, arrow2, textvar } from '../shapes.js'
import { TAG } from '../tag_names.js';

/**
 * Options for axes
 * Since axes, plot, etc. are separate objects.
 * Axes options is used so that it's easier to have consistent
 * setting for multiple objects.
 */
export type axes_options = {
    xrange    : [number, number],
    yrange    : [number, number],
    bbox?     : [Vector2, Vector2],
    xticks?   : number[],
    yticks?   : number[],
    n_sample? : number,
    ticksize  : number,
    headsize  : number,
    tick_label_offset? : number,
}

export let default_axes_options : axes_options = {
    // bbox   : [V2(-100,-100), V2(100,100)],
    bbox     : undefined,
    xrange   : [-2, 2],
    yrange   : [-2, 2],
    xticks   : undefined,
    yticks   : undefined,
    n_sample : 100,
    ticksize : 0.1,
    headsize : 0.05,
    tick_label_offset : 0,
}

export function axes_transform(axes_options? : Partial<axes_options>) : (v : Vector2) => Vector2 {
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

    return function(v : Vector2) : Vector2 {
        let x = lowerleft.x + (v.x-xmin)/(xmax-xmin)*(upperright.x-lowerleft.x);
        let y = lowerleft.y + (v.y-ymin)/(ymax-ymin)*(upperright.y-lowerleft.y);
        return V2(x,y);
    }
}
export let ax = axes_transform


/**
 * Draw xy axes without ticks
 * @param axes_options options for the axes
 * example: opt = {
 *    bbox   : [V2(-100,-100), V2(100,100)],
 * }
 * @returns a Diagram object
 */
export function axes_empty(axes_options? : Partial<axes_options>) : Diagram {
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

    let xaxis = arrow2(V2(lowerleft.x,yorigin), V2(upperright.x,yorigin), opt.headsize).append_tags(TAG.GRAPH_AXIS);
    let yaxis = arrow2(V2(xorigin,lowerleft.y), V2(xorigin,upperright.y), opt.headsize).append_tags(TAG.GRAPH_AXIS);
    return diagram_combine(xaxis, yaxis).stroke('gray').fill('gray');
    // return xaxis;
}

/**
 * Draw xy corner axes without ticks
 * @param axes_options options for the axes
 * example: opt = {
 *    bbox   : [V2(-100,-100), V2(100,100)],
 * }
 * @returns a Diagram object
 */
export function axes_corner_empty(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let [lowerleft, upperright] = opt.bbox;
    // get the intersection point

    let xaxis = arrow1(lowerleft, V2(upperright.x,lowerleft.y), opt.headsize).append_tags(TAG.GRAPH_AXIS);
    let yaxis = arrow1(lowerleft, V2(lowerleft.x,upperright.y), opt.headsize).append_tags(TAG.GRAPH_AXIS);
    return diagram_combine(xaxis, yaxis).stroke('gray').fill('gray');
    // return xaxis;
}

/**
 * Draw xy corner axes without ticks and with break mark in x axis
 * @param axes_options options for the axes
 */
export function axes_corner_empty_xbreak(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let [lowerleft, upperright] = opt.bbox;
    // get the intersection point

    let xbreak_ysize_ = opt.ticksize * 2;

    if (opt.xticks == undefined) {
        opt.xticks = get_tick_numbers(opt.xrange[0], opt.xrange[1], false);
        opt.xticks = opt.xticks.filter(x => x > opt.xrange[0] && x < opt.xrange[1]);
    }
    let xbreak_xsize = (opt.xticks![1] - opt.xticks![0])/2;
    let xbreak_xpos  = opt.xticks![0] - xbreak_xsize;
    let trans_f = axes_transform(opt);

    // suffix _ means in the transformed coordinate
    let xbreak_pleft_  = trans_f(V2(xbreak_xpos - xbreak_xsize/2,0));
    let xbreak_pright_ = trans_f(V2(xbreak_xpos + xbreak_xsize/2,0));
    let xbreak_xsize_  = xbreak_pright_.x - xbreak_pleft_.x;
    let xbreak_pbottom_= xbreak_pleft_.add(V2(xbreak_xsize_*1/3, -xbreak_ysize_/2));
    let xbreak_ptop_   = xbreak_pleft_.add(V2(xbreak_xsize_*2/3, xbreak_ysize_/2));
    let xbreak_curve   = curve([xbreak_pleft_, xbreak_pbottom_, xbreak_ptop_, xbreak_pright_]);

    let xaxis_left = line(lowerleft, xbreak_pleft_);
    let xaxis_right = arrow1(xbreak_pright_, V2(upperright.x,lowerleft.y), opt.headsize);
    let xaxis = diagram_combine(xaxis_left, xbreak_curve, xaxis_right).append_tags(TAG.GRAPH_AXIS);
    let yaxis = arrow1(lowerleft, V2(lowerleft.x,upperright.y), opt.headsize).append_tags(TAG.GRAPH_AXIS);
    return diagram_combine(xaxis, yaxis).stroke('gray').fill('gray');
}

/**
 * Create a single tick mark in the x axis
 * @param x x coordinate of the tick mark
 * @param y y coordinate of the tick mark
 * @param height height of the tick mark
 */
export function xtickmark_empty(x : number, y : number, axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let height = opt.ticksize;
    let pos = axes_transform(opt)(V2(x,y));
    return line(V2(pos.x,pos.y+height/2), V2(pos.x,pos.y-height/2))
        .stroke('gray').append_tags(TAG.GRAPH_TICK);
}

export function xtickmark(x : number, y : number, str : string, axes_options? : Partial<axes_options>) : Diagram {
    let tick = xtickmark_empty(x, y, axes_options);
    let label = textvar(str).move_origin_text("top-center").translate(tick.get_anchor("bottom-center"))
                .translate(V2(0, -(axes_options?.tick_label_offset || 0)))
                .textfill('gray').append_tags(TAG.GRAPH_TICK_LABEL);
    return diagram_combine(tick, label);
}

/**
 * Create a single tick mark in the y axis
 * @param y y coordinate of the tick mark
 * @param x x coordinate of the tick mark
 * @param height height of the tick mark
 */
export function ytickmark_empty(y : number, x : number, axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let height = opt.ticksize;
    let pos = axes_transform(opt)(V2(x,y));
    return line(V2(pos.x+height/2,pos.y), V2(pos.x-height/2,pos.y))
        .stroke('gray').append_tags(TAG.GRAPH_TICK);
}
export function ytickmark(y : number, x : number, str : string, axes_options? : Partial<axes_options>) : Diagram {
    let tick = ytickmark_empty(y, x, axes_options);
    let label = textvar(str).move_origin_text("center-right").translate(tick.get_anchor("center-left"))
                .translate(V2(-(axes_options?.tick_label_offset || 0), 0))
                .textfill('gray').append_tags(TAG.GRAPH_TICK_LABEL);
    return diagram_combine(tick, label);
}

// ======= BEGIN utility to calculate ticks

function get_tick_interval(min : number, max : number) : number {
    let range = max-min;
    let range_order = Math.floor(Math.log10(range));
    let interval_to_try = [0.1, 0.15, 0.2, 0.5, 1.0].map(x => x*Math.pow(10,range_order));
    let tick_counts = interval_to_try.map(x => Math.floor(range/x));
    // choose the interval so that the number of ticks is between the biggest one but less than 10
    for (let i = 0; i < tick_counts.length; i++) {
        if (tick_counts[i] <= 10) {
            return interval_to_try[i];
        }
    }
    return interval_to_try.slice(-1)[0];
}

function get_tick_numbers_range(min : number, max : number) : number[] {
    let interval = get_tick_interval(min, max);
    // round min and max to the nearest interval
    let new_min = Math.round(min/interval)*interval;
    let new_max = Math.round(max/interval)*interval;
    let new_count = Math.round((new_max-new_min)/interval);
    let l = range_inc(0, new_count).map(x => new_min + x*interval);
    // round l to the nearest interval
    let interval_prec = -Math.floor(Math.log10(interval)-1);
    if (interval_prec >= 0) l = l.map(x => parseFloat(x.toFixed(interval_prec)));
    return l;
}
function get_tick_numbers_aroundzero(neg : number, pos : number, nozero : boolean = true) : number[] {
    if (neg > 0) throw new Error('neg must be negative');
    if (pos < 0) throw new Error('pos must be positive');
    let magnitude = Math.max(-neg, pos);
    let interval = get_tick_interval(-magnitude, magnitude);

    // round min and max to the nearest interval
    let new_min = Math.ceil(neg/interval)*interval;
    let new_max = Math.floor(pos/interval)*interval;
    let new_count = Math.floor((new_max-new_min)/interval);

    let l = linspace(new_min, new_max, new_count+1);
    // round l to the nearest interval
    let interval_prec = -Math.floor(Math.log10(interval));
    if (interval_prec >= 0) l = l.map(x => parseFloat(x.toFixed(interval_prec)));

    if (nozero){
        return l.filter(x => x != 0);
    }else{
        return l;
    }
}
export function get_tick_numbers(min : number, max : number, exclude_zero : boolean = true) : number[] {
    if (exclude_zero && min < 0 && max > 0) {
        return get_tick_numbers_aroundzero(min, max);
    } else {
        return get_tick_numbers_range(min, max);
    }
}

// ======= END utility to calculate ticks

export function xticks(axes_options : Partial<axes_options>, y : number = 0, empty = false) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.xticks == undefined) {
        opt.xticks = get_tick_numbers(opt.xrange[0], opt.xrange[1], y == 0);
    }

    // remove ticks outside of the range
    // opt.xticks = opt.xticks.filter(x => x >= opt.xrange[0] && x <= opt.xrange[1]);
    opt.xticks = opt.xticks.filter(x => x > opt.xrange[0] && x < opt.xrange[1]);

    let xticks_diagrams = empty ? 
        opt.xticks.map(x => xtickmark_empty(x, y, opt)) :
        opt.xticks.map(x => xtickmark(x, y, x.toString(), opt));
    return diagram_combine(...xticks_diagrams);
}
export function yticks(axes_options : Partial<axes_options>, x : number = 0, empty = false) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.yticks == undefined) {
        opt.yticks = get_tick_numbers(opt.yrange[0], opt.yrange[1], x == 0);
    }

    // remove ticks outside of the range
    // opt.yticks = opt.yticks.filter(y => y >= opt.yrange[0] && y <= opt.yrange[1]);
    opt.yticks = opt.yticks.filter(y => y > opt.yrange[0] && y < opt.yrange[1]);

    let yticks_diagrams = empty ? 
        opt.yticks.map(y => ytickmark_empty(y, x, opt)) :
        opt.yticks.map(y => ytickmark(y, x, y.toString(), opt));
    return diagram_combine(...yticks_diagrams);
}


/**
 * Draw xy corner axes with ticks
 * @param axes_options options for the axes
 */
export function xycorneraxes(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let xmin = opt.xrange[0];
    let ymin = opt.yrange[0];
    return diagram_combine(axes_corner_empty(opt), xticks(opt, ymin), yticks(opt, xmin));
}

/**
 * Draw xy corner axes with ticks and break mark in x axis
 * @param axes_options options for the axes
 */
export function xycorneraxes_xbreak(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let xmin = opt.xrange[0];
    let ymin = opt.yrange[0];
    return diagram_combine(axes_corner_empty_xbreak(opt), xticks(opt, ymin), yticks(opt, xmin));
}


/**
 * Draw xy axes with ticks
 * @param axes_options options for the axes
 */
export function xyaxes(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    return diagram_combine(axes_empty(opt), xticks(opt), yticks(opt));
}

/**
 * Draw x axis with ticks
 * @param axes_options options for the axis
 */
export function xaxis(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let ax_origin = axes_transform(opt)(V2(0,0));
    let xaxis = arrow2(V2(opt.bbox[0].x, ax_origin.y), V2(opt.bbox[1].x, ax_origin.y), opt.headsize)
        .append_tags(TAG.GRAPH_AXIS);
    let xtickmarks = xticks(opt, 0);
    return diagram_combine(xaxis, xtickmarks);
}

/**
 * Draw y axis with ticks
 * @param axes_options options for the axis
 */
export function yaxis(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let ax_origin = axes_transform(opt)(V2(0,0));
    let yaxis = arrow2(V2(ax_origin.x, opt.bbox[0].y), V2(ax_origin.x, opt.bbox[1].y), opt.headsize)
        .append_tags(TAG.GRAPH_AXIS);
    let ytickmarks = yticks(opt, 0);
    return diagram_combine(yaxis, ytickmarks);
}

export function ygrid(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.xticks == undefined) {
        opt.xticks = get_tick_numbers(opt.xrange[0], opt.xrange[1], false);
    }

    let ygrid_diagrams = opt.xticks.map(x => 
        line(V2(x,opt.yrange[0]), V2(x,opt.yrange[1])).transform(axes_transform(opt)).stroke('gray')
    );
    return diagram_combine(...ygrid_diagrams).append_tags(TAG.GRAPH_GRID);
}

export function xgrid(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.yticks == undefined) {
        opt.yticks = get_tick_numbers(opt.yrange[0], opt.yrange[1], false);
    }

    let xgrid_diagrams = opt.yticks.map(y =>
        line(V2(opt.xrange[0],y), V2(opt.xrange[1],y)).transform(axes_transform(opt)).stroke('gray')
    );
    return diagram_combine(...xgrid_diagrams).append_tags(TAG.GRAPH_GRID);
}

//  TODO: add xticks and ytiks as argument
export function xygrid(axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.xticks == undefined) {
        opt.xticks = get_tick_numbers(opt.xrange[0], opt.xrange[1], false);
    }
    if (opt.yticks == undefined) {
        opt.yticks = get_tick_numbers(opt.yrange[0], opt.yrange[1], false);
    }

    let xgrid_diagrams = opt.xticks.map(x => 
        line(V2(x,opt.yrange[0]), V2(x,opt.yrange[1])).transform(axes_transform(opt)).stroke('gray')
    );
    let ygrid_diagrams = opt.yticks.map(y =>
        line(V2(opt.xrange[0],y), V2(opt.xrange[1],y)).transform(axes_transform(opt)).stroke('gray')
    );
    return diagram_combine(...xgrid_diagrams, ...ygrid_diagrams);

}




// TODO : 
// export function axes(axes_options? : Partial<axes_options>) : Diagram {
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
export function plotv(data : Vector2[], axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let [xmin, xmax] = opt.xrange;
    let [ymin, ymax] = opt.yrange;

    // split data into segments that are within the range
    let segments : Vector2[][] = [];
    let current_segment : Vector2[] = [];
    for (let i=0; i < data.length; i++) {
        let p = data[i];
        let is_inside = (p.x >= xmin && p.x <= xmax && p.y >= ymin && p.y <= ymax);
        if (!is_inside) {
            if (current_segment.length > 1) segments.push(current_segment);
            current_segment = [];
        } else {
            current_segment.push(p);
        }
    }
    if (current_segment.length > 1) segments.push(current_segment);

    let d : Diagram;
    // create separate paths for each segment
    let path_diagrams = segments.map(segment => curve(segment));
    if (path_diagrams.length == 1){
        d = path_diagrams[0];
    } else {
        d = diagram_combine(...path_diagrams).stroke('black').fill('none');
    }

    return d.transform(axes_transform(opt));
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
export function plot(xdata : number[], ydata : number[], axes_options? : Partial<axes_options>) : Diagram {
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
export function plotf(f : (x:number)=>number, axes_options? : Partial<axes_options>) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let xdata = linspace(...opt.xrange, opt.n_sample);
    let vdata = xdata.map(x => V2(x,f(x)));
    return plotv(vdata, axes_options);
}

export function under_curvef(f : (x:number)=>number, x_start : number, x_end : number,  axes_options? : Partial<axes_options> ) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined

    let new_opt = {...opt}; // copy opt
    new_opt.xrange = [x_start, x_end];
    new_opt.bbox = undefined;

    // draw plot from x_start to x_end
    let fplot = plotf(f, new_opt);
    let area_under = fplot.add_points([V2(x_end,0), V2(x_start,0)]).to_polygon();
    return area_under.transform(axes_transform(opt));
}
