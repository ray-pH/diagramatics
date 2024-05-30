import { Diagram, line, text, diagram_combine } from '../diagram.js';
import { V2 } from '../vector.js';
import { arrow2 } from '../shapes.js'
import { TAG } from '../tag_names.js';

/**
 * Draw an empty axis from xmin to xmax with arrowsize
 * @param xmin minimum value of the numberline
 * @param xmax maximum value of the numberline
 * @param arrowsize the size of the arrowhead
 * returns a Diagram
 */
export function axis(xmin : number, xmax : number, arrowsize : number = 1) : Diagram {
    return arrow2(V2(xmin, 0), V2(xmax,0), arrowsize).fill('black').append_tags(TAG.GRAPH_AXIS);
}

/**
 * Draw a numbered ticks for a numberline
 * @param xs the values of the ticks
 * @param ticksize the size of the ticks
 * @param number_offset the offset of the number from the ticks
 * returns a Diagram
 */
export function numbered_ticks(xs : number[], ticksize : number, number_offset : number) : Diagram {
    let d_ticks : Diagram[] = [];
    for (let i of xs) {
        let tick = line(V2(i, -ticksize/2), V2(i, ticksize/2)).stroke('black').append_tags(TAG.GRAPH_TICK);
        let num  = text(i.toString()).move_origin('top-center').position(V2(i, -ticksize/2 - number_offset))
            .append_tags(TAG.GRAPH_TICK_LABEL);
        d_ticks.push(diagram_combine(tick, num));
    }
    return diagram_combine(...d_ticks);
}

/**
 * Draw ticks for a numberline
 * @param xs the values of the ticks
 * @param ticksize the size of the ticks
 * returns a Diagram
 */
export function ticks(xs : number[], ticksize : number) : Diagram {
    let d_ticks : Diagram[] = [];
    for (let i of xs) {
        let tick = line(V2(i, -ticksize/2), V2(i, ticksize/2)).stroke('black').append_tags(TAG.GRAPH_TICK);
        d_ticks.push(tick);
    }
    return diagram_combine(...d_ticks);
}

/**
 * Draw a single tick for a numberline
 * @param x the value of the tick
 * @param txt the text of the tick
 * @param ticksize the size of the tick
 * @param text_offset the offset of the text from the tick
 * returns a Diagram
 */
export function single_tick(x : number, txt : string, ticksize : number, text_offset : number) : Diagram {
    let tick = line(V2(x, -ticksize/2), V2(x, ticksize/2)).stroke('black').append_tags(TAG.GRAPH_TICK);
    if (txt == '') return tick;

    let num  = text(txt).move_origin('top-center').position(V2(x, -ticksize/2 - text_offset))
        .append_tags(TAG.GRAPH_TICK_LABEL);
    return diagram_combine(tick, num);
}
