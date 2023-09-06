import { Diagram, DiagramType, Path } from "./diagram.js";

export function draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram) : void {
    if (diagram.type == DiagramType.Polygon) {
        let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        svgelement.appendChild(polygon);
        let child_names : string[] = Object.keys(diagram.children);
        for (let c of child_names) {
            // c must be a path
            let path = diagram.children[c] as Path;
            var point = svgelement.createSVGPoint();
            point.x = path.start.x;
            point.y = path.start.y;
            polygon.points.appendItem(point);
        }
        // append last point
        let path = diagram.children[child_names[child_names.length - 1]] as Path;
        var point = svgelement.createSVGPoint();
        point.x = path.end.x;
        point.y = path.end.y;
        polygon.points.appendItem(point);

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
