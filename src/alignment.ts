import { Diagram, DiagramType, diagram_combine, Anchor, empty } from './diagram.js';
import { Vector2, V2 } from './vector.js';

type VerticalAlignment   = 'top'  | 'center' | 'bottom';
type HorizontalAlignment = 'left' | 'center' | 'right';

/**
 * Align diagrams vertically
 * @param diagrams diagrams to be aligned
 * @param alignment vertical alignment of the diagrams
 * alignment can be 'top', 'center', or 'bottom'
 * @returns array of aligned diagrams
 */
export function align_vertical(diagrams : Diagram[], alignment : VerticalAlignment = 'center') : Diagram {
    // align all the diagrams following the first diagram
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = [...diagrams]

    if (alignment == 'top'){
        let top_y = newdiagrams[0].get_anchor("top-left").y;
        // return diagrams.map(d => d.translate(V2(0, top_y - d.get_anchor("top-left").y)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(0, top_y - newdiagrams[i].get_anchor("top-left").y));
        }
        return diagram_combine(...newdiagrams);
    }
    else if (alignment == 'center'){
        let center_y = newdiagrams[0].get_anchor("center-left").y;
        // return diagrams.map(d => d.translate(V2(0, center_y - d.get_anchor("center-left").y)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(0, center_y - newdiagrams[i].get_anchor("center-left").y));
        }
        return diagram_combine(...newdiagrams);
    }
    else if (alignment == 'bottom'){
        let bottom_y = newdiagrams[0].get_anchor("bottom-left").y;
        // return diagrams.map(d => d.translate(V2(0, bottom_y - d.get_anchor("bottom-left").y)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(0, bottom_y - newdiagrams[i].get_anchor("bottom-left").y));
        }
        return diagram_combine(...newdiagrams);
    }
    else {
        throw new Error("Unknown vertical alignment : " + alignment);
    }
}

/**
 * Align diagrams horizontally
 * @param diagrams diagrams to be aligned
 * @param alignment horizontal alignment of the diagrams
 * alignment can be 'left', 'center', or 'right'
 * @returns array of aligned diagrams
 */
export function align_horizontal(diagrams : Diagram[], alignment : HorizontalAlignment = 'center') : Diagram {

    // align all the diagrams following the first diagram
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = [...diagrams]

    if (alignment == 'left'){
        let left_x = newdiagrams[0].get_anchor("top-left").x;
        // return newdiagrams.map(d => d.translate(V2(left_x - d.get_anchor("top-left").x, 0)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(left_x - newdiagrams[i].get_anchor("top-left").x, 0));
        }
        return diagram_combine(...newdiagrams);
    }
    else if (alignment == 'center'){
        let center_x = newdiagrams[0].get_anchor("top-center").x;
        // return newdiagrams.map(d => d.translate(V2(center_x - d.get_anchor("top-center").x, 0)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(center_x - newdiagrams[i].get_anchor("top-center").x, 0));
        }
        return diagram_combine(...newdiagrams);
    }
    else if (alignment == 'right'){
        let right_x = newdiagrams[0].get_anchor("top-right").x;
        // return newdiagrams.map(d => d.translate(V2(right_x - d.get_anchor("top-right").x, 0)));
        for (let i = 0; i < newdiagrams.length; i++) {
            newdiagrams[i] = newdiagrams[i].translate(V2(right_x - newdiagrams[i].get_anchor("top-right").x, 0));
        }
        return diagram_combine(...newdiagrams);
    }
    else {
        throw new Error("Unknown horizontal alignment : " + alignment);
    }
}

/**
 * Distribute diagrams horizontally
 * @param diagrams diagrams to be distributed
 * @param space space between the diagrams (default = 0)
 * @returns array of distributed diagrams
 */
export function distribute_horizontal(diagrams : Diagram[], space : number = 0) : Diagram {
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = [...diagrams]

    let distributed_diagrams : Diagram[] = [newdiagrams[0]];
    for (let i = 1; i < newdiagrams.length; i++) {
        let prev_diagram = distributed_diagrams[i-1];
        let this_diagram = newdiagrams[i];
        let prev_right = prev_diagram.get_anchor("top-right").x;
        let this_left  = this_diagram.get_anchor("top-left").x;
        let dx = prev_right - this_left + space;
        distributed_diagrams.push(this_diagram.translate(V2(dx, 0)));
    }
    return diagram_combine(...distributed_diagrams);
}

/**
 * Distribute diagrams vertically
 * @param diagrams diagrams to be distributed
 * @param space space between the diagrams (default = 0)
 * @returns array of distributed diagrams
 */
export function distribute_vertical(diagrams : Diagram[], space : number = 0) : Diagram {
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = [...diagrams]

    let distributed_diagrams : Diagram[] = [newdiagrams[0]];
    for (let i = 1; i < newdiagrams.length; i++) {
        let prev_diagram = distributed_diagrams[i-1];
        let this_diagram = newdiagrams[i];
        let prev_bottom = prev_diagram.get_anchor("bottom-left").y;
        let this_top    = this_diagram.get_anchor("top-left").y;
        let dy = prev_bottom - this_top - space;
        distributed_diagrams.push(this_diagram.translate(V2(0, dy)));
    }
    return diagram_combine(...distributed_diagrams);
}

/**
 * Distribute diagrams horizontally and align
 * @param diagrams diagrams to be distributed
 * @param horizontal_space space between the diagrams (default = 0)
 * @param alignment vertical alignment of the diagrams
 * alignment can be 'top', 'center', or 'bottom'
 * @returns array of distributed and aligned diagrams
 */
export function distribute_horizontal_and_align(diagrams : Diagram[], horizontal_space : number = 0,
    alignment : VerticalAlignment = 'center') : Diagram {
    return distribute_horizontal(align_vertical(diagrams, alignment).children, horizontal_space);
}

/**
 * Distribute diagrams vertically and align
 * @param diagrams diagrams to be distributed
 * @param vertical_space space between the diagrams (default = 0)
 * @param alignment horizontal alignment of the diagrams
 * alignment can be 'left', 'center', or 'right'
 * @returns array of distributed and aligned diagrams
 */
export function distribute_vertical_and_align(diagrams : Diagram[], vertical_space : number = 0,
    alignment : HorizontalAlignment = 'center') : Diagram {
    return distribute_vertical(align_horizontal(diagrams, alignment).children, vertical_space);
}

/**
 * Distribute diagrams in a grid
 * @param diagrams diagrams to be distributed
 * @param column_count number of columns
 * @param vectical_space space between the diagrams vertically (default = 0)
 * @param horizontal_space space between the diagrams horizontally (default = 0)
 */
export function distribute_grid_row(diagrams : Diagram[], column_count : number, 
    vectical_space : number = 0, horizontal_space : number = 0,
) : Diagram {
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = [...diagrams]

    let row_count = Math.ceil(newdiagrams.length / column_count);
    let rows : Diagram[][] = [];
    for (let i = 0; i < row_count; i++) {
        rows.push(newdiagrams.slice(i * column_count, (i+1) * column_count));
    }
    let distributed_rows = rows.map(row => distribute_horizontal(row, horizontal_space));
    let distributed_diagrams = distribute_vertical(distributed_rows, vectical_space);
    return distributed_diagrams;
}
