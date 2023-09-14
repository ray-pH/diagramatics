import { Diagram, polygon, line, curve, text, diagram_combine } from '../diagram.js';
import { arrow, textvar, arc } from '../shapes.js';
import { Vector2, V2, Vdir, linspace, from_degree } from '../linear_algebra.js';
import { str_to_mathematical_italic } from '../unicode_utils.js'

/**
 * Create an annotation vector
 * @param v vector to be annotated
 * @param str string to be annotated (will be converted to mathematical italic)
 * if you don't want to convert to mathematical italic, use annotation_vector_textmode
 * @param arrow_head_size size of the arrow head
 * @param text_offset position offset of the text
 */
export function annotation_vector(v : Vector2, str? : string, text_offset? : Vector2, arrow_head_size? : number) : Diagram {
    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let vec = arrow(v, arrow_head_size);
    if (str == "" || str == undefined){ return vec; } // if str is empty, return only the vector

    let txt = textvar(str).position(v.add(text_offset));
    return diagram_combine(vec, txt);
}

/**
 * Create an annotation vector
 * @param v vector to be annotated
 * @param str string to be annotated (will not be converted to mathematical italic)
 * if you want to convert to mathematical italic, use annotation_vector
 * @param arrow_head_size size of the arrow head
 * @param text_offset positiono ffset of the text
 */
export function annotation_vector_text(v : Vector2, str? : string, text_offset? : Vector2, arrow_head_size? : number) : Diagram {
    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let vec = arrow(v, arrow_head_size);
    if (str == "" || str == undefined){ return vec; } // if str is empty, return only the vector
    
    let txt = text(str).position(v.add(text_offset));
    return diagram_combine(vec, txt);
}

/**
 * Create an annotation for angle
 * @param p three points to define the angle
 * @param str string to be annotated (will be converted to mathematical italic)
 * @param radius radius of the arc
 * @param text_offset position offset of the text
 */
export function annotation_angle(p : [Vector2, Vector2, Vector2], 
    str? : string, radius : number = 1 , text_offset? : Vector2) : Diagram {

    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let [p1, p2, p3] = p;
    let va = p1.sub(p2);
    let vb = p3.sub(p2);

    let angle_a = va.angle();
    let angle_b = vb.angle();

    let angle_arc = arc(radius, angle_b-angle_a).rotate(angle_a);
    if (str == "" || str == undefined){ return angle_arc; } // if str is empty, return only the arc

    let angle_text = textvar(str_to_mathematical_italic(str))
        .position(Vdir((angle_a+angle_b)/2))
        .translate(text_offset);
    return diagram_combine(angle_arc, angle_text);
}
