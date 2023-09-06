import { Diagram, DiagramType, Path } from "./diagram.js";

let color_fill_default = "none";
let color_stroke_default = "black";

export function draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram) : void {
    if (diagram.type == DiagramType.Polygon) {
        // get color properties
        let color_fill   = diagram.color_fill || color_fill_default;
        let color_stroke = diagram.color_stroke || color_stroke_default;
        let path_names : string[] = Object.keys(diagram.paths);

        // get polygon points
        let points : number[][] = [];
        for (let c of path_names) {
            // c must be a path
            let path = diagram.paths[c];
            points.push([path.start.x, path.start.y]);
        }
        // append last point
        let path = diagram.paths[path_names[path_names.length - 1]];
        points.push([path.end.x, path.end.y]);

        // draw svg
        let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.style.fill = color_fill;
        polygon.style.stroke = color_stroke;

        svgelement.appendChild(polygon);
        for (let p of points) {
            var point = svgelement.createSVGPoint();
            point.x = p[0];
            point.y = p[1];
            polygon.points.appendItem(point);
        }

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
