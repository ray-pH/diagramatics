import { V2 } from './linear_algebra.js';

function assert(condition : boolean, message : string) : void {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export enum DiagramType {
    Polygon = 'polygon',
    Curve   = 'curve',
    Diagram = 'diagram',
}

/**
* Diagram Class 
*
* Diagram is a tree structure
* Diagram can be a polygon, a curve, or a diagram
* Polygon is a closed path
* Curve is an open path
* Diagram is a tree of Diagrams
*/
export class Diagram {
    type : DiagramType;
    children : {[key : string]: Diagram} = {};
    paths : {[key : string]: Path} = {};
    color_stroke : string | undefined = undefined ;
    color_fill   : string | undefined = undefined ;

    constructor(type_ : DiagramType){
        this.type = type_;
    }
    add_childs(childs : Diagram[], names : string[]){
        // TODO : check for name collision
        for (let i in childs) { this.children[names[i]] = childs[i]; }
    }
    add_paths(paths : Path[], names : string[]){
        if (this.type == DiagramType.Diagram) {
            throw new Error("Diagram cannot have paths");
        }
        // TODO : check for name collision
        for (let i in paths) { this.paths[names[i]] = paths[i]; }

    }

    public fill(color : string) : Diagram { 
        switch (this.type) {
            case DiagramType.Polygon:
                this.color_fill = color;
                break;
            case DiagramType.Curve:
                // curve have no fill
                break;
            default:
                // recursively set fill for all children
                for (let c in this.children) {
                    this.children[c].fill(color);
                }
        }
        return this;
    }

    public stroke(color : string) : Diagram {
        switch (this.type) {
            case DiagramType.Polygon:
                this.color_stroke = color;
                break;
            case DiagramType.Curve:
                this.color_stroke = color;
                break;
            default:
                // recursively set stroke for all children
                for (let c in this.children) {
                    this.children[c].stroke(color);
                }
        }
        return this;
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
    let polygon = new Diagram(DiagramType.Polygon);
    polygon.add_paths(paths, path_names);
    return polygon;

}

// export { Diagram }

