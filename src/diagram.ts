import { Vector2 } from './linear_algebra.js';

function assert(condition : boolean, message : string) : void {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export enum DiagramType {
    Polygon = 'polygon',
    Curve   = 'curve',
    Empty   = 'empty',
    Text    = 'text',
    Diagram = 'diagram',
}

export enum Anchor {
    TopLeft      = 'top-left',
    TopCenter    = 'top-center',
    TopRight     = 'top-right',
    CenterLeft   = 'center-left',
    CenterCenter = 'center-center',
    CenterRight  = 'center-right',
    BottomLeft   = 'bottom-left',
    BottomCenter = 'bottom-center',
    BottomRight  = 'bottom-right',
}

/**
 * Make sure that every function return a new Diagram
 * Diagram is immutable to the user
 */

export type DiagramStyle = {
    "stroke"?           : string,
    "fill"?             : string,
    "opacity"?          : string,
    "stroke-width"?     : string, // number
    "stroke-linecap"?   : string,
    "stroke-dasharray"? : string, // number[]
    "stroke-linejoin"?  : string,
    "vector-effect"?    : string,
    // TODO : add more style
}

export type TextData = {
    "text"?             : string,
    "font-family"?      : string,
    "font-size"?        : string,
    "font-weight"?      : string,
    "font-style"?       : string,
    "text-anchor"?      : string,
    "dominant-baseline"?: string,
    // "letter-spacing"?   : string,
    // "word-spacing"?     : string,
    // "text-decoration"?  : string,
    // "writing-mode"?     : string,
}

function anchor_to_textdata(anchor : Anchor) : TextData {
    // TODO : might want to look at
    // hanging vs text-before-edge
    // ideographic vs text-after-edge
    switch (anchor) {
        case Anchor.TopLeft      : return {"text-anchor" : "start" , "dominant-baseline" : "text-before-edge"};
        case Anchor.TopCenter    : return {"text-anchor" : "middle", "dominant-baseline" : "text-before-edge"};
        case Anchor.TopRight     : return {"text-anchor" : "end"   , "dominant-baseline" : "text-before-edge"};
        case Anchor.CenterLeft   : return {"text-anchor" : "start" , "dominant-baseline" : "middle"};
        case Anchor.CenterCenter : return {"text-anchor" : "middle", "dominant-baseline" : "middle"};
        case Anchor.CenterRight  : return {"text-anchor" : "end"   , "dominant-baseline" : "middle"};
        case Anchor.BottomLeft   : return {"text-anchor" : "start" , "dominant-baseline" : "text-after-edge"};
        case Anchor.BottomCenter : return {"text-anchor" : "middle", "dominant-baseline" : "text-after-edge"};
        case Anchor.BottomRight  : return {"text-anchor" : "end"   , "dominant-baseline" : "text-after-edge"};
        default: throw new Error("Unknown anchor " + anchor);
    }
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
    children : Diagram[] = [];
    path : Path | undefined = undefined; // Polygon and Curve have a path
    origin : Vector2 = new Vector2(0, 0); // position of the origin of the diagram
    style  : DiagramStyle = {}
    textdata : TextData = {}

    constructor(type_ : DiagramType, 
        args : { path? : Path, children? : Diagram[], textdata? : TextData } = {}
    ) {
        this.type = type_;
        this.path = args.path;
        if (args.children) { this.children = args.children; }
        if (args.textdata) { this.textdata = args.textdata; }
    }

    /**
     * Copy the diagram
     */
    public copy() : Diagram {
        // do deepcopy with JSON
        let newd : Diagram = JSON.parse(JSON.stringify(this));
        // turn newd into Diagram
        Object.setPrototypeOf(newd, Diagram.prototype);
        // convert position and origin_offset to Vector2
        newd.origin = Object.setPrototypeOf(newd.origin, Vector2.prototype);
        // make sure all of the children are Diagram
        for (let c in newd.children) {
            Object.setPrototypeOf(newd.children[c], Diagram.prototype);
            newd.children[c] = newd.children[c].copy();
        }
        // set path to Path
        if (newd.path != undefined) {
            Object.setPrototypeOf(newd.path, Path.prototype);
            newd.path = newd.path.copy();
        }
        return newd;
    }

    /**
     * Combine another diagram with this diagram
     * @param diagrams a diagram or a list of diagrams
     */
    public combine(...diagrams : Diagram[]) : Diagram {
        return diagram_combine(this, ...diagrams);
    }

    /**
     * Convert the diagram to a curve
     * If the diagram is a polygon, convert it to a curve
     * If the diagram is a Diagram, convert all of the children to curves
     */
    public to_curve() : Diagram {
        let newd : Diagram = this.copy();
        if (newd.type == DiagramType.Polygon) {
            newd.type = DiagramType.Curve;
        } else if (newd.type == DiagramType.Diagram) {
            newd.children = newd.children.map(c => c.to_curve());
        }
        return newd;
    }

    /**
     * Convert the diagram to a polygon
     * If the diagram is a curve, convert it to a polygon
     * If the diagram is a Diagram, convert all of the children to polygons
     */
    public to_polygon() : Diagram {
        let newd : Diagram = this.copy();
        if (newd.type == DiagramType.Curve) {
            newd.type = DiagramType.Polygon;
        } else if (newd.type == DiagramType.Diagram) {
            newd.children = newd.children.map(c => c.to_polygon());
        }
        return newd;
    }

    /**
     * Add points to the diagram
     * if the diagram is a polygon or curve, add points to the path
     * if the diagram is a diagram, add points to the last polygon or curve child
     * @param points points to add
     */
    public add_points(points : Vector2[]) : Diagram {
        let newd : Diagram = this.copy();
        if (newd.type == DiagramType.Polygon || newd.type == DiagramType.Curve) {
            if (newd.path == undefined) { throw new Error(this.type + " must have a path"); }
            newd.path = newd.path.add_points(points);
        } else if (newd.type == DiagramType.Diagram) {
            // add point to the last polygon or curve child
            let last_child = newd.children[newd.children.length - 1];
            newd.children[newd.children.length - 1] = last_child.add_points(points);
        }
        return newd;
    }

    private update_style(stylename : keyof Diagram['style'], stylevalue : string) : Diagram {
        let newd : Diagram = this.copy();
        if (newd.type == DiagramType.Polygon || newd.type == DiagramType.Curve || newd.type == DiagramType.Text) {
            newd.style[stylename] = stylevalue;
        } else if (newd.type == DiagramType.Diagram) {
            newd.children = newd.children.map(c => c.update_style(stylename, stylevalue));
        } else if (newd.type == DiagramType.Empty) {
            // do nothing
        } else {
            throw new Error("Unreachable, unknown diagram type : " + newd.type);
        }
        return newd;
    }

    public fill(color : string) : Diagram { 
        return this.update_style('fill', color);
    }
    public stroke(color : string) : Diagram { 
        return this.update_style('stroke', color);
    }
    public opacity(opacity : number) : Diagram {
        return this.update_style('opacity', opacity.toString());
    }
    public strokewidth(width : number) : Diagram { 
        return this.update_style('stroke-width', width.toString());
    }
    public strokelinecap(linecap : 'butt' | 'round' | 'square') : Diagram {
        return this.update_style('stroke-linecap', linecap);
    }
    public strokejoin(linejoin : 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round') : Diagram {
        return this.update_style('stroke-linejoin', linejoin);
    }
    public strokedasharray(dasharray : number[]) : Diagram {
        return this.update_style('stroke-dasharray', dasharray.join(','));
    }
    public vectoreffect(vectoreffect : 'none' | 'non-scaling-stroke' | 'non-scaling-size' | 'non-rotation' | 'fixed-position'
) : Diagram {
        return this.update_style('vector-effect', vectoreffect);
    }


    private update_textdata(textdataname : keyof Diagram['textdata'], textdatavalue : string) : Diagram {
        let newd : Diagram = this.copy();
        if (newd.type == DiagramType.Text) {
            newd.textdata[textdataname] = textdatavalue;
        } else if (newd.type == DiagramType.Diagram) {
            newd.children = newd.children.map(c => c.update_textdata(textdataname, textdatavalue));
        } else if (newd.type == DiagramType.Polygon || newd.type == DiagramType.Curve || newd.type == DiagramType.Empty) {
            // do nothing
        } else {
            throw new Error("Unreachable, unknown diagram type : " + newd.type);
        }
        return newd;
    }
    public fontfamily(fontfamily : string) : Diagram {
        return this.update_textdata('font-family', fontfamily);
    }
    public fontsize(fontsize : number) : Diagram {
        return this.update_textdata('font-size', fontsize.toString());
    }
    public fontweight(fontweight : 'normal' | 'bold' | 'bolder' | 'lighter' | number ) : Diagram {
        return this.update_textdata('font-weight', fontweight.toString());
    }
    public textanchor(textanchor : 'start' | 'middle' | 'end' ) : Diagram {
        return this.update_textdata('text-anchor', textanchor);
    }
    public dominantbaseline(dominantbaseline : 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top' ) : Diagram {
        return this.update_textdata('dominant-baseline', dominantbaseline);
    }


    /**
     * Get the bounding box of the diagram
     * @returns [min, max] where min is the top left corner and max is the bottom right corner
     */
    public bounding_box() : [Vector2, Vector2] {
        let minx = Infinity, miny = Infinity;
        let maxx = -Infinity, maxy = -Infinity;
        if (this.type == DiagramType.Diagram){
                for (let c in this.children) {
                    let child = this.children[c];
                    let [min, max] = child.bounding_box();
                    minx = Math.min(minx, min.x);
                    miny = Math.min(miny, min.y);
                    maxx = Math.max(maxx, max.x);
                    maxy = Math.max(maxy, max.y);
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
        }
        else if (this.type == DiagramType.Curve || this.type == DiagramType.Polygon || this.type == DiagramType.Empty){
                if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
                for (let point of this.path.points) {
                    minx = Math.min(minx, point.x);
                    miny = Math.min(miny, point.y);
                    maxx = Math.max(maxx, point.x);
                    maxy = Math.max(maxy, point.y);
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
        } 
        else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }

    /**
     * Transform the diagram by a function
     * @param transform_function function to transform the diagram
     */
    public transform(transform_function : (p : Vector2) => Vector2) : Diagram {
        let newd : Diagram = this.copy();
        // transform all children
        newd.children = newd.children.map(c => c.transform(transform_function));
        // transform path
        if (newd.path != undefined) newd.path = newd.path.transform(transform_function);
        return newd;
    }

    /**
     * Translate the diagram by a vector
     * @param v vector to translate
     */
    public translate(v : Vector2) : Diagram {
        let newd : Diagram = this.copy();
        newd.origin = newd.origin.add(v);
        // recursively translate all children
        for (let c in newd.children) {
            newd.children[c] = newd.children[c].translate(v);
        }
        // translate paths
        if (newd.path != undefined) newd.path = newd.path.translate(v);
        return newd;
    }

    /**
     * move the diagram to a position
     * @param v position to move to (if left undefined, move to the origin)
     */
    public position(v : Vector2 = new Vector2(0,0)) : Diagram {
        let dv = v.sub(this.origin)
        let newd = this.translate(dv);
        return newd;
    }

    /**
     * Rotate the diagram by an angle around a pivot
     * @param angle angle to rotate
     * @param pivot pivot point, if left undefined, rotate around the origin
     */
    public rotate(angle : number, pivot : Vector2 | undefined = undefined) : Diagram {
        let newd : Diagram = this.copy();
      
        if (pivot == undefined) { pivot = newd.origin; }

        // rotate all children
        for (let c in newd.children) {
            newd.children[c] = newd.children[c].rotate(angle, pivot);
        }
        // rotate path
        if (newd.path != undefined) newd.path = newd.path.rotate(angle, pivot);
        return newd;
    }

    /**
     * Scale the diagram by a scale around a origin
     * @param scale scale to scale (x, y)
     * @param origin origin point, if left undefined, scale around the origin
     */
    public scale(scale : Vector2, origin? : Vector2) : Diagram {
        let newd : Diagram = this.copy();
        if (origin == undefined) { origin = newd.origin; }
        // scale all children
        newd.children = newd.children.map(c => c.scale(scale, origin));
        // scale path
        if (newd.path != undefined) newd.path = newd.path.scale(scale, origin);
        return newd;
    }

    /**
     * Reflect the diagram over a point
     * @param p point to reflect over
     */
    public reflect_over_point(p : Vector2) {
        let newd : Diagram = this.copy();
        // reflect all children
        newd.children = newd.children.map(c => c.reflect_over_point(p));
        // reflect path
        if (newd.path != undefined) newd.path = newd.path.reflect_over_point(p);
        return newd;
    }

    /**
     * Reflect the diagram over a line defined by two points
     * @param p1 point on the line
     * @param p2 point on the line
     */
    public reflect_over_line(p1 : Vector2, p2 : Vector2) {
        let newd : Diagram = this.copy();
        // reflect all children
        newd.children = newd.children.map(c => c.reflect_over_line(p1, p2));
        // reflect path
        if (newd.path != undefined) newd.path = newd.path.reflect_over_line(p1, p2);
        return newd;
    }

    /**
     * Reflect the diagram
     * if given 0 arguments, reflect over the origin
     * if given 1 argument, reflect over a point p1
     * if given 2 arguments, reflect over a line defined by two points p1 and p2
     * @param p1 point
     * @param p2 point
     */
    public reflect(p1? : Vector2, p2? : Vector2){
        if (p1 == undefined && p2 == undefined) {
            return this.reflect_over_point(new Vector2(0,0));
        } else if (p1 != undefined && p2 == undefined) {
            return this.reflect_over_point(p1);
        } else if (p1 != undefined && p2 != undefined) {
            return this.reflect_over_line(p1, p2);
        } else {
            throw new Error("Unreachable");
        }
    }

    /**
     * Vertical flip
     * Reflect the diagram over a horizontal line y = a
     * @param a y value of the line
     */
    public vflip(a : number = 0) {
        return this.reflect(new Vector2(0, a), new Vector2(1, a));
    }

    /**
     * Horizontal flip
     * Reflect the diagram over a vertical line x = a
     * @param a x value of the line
     */
    public hflip(a : number = 0){
        return this.reflect(new Vector2(a, 0), new Vector2(a, 1));
    }


    /**
     * Get the position of the anchor of the diagram
     * @param anchor anchor to get, anchors can be
     *   'top-left', 'top-center', 'top-right'
     *   'center-left', 'center-center', 'center-right'
     *   'bottom-left', 'bottom-center', 'bottom-right'
     * @returns the position of the anchor
     */
    public get_anchor(anchor : Anchor) : Vector2 {
        let [min, max] = this.bounding_box();
        let minx = min.x, miny = min.y;
        let maxx = max.x, maxy = max.y;
        let midx = (minx + maxx) / 2;
        let midy = (miny + maxy) / 2;
        switch (anchor) {
            case Anchor.TopLeft      : return new Vector2(minx, maxy);
            case Anchor.TopCenter    : return new Vector2(midx, maxy);
            case Anchor.TopRight     : return new Vector2(maxx, maxy);
            case Anchor.CenterLeft   : return new Vector2(minx, midy);
            case Anchor.CenterCenter : return new Vector2(midx, midy);
            case Anchor.CenterRight  : return new Vector2(maxx, midy);
            case Anchor.BottomLeft   : return new Vector2(minx, miny);
            case Anchor.BottomCenter : return new Vector2(midx, miny);
            case Anchor.BottomRight  : return new Vector2(maxx, miny);
            default: throw new Error("Unknown anchor " + anchor);
        }
    }

    /**
     * Move the origin of the diagram to a position or anchor
     * @param pos position to move the origin to (Vector2), or anchor to move the origin to.
     * anchors can be
     *  'top-left', 'top-center', 'top-right'
     *  'center-left', 'center-center', 'center-right'
     *  'bottom-left', 'bottom-center', 'bottom-right'
     * * for texts, use `move_origin_text()`
     */
    public move_origin(pos : Vector2 | Anchor) : Diagram {
        let newd : Diagram = this.copy();
        if (pos instanceof Vector2) {
            newd.origin = pos;
        } else {
            newd.origin = newd.get_anchor(pos);
        }
        return newd;
    }

    /**
     * Move the origin of the diagram to an anchor
     * @param pos anchor to move the origin to.
     * anchors can be
     * 'top-left', 'top-center', 'top-right'
     * 'center-left', 'center-center', 'center-right'
     * 'bottom-left', 'bottom-center', 'bottom-right'
     */
    public move_origin_text(pos : Anchor) : Diagram {
        // for text, use text-anchor and dominant-baseline
        let newd = this.copy();
        let textdata = anchor_to_textdata(pos);
        newd.textdata['text-anchor'] = textdata['text-anchor'];
        newd.textdata['dominant-baseline'] = textdata['dominant-baseline'];
        return newd;
    }

    public path_length() : number {
        if (this.type == DiagramType.Diagram) {
            let length = 0;
            for (let c in this.children) {
                length += this.children[c].path_length();
            }
            return length;
        } else if (this.type == DiagramType.Curve || this.type == DiagramType.Polygon) {
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.length();
        } else if (this.type == DiagramType.Empty) {
            // for now, do the same as polygon and curve
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.length();
        } else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }

    /**
     * Get the point on the path at t
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path starts at t=0 and ends at t=1
     * @param t parameter
     * @param segment_index (only works for polygon and curves)
     * If segment_index (n) is defined, get the point at the nth segment
     * If segment_index (n) is defined, t can be outside of [0, 1] and will return the extrapolated point
     * @returns the position of the point
     */
    public parametric_point(t : number, segment_index? : number) : Vector2 {
        if (this.type == DiagramType.Diagram) {
            // use entire length, use the childrens
            let cumuative_length = [];
            let length   = 0.0;
            for (let c in this.children) {
                length += this.children[c].path_length();
                cumuative_length.push(length);
            }
            let total_length = length;
            let cumulative_t = cumuative_length.map(l => l / total_length);

            // figure out which children t is in
            for (let i = 0; i < cumulative_t.length; i++) {
                if (t < cumulative_t[i]) {
                    let child_id = i;

                    let prev_t = (i == 0) ? 0 : cumulative_t[i-1];
                    let segment_t = (t - prev_t) / (cumulative_t[i] - prev_t);
                    return this.children[child_id].parametric_point(segment_t);
                }
            }
            throw Error("Unreachable");
        } else if (this.type == DiagramType.Curve || this.type == DiagramType.Polygon) {
            // get the point on the path
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.parametric_point(t, segment_index);
        } else if (this.type == DiagramType.Empty) {
            // for now do the same as polygon and curve
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.parametric_point(t, segment_index);
        } else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }
}

export class Path {
    // for now just do linear path
    constructor(public points : Vector2[]) { }

    copy() : Path {
        // let start = new Vector2(this.start.x, this.start.y);
        // let end = new Vector2(this.end.x, this.end.y);
        let newpoints = this.points.map(p => new Vector2(p.x, p.y));
        return new Path(newpoints);
    }

    /**
     * Get the length of the path
     */
    length() : number {
        let length = 0;
        console.log(this);
        for (let i = 1; i < this.points.length; i++) {
            length += this.points[i].sub(this.points[i-1]).length();
        }
        return length;
    }

    /**
     * add points to the path
     * @param points points to add
     */
    public add_points(points : Vector2[]) : Path {
        let newp : Path = this.copy();
        newp.points = newp.points.concat(points);
        return newp;
    }

    /**
     * Get the point on the path at t 
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path starts at t=0 and ends at t=1
     * @param t parameter
     * If segment_index (n) is defined, get the point at the nth segment
     * If segment_index (n) is defined, t can be outside of [0, 1] and will return the extrapolated point
     * @returns the position of the point
    */
    public parametric_point(t : number, segment_index? : number) : Vector2 {
        if (segment_index == undefined) { 
            if (t < 0 || t > 1) { throw Error("t must be between 0 and 1"); }
            // use entire length
            let cumuative_length = [];
            let length   = 0.0;
            for (let i = 1; i < this.points.length; i++) {
                length += this.points[i].sub(this.points[i-1]).length();
                cumuative_length.push(length);
            }
            let total_length = length;
            let cumulative_t = cumuative_length.map(l => l / total_length);
            // figure out which segment t is in
            for (let i = 0; i < cumulative_t.length; i++) {
                if (t < cumulative_t[i]) {
                    let segment_id = i;

                    let prev_t = (i == 0) ? 0 : cumulative_t[i-1];
                    let segment_t = (t - prev_t) / (cumulative_t[i] - prev_t);
                    return this.parametric_point(segment_t, segment_id);
                }
            }
            // segment must have been retrieved at this point
            throw Error("Unreachable");
        } else {
            // take nth segment
            if (segment_index < 0 || segment_index >= this.points.length - 1) { 
                throw Error("segment_index must be between 0 and n-1"); 
            }
            let start = this.points[segment_index];
            let end   = this.points[segment_index + 1];
            let dir : Vector2 = end.sub(start);
            return start.add(dir.scale(t));
        }
    }

    /**
     * Tranfrom the path by a function
     * @param transform_function function to transform the path
     */
    public transform(transform_function : (p : Vector2) => Vector2) : Path {
        let newp : Path = this.copy();
        // transform all the points
        newp.points = newp.points.map(p => transform_function(p));
        return newp;
    }

    /**
     * Translate the path by a vector
     * @param v vector to translate
     */
    public translate(v : Vector2) : Path {
        return this.transform(p => p.add(v));
        // let newp : Path = this.copy();
        // // translate all the points
        // newp.points = newp.points.map(p => p.add(v));
        // return newp;
    }

    /**
     * Rotate the path by an angle around a pivot
     * @param angle angle to rotate
     * @param pivot pivot point
     */
    public rotate(angle : number, pivot : Vector2) : Path {
        return this.transform(p => p.sub(pivot).rotate(angle).add(pivot));
        // let newp : Path = this.copy();
        // // rotate all the points
        // newp.points = newp.points.map(p => p.sub(pivot).rotate(angle).add(pivot));
        // return newp;
    }

    /**
     * Scale the path by a scale around a origin
     * @param scale scale to scale (x, y)
     * @param origin origin point
     */
    public scale(scale : Vector2, origin : Vector2) : Path {
        return this.transform(p => p.sub(origin).mul(scale).add(origin));
        // let newp : Path = this.copy();
        // // scale all the points
        // newp.points = newp.points.map(p => p.sub(origin).mul(scale).add(origin));
        // return newp;
    }

    /**
     * Reflect the path over a point
     * @param p point to reflect over
     */
    public reflect_over_point(p : Vector2) {
        return this.rotate(Math.PI, p);
    }

    /**
     * Reflect the path over a line given by two points
     * @param p1 point on the line
     * @param p2 point on the line
     */
    public reflect_over_line(p1 : Vector2, p2 : Vector2) {
        return this.transform(p => {
            let v = p2.sub(p1);
            let n = v.rotate(Math.PI / 2);
            let d = n.dot(p.sub(p1));
            let q = p.sub(n.scale(2*d));
            return q;
        });
    }
        
}

/**
 * Combine multiple diagrams into one diagram
 * @param diagrams list of diagrams to combine
 * @returns a diagram
 */
export function diagram_combine(...diagrams : Diagram[]) : Diagram {
    let newdiagrams = diagrams.map(d => d.copy());
    return new Diagram(DiagramType.Diagram, {children : newdiagrams});
}

// ====== function helpers to create primitives =========


/**
 * Create a line from start to end 
 * @param start start point
 * @param end end point
 * @returns a line diagram
 */
export function line(start : Vector2, end : Vector2) : Diagram {
    let path : Path = new Path([start, end]);
    let line = new Diagram(DiagramType.Curve, {path : path});
    return line;
}

/**
 * Create a curve from a list of points
 * @param points list of points
 * @returns a curve diagram
 */
export function curve(points : Vector2[]) : Diagram {
    let path : Path = new Path(points);
    let curve = new Diagram(DiagramType.Curve, {path : path});
    return curve;
}

/**
 * Create a polygon from a list of points
 * @param points list of points
 * @param names list of names for each path
 * @returns a polygon diagram
 */
export function polygon(points: Vector2[]) : Diagram {
    assert(points.length >= 3, "Polygon must have at least 3 points");
    let path : Path = new Path(points);

    // create diagram
    let polygon = new Diagram(DiagramType.Polygon, {path : path});
    return polygon;
}

/**
 * Create an empty diagram, contain just a single point
 * @param v position of the point
 * @returns an empty diagram
 */
export function empty(v : Vector2) : Diagram {
    let emp = new Diagram(DiagramType.Empty, {path : new Path([v])});
    return emp;
}

/**
 * Create a text diagram
 * @param str text to display
 * @returns a text diagram
 */
export function text(str : string) : Diagram {
    let dtext = new Diagram(DiagramType.Text, {
        textdata : { text : str },
        path : new Path([new Vector2(0, 0)]),
    });
    return dtext;
}
