import { Diagram, DiagramType, Path } from "./diagram.js";
import { tab_color, get_color } from "./color_palette.js";

const color_fill_default = "none";
const color_stroke_default = "black";

function draw_polygon(svgelement : SVGSVGElement, diagram : Diagram,
    set_html_attribute : boolean = true) : void {
    // get color properties
    let color_fill   = diagram.color_fill || color_fill_default;
    let color_stroke = diagram.color_stroke || color_stroke_default;
    let path_names : string[] = Object.keys(diagram.paths);

    // get polygon points
    let points : number[][] = [];
    for (let c of path_names) {
        // c must be a path
        let path = diagram.paths[c];
        points.push([path.points[0].x, path.points[0].y]);
    }
    // append last point
    let path = diagram.paths[path_names[path_names.length - 1]];
    points.push([path.points.slice(-1)[0].x, path.points.slice(-1)[0].y]);

    // draw svg
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    // polygon.style.fill = color_fill;
    // polygon.style.stroke = color_stroke;
    // use tab_color color palette
    polygon.style.fill = get_color(color_fill, tab_color);
    polygon.style.stroke = get_color(color_stroke, tab_color);

    svgelement.appendChild(polygon);
    for (let p of points) {
        var point = svgelement.createSVGPoint();
        point.x = p[0];
        point.y = p[1];
        polygon.points.appendItem(point);
    }


    if (set_html_attribute) {
        // set viewbox to the bounding box
        let bbox = svgelement.getBBox();
        svgelement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        // set preserveAspectRatio to xMidYMid meet
        svgelement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
}

export function draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram,
    set_html_attribute : boolean = true) : void {
    if (diagram.type == DiagramType.Polygon) {
        draw_polygon(svgelement, diagram, set_html_attribute);
    } else {
        throw new Error("Unimplemented : Only polygon is supported");
    }
    
}

// var svg = document.getElementById("svg");
// var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
// svg.appendChild(polygon);
//
// var array = arr = [ [ 0,0 ], 
//              [ 50,50 ],
//              [ 50,20 ], ];
//
// for (value of array) {
//   var point = svg.createSVGPoint();
//   point.x = value[0];
//   point.y = value[1];
//   polygon.points.appendItem(point);
// }
