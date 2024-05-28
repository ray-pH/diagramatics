import { Diagram, DiagramType, DiagramStyle, TextData, DEFAULT_FONTSIZE } from "./diagram.js";
import { tab_color, get_color } from "./color_palette.js";
import { to_degree, expand_directional_value } from "./utils.js";
import { str_to_mathematical_italic, str_to_normal_from_mathematical_italic } from './unicode_utils.js'
import { TAG } from "./tag_names.js";

// TODO : add guard for the dictionary key
// since the implementation is using `for (let stylename in style)` without checking
// if the correct key is in the dictionary, it can lead to unintended behavior
// for example, `font-size` could be defined in default_text_diagram_style
// and will shadow the `font-size` in default_diagram_style

export const default_diagram_style : DiagramStyle = {
    "fill"             : "none",
    "stroke"           : "black",
    "stroke-width"     : "1",
    "stroke-linecap"   : "butt",
    "stroke-dasharray" : "none",
    "stroke-linejoin"  : "round",
    "vector-effect"    : "non-scaling-stroke",
    "opacity"          : "1",
}
export const _init_default_diagram_style : DiagramStyle = {...default_diagram_style}

export const default_text_diagram_style : DiagramStyle = {
    "fill"             : "black",
    "stroke"           : "none",
    "stroke-width"     : "1",
    "stroke-linecap"   : "butt",
    "stroke-dasharray" : "none",
    "stroke-linejoin"  : "round",
    "vector-effect"    : "non-scaling-stroke",
    "opacity"          : "1",
}
export const _init_default_text_diagram_style : DiagramStyle = {...default_text_diagram_style}

export const default_textdata : TextData = {
    "text"             : "",
    "font-family"      : "Latin Modern Math, sans-serif",
    "font-size"        : DEFAULT_FONTSIZE,
    "font-weight"      : "normal",
    "text-anchor"      : "middle",
    "dy"               : "0.25em",
    "angle"            : "0",
    "font-style"       : "normal",
    "font-scale"       : "auto",
}
export const _init_default_textdata : TextData = {...default_textdata}

export function reset_default_styles() : void {
    for (let s in default_diagram_style) 
        (default_diagram_style as any)[s] = (_init_default_diagram_style as any)[s];
    for (let s in default_text_diagram_style)
        (default_text_diagram_style as any)[s] = (_init_default_text_diagram_style as any)[s];
    for (let s in default_textdata)
        (default_textdata as any)[s] = (_init_default_textdata as any)[s];
}

function draw_polygon(svgelement : SVGSVGElement, diagram : Diagram, svgtag? : string) : void {
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = get_color(style.fill as string, tab_color);
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    for (let stylename in style) {
        polygon.style[stylename as any] = (style as any)[stylename as any];
    }
    if (svgtag != undefined) polygon.setAttribute("_dg_tag", svgtag);
    // polygon.style.fill = color_fill;
    // polygon.style.stroke = color_stroke;
    // use tab_color color palette

    svgelement.appendChild(polygon);
    if (diagram.path != undefined) {
        for (let i = 0; i < diagram.path.points.length; i++) {
            let p = diagram.path.points[i];
            var point = svgelement.createSVGPoint();
            point.x =  p.x;
            point.y = -p.y;
            polygon.points.appendItem(point);
        }
    }
}


function draw_curve(svgelement : SVGSVGElement, diagram : Diagram, svgtag? : string) : void {
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = "none";
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    for (let stylename in style) {
        polyline.style[stylename as any] = (style as any)[stylename as any];
    }
    if (svgtag != undefined) polyline.setAttribute("_dg_tag", svgtag);

    svgelement.appendChild(polyline);
    if (diagram.path != undefined) {
        for (let i = 0; i < diagram.path.points.length; i++) {
            let p = diagram.path.points[i];
            var point = svgelement.createSVGPoint();
            point.x =  p.x;
            point.y = -p.y;
            polyline.points.appendItem(point);
        }
    }
}


function is_dataURL(url : string) : boolean {
    // Regular expression to check for data URL
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/;
    return dataUrlPattern.test(url);
}

const _IMAGE_DATAURL_CACHE_MAP = new Map<string, string|undefined>();

/**
 * Convert image href to data url
 * This is necessary so that the image diagram can be downloaded as png
 */
