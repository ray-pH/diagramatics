import { Diagram, DiagramType } from './diagram.js';
import { str_to_mathematical_italic } from './unicode_utils.js'
import { Vector2, V2 } from './vector.js';
import { get_color, tab_color } from './color_palette.js';

function format_number(val : number, prec : number) {
    let fixed = val.toFixed(prec);
    // remove trailing zeros
    // and if the last character is a dot, remove it
    return fixed.replace(/\.?0+$/, "");
}
export type formatFunction = (name : string, value : any, prec? : number) => string;
const defaultFormat_f : formatFunction = (name : string, val : any, prec? : number) => {
    let val_str = (typeof val == 'number' && prec != undefined) ? format_number(val,prec) : val.toString();
    return `${str_to_mathematical_italic(name)} = ${val_str}`;
}

type inpVariables_t = {[key : string] : any};
type inpSetter_t    = {[key : string] : (_ : any) => void };
/**
 * Object that controls the interactivity of the diagram
 */
export class Interactive {
    public inp_variables : inpVariables_t = {};
    public inp_setter    : inpSetter_t = {};
    public display_mode  : "svg" | "canvas" = "svg";

    private locatorHandler? : LocatorHandler = undefined;
    private dragAndDropHandler? : DragAndDropHandler = undefined;
    // no support for canvas yet

    public draw_function : (inp_object : inpVariables_t, setter_object? : inpSetter_t) => any 
        = (_) => {};
    public display_precision : undefined | number = 5;
    intervals : {[key : string] : any} = {};         

    /**
     * @param control_container_div the div that contains the control elements
     * @param diagram_outer_svg the svg element that contains the diagram
     * \* _only needed if you want to use the locator_
     * @param inp_object_ the object that contains the variables
     * \* _only needed if you want to use custom input object_
     */
    constructor(
        public control_container_div : HTMLElement, 
        public diagram_outer_svg? : SVGSVGElement,
        inp_object_? : {[key : string] : any}
    ){
        if (inp_object_ != undefined){ this.inp_variables = inp_object_; }
    }

    public draw() : void {
        this.draw_function(this.inp_variables, this.inp_setter);
    }

    public set(variable_name : string, val : any) : void {
        this.inp_setter[variable_name](val);
    }
    public get(variable_name : string) : any {
        return this.inp_variables[variable_name];
    }

    public label(variable_name : string, value : any, display_format_func : formatFunction = defaultFormat_f){

        let labeldiv = document.createElement('div');
        labeldiv.classList.add("diagramatics-label");
        labeldiv.innerHTML = display_format_func(variable_name, value, this.display_precision);

        this.inp_variables[variable_name] = value;

        // setter ==========================
        const setter = (val : any) => {
            this.inp_variables[variable_name] = val;
            labeldiv.innerHTML = display_format_func(variable_name, val, this.display_precision);
        }
        this.inp_setter[variable_name] = setter;

        // ==============================
        // add components to div
        //
        // <div class="diagramatics-label-container">
        //     <div class="diagramatics-label"></div>
        // </div>
        
        let container = document.createElement('div');
        container.classList.add("diagramatics-label-container");
        container.appendChild(labeldiv);

        this.control_container_div.appendChild(container);
    }


    public locator_draw(){
        this.locatorHandler?.setViewBox();
    }
    public drag_and_drop_draw(){
        this.dragAndDropHandler?.setViewBox();
    }

    get_svg_element(element : 'locator' | 'dnd') : [SVGSVGElement, SVGSVGElement] {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg : SVGSVGElement | undefined = undefined;
        // check if this.diagram_outer_svg has a child with meta=control_svg
        // if not, create one
        let control_svg : SVGSVGElement | undefined = undefined;
        for (let i in this.diagram_outer_svg.children) {
            let child = this.diagram_outer_svg.children[i];
            if (child instanceof SVGSVGElement && child.getAttribute("meta") == "control_svg") {
                control_svg = child;
            }
            // while looping, also find the diagram_svg
            if (child instanceof SVGSVGElement && child.getAttribute("meta") == "diagram_svg") {
                diagram_svg = child;
            }
        }

        if (diagram_svg == undefined) {
            diagram_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            diagram_svg.setAttribute("meta", "diagram_svg")
            diagram_svg.setAttribute("width", "100%");
            diagram_svg.setAttribute("height", "100%");
            this.diagram_outer_svg.appendChild(diagram_svg);
        }

        if (control_svg == undefined) {
            control_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            control_svg.setAttribute("meta", "control_svg");
            control_svg.setAttribute("width", "100%");
            control_svg.setAttribute("height", "100%");
            this.diagram_outer_svg.appendChild(control_svg);
        }

        return [diagram_svg, control_svg];
    }

