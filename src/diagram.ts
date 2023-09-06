import { Vector2 } from './linear_algebra.js';

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
 * Make sure that every function return a new Diagram
 * Diagram is immutable to the user
 */

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

    /**
     * Copy the diagram
     */
    public copy() : Diagram {
        // do deepcopy with JSON
        let newd : Diagram = JSON.parse(JSON.stringify(this));
        // turn newd into Diagram
        Object.setPrototypeOf(newd, Diagram.prototype);
        // make sure all of the children are Diagram
        for (let c in newd.children) {
            Object.setPrototypeOf(newd.children[c], Diagram.prototype)
            newd.children[c] = newd.children[c].copy();
        }
        // make sure all of the paths are Path
        for (let p in newd.paths) {
            Object.setPrototypeOf(newd.paths[p], Path.prototype)
        }
        return newd;
    }
    /**
     * Set the fill color of the diagram
     * @param color color of the fill
     */
    public fill(color : string) : Diagram { 
        let newd : Diagram = this.copy();
        switch (newd.type) {
            case DiagramType.Polygon:
                newd.color_fill = color;
                break;
            case DiagramType.Curve:
                // curve have no fill
                break;
            default:
                // recursively set fill for all children
                for (let c in newd.children) {
                    newd.children[c].fill(color);
                }
        }
        return newd;
    }

    /**
     * Set the stroke color of the diagram
     * @param color color of the stroke
     */
    public stroke(color : string) : Diagram {
        let newd : Diagram = this.copy();
        switch (newd.type) {
            case DiagramType.Polygon:
                newd.color_stroke = color;
                break;
            case DiagramType.Curve:
                newd.color_stroke = color;
                break;
            default:
                // recursively set stroke for all children
                for (let c in newd.children) {
                    newd.children[c].stroke(color);
                }
        }
        return newd;
    }
}

export class Path {
    // for now just do linear path
    constructor(public start: Vector2, public end: Vector2) { }

    /**
     * Get the point on the path at t 
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path start at t=0 and ends at t=1
     * @param t parameter
     * @returns the position of the point
    */
    get_parametric_point(t : number) : Vector2 {
        // for now assume Path is linear
        let dir : Vector2 = this.end.sub(this.start);
        return this.start.add(dir.scale(t));
    }
}

/**
 * Create a polygon from a list of points
 */
export function polygon(points: Vector2[], names : string[] = []) : Diagram {
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
