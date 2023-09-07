import { Diagram, DiagramType, Path } from "./diagram.js";
import { tab_color, get_color } from "./color_palette.js";

const color_fill_default = "none";
const color_stroke_default = "black";

function draw_polygon(svgelement : SVGSVGElement, diagram : Diagram) : void {
    // get color properties
    let color_fill   = diagram.style.color_fill || color_fill_default;
    let color_stroke = diagram.style.color_stroke || color_stroke_default;

    // draw svg
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    // polygon.style.fill = color_fill;
    // polygon.style.stroke = color_stroke;
    // use tab_color color palette
    polygon.style.fill = get_color(color_fill, tab_color);
    polygon.style.stroke = get_color(color_stroke, tab_color);

    svgelement.appendChild(polygon);
    if (diagram.path != undefined) {
        for (let p of diagram.path.points) {
            var point = svgelement.createSVGPoint();
            point.x = p.x;
            point.y = p.y;
            polygon.points.appendItem(point);
        }
    }
}


function draw_curve(svgelement : SVGSVGElement, diagram : Diagram) : void {
    // get color properties
    let color_stroke = diagram.style.color_stroke || color_stroke_default;

    // draw svg
    let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    // path.style.fill = color_fill;
    // path.style.stroke = color_stroke;
    // use tab_color color palette
    // curve.style.fill = get_color(color_fill, tab_color);
    polyline.style.fill = "none";
    polyline.style.stroke = get_color(color_stroke, tab_color);

    svgelement.appendChild(polyline);
    if (diagram.path != undefined) {
        for (let p of diagram.path.points) {
            var point = svgelement.createSVGPoint();
            point.x = p.x;
            point.y = p.y;
            polyline.points.appendItem(point);
        }
    }
}
    

export function draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram,
    set_html_attribute : boolean = true) : void {
    if (diagram.type == DiagramType.Polygon) {
        draw_polygon(svgelement, diagram);
    } else if (diagram.type == DiagramType.Curve){
        draw_curve(svgelement, diagram);
    } else {
        throw new Error("Unimplemented : Only polygon is supported");
    }
    
    if (set_html_attribute) {
        // set viewbox to the bounding box
        let bbox = svgelement.getBBox();
        svgelement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        // set preserveAspectRatio to xMidYMid meet
        svgelement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
}