    /**
     * Create a locator
     * Locator is a draggable object that contain 2D coordinate information
     * @param variable_name name of the variable
     * @param value initial value
     * @param radius radius of the locator draggable object
     * @param color color of the locator
     * @param track_diagram if provided, the locator will snap to the closest point on the diagram
     */
    public locator(variable_name : string, value : Vector2, radius : number, color : string = 'blue', track_diagram? : Diagram, blink : boolean = true){
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        this.inp_variables[variable_name] = value;

        let [diagram_svg, control_svg] = this.get_svg_element('locator');
        // if this is the fist time this function is called, create a locatorHandler
        if (this.locatorHandler == undefined) {
            let locatorHandler = new LocatorHandler(control_svg, diagram_svg);
            this.locatorHandler = locatorHandler;
            this.diagram_outer_svg.addEventListener('mousemove'  , (evt) => { locatorHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('mouseup'    , (evt) => { locatorHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchmove'  , (evt) => { locatorHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('touchend'   , (evt) => { locatorHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchcancel', (evt) => { locatorHandler.endDrag(evt); });
        }


        // ============== callback
        const callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[variable_name] = pos;
            if (redraw) this.draw();
        }
        this.locatorHandler.registerCallback(variable_name, callback);

        // ============== Circle element

        let locator_svg = create_locator_pointer_svg(radius, value, color, blink);
        if(blink){
            // store the circle_outer into the LocatorHandler so that we can turn it off later
            let blinking_outers = locator_svg.getElementsByClassName("diagramatics-locator-blink");
            for (let i = 0; i < blinking_outers.length; i++)
                (this.locatorHandler as LocatorHandler).addBlinkingCircleOuter(blinking_outers[i])
        }
        locator_svg.addEventListener('mousedown', (evt) => { 
            (this.locatorHandler as LocatorHandler).startDrag(evt, variable_name, locator_svg);
        });
        locator_svg.addEventListener('touchstart', (evt) => { 
            (this.locatorHandler as LocatorHandler).startDrag(evt, variable_name, locator_svg);
        });
        control_svg.appendChild(locator_svg);

        // =============== setter
        let setter;
        if (track_diagram) {
            if (track_diagram.type != DiagramType.Polygon && track_diagram.type != DiagramType.Curve)
                throw Error('Track diagram must be a polygon or curve');
            if (track_diagram.path == undefined) throw Error(`diagram {diagtam.type} must have a path`);
            let track = track_diagram.path.points;
            setter = (pos : Vector2) => {
                let coord = closest_point_from_points(pos, track);
                locator_svg.setAttributeNS(null, "x", coord.x.toString());
                locator_svg.setAttributeNS(null, "y", (-coord.y).toString());
                return coord;
            }
        }
        else{
            setter = (pos : Vector2) => {
                locator_svg.setAttributeNS(null, "x", pos.x.toString());
                locator_svg.setAttributeNS(null, "y", (-pos.y).toString());
                return pos;
            }
        }
        this.locatorHandler.registerSetter(variable_name, setter);

        // set initial position
        let init_pos = setter(value);
        callback(init_pos, false);
    }

    /**
     * Create a slider
     * @param variable_name name of the variable
     * @param min minimum value
     * @param max maximum value
     * @param value initial value
     * @param step step size
     * @param time time of the animation in milliseconds
     * @param display_format_func function to format the display of the value
    */
    public slider(variable_name : string, min : number = 0, max : number = 100, value : number = 50, step : number = -1, 
        time : number = 1.5, display_format_func : formatFunction = defaultFormat_f){
        // if the step is -1, then it is automatically calculated
        if (step == -1){ step = (max - min) / 100; }

        // initialize the variable
        this.inp_variables[variable_name] = value;

        // =========== label =============
        let labeldiv = document.createElement('div');
        labeldiv.classList.add("diagramatics-label");
        labeldiv.innerHTML = display_format_func(variable_name, value, this.display_precision);

        // =========== slider ===========

        // create the callback function
        const callback = (val : number, redraw : boolean = true) => {
            this.inp_variables[variable_name] = val;
            labeldiv.innerHTML = display_format_func(variable_name, val, this.display_precision);
            if (redraw) this.draw();
        }
        let slider = create_slider(callback, min, max, value, step);

        // ================ setter
        const setter = (val : number) => {
            slider.value = val.toString();
            callback(val, false);
        }

        this.inp_setter[variable_name] = setter;

        // =========== playbutton ========
        let nstep = (max - min) / step;
        const interval_time = 1000 * time / nstep;

        let playbutton = document.createElement('button');
        let symboldiv  = document.createElement('div');
        symboldiv.classList.add("diagramatics-slider-playbutton-symbol");
        playbutton.appendChild(symboldiv);
        playbutton.classList.add("diagramatics-slider-playbutton");
        playbutton.onclick = () => {
            if (this.intervals[variable_name] == undefined){
                // if is not playing
                playbutton.classList.add("paused");
                this.intervals[variable_name] = setInterval(() => {
                    let val = parseFloat(slider.value);
                    val += step;
                    // wrap around
                    val = ((val - min) % (max - min)) + min;
                    
                    slider.value = val.toString();
                    callback(val);
                }, interval_time);
            } else {
                // if is playing
                playbutton.classList.remove("paused");
                clearInterval(this.intervals[variable_name]);
                this.intervals[variable_name] = undefined;
            }
        }

        // ==============================
        // add components to div
        //
        // <div class="diagramatics-slider-leftcontainer">
        //     <br>
        //     <button class="diagramatics-slider-playbutton"></button>
        // </div>
        // <div class="diagramatics-slider-rightcontainer">
        //     <div class="diagramatics-label"></div>
        //     <input type="range"class="diagramatics-slider">
        // </div>
        //
        let leftcontainer = document.createElement('div');
        leftcontainer.classList.add("diagramatics-slider-leftcontainer");
        leftcontainer.appendChild(document.createElement('br'));
        leftcontainer.appendChild(playbutton);

        let rightcontainer = document.createElement('div');
        rightcontainer.classList.add("diagramatics-slider-rightcontainer");
        rightcontainer.appendChild(labeldiv);
        rightcontainer.appendChild(slider);

        let container = document.createElement('div');
        container.classList.add("diagramatics-slider-container");
        container.appendChild(leftcontainer);
        container.appendChild(rightcontainer);

        this.control_container_div.appendChild(container);
    }

    init_drag_and_drop() {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let [diagram_svg, dnd_svg] = this.get_svg_element('dnd');

        // if this is the fist time this function is called, create a dragAndDropHandler
        if (this.dragAndDropHandler == undefined) {
            let dragAndDropHandler = new DragAndDropHandler(dnd_svg, diagram_svg);
            this.dragAndDropHandler = dragAndDropHandler;
            // this.diagram_outer_svg.addEventListener('mousemove'  , (evt) => { dragAndDropHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('mouseup'    , (evt) => { dragAndDropHandler.endDrag(evt); });
            // this.diagram_outer_svg.addEventListener('touchmove'  , (evt) => { dragAndDropHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('touchend'   , (evt) => { dragAndDropHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchcancel', (evt) => { dragAndDropHandler.endDrag(evt); });
        }
    }

    public dnd_container(name : string, diagram : Diagram) {
        this.init_drag_and_drop();
        this.dragAndDropHandler?.add_container(name, diagram);
    }

    public dnd_draggable(name : string, diagram : Diagram) {
        this.init_drag_and_drop();
        if (this.dragAndDropHandler == undefined) throw Error("dragAndDropHandler in Interactive class is undefined");

        this.inp_variables[name] = diagram.origin;
        this.dragAndDropHandler.add_draggable(name, diagram);

        const callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[name] = pos;
            if (redraw) this.draw();
        }
        this.dragAndDropHandler.registerCallback(name, callback);
    }
        

}

// ========== functions
//
function create_slider(callback : (val : number) => any, min : number = 0, max : number = 100, value : number = 50, step : number) : HTMLInputElement {
    // create a slider
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();
    slider.oninput = () => {
        let val = slider.value;
        callback(parseFloat(val));
    }
    // add class to slider
    slider.classList.add("diagramatics-slider");
    return slider;
}

function create_locator_pointer_svg(radius : number, value : Vector2, color : string, blink : boolean) : SVGSVGElement {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // set svg overflow to visible
    svg.setAttribute("overflow", "visible");
    // set cursor to be pointer when hovering
    svg.style.cursor = "pointer";

    let circle_outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let circle_inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    let inner_radius    = radius * 0.4;

    circle_outer.setAttribute("r", radius.toString());
    circle_outer.setAttribute("fill", get_color(color, tab_color));
    circle_outer.setAttribute("fill-opacity", "0.3137");
    circle_outer.setAttribute("stroke", "none");
    circle_outer.classList.add("diagramatics-locator-outer");
    if (blink) circle_outer.classList.add("diagramatics-locator-blink");

    circle_inner.setAttribute("r", inner_radius.toString());
    circle_inner.setAttribute("fill", get_color(color, tab_color));
    circle_inner.setAttribute("stroke", "none");
    circle_inner.classList.add("diagramatics-locator-inner");

    svg.appendChild(circle_outer);
    svg.appendChild(circle_inner);
    svg.setAttribute("x", value.x.toString());
    svg.setAttribute("y", (-value.y).toString());
    return svg;
}

// function create_locator() : SVGCircleElement {
// }
//
function closest_point_from_points(p : Vector2, points : Vector2[]) : Vector2 {
    if (points.length == 0) return p;
    let closest_d2 = Infinity;
    let closest_p = points[0];
    for (let i = 0; i < points.length; i++) {
        let d2 = points[i].sub(p).length_sq();
        if (d2 < closest_d2) {
            closest_d2 = d2;
            closest_p = points[i];
        }
    }
    return closest_p;
}

// helper to calculate CTM in firefox
// there's a well known bug in firefox about `getScreenCTM()`
function firefox_calcCTM(svgelem : SVGSVGElement) : DOMMatrix {
    let ctm = svgelem.getScreenCTM() as DOMMatrix;
    // get screen width and height of the element
    let screenWidth  = svgelem.width.baseVal.value;
    let screenHeight = svgelem.height.baseVal.value;
    let viewBox      = svgelem.viewBox.baseVal;
    let scalex       = screenWidth/viewBox.width;
    let scaley       = screenHeight/viewBox.height;
    let scale        = Math.min(scalex, scaley);

    // let translateX = (screenWidth/2  + ctm.e) - (viewBox.width/2  + viewBox.x) * scale;
    // let translateY = (screenHeight/2 + ctm.f) - (viewBox.height/2 + viewBox.y) * scale;
    let translateX = (screenWidth/2 ) - (viewBox.width/2  + viewBox.x) * scale;
    let translateY = (screenHeight/2) - (viewBox.height/2 + viewBox.y) * scale;
    return DOMMatrix.fromMatrix(ctm).translate(translateX, translateY).scale(scale);
}

type LocatorEvent = TouchEvent | Touch | MouseEvent
type DnDEvent = TouchEvent | Touch | MouseEvent

function getMousePosition(evt : LocatorEvent, svgelem : SVGSVGElement) : {x : number, y : number} {
    // var CTM = this.control_svg.getScreenCTM() as DOMMatrix;
    // NOTE: there's a well known bug in firefox about `getScreenCTM()`
    // check if the browser is firefox
    let CTM : DOMMatrix;
    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        CTM = firefox_calcCTM(svgelem);
    } else {
        CTM = svgelem.getScreenCTM() as DOMMatrix;
    }
    // console.log(CTM);

