import { Diagram, DiagramType } from './diagram.js';
import { str_to_mathematical_italic } from './unicode_utils.js'
import { Vector2, V2 } from './vector.js';
import { get_color, tab_color } from './color_palette.js';
import { f_draw_to_svg } from './draw_svg.js';
import { rectangle_corner } from './shapes.js';

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

type setter_function_t = (_ : any) => void;
type inpVariables_t = {[key : string] : any};
type inpSetter_t    = {[key : string] : setter_function_t };

enum control_svg_name {
    locator   = "control_svg",
    dnd       = "dnd_svg",
    custom    = "custom_int_svg",
    button    = "button_svg"
}

/**
 * Object that controls the interactivity of the diagram
 */
export class Interactive {
    public inp_variables : inpVariables_t = {};
    public inp_setter    : inpSetter_t = {};
    public display_mode  : "svg" | "canvas" = "svg";

    public diagram_svg : SVGSVGElement | undefined = undefined;
    public locator_svg : SVGSVGElement | undefined = undefined;
    public dnd_svg : SVGSVGElement | undefined = undefined;
    public custom_svg : SVGSVGElement | undefined = undefined;
    public button_svg : SVGSVGElement | undefined = undefined;

    private locatorHandler? : LocatorHandler = undefined;
    private dragAndDropHandler? : DragAndDropHandler = undefined;
    private buttonHandler? : ButtonHandler = undefined;
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
        this.locatorHandler?.setViewBox();
        this.dragAndDropHandler?.setViewBox();
        set_viewbox(this.custom_svg, this.diagram_svg);
        set_viewbox(this.button_svg, this.diagram_svg);
        // TODO: also do this for the other control_svg
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


    /**
     * WARNING: deprecated
     * use `locator_initial_draw` instead
     */
    public locator_draw(){
        this.locatorHandler?.setViewBox();
    }
    public locator_initial_draw(){
        // TODO: generate the svg here
        this.locatorHandler?.setViewBox();
    }

    /** 
     * alias for `dnd_initial_draw`
     */
    public drag_and_drop_initial_draw(){
        this.dnd_initial_draw();
    }
    public dnd_initial_draw() {
        this.dragAndDropHandler?.setViewBox();
        this.dragAndDropHandler?.drawSvg();
    }

