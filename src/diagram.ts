import { V2 } from './linear_algebra.js';

function assert(condition : boolean, message : string) : void {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export enum DiagramType {
    Polygon = 'polygon',
    Line    = 'line',
    Diagram = 'diagram',
}

/**
* Diagram Class 
*/
export class Diagram {
    children : {[key : string]: (Diagram|Path)};
    type : DiagramType;

    constructor(childs : (Diagram|Path)[], names : string[], type_ : DiagramType){
        this.type = type_;
        this.children = {}
        for (let i in childs) {
            this.children[names[i]] = childs[i];
        }
    }
}

export class Path {
    // for now just do linear path
    constructor(public start: V2, public end: V2) { }

    /**
     * Get the point on the path at t 
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path start at t=0 and ends at t=1
     * @param t parameter
     * @returns the position of the point
    */
    get_parametric_point(t : number) : V2 {
        // for now assume Path is linear
        let dir : V2 = this.end.sub(this.start);
        return this.start.add(dir.scale(t));
    }
}

/**
 * Create a polygon from a list of points
 */
export function polygon(points: V2[], names : string[] = []) : Diagram {
    assert(points.length >= 3, "Polygon must have at least 3 points");
    let paths : Path[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        paths.push(new Path(points[i], points[i+1]));
    }

    // create names ['path1', 'path2', ...]
    let path_names : string[] = [];
    for (let i in paths) { path_names.push('path' + i.toString()); }

    // put custom names
    let imax = Math.min(path_names.length, names.length);
    for (let i = 0; i < imax; i++) { path_names[i] = names[i] as string; }

    // create diagram
    return new Diagram(paths, path_names, DiagramType.Polygon);
}


// export { Diagram }

