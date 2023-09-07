import { Diagram, DiagramType, DiagramStyle, Path } from "./diagram.js";
import { tab_color, get_color } from "./color_palette.js";

const default_diagram_style : DiagramStyle = {
    "fill"             : "none",
    "stroke"           : "black",
    "stroke-width"     : "1",
    "stroke-linecap"   : "butt",
    "stroke-dasharray" : "none",
}

function draw_polygon(svgelement : SVGSVGElement, diagram : Diagram) : void {
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = get_color(style.fill as string, tab_color);
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    for (let stylename in style) {
        polygon.style[stylename as any] = (style as any)[stylename as any];
    }
    // polygon.style.fill = color_fill;
    // polygon.style.stroke = color_stroke;
    // use tab_color color palette

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
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = "none";
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    for (let stylename in style) {
        polyline.style[stylename as any] = (style as any)[stylename as any];
    }

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
