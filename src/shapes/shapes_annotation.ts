import { Diagram, line, diagram_combine, curve } from '../diagram.js';
import { arrow, textvar, arc } from '../shapes.js';
import { Vector2, V2 } from '../vector.js';

/**
 * Create an annotation vector
 * @param v vector to be annotated
 * @param str string to be annotated (will be converted to mathematical italic)
 * if you don't want to convert to mathematical italic, use annotation.vector_text
 * @param arrow_head_size size of the arrow head
 * @param text_offset position offset of the text
 */
export function vector(v : Vector2, str? : string, text_offset? : Vector2, arrow_head_size? : number) : Diagram {
    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    let vec = arrow(v, arrow_head_size);
    if (str == "" || str == undefined){ return vec; } // if str is empty, return only the vector

    let txt = textvar(str).position(v.add(text_offset));
    return diagram_combine(vec, txt);
}

/**
 * Create an annotation for angle
 * @param p three points to define the angle
 * @param str string to be annotated (will be converted to mathematical italic)
 * @param radius radius of the arc
 * @param text_offset position offset of the text
 * if given as a number, the text will be placed at the angle bisector with the given distance from the vertex
 * if given as a vector, the text will be placed at the given position offset
 */
export function angle(p : [Vector2, Vector2, Vector2], 
    str? : string, radius : number = 1 , text_offset? : Vector2 | number,
) : Diagram {

    let [p1, p2, p3] = p;
    let va = p1.sub(p2);
    let vb = p3.sub(p2);

    if (text_offset == undefined){ text_offset = V2(0,0); } // default value
    if (typeof text_offset == "number"){ 
        let vd = va.normalize().add(vb.normalize()).normalize().scale(text_offset);
        text_offset = vd;
    } 

    let angle_a = va.angle();
    let angle_b = vb.angle();
    // angle_b must be larger than angle_a
    if (angle_b < angle_a){ angle_b += 2*Math.PI; }

    let angle_arc = arc(radius, angle_b-angle_a).rotate(angle_a)
        .add_points([V2(0,0)]).to_polygon();
    if (str == "" || str == undefined){ return angle_arc.position(p2); } // if str is empty, return only the arc

    let angle_text = textvar(str)
        .translate(text_offset);

    return diagram_combine(angle_arc, angle_text).position(p2);
}

/**
 * Create an annotation for angle (always be the smaller angle)
 * @param p three points to define the angle
 * @param str string to be annotated (will be converted to mathematical italic)
 * @param radius radius of the arc
 * @param text_offset position offset of the text
 * if given as a number, the text will be placed at the angle bisector with the given distance from the vertex
 * if given as a vector, the text will be placed at the given position offset
 */
export function angle_smaller(p : [Vector2, Vector2, Vector2],
    str? : string, radius : number = 1 , text_offset? : Vector2 | number,
) : Diagram {

    let [p1, p2, p3] = p;
    let va = p1.sub(p2);
    let vb = p3.sub(p2);

    let angle_a = va.angle();
    let angle_b = vb.angle();
    // angle_b must be larger than angle_a
    if (angle_b < angle_a){ angle_b += 2*Math.PI; }
    let dangle = angle_b - angle_a;


    // if dangle is larger than 180 degree, swap the two vectors
    let ps : typeof p = dangle > Math.PI ? [p3, p2, p1] : [p1, p2, p3];
    return angle(ps, str, radius, text_offset);
}

/**
 * Create an annotation for right angle
 * make sure the angle is 90 degree
 * @param p three points to define the angle
 * @param size size of the square
 */
export function right_angle(p : [Vector2, Vector2, Vector2], size : number = 1) : Diagram {
    let [p1, p2, p3] = p;
    let p1_ = p1.sub(p2).normalize().scale(size).add(p2);
    let p3_ = p3.sub(p2).normalize().scale(size).add(p2);
    let p2_ = V2(p1_.x, p3_.y);
    return curve([p1_, p2_, p3_]);
}

export function length(p1 : Vector2, p2 : Vector2, str : string, offset : number, 
    tablength? : number, textoffset? : number, tabsymmetric : boolean = true
) : Diagram {

    // setup defaults
    tablength = tablength ?? p2.sub(p1).length()/20;
    textoffset = textoffset ?? offset * 2;

    let v = p1.equals(p2) ? V2(0,0) : p2.sub(p1).normalize();
    let n = V2(v.y, -v.x);
    let pA = p1.add(n.scale(offset));
    let pB = p2.add(n.scale(offset));

    let tabA = tabsymmetric ?
        line(pA.sub(n.scale(tablength/2)), pA.add(n.scale(tablength/2))) :
        line(pA, pA.sub(n.scale(tablength)));
    let tabB = tabsymmetric ?
        line(pB.sub(n.scale(tablength/2)), pB.add(n.scale(tablength/2))) :
        line(pB, pB.sub(n.scale(tablength)));
    let lineAB = line(pA, pB);
    let lines = diagram_combine(lineAB, tabA, tabB);

    let pmid = p1.add(p2).scale(0.5);
    let label = textvar(str).position(pmid.add(n.scale(textoffset)));

    return diagram_combine(lines, label);
}

/**
 * Create a congruence mark
 * @param p1 start point of the line
 * @param p2 end point of the line
 * @param count number of marks
 * @param size size of the mark
 * @param gap gap between the marks
 */
export function congruence_mark(p1 : Vector2, p2 : Vector2, count : number, size : number = 1, gap? : number) : Diagram {
    let v = p2.sub(p1)
    let n_angle = Math.atan2(v.x, -v.y);
    let p_mid = p1.add(p2).scale(0.5);
    gap = gap ?? size/2;

    let marks = [];
    for (let i = 0; i < count; i++){
        let l = line(V2(-size/2, i*gap), V2(size/2, i*gap));
        marks.push(l)
    }
    let dg_marks = diagram_combine(...marks);
    return dg_marks.rotate(n_angle).move_origin('center-center').position(p_mid);
}

/**
 * Create a parallel mark
 * @param p1 start point of the line
 * @param p2 end point of the line
 * @param count number of marks
 * @param size size of the mark
 * @param gap gap between the marks
 * @param arrow_angle angle of the arrow
 */
export function parallel_mark(p1 : Vector2, p2 : Vector2, count : number, size : number = 1, gap? : number, arrow_angle : number = 0.5) : Diagram {
    let v = p2.sub(p1)
    let n_angle = Math.atan2(v.x, -v.y);
    let p_mid = p1.add(p2).scale(0.5);
    gap = gap ?? size/2;

    let marks = [];
    let dy = size/2 * Math.cos(arrow_angle);
    for (let i = 0; i < count; i++){
        let p0 = V2(0, i*gap - dy);
        let l1 = line(V2(-size/2, i*gap), p0)
        let l2 = line(V2(size/2, i*gap), p0)
        marks.push(l1.combine(l2));
    }
    let dg_marks = diagram_combine(...marks);
    return dg_marks.rotate(n_angle).move_origin('center-center').position(p_mid);
}
