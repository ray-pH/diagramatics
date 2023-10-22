import { Diagram, Anchor, polygon, line, curve, text, diagram_combine } from '../diagram.js';
import { Vector2, V2 } from '../vector.js';
import { linspace } from '../utils.js';
import { rectangle, rectangle_corner, arrow1, arrow2, textvar } from '../shapes.js'
import { axes_options, yticks, xticks, axes_transform } from './shapes_graph.js'

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

export function plot(datavalues : number[], bar_options : Partial<bar_options> = {}){
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let n = datavalues.length;

    let ymax = Math.max(...datavalues);
    let yrange = opt.yrange ?? [0, ymax];
    let bbox = opt.bbox ?? [V2(0,0), V2(10,ymax)];

    let ax_opt : axes_options = {
        xrange   : [0, n+1],
        yrange   : yrange,
        headsize : 0,
        ticksize : opt.ticksize,
        bbox     : bbox,
    }
    let ax_f = axes_transform(ax_opt);

    let bar_arr = datavalues.map((y,i) => 
        rectangle(1.0-opt.gap, y).move_origin('bottom-center')
            .position(V2(Number(i)+1, 0)).transform(ax_f)
    );
    return diagram_combine(...bar_arr);
}


export function xaxes(datanames : string[], bar_options : Partial<bar_options> = {}){
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let n = datanames.length;

    let ax_opt : axes_options = {
        xrange   : [0, n+1],
        yrange   : [0, 1],
        headsize : 0,
        ticksize : opt.ticksize,
        bbox     : opt.bbox,
    }
    let ax_f = axes_transform(ax_opt);

    let l = line(V2(0,0), V2(n+1,0)).transform(ax_f).stroke('gray');
    let label_arr = datanames.map((name,i) => 
        text(name).move_origin_text('top-center').position(V2(Number(i)+1, 0)).transform(ax_f)
            .translate(V2(0,-opt.ticksize/2)).textfill('gray')
    );
    return diagram_combine(l, ...label_arr);
}

export function yaxes(datavalues : number[], bar_options : Partial<bar_options> = {}){
    let opt = {...default_bar_options, ...bar_options}; // use default if not defined
    let n = datavalues.length;

    let ymax = Math.max(...datavalues);
    let yrange = opt.yrange ?? [0, ymax];
    let bbox = opt.bbox ?? [V2(0,0), V2(10,ymax)];

    let ax_opt : axes_options = {
        xrange   : [0, n+1],
        yrange   : yrange,
        headsize : 0,
        ticksize : opt.ticksize,
        bbox     : bbox,
    }

    let l = line(V2(0,0), V2(0,yrange[1])).transform(axes_transform(ax_opt)).stroke('gray');
    return yticks(ax_opt).combine(l);
}
