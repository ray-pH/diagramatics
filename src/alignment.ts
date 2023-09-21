import { Diagram, DiagramType, diagram_combine, Anchor } from './diagram.js';
import { Vector2, V2 } from './vector.js';


enum VerticalAlignment {
    Top    = 'top',
    Center = 'center',
    Bottom = 'bottom',
}
enum HorizontalAlignment {
    Left   = 'left',
    Center = 'center',
    Right  = 'right',
}

/**
 * Align diagrams vertically
 * @param diagrams diagrams to be aligned
 * @param alignment vertical alignment of the diagrams
 * alignment can be 'top', 'center', or 'bottom'
 * @returns array of aligned diagrams
 */
export function align_vertical(diagrams : Diagram[], alignment : VerticalAlignment = VerticalAlignment.Center) : Diagram[] {
    // align all the diagrams following the first diagram
    if (diagrams.length == 0) { return diagrams; }

    if (alignment == VerticalAlignment.Top){
        let top_y = diagrams[0].get_anchor(Anchor.TopLeft).y;
        return diagrams.map(d => d.translate(V2(0, top_y - d.get_anchor(Anchor.TopLeft).y)));
    }
    else if (alignment == VerticalAlignment.Center){
        let center_y = diagrams[0].get_anchor(Anchor.CenterLeft).y;
        return diagrams.map(d => d.translate(V2(0, center_y - d.get_anchor(Anchor.CenterLeft).y)));
    }
    else if (alignment == VerticalAlignment.Bottom){
        let bottom_y = diagrams[0].get_anchor(Anchor.BottomLeft).y;
        return diagrams.map(d => d.translate(V2(0, bottom_y - d.get_anchor(Anchor.BottomLeft).y)));
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
export function align_horizontal(diagrams : Diagram[], 
    alignment : HorizontalAlignment = HorizontalAlignment.Center) : Diagram[] {

    // align all the diagrams following the first diagram
    if (diagrams.length == 0) { return diagrams; }

    if (alignment == HorizontalAlignment.Left){
        let left_x = diagrams[0].get_anchor(Anchor.TopLeft).x;
        return diagrams.map(d => d.translate(V2(left_x - d.get_anchor(Anchor.TopLeft).x, 0)));
    }
    else if (alignment == HorizontalAlignment.Center){
        let center_x = diagrams[0].get_anchor(Anchor.TopCenter).x;
        return diagrams.map(d => d.translate(V2(center_x - d.get_anchor(Anchor.TopCenter).x, 0)));
    }
    else if (alignment == HorizontalAlignment.Right){
        let right_x = diagrams[0].get_anchor(Anchor.TopRight).x;
        return diagrams.map(d => d.translate(V2(right_x - d.get_anchor(Anchor.TopRight).x, 0)));
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
export function distribute_horizontal(diagrams : Diagram[], space : number = 0) : Diagram[] {
    if (diagrams.length == 0) { return diagrams; }

    let distributed_diagrams : Diagram[] = [diagrams[0]];
    for (let i = 1; i < diagrams.length; i++) {
        let prev_diagram = distributed_diagrams[i-1];
        let this_diagram = diagrams[i];
        let prev_right = prev_diagram.get_anchor(Anchor.TopRight).x;
        let this_left  = this_diagram.get_anchor(Anchor.TopLeft).x;
        let dx = prev_right - this_left + space;
        distributed_diagrams.push(this_diagram.translate(V2(dx, 0)));
    }
    return distributed_diagrams;
}

/**
 * Distribute diagrams vertically
 * @param diagrams diagrams to be distributed
 * @param space space between the diagrams (default = 0)
 * @returns array of distributed diagrams
 */
export function distribute_vertical(diagrams : Diagram[], space : number = 0) : Diagram[] {
    if (diagrams.length == 0) { return diagrams; }

    let distributed_diagrams : Diagram[] = [diagrams[0]];
    for (let i = 1; i < diagrams.length; i++) {
        let prev_diagram = distributed_diagrams[i-1];
        let this_diagram = diagrams[i];
        let prev_bottom = prev_diagram.get_anchor(Anchor.BottomLeft).y;
        let this_top    = this_diagram.get_anchor(Anchor.TopLeft).y;
        let dy = prev_bottom - this_top + space;
        distributed_diagrams.push(this_diagram.translate(V2(0, dy)));
    }
    return distributed_diagrams;
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
    alignment : VerticalAlignment = VerticalAlignment.Center) : Diagram[] {
    return distribute_horizontal(align_vertical(diagrams, alignment), horizontal_space);
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
    alignment : HorizontalAlignment = HorizontalAlignment.Center) : Diagram[] {
    return distribute_vertical(align_horizontal(diagrams, alignment), vertical_space);
}