    // firefox doesn't support `TouchEvent`, we need to check for it
    if (window.TouchEvent && evt instanceof TouchEvent) { evt = evt.touches[0]; }
    return {
        x: ((evt as Touch | MouseEvent).clientX - CTM.e) / CTM.a,
        y: ((evt as Touch | MouseEvent).clientY - CTM.f) / CTM.d
    };
}

class LocatorHandler {

    selectedElement  : SVGElement | null = null;
    selectedVariable : string | null = null;
    callbacks : {[key : string] : (pos : Vector2) => any} = {};
    setter    : {[key : string] : (pos : Vector2) => any} = {};
    // store blinking circle_outer so that we can turn it off
    blinking_circle_outers : Element[] = [];
    first_touch_callback : Function | null = null;

    constructor(public control_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }

    startDrag(_ : LocatorEvent, variable_name : string, selectedElement : SVGElement) {
        this.selectedElement  = selectedElement;
        this.selectedVariable = variable_name;
        this.handleBlinking();
    }
    drag(evt : LocatorEvent) {
        if (this.selectedElement == undefined) return;
        if (this.selectedVariable == undefined) return;

        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        if (window.TouchEvent && evt instanceof TouchEvent) { evt.preventDefault(); }

        let coord = getMousePosition(evt, this.control_svg);

        let pos = V2(coord.x, -coord.y);
        // check if setter for this.selectedVariable exists
        // if it does, call it
        if (this.setter[this.selectedVariable] != undefined) {
            pos = this.setter[this.selectedVariable](pos);
        }

        // check if callback for this.selectedVariable exists
        // if it does, call it
        if (this.selectedVariable == null) return;
        if (this.callbacks[this.selectedVariable] != undefined) {
            this.callbacks[this.selectedVariable](pos);
        }
        this.setViewBox();

    }
    setViewBox() {
        // set viewBox and preserveAspectRatio of control_svg to be the same as diagram_svg
        this.control_svg.setAttribute("viewBox", this.diagram_svg.getAttribute("viewBox") as string);
        this.control_svg.setAttribute("preserveAspectRatio", this.diagram_svg.getAttribute("preserveAspectRatio") as string);
    }
    endDrag(_ : LocatorEvent) {
        this.selectedElement = null;
        this.selectedVariable = null;
    }