function set_image_href_dataURL(img : SVGImageElement, src : string) : void{
    // if it is already a dataURL, just set it
    if (is_dataURL(src)) {
        img.setAttribute("href", src);
        img.setAttribute("xlink:href", src);
        return;
    }
    
    // if it's already cached, just set it
    if (_IMAGE_DATAURL_CACHE_MAP.has(src)){
        const dataURL = _IMAGE_DATAURL_CACHE_MAP.get(src)!;
        if (!dataURL) return; 
        // dataURL can be undefined, indicating it's still loading or
        // the image is not found
        img.setAttribute("href", dataURL);
        img.setAttribute("xlink:href", dataURL);
        return;
    }
    
    // _IMAGE_DATAURL_CACHE_MAP.set(src, undefined);
    let canvas    = document.createElement("canvas");
    let ctx       = canvas.getContext('2d');

    let base_image = new Image();
    base_image.crossOrigin = "anonymous";
    base_image.onload = () => {
        canvas.height = base_image.height;
        canvas.width  = base_image.width;
        ctx?.drawImage(base_image, 0, 0);

        // NOTE : we need to set both href and xlink:href for compatibility reason
        // most browser already deprecate xlink:href because of SVG 2.0
        // but other browser and image viewer/editor still only support xlink:href
        // might be removed in the future
        const dataURL = canvas.toDataURL("image/png");
        img.setAttribute("href", dataURL);
        img.setAttribute("xlink:href", dataURL);
        _IMAGE_DATAURL_CACHE_MAP.set(src, dataURL);
        canvas.remove();
    }
    base_image.src = src;

}

/**
 * if `embed_image` is `true`, the image will be embedded as dataURL
 * this allow the image to be downloaded as SVG with the image embedded
 */
