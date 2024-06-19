import polybool from '@velipso/polybool';
import { PolyBool, GeometryEpsilon, Point } from '@velipso/polybool';
import { Diagram, DiagramType, polygon, curve, empty, diagram_combine } from './diagram.js';
import { V2 } from './vector.js';

type PolyBoolPoly = {
    regions: Point[][];
    inverted: boolean;
}
function dg_to_polybool(d : Diagram) : PolyBoolPoly {
    const dg_points = d.path?.points ?? [];
    const points = dg_points.map(p => [p.x, p.y] as Point);
    return {
        regions: [points],
        inverted: false
    };
}

function polybool_to_dg(poly : PolyBoolPoly) : Diagram {
    const diagrams_per_region = poly.regions.map(region => {
        const dg_points = region.map(p => V2(p[0], p[1]));
        return polygon(dg_points);
    });
    if (diagrams_per_region.length < 1){
        return empty();
    } else if (diagrams_per_region.length == 1){
        return diagrams_per_region[0];
    } else {
        return diagram_combine(...diagrams_per_region);
    }
}

/*
 * get the union of two polygons
 * @param d1 a Polygon Diagram
 * @param d2 a Polygon Diagram
 * @tolerance the tolerance for the operation (default 1e-10)
 * @returns a Polygon that is the union of d1 and d2
*/
export function union(d1 : Diagram, d2 : Diagram, tolerance? : number) : Diagram {
    const pol = tolerance ? new PolyBool(new GeometryEpsilon(tolerance)) : polybool;
    const shape1 = dg_to_polybool(d1);
    const shape2 = dg_to_polybool(d2);
    const result = pol.union(shape1, shape2);
    return polybool_to_dg(result);
}

/*
 * get the difference of two polygons (d1 - d2)
 * @param d1 a Polygon Diagram
 * @param d2 a Polygon Diagram
 * @tolerance the tolerance for the operation (default 1e-10)
 * @returns a Polygon that is the difference of d1 and d2
*/
export function difference(d1 : Diagram, d2 : Diagram, tolerance? : number) : Diagram {
    const pol = tolerance ? new PolyBool(new GeometryEpsilon(tolerance)) : polybool;
    const shape1 = dg_to_polybool(d1);
    const shape2 = dg_to_polybool(d2);
    const result = pol.difference(shape1, shape2);
    return polybool_to_dg(result);
}

/*
 * get the intersection of two polygons
 * @param d1 a Polygon Diagram
 * @param d2 a Polygon Diagram
 * @param tolerance the tolerance for the operation (default 1e-10)
 * @returns a Polygon that is the intersection of d1 and d2
*/
export function intersect(d1 : Diagram, d2 : Diagram, tolerance? : number) : Diagram {
    const pol = tolerance ? new PolyBool(new GeometryEpsilon(tolerance)) : polybool;
    const shape1 = dg_to_polybool(d1);
    const shape2 = dg_to_polybool(d2);
    const result = pol.intersect(shape1, shape2);
    return polybool_to_dg(result);
}

/*
 * get the xor of two polygons
 * @param d1 a Polygon Diagram
 * @param d2 a Polygon Diagram
 * @param tolerance the tolerance for the operation (default 1e-10)
 * @returns a Polygon that is the xor of d1 and d2
*/
export function xor(d1 : Diagram, d2 : Diagram, tolerance? : number) : Diagram {
    const pol = tolerance ? new PolyBool(new GeometryEpsilon(tolerance)) : polybool;
    const shape1 = dg_to_polybool(d1);
    const shape2 = dg_to_polybool(d2);
    const result = pol.xor(shape1, shape2);
    return polybool_to_dg(result);
}