    registerCallback(name : string, callback : (pos : Vector2) => any){
        this.callbacks[name] = callback;
    }
    registerSetter(name : string, setter : (pos : Vector2) => any){
        this.setter[name] = setter;
    }
    addBlinkingCircleOuter(circle_outer : Element){
        this.blinking_circle_outers.push(circle_outer);
    }
    handleBlinking(){
        // turn off all blinking_circle_outers after the first touch
        if (this.blinking_circle_outers.length == 0) return;
        for (let i = 0; i < this.blinking_circle_outers.length; i++) {
            this.blinking_circle_outers[i].classList.remove("diagramatics-locator-blink");
        }
        this.blinking_circle_outers = [];
        if (this.first_touch_callback != null) this.first_touch_callback();
    }
}

type bbox_t = [Vector2, Vector2];
type DragAndDropContainerData = {
    name : string,
    bbox : bbox_t,
    position : Vector2,
    svgelement : SVGElement,
    content : string[]
}
type DragAndDropDraggableData = {
    name : string,
    bbox : bbox_t,
    position : Vector2,
    svgelement : SVGElement,
    container : string,
}

class DragAndDropHandler {
    containers : {[key : string] : DragAndDropContainerData} = {};
    draggables : {[key : string] : DragAndDropDraggableData} = {};
    callbacks : {[key : string] : (pos : Vector2) => any} = {};
    hoveredContainerName : string | null = null;
    draggedElementName : string | null = null;