function draw_image(svgelement : SVGSVGElement, diagram : Diagram, embed_image : boolean, svgtag? : string) : void {
    let image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    if (diagram.imgdata.src == undefined) return;
    // make sure path is defined and have 4 points
    if (diagram.path == undefined) return;
    if (diagram.path.points.length != 4) return;

    // it's calculated like this to be able to apply linear transformation
    // path: bottom-left, bottom-right, top-right, top-left
    // width  : 0-1
    // height : 1-2
    let width  = diagram.path.points[1].sub(diagram.path.points[0]).length();
    let height = diagram.path.points[2].sub(diagram.path.points[1]).length();
    
    // calculate the linear transformation matrix
    // [ a c ]
    // [ b d ]
    let ex = diagram.path.points[1].sub(diagram.path.points[0]).normalize();
    let ey = diagram.path.points[3].sub(diagram.path.points[0]).normalize();
    let a =  ex.x; let b = -ex.y;
    let c = -ey.x; let d =  ey.y;

    let xpos = diagram.path.points[3].x;
    let ypos = -diagram.path.points[3].y;

    if (embed_image) {
        set_image_href_dataURL(image, diagram.imgdata.src);
    } else {
        image.setAttribute("href", diagram.imgdata.src);
    }
    image.setAttribute("width", width.toString());
    image.setAttribute("height", height.toString());
    image.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} ${xpos} ${ypos})`);
    image.setAttribute("preserveAspectRatio", "none");
    if (svgtag != undefined) image.setAttribute("_dg_tag", svgtag);

    svgelement.appendChild(image);
}

/**
 * Collect all DiagramType.Text in the diagram
 * @param diagram the outer diagram
 * @returns a list of DiagramType.Text
*/
function collect_text(diagram : Diagram, type : DiagramType.Text | DiagramType.MultilineText) : Diagram[] {
    if (diagram.type == type) {
        return [diagram];
    } else if (diagram.type == DiagramType.Diagram) {
        let result : Diagram[] = [];
        for (let d of diagram.children) {
            result = result.concat(collect_text(d, type));
        }
        return result;
    } else {
        return [];
    }
}

/** Calculate the scaling factor for the text based on the reference svg element */
export function calculate_text_scale(referencesvgelement : SVGSVGElement, padding? : [number, number, number, number]) : number {
    const pad = expand_directional_value(padding ?? 0)
    let bbox = referencesvgelement.getBBox();
    let refsvgelement_width = referencesvgelement.width.baseVal.value - pad[1] - pad[3];
    let refsvgelement_height = referencesvgelement.height.baseVal.value - pad[0] - pad[2];
    return Math.max(bbox.width / refsvgelement_width, bbox.height / refsvgelement_height)
}

/**
 * @param svgelement the svg element to draw to
 * @param diagrams the list of text diagrams to draw
 * @param calculated_scale the calculated scale for the text
 */
function draw_texts(svgelement : SVGSVGElement, diagrams : Diagram[], 
    calculated_scale : number, svgtag? : string) : void {
    for (let diagram of diagrams) {
        let style = {...default_text_diagram_style, ...diagram.style}; // use default if not defined
        style.fill = get_color(style.fill as string, tab_color);
        style.stroke = get_color(style.stroke as string, tab_color);

        let textdata = {...default_textdata, ...diagram.textdata}; // use default if not defined
        if (diagram.path == undefined) { throw new Error("Text must have a path"); }
        // draw svg of text
        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        // text.setAttribute("x", diagram.path.points[0].x.toString());
        // text.setAttribute("y", (-diagram.path.points[0].y).toString());
        let xpos = diagram.path.points[0].x;
        let ypos = -diagram.path.points[0].y;
        let angle_deg = to_degree(parseFloat(textdata["angle"] as string));

        let scale = textdata["font-scale"] == "auto" ? 
            calculated_scale : parseFloat(textdata["font-scale"] as string);
        let font_size = parseFloat(textdata["font-size"] as string) * scale;

        // set font styles (font-family, font-size, font-weight)
        text.setAttribute("font-family", textdata["font-family"] as string);
        text.setAttribute("font-style", textdata["font-style"] as string);
        text.setAttribute("font-size", font_size.toString());
        text.setAttribute("font-weight", textdata["font-weight"] as string);
        text.setAttribute("text-anchor", textdata["text-anchor"] as string);
        text.setAttribute("dy", textdata["dy"] as string);
        // text.setAttribute("dominant-baseline", textdata["dominant-baseline"] as string);
        text.setAttribute("transform", `translate(${xpos} ${ypos}) rotate(${angle_deg}) `);
        if (svgtag != undefined) text.setAttribute("_dg_tag", svgtag);

        // custom attribute for tex display
        text.setAttribute("_x", xpos.toString());
        text.setAttribute("_y", ypos.toString());
        text.setAttribute("_angle", angle_deg.toString());
        
        for (let stylename in style) {
            text.style[stylename as any] = (style as any)[stylename as any];
        }

        // set the content of the text
        let text_content = textdata["text"];
        if (diagram.tags.includes(TAG.TEXTVAR) && !is_texstr(text_content)) 
            text_content = str_to_mathematical_italic(text_content);
        text.innerHTML = text_content;

        // add to svgelement
        svgelement.appendChild(text);
    }
}

/**
 * @param svgelement the svg element to draw to
 * @param diagrams the list of text diagrams to draw
 * @param calculated_scale the calculated scale for the text
 */
function draw_multiline_texts(svgelement : SVGSVGElement, diagrams : Diagram[], 
    calculated_scale : number, svgtag? : string) : void {
    for (let diagram of diagrams) {
    //     let style = {...default_text_diagram_style, ...diagram.style}; // use default if not defined
    //     style.fill = get_color(style.fill as string, tab_color);
    //     style.stroke = get_color(style.stroke as string, tab_color);
    //
    //     let textdata = {...default_textdata, ...diagram.textdata}; // use default if not defined
        if (diagram.path == undefined) { throw new Error("Text must have a path"); }
        // draw svg of text
        let textsvg = document.createElementNS("http://www.w3.org/2000/svg", "text");
        let xpos = diagram.path.points[0].x;
        let ypos = -diagram.path.points[0].y;
        // let angle_deg = to_degree(parseFloat(textdata["angle"] as string));
        let angle_deg = 0;


        // use default if not defined
        let textdata = {...default_textdata, ...{dy:"0", "text-anchor":"start"}, ...diagram.textdata}; 
        let diagram_font_size = textdata["font-size"];


        if (diagram.multilinedata?.content == undefined) { throw new Error("MultilineText must have multilinedata"); }
        // let current_line : number = 0;
        let dg_scale_factor = diagram.multilinedata["scale-factor"] ?? 1;
        let is_firstline : boolean = true;
        let is_in_front  : boolean = true;
        let newline_dy   : string  = "1em";
        for (let tspandata of diagram.multilinedata.content) {

            if (tspandata.text == "\n") { 
                is_in_front = true; 
                newline_dy = tspandata.style['dy'] ?? "1em";
                continue; 
            }

            // create tspan for each tspandata
            let tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");

            let not_setting_dy = (tspandata.style['dy'] == undefined)
            let tspanstyle = {
                ...default_text_diagram_style, 
                ...textdata,
                ...{dy : "0", dx : "0"}, 
                ...{"font-size" : diagram_font_size},
                ...tspandata.style
            };

            if (is_in_front) {
                tspan.setAttribute("x", "0");
                let textdata_dy = textdata["dy"] as string ?? "0";
                if (not_setting_dy) tspanstyle.dy = is_firstline ? textdata_dy : newline_dy;
                is_in_front = false;
            }

            let scale = tspanstyle["font-scale"] == "auto" ? 
                calculated_scale : parseFloat(tspanstyle["font-scale"] as string);
            let font_size = parseFloat(tspanstyle["font-size"] as string) * scale * dg_scale_factor;

            if (tspanstyle["tag"]) tspan.setAttribute("_dg_tag", tspanstyle["tag"] as string);

            tspan.style.whiteSpace = "pre";
            // if we do style.whiteSpace in `textsvg`, it doesnt work in Apple's webkit
            tspan.setAttribute("dx", tspanstyle.dx as string);
            tspan.setAttribute("dy", tspanstyle.dy as string);
            tspan.setAttribute("font-style", tspanstyle["font-style"] as string);
            tspan.setAttribute("font-family", tspanstyle["font-family"] as string);
            // tspan.setAttribute("font-size", tspanstyle["font-size"] as string);
            tspan.setAttribute("font-size", font_size.toString());
            tspan.setAttribute("font-weight", tspanstyle["font-weight"] as string);
            // tspan.setAttribute("text-anchor", tspanstyle["text-anchor"] as string);
            tspan.style["fill"] = get_color(tspanstyle.fill as string, tab_color);
            tspan.style["stroke"] = get_color(tspanstyle.stroke as string, tab_color);
            tspan.style["opacity"] = tspanstyle.opacity as string;

            let text = tspandata.text;
            if (tspanstyle["textvar"]) text = str_to_mathematical_italic(text);
            tspan.innerHTML = text;
            textsvg.appendChild(tspan);

            is_firstline = false;
        }

        //
        // let scale = textdata["font-scale"] == "auto" ? 
        //     calculated_scale : parseFloat(textdata["font-scale"] as string);
        // let font_size = parseFloat(textdata["font-size"] as string) * scale;
        //
        // // set font styles (font-family, font-size, font-weight)
        // text.setAttribute("font-family", textdata["font-family"] as string);
        // text.setAttribute("font-size", font_size.toString());
        // text.setAttribute("font-weight", textdata["font-weight"] as string);
        // text.setAttribute("text-anchor", textdata["text-anchor"] as string);
        // // text.setAttribute("dominant-baseline", textdata["dominant-baseline"] as string);
        textsvg.setAttribute("dy", textdata["dy"] as string);
        textsvg.setAttribute("text-anchor", textdata["text-anchor"] as string);
        textsvg.setAttribute("transform", `translate(${xpos} ${ypos}) rotate(${angle_deg}) `);
        if (svgtag != undefined) textsvg.setAttribute("_dg_tag", svgtag);
        //
        // // custom attribute for tex display
        // text.setAttribute("_x", xpos.toString());
        // text.setAttribute("_y", ypos.toString());
        // text.setAttribute("_angle", angle_deg.toString());
        // 
        // for (let stylename in style) {
        //     text.style[stylename as any] = (style as any)[stylename as any];
        // }
        //
        // // set the content of the text
        // let text_content = textdata["text"];
        // if (diagram.tags.includes('textvar') && !is_texstr(text_content)) 
        //     text_content = str_to_mathematical_italic(text_content);
        // text.innerHTML = text_content;
        //
        // // add to svgelement
        svgelement.appendChild(textsvg);
    }
}

/**
 * Get all svg elements with a specific tag
 * @param svgelement the svg element to search
 * @param tag the tag to search
 * @returns a list of svg elements with the tag
 */
export function get_tagged_svg_element(tag : string, svgelement : SVGElement) : SVGElement[] {
    let result : SVGElement[] = [];
    for (let i in svgelement.children) {
        let child = svgelement.children[i];
        if (!(child instanceof SVGElement)) continue;
        if (child.getAttribute("_dg_tag") == tag) {
            result.push(child);
        }
        // recurse through all children
        if (child.children?.length) {
            result = result.concat(get_tagged_svg_element(tag, child));
        }
    }
    return result;
}

/**
 * @param svgelement the svg element to draw to
 * @param diagram the diagram to draw
 * @param render_text whether to render text
 * @param embed_image (optional) whether to embed images
 * this allow the image to be downloaded as SVG with the image embedded
 * @param text_scaling_factor (optional) the scaling factor for text
 * @param svgtag (optional) the tag to add to the svg element
 */
export function f_draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram, render_text : boolean = true, embed_image : boolean = false,
    text_scaling_factor? : number, svgtag? : string) : void {
    
    if (diagram.type == DiagramType.Polygon) {
        draw_polygon(svgelement, diagram, svgtag);
    } else if (diagram.type == DiagramType.Curve){
        draw_curve(svgelement, diagram, svgtag);
    } else if (diagram.type == DiagramType.Text || diagram.type == DiagramType.MultilineText){
        // do nothing
    } else if (diagram.type == DiagramType.Image){
        draw_image(svgelement, diagram, embed_image, svgtag);
    } else if (diagram.type == DiagramType.Diagram){
        for (let d of diagram.children) {
            f_draw_to_svg(svgelement, d, false, embed_image, undefined, svgtag);
        }
    } else {
        console.warn("Unreachable, unknown diagram type : " + diagram.type);
    }

    // draw text last to make the scaling works
    // because the text is scaled based on the bounding box of the svgelement
    if (render_text) {
        if (text_scaling_factor == undefined){
            text_scaling_factor = calculate_text_scale(svgelement);
        }
        let text_diagrams      : Diagram[] = collect_text(diagram, DiagramType.Text);
        let multiline_diagrams : Diagram[] = collect_text(diagram, DiagramType.MultilineText);
        draw_texts(svgelement, text_diagrams, text_scaling_factor ?? 1, svgtag);
        draw_multiline_texts(svgelement, multiline_diagrams, text_scaling_factor ?? 1, svgtag);
    }
    
}

/**
 * WARNING: DEPRECATED
 * use `draw_to_svg_element` instead
 *
 * Draw a diagram to an svg element
 * @param outer_svgelement the outer svg element to draw to
 * @param diagram the diagram to draw
 * @param set_html_attribute whether to set the html attribute of the outer_svgelement
 * @param render_text whether to render text
 * @param clear_svg whether to clear the svg before drawing
 */
export function draw_to_svg(outer_svgelement : SVGSVGElement, diagram : Diagram,
    set_html_attribute : boolean = true, render_text : boolean = true, clear_svg : boolean = true) : void {
    let options : draw_to_svg_options = {
        set_html_attribute : set_html_attribute,
        render_text : render_text,
        clear_svg : clear_svg,
    };
    draw_to_svg_element(outer_svgelement, diagram, options);
}

export interface draw_to_svg_options {
    set_html_attribute? : boolean,
    render_text? : boolean,
    clear_svg? : boolean,
    embed_image? : boolean,
    background_color? : string,
    padding? : number | number[],
    text_scaling_reference_svg? : SVGSVGElement,
    text_scaling_reference_padding? : number | number[],
}

// TODO: replace draw_to_svg with the current draw_to_svg_element in the next major version

/**
 * Draw a diagram to an svg element
 * @param outer_svgelement the outer svg element to draw to
 * @param diagram the diagram to draw
 * @param options the options for drawing
 * ```typescript
 * options : {
 *    set_html_attribute? : boolean (true),
 *    render_text? : boolean (true),
 *    clear_svg? : boolean (true),
 *    embed_image? : boolean (false),
 *    background_color? : string (undefined),
 *    padding? : number | number[] (10),
 *    text_scaling_reference_svg? : SVGSVGElement (undefined),
 *    text_scaling_reference_padding? : number | number[] (undefined),
 * }
 * ````
 * define `text_scaling_reference_svg` and `text_scaling_reference_padding` to scale text based on another svg element
 */
