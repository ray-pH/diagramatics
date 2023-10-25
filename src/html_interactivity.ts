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

/**
 * Object that controls the interactivity of the diagram
 */
export class Interactive {
    public inp_variables : {[key : string] : any} = {};
    public inp_setter    : {[key : string] : (_ : any) => void } = {};
    public display_mode  : "svg" | "canvas" = "svg";

    private locatorHandler? : LocatorHandler = undefined;
    // no support for canvas yet

    public draw_function : (inp_object : typeof this.inp_variables, setter_object? : typeof this.inp_setter) => any 
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

type LocatorEvent = TouchEvent | Touch | MouseEvent
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

    getMousePosition(evt : LocatorEvent ) {
        var CTM = this.control_svg.getScreenCTM() as DOMMatrix;
        if (evt instanceof TouchEvent) { evt = evt.touches[0]; }
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
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
        if (evt instanceof TouchEvent) { evt.preventDefault(); }

        let coord = this.getMousePosition(evt);

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
