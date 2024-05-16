import { Vector2, V2, Transform } from './vector.js';
import { BB_multiline } from './BBcode.js'
import { TAG } from './tag_names.js'

function assert(condition : boolean, message : string) : void {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export enum DiagramType {
    Polygon = 'polygon',
    Curve   = 'curve',
    Text    = 'text',
    Image   = 'image',
    Diagram = 'diagram',
    MultilineText = 'multilinetext',
}

export const DEFAULT_FONTSIZE = "16"; // 16px (12pt) is the web default

export type Anchor = 
    'top-left'    | 'top-center'    | 'top-right'    | 
    'center-left' | 'center-center' | 'center-right' | 
    'bottom-left' | 'bottom-center' | 'bottom-right' ;

/**
 * Make sure that every function return a new Diagram
 * Diagram is immutable to the user
 */

export type DiagramStyle = {
    "stroke"           : string,
    "fill"             : string,
    "opacity"          : string,
    "stroke-width"     : string, // number
    "stroke-linecap"   : string,
    "stroke-dasharray" : string, // number[]
    "stroke-linejoin"  : string,
    "vector-effect"    : string,
    // TODO : add more style
}

export type TextData = {
    "text"             : string,
    "font-family"      : string,
    "font-size"        : string,
    "font-weight"      : string,
    "font-style"       : string,
    "text-anchor"      : string,
    "dy"               : string, // used to be "dominant-baseline": string,
    "angle"            : string,
    "font-scale"       : string, // this is a custom attribute that is not present in SVG
    // "letter-spacing"   : string,
    // "word-spacing"     : string,
    // "text-decoration"  : string,
    // "writing-mode"     : string,
}

export type ImageData = {
    "src"    : string,
}

type ExtraTspanStyle = {
    "dy" : string,
    "dx" : string,
    "textvar" : boolean,
    "tag" : string,
}
type TextSpanData = {
    "text"  : string,
    "style" : Partial<TextData> & Partial<DiagramStyle> & Partial<ExtraTspanStyle>,
}
export type MultilineTextData = {
    "content" : TextSpanData[],
    "scale-factor" : number,
}

function anchor_to_textdata(anchor : Anchor) : Partial<TextData> {
    // TODO : might want to look at
    // hanging vs text-before-edge
    // ideographic vs text-after-edge
    switch (anchor) {
        case "top-left"      : return {"text-anchor" : "start" , "dy" : "0.75em"};
        case "top-center"    : return {"text-anchor" : "middle", "dy" : "0.75em"};
        case "top-right"     : return {"text-anchor" : "end"   , "dy" : "0.75em"};
        case "center-left"   : return {"text-anchor" : "start" , "dy" : "0.25em"};
        case "center-center" : return {"text-anchor" : "middle", "dy" : "0.25em"};
        case "center-right"  : return {"text-anchor" : "end"   , "dy" : "0.25em"};
        case "bottom-left"   : return {"text-anchor" : "start" , "dy" : "-0.25em"};
        case "bottom-center" : return {"text-anchor" : "middle", "dy" : "-0.25em"};
        case "bottom-right"  : return {"text-anchor" : "end"   , "dy" : "-0.25em"};
        default: throw new Error("Unknown anchor " + anchor);
    }
}


/**
* Diagram Class 
*
* Diagram is a tree structure
* Diagram can be a polygon, curve, text, image, or diagram
* Polygon is a closed path
* Curve is an open path
* Diagram is a tree of Diagrams
*/
export class Diagram {
    type : DiagramType;
    children : Diagram[] = [];
    path : Path | undefined = undefined; // Polygon and Curve have a path
    origin : Vector2 = new Vector2(0, 0); // position of the origin of the diagram
    style         : Partial<DiagramStyle>      = {};
    textdata      : Partial<TextData>          = {};
    multilinedata : Partial<MultilineTextData> = {};
    imgdata       : Partial<ImageData>         = {};
    mutable       : boolean   = false;
    tags : string[] = [];

    constructor(type_ : DiagramType, 
        args : { 
            path?     : Path, 
            children? : Diagram[], 
            textdata? : Partial<TextData>, 
            imgdata?  : Partial<ImageData>,
            multilinedata? : Partial<MultilineTextData>,
            tags?     : string[],
        } = {}
    ) {
        this.type = type_;
        this.path = args.path;
        if (args.children) { this.children = args.children; }
        if (args.textdata) { this.textdata = args.textdata; }
        if (args.imgdata)  { this.imgdata  = args.imgdata; }
        if (args.tags)     { this.tags     = args.tags; }
        if (args.multilinedata) { this.multilinedata = args.multilinedata; }
    }

    /**
     * Turn the diagram into a mutable diagram
     */
    public mut() : Diagram {
        this.mutable = true;
        // make path mutable
        if (this.path != undefined) this.path.mutable = true;
        // make all of the children mutable
        for (let i = 0; i < this.children.length; i++) this.children[i].mut();
        return this;
    }

    public mut_parent_only() : Diagram {
        this.mutable = true;
        // make path mutable
        if (this.path != undefined) this.path.mutable = true;
        return this;
    }

    /**
     * Create a copy of the diagram that is immutable
     */
    public immut() : Diagram {
        let newd : Diagram = this.copy();
        newd.mutable = false;
        // make path immutable
        if (this.path != undefined) this.path.mutable = false;
        // make all of the children immutable
        for (let i = 0; i < newd.children.length; i++) newd.children[i].immut();
        return newd;
    }

    private static deep_setPrototypeOf(obj : any) : void {
        Object.setPrototypeOf(obj, Diagram.prototype);
        let objd : Diagram = obj;
        // convert position and origin_offset to Vector2
        objd.origin = Object.setPrototypeOf(objd.origin, Vector2.prototype);
        // make sure all of the children are Diagram
        for (let c = 0; c < objd.children.length; c++)
            Diagram.deep_setPrototypeOf(objd.children[c]);

        // set path to Path
        if (objd.path != undefined) {
            Object.setPrototypeOf(objd.path, Path.prototype);
            objd.path = objd.path.copy();
        }
    }

    /**
     * Copy the diagram
     * @return { Diagram }
     */
    public copy() : Diagram {
        // do deepcopy with JSON
        let newd : Diagram = JSON.parse(JSON.stringify(this));
        // turn newd into Diagram
        Diagram.deep_setPrototypeOf(newd);
        return newd;
    }

    public copy_if_not_mutable() : Diagram {
        return this.mutable ? this : this.copy();
    }

    /**
     * Append tags to the diagram
     */
    public append_tags(tags : string | string[]) : Diagram {
        let newd = this.copy_if_not_mutable();
        if (!Array.isArray(tags)) tags = [tags];
        for (let tag of tags){
            if(!newd.tags.includes(tag)) newd.tags.push(tag);
        }
        return newd;
    }
    /**
     * Remove tags from the diagram
     */
    public remove_tags(tags : string | string[]) : Diagram {
        let newd = this.copy_if_not_mutable();
        newd.tags = newd.tags.filter(t => !tags.includes(t));
        return newd;
    }
    /**
     * Reset all tags of the diagram
     */
    public reset_tags() : Diagram {
        let newd = this.copy_if_not_mutable();
        newd.tags = [];
        return newd;
    }
    /**
    * Check if the diagram contains a tag
    */
    public contain_tag(tag : string) : boolean {
        return this.tags.includes(tag);
    }
    public contain_all_tags(tags : string[]) : boolean {
        for (let tag of tags){
            if (!this.tags.includes(tag)) return false;
        }
        return true;
    }

    /**
     * Collect all children and subchildren of the diagram
     * helper function for flatten()
     */
    private collect_children() : Diagram[] {
        let children : Diagram[] = [];
        if (this.type == DiagramType.Diagram) {
            for (let c of this.children) {
                children = children.concat(c.collect_children());
            }
        } else {
            children.push(this);
        }
        return children;
    }

    /**
     * Flatten the children structure of the diagram
     * so that the diagram only has one level of children
     * \* implemented for performance reason
     */
    public flatten() : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        newd.children = newd.collect_children();
        return newd;
    }

    /**
     * Apply a function to the diagram
     * @param func function to apply
     * func takes in a diagram and returns a diagram
     */
    public apply(func : (d : Diagram) => Diagram) : Diagram {
        return func(this.copy_if_not_mutable());
    }

    /**
     * Apply a function to the diagram and all of its children recursively
     * @param func function to apply
     * func takes in a diagram and returns a diagram
     */
    public apply_recursive(func : (d : Diagram) => Diagram) : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        // apply to self
        newd = func(newd);
        // apply to children
        for (let i = 0; i < newd.children.length; i++) {
            newd.children[i] = newd.children[i].apply_recursive(func);
        }
        return newd;
    }
    
    /**
    * Apply a function to the diagram and all of its children recursively
    * The function is only applied to the diagrams that contain a specific tag
    * @param tags the tag to filter the diagrams
    * @param func function to apply
    * func takes in a diagram and returns a diagram
    */ 
    public apply_to_tagged_recursive(tags : string | string[], func : (d : Diagram) => Diagram) : Diagram {
        if (!Array.isArray(tags)) tags = [tags];
        
        let newd : Diagram = this.copy_if_not_mutable();
        // if the diagram has the tag, apply the function to self
        if (newd.contain_all_tags(tags)) newd = func(newd);
        // apply to children
        for (let i = 0; i < newd.children.length; i++) {
            newd.children[i] = newd.children[i].apply_to_tagged_recursive(tags, func);
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
        let newd : Diagram = this.copy_if_not_mutable();
        if (newd.type == DiagramType.Polygon) {
            newd.type = DiagramType.Curve;
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.to_curve());
            for (let i = 0; i < newd.children.length; i++) 
                newd.children[i] = newd.children[i].to_curve();
        }
        return newd;
    }

    /**
     * Convert the diagram to a polygon
     * If the diagram is a curve, convert it to a polygon
     * If the diagram is a Diagram, convert all of the children to polygons
     */
    public to_polygon() : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        if (newd.type == DiagramType.Curve) {
            newd.type = DiagramType.Polygon;
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.to_polygon());
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].to_polygon();
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
        let newd : Diagram = this.copy_if_not_mutable();
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

    private update_style(stylename : keyof Diagram['style'], stylevalue : string, excludedType? : DiagramType[]) : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        if (excludedType?.includes(newd.type)) { 
            return newd; 
        } else if (newd.type == DiagramType.Polygon || newd.type == DiagramType.Curve 
            || newd.type == DiagramType.Text || newd.type == DiagramType.Image 
            || newd.type == DiagramType.MultilineText
        ) {
            newd.style[stylename] = stylevalue;
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.update_style(stylename, stylevalue, excludedType));
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].update_style(stylename, stylevalue, excludedType);
        } else {
            throw new Error("Unreachable, unknown diagram type : " + newd.type);
        }
        return newd;
    }
    
    /* * Clone style from another diagram */
    public clone_style_from(diagram : Diagram) : Diagram {
        return this.apply_recursive(d => {
            d.style = {...diagram.style};
            return d;
        });
    }

    public fill(color : string) : Diagram { 
        return this.update_style('fill', color, [DiagramType.Text]);
    }
    public stroke(color : string) : Diagram { 
        return this.update_style('stroke', color, [DiagramType.Text]);
    }
    public opacity(opacity : number) : Diagram {
        return this.update_style('opacity', opacity.toString());
    }
    public strokewidth(width : number) : Diagram { 
        return this.update_style('stroke-width', width.toString(), [DiagramType.Text]);
    }
    public strokelinecap(linecap : 'butt' | 'round' | 'square') : Diagram {
        return this.update_style('stroke-linecap', linecap);
    }
    public strokelinejoin(linejoin : 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round') : Diagram {
        return this.update_style('stroke-linejoin', linejoin);
    }
    public strokedasharray(dasharray : number[]) : Diagram {
        return this.update_style('stroke-dasharray', dasharray.join(','));
    }
    public vectoreffect(vectoreffect : 'none' | 'non-scaling-stroke' | 'non-scaling-size' | 'non-rotation' | 'fixed-position'
) : Diagram {
        return this.update_style('vector-effect', vectoreffect);
    }

    public textfill(color : string) : Diagram {
        return this.update_style('fill', color, [DiagramType.Polygon, DiagramType.Curve]);
    }
    public textstroke(color : string) : Diagram {
        return this.update_style('stroke', color, [DiagramType.Polygon, DiagramType.Curve]);
    }
    public textstrokewidth(width : number) : Diagram {
        return this.update_style('stroke-width', width.toString(), [DiagramType.Polygon, DiagramType.Curve]);
    }


    private update_textdata(textdataname : keyof Diagram['textdata'], textdatavalue : string) : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        if (newd.type == DiagramType.Text || newd.type == DiagramType.MultilineText) {
            newd.textdata[textdataname] = textdatavalue;
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.update_textdata(textdataname, textdatavalue));
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].update_textdata(textdataname, textdatavalue);
        } else if (newd.type == DiagramType.Polygon || newd.type == DiagramType.Curve) {
            // do nothing
        } else {
            throw new Error("Unreachable, unknown diagram type : " + newd.type);
        }
        return newd;
    }
    public fontfamily(fontfamily : string) : Diagram {
        return this.update_textdata('font-family', fontfamily);
    }
    public fontstyle(fontstyle : string) : Diagram {
        return this.update_textdata('font-style', fontstyle);
    }
    public fontsize(fontsize : number) : Diagram {
        return this.update_textdata('font-size', fontsize.toString());
    }
    public fontweight(fontweight : 'normal' | 'bold' | 'bolder' | 'lighter' | number ) : Diagram {
        return this.update_textdata('font-weight', fontweight.toString());
    }
    public fontscale(fontscale : number | 'auto') : Diagram {
        return this.update_textdata('font-scale', fontscale.toString());
    }
    public textanchor(textanchor : 'start' | 'middle' | 'end' ) : Diagram {
        return this.update_textdata('text-anchor', textanchor);
    }
    public textdy(dy : string) : Diagram {
        return this.update_textdata('dy', dy);
    }
    public textangle(angle : number){
        return this.update_textdata('angle', angle.toString());
    }
    public text_tovar() : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        if (newd.type == DiagramType.Text) {
            newd = newd.append_tags(TAG.TEXTVAR);
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.text_tovar());
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].text_tovar();
        }
        return newd;
    }
    public text_totext() : Diagram {
        let newd : Diagram = this.copy_if_not_mutable();
        if (newd.type == DiagramType.Text) {
            newd = newd.remove_tags('textvar');
        } else if (newd.type == DiagramType.Diagram) {
            // newd.children = newd.children.map(c => c.text_totext());
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].text_totext();
        }
        return newd;
    }
            


    /**
     * Get the bounding box of the diagram
     * @returns [min, max] where min is the top left corner and max is the bottom right corner
     */
    public bounding_box() : [Vector2, Vector2] {
        let minx = Infinity, miny = Infinity;
        let maxx = -Infinity, maxy = -Infinity;
        if (this.type == DiagramType.Diagram){
                for (let c = 0; c < this.children.length; c++){
                    let child = this.children[c];
                    let [min, max] = child.bounding_box();
                    minx = Math.min(minx, min.x);
                    miny = Math.min(miny, min.y);
                    maxx = Math.max(maxx, max.x);
                    maxy = Math.max(maxy, max.y);
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
        }
        else if (this.type == DiagramType.Curve || this.type == DiagramType.Polygon 
            || this.type == DiagramType.Image){
                if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
                for (let p = 0; p < this.path.points.length; p++) {
                    let point = this.path.points[p];
                    minx = Math.min(minx, point.x);
                    miny = Math.min(miny, point.y);
                    maxx = Math.max(maxx, point.x);
                    maxy = Math.max(maxy, point.y);
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
        } 
        else if (this.type == DiagramType.Text || this.type == DiagramType.MultilineText){
            return [this.origin.copy(), this.origin.copy()];
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
        let newd : Diagram = this.copy_if_not_mutable();
        // transform all children
        // newd.children = newd.children.map(c => c.transform(transform_function));
        for (let i = 0; i < newd.children.length; i++)
            newd.children[i] = newd.children[i].transform(transform_function);
        // transform path
        if (newd.path != undefined) newd.path = newd.path.transform(transform_function);
        // transform origin
        newd.origin = transform_function(newd.origin);
        return newd;
    }

    /**
     * Translate the diagram by a vector
     * @param v vector to translate
     */
    public translate(v : Vector2) : Diagram {
        return this.transform(Transform.translate(v));
    }

    /**
     * move the diagram to a position
     * @param v position to move to (if left undefined, move to the origin)
     */
    public position(v : Vector2 = new Vector2(0,0)) : Diagram {
        let dv = v.sub(this.origin)
        return this.translate(dv);
    }

    /**
     * Rotate the diagram by an angle around a pivot
     * @param angle angle to rotate
     * @param pivot pivot point, if left undefined, rotate around the origin
     */
    public rotate(angle : number, pivot : Vector2 | undefined = undefined) : Diagram {
        if (pivot == undefined) { pivot = this.origin; }
        return this.transform(Transform.rotate(angle, pivot));
    }

    /**
     * Scale the diagram by a scale around a origin
     * @param scale scale to scale (x, y)
     * @param origin origin point, if left undefined, scale around the origin
     */
    public scale(scale : Vector2 | number, origin? : Vector2) : Diagram {
        if (origin == undefined) { origin = this.origin; }
        if (typeof scale == 'number') { scale = new Vector2(scale, scale); }
        return this.transform(Transform.scale(scale, origin));
    }

    /**
     * Scale texts contained in the diagram by a scale
     * @param scale scaling factor
     */
    public scaletext(scale : number) : Diagram {
        return this.apply_recursive(d => {
            switch (d.type) {
                case DiagramType.Text: {
                    let fontsize = parseFloat(d.textdata['font-size'] || DEFAULT_FONTSIZE);
                    let newd = d.copy_if_not_mutable();
                    newd.textdata['font-size'] = (fontsize * scale).toString();
                    return newd;
                }
                case DiagramType.MultilineText: {
                    let newd = d.copy_if_not_mutable();
                    newd.multilinedata['scale-factor'] = (newd.multilinedata['scale-factor'] || 1) * scale;
                    return newd;
                }
                default: return d;
            }
        });
    }

    /**
     * Skew the diagram in the x direction by an angle around a base
     * @param angle angle to skew
     * @param base base point, if left undefined, skew around the origin
     */
    public skewX(angle : number, base? : Vector2) : Diagram {
        if (base == undefined) { base = this.origin; }
        return this.transform(Transform.skewX(angle, base.y));
    }

    /**
     * Skew the diagram in the y direction by an angle around a base
     * @param angle angle to skew
     * @param base base point, if left undefined, skew around the origin
     */
    public skewY(angle : number, base? : Vector2) : Diagram {
        if (base == undefined) { base = this.origin; }
        return this.transform(Transform.skewY(angle, base.x));
    }

    /**
     * Reflect the diagram over a point
     * @param p point to reflect over
     */
    public reflect_over_point(p : Vector2) {
        return this.transform(Transform.reflect_over_point(p));
    }

    /**
     * Reflect the diagram over a line defined by two points
     * @param p1 point on the line
     * @param p2 point on the line
     */
    public reflect_over_line(p1 : Vector2, p2 : Vector2) {
        return this.transform(Transform.reflect_over_line(p1, p2));
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
            return this.reflect_over_point(this.origin);
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
     * if left undefined, flip over the origin
     */
    public vflip(a? : number) {
        if (a == undefined) { a = this.origin.y; }
        return this.reflect(new Vector2(0, a), new Vector2(1, a));
    }

    /**
     * Horizontal flip
     * Reflect the diagram over a vertical line x = a
     * @param a x value of the line
     * if left undefined, flip over the origin
     */
    public hflip(a? : number){
        if (a == undefined) { a = this.origin.x; }
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
            case "top-left"      : return new Vector2(minx, maxy);
            case "top-center"    : return new Vector2(midx, maxy);
            case "top-right"     : return new Vector2(maxx, maxy);
            case "center-left"   : return new Vector2(minx, midy);
            case "center-center" : return new Vector2(midx, midy);
            case "center-right"  : return new Vector2(maxx, midy);
            case "bottom-left"   : return new Vector2(minx, miny);
            case "bottom-center" : return new Vector2(midx, miny);
            case "bottom-right"  : return new Vector2(maxx, miny);
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
        let newd : Diagram = this.copy_if_not_mutable();
        if (pos instanceof Vector2) {
            newd.origin = pos;
        } else {
            newd.origin = newd.get_anchor(pos);
        }
        return newd;
    }

    /**
     * Move the origin of text diagram to an anchor
     * @param anchor anchor to move the origin to.
     * anchors can be
     * 'top-left', 'top-center', 'top-right'
     * 'center-left', 'center-center', 'center-right'
     * 'bottom-left', 'bottom-center', 'bottom-right'
     */
    private __move_origin_text(anchor : Anchor) : Diagram {
        // for text, use text-anchor and dominant-baseline
        let newd = this.copy_if_not_mutable();
        let textdata = anchor_to_textdata(anchor);
        newd.textdata['text-anchor'] = textdata['text-anchor'];
        newd.textdata['dy'] = textdata['dy'];
        return newd;
    }

    /**
     * Move the origin of text diagram to a position
     * @param anchor anchor to move the origin to.
     * anchors can be
     * 'top-left', 'top-center', 'top-right'
     * 'center-left', 'center-center', 'center-right'
     * 'bottom-left', 'bottom-center', 'bottom-right'
     *
     */
    public move_origin_text(anchor : Anchor) : Diagram {
        let newd = this.copy_if_not_mutable();
        if (this.type == DiagramType.Text || this.type == DiagramType.MultilineText) {
            newd = newd.__move_origin_text(anchor);
        } else if (this.type == DiagramType.Diagram) {
            //newd.children = newd.children.map(c => c.move_origin_text(anchor));
            for (let i = 0; i < newd.children.length; i++)
                newd.children[i] = newd.children[i].move_origin_text(anchor);
        } else {
            // do nothing
        }
        return newd;
    }

    public path_length() : number {
        if (this.type == DiagramType.Diagram) {
            let length = 0;
            for (let c = 0; c < this.children.length; c++) {
                length += this.children[c].path_length();
            }
            return length;
        } else if (this.type == DiagramType.Curve || this.type == DiagramType.Polygon) {
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.length();
        } else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }
    
    /**
    * Reverse the order of the points in the path
    */
    public reverse_path() {
        let newd = this.copy_if_not_mutable();
        if (newd.path) {
            newd.path = newd.path?.reverse();
        }
        return newd;
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
            for (let c = 0; c < this.children.length; c++) {
                length += this.children[c].path_length();
                cumuative_length.push(length);
            }
            let total_length = length;
            let cumulative_t = cumuative_length.map(l => l / total_length);

            // figure out which children t is in
            for (let i = 0; i < cumulative_t.length; i++) {
                if (t <= cumulative_t[i]) {
                    let child_id = i;

                    let prev_t = (i == 0) ? 0 : cumulative_t[i-1];
                    let segment_t = (t - prev_t) / (cumulative_t[i] - prev_t);
                    return this.children[child_id].parametric_point(segment_t);
                }
            }
            throw Error("Unreachable");
        } else if (this.type == DiagramType.Curve) {
            // get the point on the path
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.parametric_point(t, false, segment_index);
        } else if (this.type == DiagramType.Polygon) {
            // get the point on the path
            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            return this.path.parametric_point(t, true, segment_index);
        } else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }

    public debug_bbox() : Diagram {
        // TODO : let user supply the styling function
        let style_bbox = (d : Diagram) => {
            return d.fill('none').stroke('gray').strokedasharray([5,5])
        };

        let [min, max] = this.bounding_box();
        let rect_bbox = polygon([
            new Vector2(min.x, min.y), new Vector2(max.x, min.y), 
            new Vector2(max.x, max.y), new Vector2(min.x, max.y)
        ]).apply(style_bbox);

        let origin_x = text('+').position(this.origin)

        return rect_bbox.combine(origin_x);
    }

    public debug(show_index : boolean = true) : Diagram {
        // TODO : let user supply the styling function
        let style_path = (d : Diagram) => {
            return d.fill('none').stroke('red').strokedasharray([5,5])
        };
        let style_index = (d : Diagram) => {
            let bg = d.textfill('white').textstroke('white').textstrokewidth(5);
            let dd = d.fill('black');
            return bg.combine(dd);
        };

        // handle each type separately
        if (this.type == DiagramType.Diagram) {
            return this.debug_bbox();
        } 
        else if (this.type == DiagramType.Text){
            // return empty at diagram origin
            return empty(this.origin);
        }
        else if (this.type == DiagramType.Polygon || this.type == DiagramType.Curve 
            || this.type == DiagramType.Image){
            let f_obj = this.type == DiagramType.Polygon || DiagramType.Image ? polygon : curve;

            let deb_bbox = this.debug_bbox();

            if (this.path == undefined) { throw new Error(this.type + " must have a path"); }
            let deb_object = f_obj(this.path.points).apply(style_path);

            // if show_index is false, return only the bbox and polygon
            if (show_index == false) { return deb_bbox.combine(deb_object); }

            // iterate for all path points
            let points = this.path.points;
            // let point_texts = points.map((p, i) => text(i.toString()).position(p).apply(style_index));
            let point_texts : Diagram[] = [];
            let prev_point : Vector2 | undefined = undefined;

            let [min, max] = this.bounding_box();
            let minimum_dist_tolerance = Math.min(max.x - min.x, max.y - min.y) / 10;
            for (let i = 0; i < points.length; i++) {
                // push to point_texts only if far enough from prev_point
                let dist_to_prev = prev_point == undefined ? Infinity : points[i].sub(prev_point).length();
                if (dist_to_prev < minimum_dist_tolerance) continue;

                point_texts.push(text(i.toString()).position(points[i]).apply(style_index));
                prev_point = points[i];
            }

            return deb_bbox.combine(deb_object,...point_texts);
        }
        else {
            throw new Error("Unreachable, unknown diagram type : " + this.type);
        }
    }
}

export class Path {
    mutable : boolean = false;
    constructor(public points : Vector2[]) { }

    copy() : Path {
        let newpoints = this.points.map(p => new Vector2(p.x,p.y));
        return new Path(newpoints);
    }
    copy_if_not_mutable() : Path {
        return this.mutable ? this : this.copy();
    }
    
    /**
    * Reverse the order of the points in the path
    */
    public reverse() : Path {
        let newp : Path = this.copy_if_not_mutable();
        newp.points = newp.points.reverse();
        return newp;
    }

    /**
     * Get the length of the path
     */
    public length() : number {
        let length = 0;
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
        let newp : Path = this.copy_if_not_mutable();
        newp.points = newp.points.concat(points);
        return newp;
    }

    /**
     * Get the point on the path at t 
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path starts at t=0 and ends at t=1
     * @param t parameter
     * @param closed if true, the path is closed
     * @param segment_index 
     * If `segment_index` (n) is defined, get the point at the nth segment.
     * If `segment_index` (n) is defined, t can be outside of [0, 1] and will return the extrapolated point.
     * @returns the position of the point
    */
    public parametric_point(t : number, closed : boolean = false, segment_index? : number) : Vector2 {
        let extended_points = this.points;
        if (closed) extended_points = this.points.concat(this.points[0]);
        // for a closed path, there's an extra segment connecting the last point to the first point

        if (segment_index == undefined) { 
            if (t < 0 || t > 1) { throw Error("t must be between 0 and 1"); }
            // use entire length
            let cumulative_length = [];
            let length   = 0.0;
            for (let i = 1; i < extended_points.length; i++) {
                length += extended_points[i].sub(extended_points[i-1]).length();
                cumulative_length.push(length);
            }
            let total_length = length;
            let cumulative_t = cumulative_length.map(l => l / total_length);
            // figure out which segment t is in
            for (let i = 0; i < cumulative_t.length; i++) {
                if (t <= cumulative_t[i]) {
                    let segment_id = i;

                    let prev_t = (i == 0) ? 0 : cumulative_t[i-1];
                    let segment_t = (t - prev_t) / (cumulative_t[i] - prev_t);
                    return this.parametric_point(segment_t, closed, segment_id);
                }
            }
            // segment must have been retrieved at this point
            throw Error("Unreachable");
        } else {
            // take nth segment
            if (segment_index < 0 || segment_index > extended_points.length - 1) { 
                throw Error("segment_index must be between 0 and n-1"); 
            }
            let start = extended_points[segment_index];
            let end   = extended_points[segment_index + 1];
            let dir : Vector2 = end.sub(start);
            return start.add(dir.scale(t));
        }
    }

    /**
     * Tranfrom the path by a function
     * @param transform_function function to transform the path
     */
    public transform(transform_function : (p : Vector2) => Vector2) : Path {
        let newp : Path = this.copy_if_not_mutable();
        // transform all the points
        // newp.points = newp.points.map(p => transform_function(p));
        for (let i = 0; i < newp.points.length; i++) newp.points[i] = transform_function(newp.points[i]);
        return newp;
    }
}

/**
 * Combine multiple diagrams into one diagram
 * @param diagrams list of diagrams to combine
 * @returns a diagram
 */
export function diagram_combine(...diagrams : Diagram[]) : Diagram {
    if (diagrams.length == 0) { return empty(); }
    let newdiagrams = diagrams.map(d => d.copy_if_not_mutable());

    // check if all children is mutable
    // if they are, then set the new diagram to be mutable
    let all_children_mutable = true;
    for (let i = 0; i < newdiagrams.length; i++) {
        if (!newdiagrams[i].mutable) { 
            all_children_mutable = false; 
            break; 
        }
    }

    let newd = new Diagram(DiagramType.Diagram, {children : newdiagrams});
    newd.mutable = all_children_mutable;
    return newd.move_origin(diagrams[0].origin);
    // return newd.move_origin(Anchor.CenterCenter);
    // i think it's better to keep the origin at the origin of the first diagram
}

// ====== function helpers to create primitives =========


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
 * Create a line from start to end 
 * @param start start point
 * @param end end point
 * @returns a line diagram
 */
export function line(start : Vector2, end : Vector2) : Diagram {
    return curve([start, end]).append_tags(TAG.LINE);
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
export function empty(v : Vector2 = V2(0,0)) : Diagram {
    let emp = curve([v])
    return emp;
}

/**
 * Create a text diagram
 * @param str text to display
 * @returns a text diagram
 */
export function text(str : string) : Diagram {
    let dtext = new Diagram(DiagramType.Text, {
        textdata : { text : str, "font-size" : DEFAULT_FONTSIZE },
        path : new Path([new Vector2(0, 0)]),
    });
    return dtext;
}

/**
 * Create an image diagram
 * @param src image source
 * @param width width of the image
 * @param height height of the image
 * @returns an image diagram
 */
export function image(src : string, width : number, height: number){
    let imgdata : ImageData = { src }
    // path: bottom-left, bottom-right, top-right, top-left
    let path    : Path      = new Path([
        V2(-width/2, -height/2), V2(width/2, -height/2),
        V2(width/2, height/2), V2(-width/2, height/2),
    ]);
    let img = new Diagram(DiagramType.Image, {imgdata : imgdata, path : path});
    return img;
}

/**
 * Create a multiline text diagram
 * @param strs list of text to display
 */
export function multiline(spans : ([string] | [string,Partial<TextData>])[]) : Diagram {
    let tspans : TextSpanData[] = [];
    for (let i = 0; i < spans.length; i++) {
        let text = spans[i][0];
        let style = spans[i][1] ?? {};
        tspans.push({text, style});
    }
    let dmulti = new Diagram(DiagramType.MultilineText, {
        multilinedata : { content : tspans, "scale-factor" : 1 },
        path : new Path([new Vector2(0, 0)]),
    });
    return dmulti;
}

export function multiline_bb(bbstr : string, linespace? : string) : Diagram {
    let tspans : TextSpanData[] = BB_multiline.from_BBCode(bbstr,linespace) as TextSpanData[];
    let dmulti = new Diagram(DiagramType.MultilineText, {
        multilinedata : { content : tspans, "scale-factor" : 1 },
        path : new Path([new Vector2(0, 0)]),
    });
    return dmulti;
}


// END primitives =============================

export function diagram_from_jsonstring(str : string) : Diagram {
    try {
        // turn str into JSON object
        let d : Diagram = JSON.parse(str);
        // turn d into Diagram
        Object.setPrototypeOf(d, Diagram.prototype);
        d = d.copy();
        return d;
    } catch (e) {
        // if there's a mistake, return an empty diagram
        console.warn(e);
        return empty(new Vector2(0,0));
    }
}