export function draw_to_svg_element(outer_svgelement : SVGSVGElement, diagram : Diagram, options : draw_to_svg_options = {}) : void {
    const set_html_attribute = options.set_html_attribute ?? true;
    const render_text = options.render_text ?? true;
    const clear_svg = options.clear_svg ?? true;
    const embed_image = options.embed_image ?? false;
    
    let svgelement : SVGSVGElement | undefined = undefined;
    // check if outer_svgelement has a child with meta=diagram_svg
    for (let i in outer_svgelement.children) {
        let child = outer_svgelement.children[i];
        if (child instanceof SVGSVGElement && child.getAttribute("meta") == "diagram_svg") {
            svgelement = child;
            break;
        }
    }

    if (svgelement == undefined) {
        // if svgelemet doesn't exist yet, create it
        // create an inner svg element
        svgelement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgelement.setAttribute("meta", "diagram_svg")
        svgelement.setAttribute("width", "100%");
        svgelement.setAttribute("height", "100%");
        outer_svgelement.appendChild(svgelement);
    }

    let text_scaling_factor : number | undefined = undefined;
    if (options.text_scaling_reference_svg) {
        options.text_scaling_reference_padding = options.text_scaling_reference_padding ?? options.padding ?? 10;
        options.text_scaling_reference_padding = expand_directional_value(options.text_scaling_reference_padding);
        text_scaling_factor = calculate_text_scale(
            options.text_scaling_reference_svg,
            options.text_scaling_reference_padding as [number, number, number, number]
        );
    }
    
    // TODO : for performance, do smart clearing of svg, and not just clear everything
    if (clear_svg) svgelement.innerHTML = "";

    f_draw_to_svg(svgelement, diagram, render_text, embed_image, text_scaling_factor);

    if (set_html_attribute) {
        const pad_px = expand_directional_value(options.padding ?? 10);
        // set viewbox to the bounding box
        let bbox = svgelement.getBBox();
        // add padding of 10px to the bounding box (if the graph is small, it'll mess it up)
        // scale 10px based on the width and height of the svg
        let svg_width = svgelement.width.baseVal.value - pad_px[1] - pad_px[3];
        let svg_height = svgelement.height.baseVal.value - pad_px[0] - pad_px[2];
        let scale = Math.max(bbox.width / svg_width, bbox.height / svg_height)
        let pad = pad_px.map(p => p*scale);
        // [top, right, bottom, left]
        bbox.x -= pad[3];
        bbox.y -= pad[0];
        bbox.width += pad[1] + pad[3];
        bbox.height += pad[0] + pad[2];
        svgelement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        // set preserveAspectRatio to xMidYMid meet
        svgelement.setAttribute("preserveAspectRatio", "xMidYMid meet");
        outer_svgelement.style.overflow = "visible";
    }
    
    if (options.background_color) {
        let bbox = svgelement.getBBox();
        // if svgelement has viewBox set, use it instead of getBBox
        if (svgelement.viewBox.baseVal.width !== 0) bbox = svgelement.viewBox.baseVal;
        
        // draw a rectangle as the background
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", bbox.x.toString());
        rect.setAttribute("y", bbox.y.toString());
        rect.setAttribute("width", bbox.width.toString());
        rect.setAttribute("height", bbox.height.toString());
        rect.style.fill = get_color(options.background_color as string, tab_color);
        rect.style.stroke = "none";
        
        // prepend
        svgelement.insertBefore(rect, svgelement.firstChild);
    }
}