    get_svg_element(metaname : string) : [SVGSVGElement, SVGSVGElement] {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg : SVGSVGElement | undefined = undefined;
        // check if this.diagram_outer_svg has a child with meta=control_svg
        // if not, create one
        let control_svg : SVGSVGElement | undefined = undefined;

        for (let i in this.diagram_outer_svg.children) {
            let child = this.diagram_outer_svg.children[i];
            if (child instanceof SVGSVGElement && child.getAttribute("meta") == metaname) {
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
            control_svg.setAttribute("meta", metaname);
            control_svg.setAttribute("width", "100%");
            control_svg.setAttribute("height", "100%");
            this.diagram_outer_svg.appendChild(control_svg);
        }

        this.diagram_svg = diagram_svg;
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

        let [diagram_svg, control_svg] = this.get_svg_element(control_svg_name.locator);
        this.locator_svg = control_svg;
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

    private init_drag_and_drop() {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let [diagram_svg, dnd_svg] = this.get_svg_element(control_svg_name.dnd);
        this.dnd_svg = dnd_svg;

        // if this is the fist time this function is called, create a dragAndDropHandler
        if (this.dragAndDropHandler == undefined) {
            let dragAndDropHandler = new DragAndDropHandler(dnd_svg, diagram_svg);
            this.dragAndDropHandler = dragAndDropHandler;
            this.diagram_outer_svg.addEventListener('mousemove'  , (evt) => { dragAndDropHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('mouseup'    , (evt) => { dragAndDropHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchmove'  , (evt) => { dragAndDropHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('touchend'   , (evt) => { dragAndDropHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchcancel', (evt) => { dragAndDropHandler.endDrag(evt); });
        }
    }

    /**
     * Create a drag and drop container
     * @param name name of the container
     * @param diagram diagram of the container
    */
    public dnd_container(name : string, diagram : Diagram) {
        this.init_drag_and_drop();
        this.dragAndDropHandler?.add_container(name, diagram);
    }

    /**
     * Create a drag and drop draggable
     * @param name name of the draggable
     * @param diagram diagram of the draggable
     * @param container_diagram diagram of the container, if not provided, a container will be created automatically
    */
    public dnd_draggable(name : string, diagram : Diagram, container_diagram? : Diagram) {
        this.init_drag_and_drop();
        if (this.dragAndDropHandler == undefined) throw Error("dragAndDropHandler in Interactive class is undefined");

        this.inp_variables[name] = diagram.origin;
        this.dragAndDropHandler.add_draggable(name, diagram, container_diagram);

        const callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[name] = pos;
            if (redraw) this.draw();
        }
        this.dragAndDropHandler.registerCallback(name, callback);
    }

    /**
     * Get the data of the drag and drop objects with the format:
     * `{container:string, content:string[]}[]`
    */
    public get_dnd_data() : DragAndDropData {
        return this.dragAndDropHandler?.getData() ?? [];
    }

    /**
     * Create a custom interactive object
     * @param id id of the object
     * @param classlist list of classes of the object
     * @param diagram diagram of the object
     * @returns the svg element of the object
     */
    public custom_object(id : string, classlist: string[], diagram : Diagram) : SVGSVGElement {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let [diagram_svg, control_svg] = this.get_svg_element(control_svg_name.custom);

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg, diagram, true, diagram_svg);
        svg.setAttribute("overflow", "visible");
        svg.setAttribute("class", classlist.join(" "));
        svg.setAttribute("id",id);

        control_svg.appendChild(svg);
        this.custom_svg = control_svg;
        return svg;
    }

    private init_button() {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let [diagram_svg, button_svg] = this.get_svg_element(control_svg_name.button);
        this.button_svg = button_svg;

        // if this is the fist time this function is called, create a dragAndDropHandler
        if (this.buttonHandler == undefined) {
            let buttonHandler = new ButtonHandler(button_svg, diagram_svg);
            this.buttonHandler = buttonHandler;
        }
    }

    /**
     * Create a toggle button
     * @param name name of the button
     * @param diagram_on diagram of the button when it is on
     * @param diagram_off diagram of the button when it is off
     * @param state initial state of the button
     * @param callback callback function when the button state is changed
    */
    public button_toggle(name : string, diagram_on : Diagram, diagram_off : Diagram, state : boolean = false,
        callback? : (name : string, state : boolean) => any
    ){
        this.init_button();
        if (this.buttonHandler == undefined) throw Error("buttonHandler in Interactive class is undefined");

        this.inp_variables[name] = state;

        let main_callback;
        if (callback){
            main_callback = (state : boolean, redraw : boolean = true) => { 
                this.inp_variables[name] = state 
                callback(name, state);
                if (redraw) this.draw();
            }
        } else {
            main_callback = (state : boolean, redraw : boolean = true) => { 
                this.inp_variables[name] = state 
                if (redraw) this.draw();
            }

        }

        let setter = this.buttonHandler.add_toggle(name, diagram_on, diagram_off, state, main_callback);
        this.inp_setter[name] = setter;
    }

    /**
     * Create a click button
     * @param name name of the button
     * @param diagram diagram of the button
     * @param diagram_pressed diagram of the button when it is pressed
     * @param callback callback function when the button is clicked
    */
    public button_click(name : string, diagram : Diagram, diagram_pressed : Diagram, callback : () => any){
        this.init_button();
        if (this.buttonHandler == undefined) throw Error("buttonHandler in Interactive class is undefined");

        let n_callback = () => { callback(); this.draw(); }
        this.buttonHandler.add_click(name, diagram, diagram_pressed, n_callback);
    }
}

// ========== functions
//

function set_viewbox(taget : SVGSVGElement | undefined, source : SVGSVGElement | undefined) {
    if (taget == undefined) return;
    if (source == undefined) return;
    taget.setAttribute("viewBox", source.getAttribute("viewBox") as string);
    taget.setAttribute("preserveAspectRatio", source.getAttribute("preserveAspectRatio") as string);
}


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

/**
 * Convert client position to SVG position
 * @param clientPos the client position
 * @param svgelem the svg element
 */
export function clientPos_to_svgPos(clientPos : {x : number, y : number}, svgelem : SVGSVGElement) : 
{x : number, y : number} {
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
    
    return {
        x : (clientPos.x - CTM.e) / CTM.a,
        y : (clientPos.y - CTM.f) / CTM.d
    }
}

function getMousePosition(evt : LocatorEvent, svgelem : SVGSVGElement) : {x : number, y : number} {
    // firefox doesn't support `TouchEvent`, we need to check for it
    if (window.TouchEvent && evt instanceof TouchEvent) { evt = evt.touches[0]; }
    let clientPos = {
        x : (evt as Touch | MouseEvent).clientX,
        y : (evt as Touch | MouseEvent).clientY
    }
    return clientPos_to_svgPos(clientPos, svgelem);
}

/**
 * Get the SVG coordinate from the event (MouseEvent or TouchEvent)
 * @param evt the event
 * @param svgelem the svg element
 * @returns the SVG coordinate
 */
export function get_SVGPos_from_event(evt : LocatorEvent, svgelem : SVGSVGElement) : {x : number, y : number} {
    return getMousePosition(evt, svgelem);
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

type DragAndDropContainerData = {
    name : string,
    position : Vector2,
    svgelement? : SVGElement,
    diagram : Diagram,
    content : string[]
}
type DragAndDropDraggableData = {
    name : string,
    position : Vector2,
    svgelement? : SVGElement,
    diagram : Diagram,
    container : string,
}
type DragAndDropData = {container:string, content:string[]}[]

enum dnd_type {
    container = "diagramatics-dnd-container",
    draggable = "diagramatics-dnd-draggable",
    ghost     = "diagramatics-dnd-draggable-ghost"
}

class DragAndDropHandler {
    containers : {[key : string] : DragAndDropContainerData} = {};
    draggables : {[key : string] : DragAndDropDraggableData} = {};
    callbacks : {[key : string] : (pos : Vector2) => any} = {};
    hoveredContainerName : string | null = null;
    draggedElementName : string | null = null;
    draggedElementGhost : SVGElement | null = null;

    constructor(public dnd_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }

    public add_container(name : string, diagram : Diagram) {
        if (this.containers[name] != undefined) throw Error(`container with name ${name} already exists`);
        this.containers[name] = {name, diagram, position : diagram.origin, content : []};
    }

    public add_draggable(name : string, diagram : Diagram, container_diagram? : Diagram) {
        if (this.draggables[name] != undefined) throw Error(`draggable with name ${name} already exists`);
        // add a container as initial container for the draggable
        let initial_container_name = `_container0_${name}`;

        if (container_diagram == undefined)
            container_diagram = this.diagram_container_from_draggable(diagram);
        this.add_container(initial_container_name, container_diagram);

        this.containers[initial_container_name].content.push(name);
        this.draggables[name] = {name, diagram, position : diagram.origin, container : initial_container_name};
    }

    registerCallback(name : string, callback : (pos : Vector2) => any){
        this.callbacks[name] = callback;
    }

    setViewBox() {
        // set viewBox and preserveAspectRatio of control_svg to be the same as diagram_svg
        this.dnd_svg.setAttribute("viewBox", this.diagram_svg.getAttribute("viewBox") as string);
        this.dnd_svg.setAttribute("preserveAspectRatio", this.diagram_svg.getAttribute("preserveAspectRatio") as string);
    }
    drawSvg(){
        for (let name in this.containers)
            this.add_container_svg(name, this.containers[name].diagram);
        for (let name in this.draggables)
            this.add_draggable_svg(name, this.draggables[name].diagram);
    }

    getData() : DragAndDropData {
        let data : DragAndDropData = []
        for (let name in this.containers){
            data.push({container : name, content : this.containers[name].content});
        }
        return data;
    }

    diagram_container_from_draggable(diagram : Diagram) : Diagram {
        let rect = rectangle_corner(...diagram.bounding_box()).move_origin(diagram.origin);
        return rect.strokedasharray([5]);
    }

    add_container_svg(name : string, diagram: Diagram) {
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg, diagram.position(V2(0,0)), 
            false, this.dnd_svg, dnd_type.container);
        let position = diagram.origin;
        svg.setAttribute("overflow", "visible");
        svg.setAttribute("x", position.x.toString());
        svg.setAttribute("y", (-position.y).toString());
        svg.setAttribute("class", dnd_type.container);
        svg.setAttribute("id", name);
        this.dnd_svg.prepend(svg);

        this.containers[name].svgelement = svg;
    }

    add_draggable_svg(name : string, diagram : Diagram) {
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg, diagram.position(V2(0,0)), true, this.dnd_svg, dnd_type.draggable);
        let position = diagram.origin;
        svg.setAttribute("overflow", "visible");
        svg.setAttribute("x", position.x.toString());
        svg.setAttribute("y", (-position.y).toString());
        svg.setAttribute("class", dnd_type.draggable);
        svg.setAttribute("id", name);
        svg.setAttribute("draggable", "true");

        svg.onmousedown = (evt) => {
            this.draggedElementName = name;
            this.startDrag(evt);
        }
        svg.ontouchstart = (evt) => {
            this.draggedElementName = name;
            this.startDrag(evt);
        }

        this.dnd_svg.append(svg);
        this.draggables[name].svgelement = svg;
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
        let target_position  = container.position;

        draggable.svgelement?.setAttribute("x", target_position.x.toString());
        draggable.svgelement?.setAttribute("y", (-target_position.y).toString());

        this.remove_draggable_from_container(draggable_name, original_container_name);
        draggable.container = container_name;
        draggable.position = target_position;
        container.content.push(draggable_name);

        let draggedElement = this.draggables[draggable_name];
        this.callbacks[draggedElement.name](draggedElement.position);
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

        // reset container hovered class
        this.reset_hovered_class();
        // delete orphaned ghost
        let ghosts = this.dnd_svg.getElementsByClassName(dnd_type.ghost);
        for (let i = 0; i < ghosts.length; i++) ghosts[i].remove();
        
        // create a clone of the dragged element
        if (this.draggedElementName == null) return;
        let draggable = this.draggables[this.draggedElementName];
        if (draggable.svgelement == undefined) return;
        draggable.svgelement.classList.add("picked");
        this.draggedElementGhost = draggable.svgelement.cloneNode(true) as SVGElement;
        // set pointer-events : none
        this.draggedElementGhost.style.pointerEvents = "none";
        this.draggedElementGhost.setAttribute("opacity", "0.5");
        this.draggedElementGhost.setAttribute("class", dnd_type.ghost);
        this.dnd_svg.prepend(this.draggedElementGhost);
    }

    get_dnd_element_data_from_evt(evt : DnDEvent) : {name : string, type : string} | null {
        let element : HTMLElement | null = null;
        if (window.TouchEvent && evt instanceof TouchEvent) { 
            let evt_touch = evt.touches[0];
            element = document.elementFromPoint(evt_touch.clientX, evt_touch.clientY) as HTMLElement;
        } else if (!(evt instanceof TouchEvent)) {
            element = document.elementFromPoint(evt.clientX, evt.clientY) as HTMLElement;
        }
        if (element == null) return null;

        let dg_tag = element.getAttribute("_dg_tag"); if (dg_tag == null) return null;

        if (dg_tag == dnd_type.container) {
            let parent = element.parentElement; if (parent == null) return null;
            let name = parent.getAttribute("id"); if (name == null) return null;
            return {name, type : dnd_type.container};
        }
        if (dg_tag == dnd_type.draggable) {
            let parent = element.parentElement; if (parent == null) return null;
            let name = parent.getAttribute("id"); if (name == null) return null;
            return {name, type : dnd_type.draggable};
        }
        return null;
    }

    drag(evt : DnDEvent) {
        if (this.draggedElementName == null) return;
        if (this.draggedElementGhost == null) return;
        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        if (window.TouchEvent && evt instanceof TouchEvent) { evt.preventDefault(); }

        this.reset_hovered_class();
        let element_data = this.get_dnd_element_data_from_evt(evt);
        if (element_data == null) {
            this.hoveredContainerName = null;
        } else if (element_data.type == dnd_type.container) {
            this.hoveredContainerName = element_data.name;
            this.containers[element_data.name].svgelement?.classList.add("hovered");
        } else if (element_data.type == dnd_type.draggable) {
            this.hoveredContainerName = this.draggables[element_data.name]?.container;
            this.draggables[element_data.name].svgelement?.classList.add("hovered");
            // this.containers[this.hoveredContainerName]?.svgelement?.classList.add("hovered");
        }

        let coord = getMousePosition(evt, this.dnd_svg);
        this.draggedElementGhost.setAttribute("x", coord.x.toString());
        this.draggedElementGhost.setAttribute("y", coord.y.toString());
    }

    endDrag(_evt : DnDEvent) {
        if (this.hoveredContainerName != null && this.draggedElementName != null){
            this.try_move_draggable_to_container(this.draggedElementName, this.hoveredContainerName);
        }
        this.draggedElementName = null;
        this.hoveredContainerName = null;
        this.reset_hovered_class();
        this.reset_picked_class();

        if (this.draggedElementGhost != null){
            this.draggedElementGhost.remove();
            this.draggedElementGhost = null;
        }
    }

    reset_hovered_class(){
        for (let name in this.containers) {
            this.containers[name].svgelement?.classList.remove("hovered");
        }
        for (let name in this.draggables) {
            this.draggables[name].svgelement?.classList.remove("hovered");
        }
    }

    reset_picked_class(){
        for (let name in this.draggables) {
            this.draggables[name].svgelement?.classList.remove("picked");
        }
    }
}

class ButtonHandler {
    // callbacks : {[key : string] : (state : boolean) => any} = {};
    states : {[key : string] : boolean} = {};
    touchdownName : string | null = null;

    constructor(public button_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }

    add_toggle(name : string, diagram_on : Diagram, diagram_off : Diagram, state : boolean, callback : (state : boolean, redraw? : boolean) => any) : setter_function_t {
        let svg_off = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg_off, diagram_off, true, this.diagram_svg);
        svg_off.setAttribute("overflow", "visible");
        svg_off.style.cursor = "pointer";

        let svg_on = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg_on, diagram_on, true, this.diagram_svg);
        svg_on.setAttribute("overflow", "visible");
        svg_on.style.cursor = "pointer";

        this.button_svg.appendChild(svg_off);
        this.button_svg.appendChild(svg_on);

        this.states[name] = state;

        const set_display = (state : boolean) => {
            svg_on.setAttribute("display", state ? "block" : "none");
            svg_off.setAttribute("display", state ? "none" : "block");
        }
        set_display(this.states[name]);

        const update_state = (state : boolean, redraw : boolean = true) => {
            this.states[name] = state;
            callback(this.states[name], redraw);
            set_display(this.states[name]);
        }

        svg_on.onclick = (e) => { 
            e.preventDefault();
            update_state(false); 
        };
        svg_off.onclick = (e) => { 
            e.preventDefault();
            update_state(true); 
        };
        svg_on.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
        };
        svg_off.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
        };

        svg_on.ontouchend = () => { 
            if (this.touchdownName == name) update_state(false); 
            this.touchdownName = null;
        };
        svg_off.ontouchend = () => { 
            if (this.touchdownName == name) update_state(true); 
            this.touchdownName = null;
        };

        const setter = (state : boolean) => { update_state(state, false); }
        return setter;
    }

    // TODO: handle touch input moving out of the button
    add_click(name : string, diagram : Diagram, diagram_pressed : Diagram, callback : () => any){
        let svg_normal = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg_normal, diagram, true, this.diagram_svg);
        svg_normal.setAttribute("overflow", "visible");
        svg_normal.style.cursor = "pointer";

        let svg_pressed = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg_pressed, diagram_pressed, true, this.diagram_svg);
        svg_pressed.setAttribute("overflow", "visible");
        svg_pressed.style.cursor = "pointer";

        this.button_svg.appendChild(svg_normal);
        this.button_svg.appendChild(svg_pressed);

        const set_display = (pressed : boolean) => {
            svg_pressed.setAttribute("display", pressed ? "block" : "none");
            svg_normal.setAttribute("display", pressed ? "none" : "block");
        }
        set_display(false);

        svg_normal.onmousedown = (e) => {
            e.preventDefault();
            this.touchdownName = name;
            set_display(true);
        }
        svg_normal.onmouseup = (e) => {
            e.preventDefault();
            this.touchdownName = null;
        }
        svg_pressed.onmouseleave = (_e) => { set_display(false); }
        svg_pressed.onmousedown = (e) => {
            e.preventDefault();
            this.touchdownName = name;
        }
        svg_pressed.onmouseup = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            set_display(false);
        }

        svg_normal.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
            set_display(true);
        };
        svg_normal.ontouchend = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            set_display(false);
        }
        svg_pressed.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
            set_display(true);
        };
        svg_pressed.ontouchend = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            set_display(false);
        }
            
            
    }
        
}
