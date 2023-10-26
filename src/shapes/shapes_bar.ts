import { Diagram, line, text, diagram_combine } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { rectangle, } from '../shapes.js'
import { axes_options, yticks, axes_transform } from './shapes_graph.js'

export type bar_options = {
    gap : number,
    yrange? : [number, number],
    yticks? : number[],
    bbox? : [Vector2, Vector2],
    ticksize : number,
}

export let default_bar_options : bar_options = {
    gap: 0.1,
    ticksize: 0.2,
    bbox: [V2(0,0), V2(10,10)],
}


function to_ax_options(datavalues : number[], baropt : Partial<bar_options>) : axes_options {
    let opt = {...default_bar_options, ...baropt}; // use default if not defined
    let n = datavalues.length;

    let ymax = Math.max(...datavalues);
    let yrange = opt.yrange ?? [0, ymax];
    let bbox = opt.bbox ?? [V2(0,0), V2(10,ymax)];

    let ax_opt : axes_options = {
        xrange   : [-1, n],
        yrange   : yrange,
        headsize : 0,
        ticksize : opt.ticksize,
        bbox     : bbox,
    }
    return ax_opt;
}

/**
 * Plot a bar chart
 * @param datavalues the data values to plot
 * @param bar_options options for the bar chart
 * @returns a diagram of the bar chart
 */
export function plot(datavalues : number[], bar_options : Partial<bar_options> = {}) : Diagram {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined

    let ax_opt = to_ax_options(datavalues, opt);
    let ax_f = axes_transform(ax_opt);

    let bar_arr = datavalues.map((y,i) => 
        rectangle(1.0-opt.gap, y).move_origin('bottom-center')
            .position(V2(Number(i), 0)).transform(ax_f)
    );
    return diagram_combine(...bar_arr);
}

/**
 * x-axes with label for bar chart
 * @param datanames the data names
 * @param bar_options options for the bar chart
 * @returns a diagram of the x-axes
 */
export function xaxes(datanames : string[], bar_options : Partial<bar_options> = {}) : Diagram {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let n = datanames.length;

    let ax_opt = to_ax_options(datanames.map(() => 1), opt);
    let ax_f = axes_transform(ax_opt);

    let l = line(V2(-1,0), V2(n,0)).transform(ax_f).stroke('gray');
    let label_arr = datanames.map((name,i) => 
        text(name).move_origin_text('top-center').position(V2(Number(i), 0)).transform(ax_f)
            .translate(V2(0,-opt.ticksize/2)).textfill('gray')
    );
    return diagram_combine(l, ...label_arr);
}

/**
 * y-axes with label for bar chart
 * @param datavalues the data values
 * @param bar_options options for the bar chart
 */
export function yaxes(datavalues : number[], bar_options : Partial<bar_options> = {}) : Diagram {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined

    let ax_opt = to_ax_options(datavalues, opt);

    let ymax   = ax_opt.yrange[1];
    let yrange = opt.yrange ?? [0, ymax];

    let ax_f = axes_transform(ax_opt);

    let l = line(V2(-1,0), V2(-1,yrange[1])).transform(ax_f).stroke('gray');
    return yticks(ax_opt, -1).combine(l);
}

export function axes_tansform(datavalues : number[], bar_options : Partial<bar_options> = {}) : (v : Vector2) => Vector2 {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let ax_opt = to_ax_options(datavalues, opt);
    return axes_transform(ax_opt);
}