function is_texstr(s : string) : boolean {
    return s.startsWith("$") && s.endsWith("$");
}
function is_texdisplaystr(s : string) : boolean {
    return s.startsWith("$$") && s.endsWith("$$");
}
function strip_texstr(s : string) : string {
    if (is_texdisplaystr(s)) return s.substring(2, s.length-2);
    if (is_texstr(s)) return s.substring(1, s.length-1);
    return s;
}

type texhandler_config = {
    display : boolean,
    // fontsize : number,
}
type texhadler_function = (texstr : string, config : texhandler_config) => string; // return SVG string

/**
 * Recursively handle tex in svg
 * @param svg the svg element to handle
 * @param texhandler the tex handler function
 */
export function handle_tex_in_svg(svg : SVGElement, texhandler : texhadler_function) : void {
    // recurse through all children of svg until we find text
    // then replace the text with the svg returned by texhandler
    for (let i = 0; i < svg.children.length; i++) {
        let child = svg.children[i];
        if (child instanceof SVGTextElement) {
            let str = child.innerHTML;
            if (!is_texstr(str)) continue;

            let fontsizestr = child.getAttribute('font-size');
            if (fontsizestr == null) continue;
            let fontsize = parseFloat(fontsizestr);

            let svgstr = texhandler(strip_texstr(str), {
                display : is_texdisplaystr(str),
                // fontsize : parseFloat(fontsize),
            });

            let xstr = child.getAttribute('_x');
            let ystr = child.getAttribute('_y');
            // let angstr = child.getAttribute('_angle');
            if (xstr == null || ystr == null) continue;

            let textanchor = child.getAttribute('text-anchor');
            let dy = child.getAttribute('dy');
            if (textanchor == null || dy == null) continue;

            child.outerHTML = svgstr;
            child = svg.children[i]; // update child

            // HACK: scaling for mathjax tex2svg, for other option think about it later
            let widthexstr = child.getAttribute('width');   // ###ex
            if (widthexstr == null) continue;
            let widthex = parseFloat(widthexstr.substring(0, widthexstr.length-2));
            let heightexstr = child.getAttribute('height'); // ###ex
            if (heightexstr == null) continue;
            let heightex = parseFloat(heightexstr.substring(0, heightexstr.length-2));

            const magic_number = 2;
            let width = widthex * fontsize / magic_number;
            let height = heightex * fontsize / magic_number;

            let xval = parseFloat(xstr);
            let yval = parseFloat(ystr);
            switch (textanchor) {
                case "start": break; // left
                case "middle":       // center
                    xval -= width/2; break;
                case "end":          // right
                    xval -= width; break;
            }
            switch (dy) {
                case "0.75em": break; // top
                case "0.25em":                  // center
                    yval -= height/2; break;
                case "-0.25em":         // bottom
                    yval -= height; break;
            }

            child.setAttribute('width', width.toString());
            child.setAttribute('height', height.toString());
            child.setAttribute('x', xval.toString());
            child.setAttribute('y', yval.toString());
        } else if (child instanceof SVGElement) {
            handle_tex_in_svg(child, texhandler);
        }
    }
}