    constructor(public dnd_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }

    public add_container(name : string, diagram : Diagram) {
        this.add_container_bbox(name, diagram.bounding_box());
    }
    public add_draggable(name : string, diagram : Diagram) {
        this.add_draggable_bbox(name, diagram.bounding_box());
    }

    registerCallback(name : string, callback : (pos : Vector2) => any){
        this.callbacks[name] = callback;
    }

    setViewBox() {
        // set viewBox and preserveAspectRatio of control_svg to be the same as diagram_svg
        this.dnd_svg.setAttribute("viewBox", this.diagram_svg.getAttribute("viewBox") as string);
        this.dnd_svg.setAttribute("preserveAspectRatio", this.diagram_svg.getAttribute("preserveAspectRatio") as string);
    }


    public add_container_bbox(name : string, bbox : bbox_t) {
        if (this.containers[name] != undefined) throw Error(`container with name ${name} already exists`);
        let position = bbox[0].add(bbox[1]).scale(0.5);
        let svgelement = this.add_container_svg(name, bbox);
        this.containers[name] = {name, bbox, position, svgelement, content : []};
    }

    public add_draggable_bbox(name : string, bbox : bbox_t) {
        if (this.draggables[name] != undefined) throw Error(`draggable with name ${name} already exists`);
        // add a container as initial container for the draggable
        let initial_container_name = `_container0_${name}`;
        this.add_container_bbox(initial_container_name, bbox);
        this.containers[initial_container_name].content.push(name);
        let position = bbox[0].add(bbox[1]).scale(0.5);
        let svgelement = this.add_draggable_svg(name, bbox);
        this.draggables[name] = {name, bbox, position, svgelement, container : initial_container_name};
    }

