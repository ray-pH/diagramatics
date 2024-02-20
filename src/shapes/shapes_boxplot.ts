import { Diagram, line, text, diagram_combine } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { rectangle, arrow2 } from '../shapes.js'
import { axes_options, xticks, yticks, axes_transform, xtickmark_empty, ytickmark_empty } from './shapes_graph.js'

export type boxplot_options = {
    range? : [number, number],
    ticks? : number[],
    bbox? : [Vector2, Vector2],
    ticksize : number,
    headsize : number,
    orientation : 'x' | 'y',
    tick_label_offset? : number,
}

export let default_bar_options : boxplot_options = {
    ticksize: 0.2,
    range : [0,1],
    bbox: [V2(0,0), V2(10,10)],
    orientation: 'x',
    headsize : 0.05,
    tick_label_offset : 0,
}

export function to_ax_options(baropt : Partial<boxplot_options>) : axes_options {
    let opt = {...default_bar_options, ...baropt}; // use default if not defined
    opt.bbox = opt.bbox ?? [V2(0,0), V2(10,10)]; // just to make sure it is defined

    if (opt.orientation == 'x') {
        let ax_opt : axes_options = {
            xrange   : opt.range as [number, number],
            yrange   : [opt.bbox[0].y, opt.bbox[1].y],
            xticks   : opt.ticks,
            headsize : opt.headsize,
            ticksize : opt.ticksize,
            bbox     : opt.bbox,
            tick_label_offset : opt.tick_label_offset,
        }
        return ax_opt;
    } else {
        let ax_opt : axes_options = {
            xrange   : [opt.bbox[0].x, opt.bbox[1].x],
            yrange   : opt.range as [number, number],
            yticks   : opt.ticks,
            headsize : opt.headsize,
            ticksize : opt.ticksize,
            bbox     : opt.bbox,
            tick_label_offset : opt.tick_label_offset,
        }
        return ax_opt;
    }
}


/**
 * axis for boxplot
 * @param bar_options options for the bar chart
 * @returns a diagram of the axes
 */
export function axes(bar_options : Partial<boxplot_options> = {}) : Diagram {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let ax_opt = to_ax_options(opt);
    // let ax_f = axes_transform(ax_opt);

    let [lowerleft, upperright] = opt.bbox as [Vector2, Vector2];

    if (opt.orientation == 'x') {
        let xaxis = arrow2(V2(lowerleft.x,0), V2(upperright.x,0), opt.headsize);
        let xtickmarks = xticks(ax_opt, 0);
        return diagram_combine(xaxis, xtickmarks).stroke('gray').fill('gray');
    } else {
        let yaxis = arrow2(V2(0,lowerleft.y), V2(0,upperright.y), opt.headsize);
        let ytickmarks = yticks(ax_opt, 0);
        return diagram_combine(yaxis, ytickmarks).stroke('gray').fill('gray');
    }
}

/**
 */
export function empty_tickmarks(xs: number[], bar_options : Partial<boxplot_options> = {}) : Diagram {
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let ax_opt = to_ax_options(opt);
    // let ax_f = axes_transform(ax_opt);
    if (opt.orientation == 'x') {
        ax_opt.xticks = xs;
        return xticks(ax_opt, 0, true);
    } else {
        ax_opt.yticks = xs;
        return yticks(ax_opt, 0, true);
    }
}

/**
 * Plot a boxplot from quartiles
 * @param quartiles [Q0, Q1, Q2, Q3, Q4]
 * @param pos position of the boxplot
 * @param size size of the boxplot
 * @param bar_options options for the bar chart
 * @returns a diagram of the boxplot
 */
export function plotQ(quartiles : number[], pos : number, size : number, bar_options : Partial<boxplot_options>){
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let ax_opt = to_ax_options(opt);
    let ax_f = axes_transform(ax_opt);
    let [Q0, Q1, Q2, Q3, Q4] = quartiles;

    let whisker_size = 0.8 * size;
    if (opt.orientation == 'x') {
        let box = rectangle(Q3-Q1, size).move_origin('center-left').position(V2(Q1, pos)).transform(ax_f);
        let min    = line(V2(Q0, pos - whisker_size/2), V2(Q0, pos + whisker_size/2)).transform(ax_f);
        let max    = line(V2(Q4, pos - whisker_size/2), V2(Q4, pos + whisker_size/2)).transform(ax_f);
        let median = line(V2(Q2, pos - size/2), V2(Q2, pos + size/2)).transform(ax_f);
        let whisker_min = line(V2(Q0, pos), V2(Q1, pos)).transform(ax_f);
        let whisker_max = line(V2(Q3, pos), V2(Q4, pos)).transform(ax_f);
        return diagram_combine(box, min, max, median, whisker_min, whisker_max);
    } else {
        let box = rectangle(size, Q3-Q1).move_origin('bottom-center').position(V2(pos, Q1)).transform(ax_f);
        let min    = line(V2(pos - whisker_size/2, Q0), V2(pos + whisker_size/2, Q0)).transform(ax_f);
        let max    = line(V2(pos - whisker_size/2, Q4), V2(pos + whisker_size/2, Q4)).transform(ax_f);
        let median = line(V2(pos - size/2, Q2), V2(pos + size/2, Q2)).transform(ax_f);
        let whisker_min = line(V2(pos, Q0), V2(pos, Q1)).transform(ax_f);
        let whisker_max = line(V2(pos, Q3), V2(pos, Q4)).transform(ax_f);
        return diagram_combine(box, min, max, median, whisker_min, whisker_max);
    }
}

// TODO: plot boxplot from data
// TODO: plot multiple boxplots at once
