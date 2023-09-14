import { Diagram, polygon, line, curve, text, diagram_combine } from '../diagram.js';
import { arrow, textvar } from '../shapes.js';
import { Vector2, V2, linspace, from_degree } from '../linear_algebra.js';
import { str_to_mathematical_italic } from '../unicode_utils.js'

/**
 * Create an annotation vector
 * @param v vector to be annotated
 * @param str string to be annotated (will be converted to mathematical italic)
 * if you don't want to convert to mathematical italic, use annotation_vector_textmode
 * @param arrow_head_size size of the arrow head
 * @param text_offset offset of the text
 */
export function annotation_vector(v : Vector2, str : string, arrow_head_size? : number, text_offset? : Vector2) : Diagram {
    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let vec = arrow(v, arrow_head_size);
    if (str == ""){ return vec; } // if str is empty, return only the vector

    let txt = textvar(str).position(v.add(text_offset));
    return diagram_combine(vec, txt);
}

/**
 * Create an annotation vector
 * @param v vector to be annotated
 * @param str string to be annotated (will not be converted to mathematical italic)
 * if you want to convert to mathematical italic, use annotation_vector
 * @param arrow_head_size size of the arrow head
 * @param text_offset offset of the text
 */
export function annotation_vector_text(v : Vector2, str : string, arrow_head_size? : number, text_offset? : Vector2) : Diagram {
    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let vec = arrow(v, arrow_head_size);
    if (str == ""){ return vec; } // if str is empty, return only the vector
    
    let txt = text(str).position(v.add(text_offset));
    return diagram_combine(vec, txt);
}