    add_container_svg(name : string, bbox : bbox_t) : SVGElement {
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", bbox[0].x.toString());
        rect.setAttribute("y", (-bbox[1].y).toString());
        rect.setAttribute("width", (bbox[1].x - bbox[0].x).toString());
        rect.setAttribute("height", (bbox[1].y - bbox[0].y).toString());
        rect.setAttribute("fill", "red");
        rect.setAttribute("fill-opacity", "0.5");
        rect.setAttribute("class", "diagramatics-draggable-container");
        rect.setAttribute("id", name);
        this.dnd_svg.prepend(rect);

        rect.onmouseover = (_evt) => { this.hoveredContainerName = name; }
        return rect;
    }

    add_draggable_svg(name : string, bbox : bbox_t) : SVGElement {
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", bbox[0].x.toString());
        rect.setAttribute("y", (-bbox[1].y).toString());
        rect.setAttribute("width", (bbox[1].x - bbox[0].x).toString());
        rect.setAttribute("height", (bbox[1].y - bbox[0].y).toString());
        rect.setAttribute("fill", "blue");
        rect.setAttribute("fill-opacity", "0.5");
        rect.setAttribute("class", "diagramatics-draggable");
        rect.setAttribute("id", name);
        rect.setAttribute("draggable", "true");

        rect.addEventListener('mousedown', (evt) => { 
            this.draggedElementName = name;
            this.startDrag(evt);
        });
        rect.addEventListener('touchstart', (evt) => { 
            this.draggedElementName = name;
            this.startDrag(evt);
        });
        rect.onmouseover = (_evt) => { 
            if (this.draggables[name].container){
                this.hoveredContainerName = this.draggables[name].container;
            }
        }

        this.dnd_svg.append(rect);
        return rect;
    }

    remove_draggable_from_container(draggable_name : string, container_name : string) {
        this.containers[container_name].content = 
            this.containers[container_name].content.filter((name) => name != draggable_name);
    }
    move_draggable_to_container(draggable_name : string, container_name : string) {
        let draggable = this.draggables[draggable_name];

        // ignore if the draggable is already in the container
        if (draggable.container == container_name) return;

        let container = this.containers[container_name];
        let original_container_name = draggable.container;
        let draggable_size = draggable.bbox[1].sub(draggable.bbox[0]);
        let target_position  = container.position;
        let newbbox = [target_position.sub(draggable_size.scale(0.5)), 
            target_position.add(draggable_size.scale(0.5))] as bbox_t;
        draggable.svgelement.setAttribute("x", newbbox[0].x.toString());
        draggable.svgelement.setAttribute("y", (-newbbox[1].y).toString());

        this.remove_draggable_from_container(draggable_name, original_container_name);
        draggable.container = container_name;
        draggable.bbox = newbbox;
        draggable.position = target_position;
        container.content.push(draggable_name);
    }

    try_move_draggable_to_container(draggable_name : string, container_name : string) {
        let draggable = this.draggables[draggable_name];
        let container = this.containers[container_name];
        if (container.content.length == 0) {
            this.move_draggable_to_container(draggable_name, container_name);
        } else {
            // swap
            let original_container_name = draggable.container;
            let other_draggable_name = container.content[0];
            this.move_draggable_to_container(other_draggable_name, original_container_name);
            this.move_draggable_to_container(draggable_name, container_name);
        }
    }

    startDrag(evt : DnDEvent) {
        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        if (window.TouchEvent && evt instanceof TouchEvent) { evt.preventDefault(); }
        this.hoveredContainerName = null;
        // console.log(evt);
    }

    endDrag(_evt : DnDEvent) {
        if (this.hoveredContainerName != null && this.draggedElementName != null){
            this.try_move_draggable_to_container(this.draggedElementName, this.hoveredContainerName);
            let draggedElement = this.draggables[this.draggedElementName];
            this.callbacks[draggedElement.name](draggedElement.position);
        }
        this.draggedElementName = null;
        this.hoveredContainerName = null;
    }


}