/**
 * Download the svg as svg file
 * @param outer_svgelement the outer svg element to download
 */
export function download_svg_as_svg(outer_svgelement : SVGSVGElement) : void {
    let inner_svgelement = outer_svgelement.querySelector("svg[meta=diagram_svg]") as SVGSVGElement | null;
    if (inner_svgelement == null) { console.warn("Cannot find svg element"); return; }
    let locator_svgelement = outer_svgelement.querySelector("svg[meta=control_svg]") as SVGSVGElement | null;

    let svgelement = inner_svgelement;
    // concat locator_svgelement to the copy of inner_svgelement
    if (locator_svgelement != null) {  
        let copy_inner_svgelement = inner_svgelement.cloneNode(true) as SVGSVGElement;
        for (let i in locator_svgelement.children) {
            let child = locator_svgelement.children[i];
            if (!(child instanceof SVGSVGElement)) continue;
            copy_inner_svgelement.appendChild(child.cloneNode(true));
        }
        svgelement = copy_inner_svgelement;
    }

    // get svg string
    let svg_string = new XMLSerializer().serializeToString(svgelement);
    let blob = new Blob([svg_string], {type: "image/svg+xml"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "diagramatics.svg";
    a.click();
}

/**
 * Download the svg as png file
 * @param outer_svgelement the outer svg element to download
 */
export function download_svg_as_png(outer_svgelement : SVGSVGElement) {
    let inner_svgelement = outer_svgelement.querySelector("svg[meta=diagram_svg]") as SVGSVGElement | null;
    if (inner_svgelement == null) { console.warn("Cannot find svg element"); return; }
    let svgelem = outer_svgelement;

    let svg_string = new XMLSerializer().serializeToString(svgelem);
    let svg_blob = new Blob([svg_string], {type: "image/svg+xml"});

    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svg_blob);

    const image = new Image();
    image.width = svgelem.width.baseVal.value;
    image.height = svgelem.height.baseVal.value;
    image.src = url;
    image.onload = function() {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(image, 0, 0);
        DOMURL.revokeObjectURL(url);

        const imgURI = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const a = document.createElement("a");
        a.href = imgURI;
        a.download = "diagramatics.png";
        a.click();
    }
}
