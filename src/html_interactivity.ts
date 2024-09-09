import { Diagram, DiagramType, diagram_combine, empty } from './diagram.js';
import { str_to_mathematical_italic } from './unicode_utils.js'
import { Vector2, V2 } from './vector.js';
import { get_color, tab_color } from './color_palette.js';
import { f_draw_to_svg, calculate_text_scale } from './draw_svg.js';
import { rectangle, rectangle_corner } from './shapes.js';
import { size } from './shapes/shapes_geometry.js';
import { HorizontalAlignment, VerticalAlignment, distribute_horizontal_and_align, distribute_variable_row, distribute_vertical_and_align } from './alignment.js';
import { range } from './utils.js';

type BBox = [Vector2, Vector2]

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
enum HTML_INT_TARGET {
    DOCUMENT = "document",
    SVG = "svg"
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
    
    public registeredEventListenerRemoveFunctions : (() => void)[] = [];
    public single_int_mode: boolean = false;

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
        inp_object_? : {[key : string] : any},
        public event_target: HTML_INT_TARGET = HTML_INT_TARGET.SVG,
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
    
    private registerEventListener(
        element: EventTarget, 
        type: keyof GlobalEventHandlersEventMap, 
        callback: EventListenerOrEventListenerObject | null,
        options? : boolean | AddEventListenerOptions,
    ) {
        element.addEventListener(type, callback, options);
        const removeFunction = () => element.removeEventListener(type, callback);
        this.registeredEventListenerRemoveFunctions.push(removeFunction);
    }
    
    public removeRegisteredEventListener() {
        this.registeredEventListenerRemoveFunctions.forEach(f => f());
        this.registeredEventListenerRemoveFunctions = [];
    }
    

    get_svg_element(metaname: string, force_recreate: boolean = false) : SVGSVGElement {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg : SVGSVGElement | undefined = undefined;
        // check if this.diagram_outer_svg has a child with meta=control_svg
        // if not, create one
        let svg_element : SVGSVGElement | undefined = undefined;

        for (let i in this.diagram_outer_svg.children) {
            let child = this.diagram_outer_svg.children[i];
            if (child instanceof SVGSVGElement && child.getAttribute("meta") == metaname) {
                svg_element = child;
            }
        }

        if (this.single_int_mode && force_recreate && svg_element != undefined) {
            svg_element.remove?.();
            svg_element = undefined;
        }
        if (svg_element == undefined) {
            svg_element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg_element.setAttribute("meta", metaname);
            svg_element.setAttribute("width", "100%");
            svg_element.setAttribute("height", "100%");
            if (this.isTargetingDocument()) svg_element.style.overflow = "visible";
            this.diagram_outer_svg.appendChild(svg_element);
        }

        return svg_element;
    }

    get_diagram_svg() : SVGSVGElement {
        let diagram_svg = this.get_svg_element("diagram_svg");
        this.diagram_svg = diagram_svg;
        return diagram_svg;
    }
    
    isTargetingDocument() : boolean {
        return this.event_target == HTML_INT_TARGET.DOCUMENT;
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
    public locator(
        variable_name : string, value : Vector2, radius : number, color : string = 'blue', 
        track_diagram? : Diagram, blink : boolean = true,
        callback?: (locator_name: string, position: Vector2) => any,
    ){
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        this.inp_variables[variable_name] = value;

        let diagram_svg  = this.get_diagram_svg();
        let control_svg  = this.get_svg_element(control_svg_name.locator, !this.locator_svg);
        this.locator_svg = control_svg;
        // if this is the fist time this function is called, create a locatorHandler
        if (this.locatorHandler == undefined) {
            let locatorHandler = new LocatorHandler(control_svg, diagram_svg);
            this.locatorHandler = locatorHandler;
            const eventTarget = this.isTargetingDocument() ? document : this.diagram_outer_svg;
            this.registerEventListener(eventTarget, 'mousemove',  (evt:any) => { locatorHandler.drag(evt)});
            this.registerEventListener(eventTarget, 'mouseup',    (evt:any) => { locatorHandler.endDrag(evt)});
            this.registerEventListener(eventTarget, 'touchmove',  (evt:any) => { locatorHandler.drag(evt)});
            this.registerEventListener(eventTarget, 'touchend',   (evt:any) => { locatorHandler.endDrag(evt)});
            this.registerEventListener(eventTarget, 'touchcancel',(evt:any) => { locatorHandler.endDrag(evt)});
        }


        // ============== callback
        const f_callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[variable_name] = pos;
            if (callback && redraw) callback(variable_name, pos);
            if (redraw) this.draw();
        }
        this.locatorHandler.registerCallback(variable_name, f_callback);

        // ============== Circle element

        let locator_svg = this.locatorHandler.create_locator_circle_pointer_svg(variable_name, radius, value, color, blink);
        if(blink){
            // store the circle_outer into the LocatorHandler so that we can turn it off later
            let blinking_outers = locator_svg.getElementsByClassName("diagramatics-locator-blink");
            for (let i = 0; i < blinking_outers.length; i++)
                (this.locatorHandler as LocatorHandler).addBlinkingCircleOuter(blinking_outers[i])
        }
        this.registerEventListener(locator_svg, 'mousedown', (evt:any) => {
            this.locatorHandler!.startDrag(evt, variable_name, locator_svg);
        });
        this.registerEventListener(locator_svg, 'touchstart', (evt:any) => {
            this.locatorHandler!.startDrag(evt, variable_name, locator_svg);
        });

        // =============== setter
        let setter;
        if (track_diagram) {
            if (track_diagram.type != DiagramType.Polygon && track_diagram.type != DiagramType.Curve)
                throw Error('Track diagram must be a polygon or curve');
            if (track_diagram.path == undefined) throw Error(`diagram {diagtam.type} must have a path`);
            let track = track_diagram.path.points;
            setter = (pos : Vector2) => {
                let coord = closest_point_from_points(pos, track);
                locator_svg.setAttribute("transform", `translate(${coord.x},${-coord.y})`)
                return coord;
            }
        }
        else{
            setter = (pos : Vector2) => {
                locator_svg.setAttribute("transform", `translate(${pos.x},${-pos.y})`)
                return pos;
            }
        }
        this.locatorHandler.registerSetter(variable_name, setter);
        this.inp_setter[variable_name] = setter;

        // set initial position
        let init_pos = setter(value);
        this.locatorHandler.setPos(variable_name, init_pos);
    }


    // TODO: in the next breaking changes update,
    // merge this function with locator
    /**
     * Create a locator with custom diagram object
     * @param variable_name name of the variable
     * @param value initial value
     * @param diagram diagram of the locator
     * @param track_diagram if provided, the locator will snap to the closest point on the diagram
     * @param blink if true, the locator will blink
     * @param callback callback function that will be called when the locator is moved
     * @param callback_rightclick callback function that will be called when the locator is right clicked
     */
    public locator_custom(
        variable_name : string, value : Vector2, diagram : Diagram, 
        track_diagram? : Diagram, blink : boolean = true,
        callback?: (locator_name: string, position: Vector2) => any,
        callback_rightclick?: (locator_name: string) => any
    ){
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        this.inp_variables[variable_name] = value;

        let diagram_svg  = this.get_diagram_svg();
        let control_svg  = this.get_svg_element(control_svg_name.locator, !this.locator_svg);
        this.locator_svg = control_svg;
        // if this is the fist time this function is called, create a locatorHandler
        if (this.locatorHandler == undefined) {
            let locatorHandler = new LocatorHandler(control_svg, diagram_svg);
            this.locatorHandler = locatorHandler;
            const eventTarget = this.isTargetingDocument() ? document : this.diagram_outer_svg;
            this.registerEventListener(eventTarget, 'mousemove',  (evt:any) => { locatorHandler.drag(evt); })
            this.registerEventListener(eventTarget, 'mouseup',    (evt:any) => { locatorHandler.endDrag(evt); })
            this.registerEventListener(eventTarget, 'touchmove',  (evt:any) => { locatorHandler.drag(evt); })
            this.registerEventListener(eventTarget, 'touchend',   (evt:any) => { locatorHandler.endDrag(evt); })
            this.registerEventListener(eventTarget, 'touchcancel',(evt:any) => { locatorHandler.endDrag(evt); })
        }


        // ============== callback
        const f_callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[variable_name] = pos;
            // don't call the callback on the initialization;
            if (callback && redraw) callback(variable_name, pos);
            if (redraw) this.draw();
        }
        this.locatorHandler.registerCallback(variable_name, f_callback);

        // ============== SVG element

        let locator_svg = this.locatorHandler!.create_locator_diagram_svg(variable_name, diagram, blink);
        this.registerEventListener(locator_svg, 'mousedown', (evt:any) => {
            this.locatorHandler!.startDrag(evt, variable_name, locator_svg);
        });
        this.registerEventListener(locator_svg, 'touchstart', (evt:any) => {
            this.locatorHandler!.startDrag(evt, variable_name, locator_svg);
        });
        if (callback_rightclick){
          this.registerEventListener(locator_svg, 'contextmenu', (evt) => {
            evt.preventDefault();
            callback_rightclick(variable_name);
          });
        }

        // =============== setter
        let setter;
        if (track_diagram) {
            if (track_diagram.type != DiagramType.Polygon && track_diagram.type != DiagramType.Curve)
                throw Error('Track diagram must be a polygon or curve');
            if (track_diagram.path == undefined) throw Error(`diagram {diagtam.type} must have a path`);
            let track = track_diagram.path.points;
            setter = (pos : Vector2) => {
                let coord = closest_point_from_points(pos, track);
                locator_svg.setAttribute("transform", `translate(${coord.x},${-coord.y})`)
                return coord;
            }
        }
        else{
            setter = (pos : Vector2) => {
                locator_svg.setAttribute("transform", `translate(${pos.x},${-pos.y})`)
                return pos;
            }
        }
        this.locatorHandler.registerSetter(variable_name, setter);
        this.inp_setter[variable_name] = setter;

        // set initial position
        let init_pos = setter(value);
        this.locatorHandler.setPos(variable_name, init_pos);
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
        let diagram_svg = this.get_diagram_svg();
        let dnd_svg     = this.get_svg_element(control_svg_name.dnd, !this.dnd_svg);
        this.dnd_svg    = dnd_svg;

        // if this is the fist time this function is called, create a dragAndDropHandler
        if (this.dragAndDropHandler == undefined) {
            let dragAndDropHandler = new DragAndDropHandler(dnd_svg, diagram_svg);
            this.dragAndDropHandler = dragAndDropHandler;
            const eventTarget = this.isTargetingDocument() ? document : this.diagram_outer_svg;
            // this.registerEventListener(this.diagram_outer_svg, 'mousemove',  (evt:any) => {dragAndDropHandler.drag(evt);});
            this.registerEventListener(eventTarget, 'mousemove',  (evt:any) => {dragAndDropHandler.drag(evt);});
            this.registerEventListener(eventTarget, 'mouseup',    (evt:any) => {dragAndDropHandler.endDrag(evt);});
            this.registerEventListener(eventTarget, 'touchmove',  (evt:any) => {dragAndDropHandler.drag(evt);});
            this.registerEventListener(eventTarget, 'touchend',   (evt:any) => {dragAndDropHandler.endDrag(evt);});
            this.registerEventListener(eventTarget, 'touchcancel',(evt:any) => {dragAndDropHandler.endDrag(evt);});
        }
    }

    /**
     * Create a drag and drop container
     * @param name name of the container
     * @param diagram diagram of the container
     * @param capacity capacity of the container (default is 1)
     * @param config configuration of the container positioning
     * the configuration is an object with the following format:
     * `{type:"horizontal-uniform"}`, `{type:"vertical-uniform"}`, `{type:"grid", value:[number, number]}`
     * `{type:"horizontal", padding:number}`, `{type:"vertical", padding:number}`
     * `{type:"flex-row", padding:number, vertical_alignment:VerticalAlignment, horizontal_alignment:HorizontalAlignment}`
     *
     * you can also add custom region box for the target by adding `custom_region_box: [Vector2, Vector2]` in the config
     *
     * you can also add a sorting function for the target by adding `sorting_function: (a: string, b: string) => number`
    */
    public dnd_container(name : string, diagram : Diagram, capacity? : number, config? : dnd_container_config) {
        this.init_drag_and_drop();
        this.dragAndDropHandler?.add_container(name, diagram, capacity, config);
    }

    // TODO: in the next breaking changes update,
    // merge this function with dnd_draggable_to_container
    /**
     * Create a drag and drop draggable that is positioned into an existing container
     * @param name name of the draggable
     * @param diagram diagram of the draggable
     * @param container_name name of the container
     * @param callback callback function when the draggable is moved
     */
    public dnd_draggable_to_container(name : string, diagram : Diagram, container_name : string, callback? : (name:string, container:string) => any) {
        this.init_drag_and_drop();
        if (this.dragAndDropHandler == undefined) throw Error("dragAndDropHandler in Interactive class is undefined");

        this.inp_variables[name] = diagram.origin;
        this.dragAndDropHandler.add_draggable_to_container(name, diagram, container_name);

        const dnd_callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[name] = pos;
            if (callback) callback(name, container_name);
            if (redraw) this.draw();
        }
        this.dragAndDropHandler.registerCallback(name, dnd_callback);
    }
    
    /**
     * Create a drag and drop draggable
     * @param name name of the draggable
     * @param diagram diagram of the draggable
     * @param container_diagram diagram of the container, if not provided, a container will be created automatically
     * @param callback callback function when the draggable is moved
    */
    public dnd_draggable(name : string, diagram : Diagram, container_diagram? : Diagram, callback? : (name:string, pos:Vector2) => any) {
        this.init_drag_and_drop();
        if (this.dragAndDropHandler == undefined) throw Error("dragAndDropHandler in Interactive class is undefined");

        this.inp_variables[name] = diagram.origin;
        this.dragAndDropHandler.add_draggable_with_container(name, diagram, container_diagram);

        const dnd_callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[name] = pos;
            if (callback) callback(name, pos);
            if (redraw) this.draw();
        }
        this.dragAndDropHandler.registerCallback(name, dnd_callback);
    }

    /**
     * Register a callback function when a draggable is dropped outside of a container
     * @param callback callback function
     */
    public dnd_register_drop_outside_callback(callback : (name : string) => any) {
        this.init_drag_and_drop();
        this.dragAndDropHandler?.register_dropped_outside_callback(callback);
    }
    
    /**
     * Register a validation function when a draggable is moved to a container
     * If the function return false, the draggable will not be moved
     * @param fun validation function
    */
    public dnd_register_move_validation_function(fun: (draggable_name: string, target_name: string) => boolean) {
        this.init_drag_and_drop();
        this.dragAndDropHandler?.register_move_validation_function(fun);
    }

    /**
     * Move a draggable to a container
     * @param name name of the draggable
     * @param container_name name of the container
     */
    public dnd_move_to_container(name : string, container_name : string) {
        this.dragAndDropHandler?.try_move_draggable_to_container(name, container_name);
    }

    /**
     * Get the data of the drag and drop objects with the format:
     * `{container:string, content:string[]}[]`
    */
    public get_dnd_data() : DragAndDropData {
        return this.dragAndDropHandler?.getData() ?? [];
    }

    /**
     * Set the data of the drag and drop objects with the format:
     * `{container:string, content:string[]}[]`
     */
    public set_dnd_data(data : DragAndDropData) : void {
        this.dragAndDropHandler?.setData(data);
    }
    
    /**
    * Get the content size of a container
    */
    public  get_dnd_container_content_size(container_name : string) : [number,number] {
       if (!this.dragAndDropHandler) return [NaN,NaN];
       return this.dragAndDropHandler.get_container_content_size(container_name);
    }
    
    /**
     * Set whether the content of the container should be sorted or not
     */
    public set_dnd_content_sort(sort_content : boolean) : void {
        if (!this.dragAndDropHandler) return;
        this.dragAndDropHandler.sort_content = sort_content;
    }
    
    public remove_dnd_draggable(name : string) {
        this.dragAndDropHandler?.remove_draggable(name);
    }
    public remove_locator(name: string) {
        this.locatorHandler?.remove(name);
    }
    public remove_button(name: string) {
        this.buttonHandler?.remove(name);
    }

    /**
     * @deprecated (use `Interactive.custom_object_g()` instead)
     * This method will be removed in the next major release
     *
     * Create a custom interactive object
     * @param id id of the object
     * @param classlist list of classes of the object
     * @param diagram diagram of the object
     * @returns the svg element of the object
     */
    public custom_object(id : string, classlist: string[], diagram : Diagram) : SVGSVGElement {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg = this.get_diagram_svg();
        let control_svg = this.get_svg_element(control_svg_name.custom, !this.custom_svg);

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        f_draw_to_svg(svg, svg, diagram, true, false, calculate_text_scale(diagram_svg));
        svg.setAttribute("overflow", "visible");
        svg.setAttribute("class", classlist.join(" "));
        svg.setAttribute("id",id);
        
        control_svg.setAttribute("viewBox", diagram_svg.getAttribute("viewBox") as string);
        control_svg.setAttribute("preserveAspectRatio", diagram_svg.getAttribute("preserveAspectRatio") as string);
        control_svg.style.overflow = "visible";

        control_svg.appendChild(svg);
        this.custom_svg = control_svg;
        return svg;
    }
    
    /**
     * Create a custom interactive object
     * @param id id of the object
     * @param classlist list of classes of the object
     * @param diagram diagram of the object
     * @returns the <g> svg element of the object
     */
    public custom_object_g(id : string, classlist: string[], diagram : Diagram) : SVGGElement {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg = this.get_diagram_svg();
        let control_svg = this.get_svg_element(control_svg_name.custom, !this.custom_svg);

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(control_svg, g, diagram, true, false, calculate_text_scale(diagram_svg));
        g.setAttribute("overflow", "visible");
        g.setAttribute("class", classlist.join(" "));
        g.setAttribute("id",id);
        
        control_svg.setAttribute("viewBox", diagram_svg.getAttribute("viewBox") as string);
        control_svg.setAttribute("preserveAspectRatio", diagram_svg.getAttribute("preserveAspectRatio") as string);
        control_svg.style.overflow = "visible";

        control_svg.appendChild(g);
        this.custom_svg = control_svg;
        return g;
    }

    private init_button() {
        if (this.diagram_outer_svg == undefined) throw Error("diagram_outer_svg in Interactive class is undefined");
        let diagram_svg = this.get_diagram_svg();
        let button_svg  = this.get_svg_element(control_svg_name.button, !this.button_svg);
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

        let setter = this.buttonHandler.try_add_toggle(name, diagram_on, diagram_off, state, main_callback);
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
        this.buttonHandler.try_add_click(name, diagram, diagram_pressed, diagram, n_callback);
    }
    
    /**
     * Create a click button
     * @param name name of the button
     * @param diagram diagram of the button
     * @param diagram_pressed diagram of the button when it is pressed
     * @param diagram_hover diagram of the button when it is hovered
     * @param callback callback function when the button is clicked
    */
    public button_click_hover(name : string, diagram : Diagram, diagram_pressed : Diagram, diagram_hover : Diagram, callback : () => any){
        this.init_button();
        if (this.buttonHandler == undefined) throw Error("buttonHandler in Interactive class is undefined");

        let n_callback = () => { callback(); this.draw(); }
        this.buttonHandler.try_add_click(name, diagram, diagram_pressed, diagram_hover, n_callback);
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
        y : - (clientPos.y - CTM.f) / CTM.d
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
    mouseOffset : Vector2 = V2(0,0);
    callbacks : {[key : string] : (pos : Vector2, redraw?: boolean) => any} = {};
    setter    : {[key : string] : (pos : Vector2) => any} = {};
    // store blinking circle_outer so that we can turn it off
    svg_elements: {[key : string] : SVGElement} = {};
    blinking_circle_outers : Element[] = [];
    first_touch_callback : Function | null = null;
    element_pos : {[key : string] : Vector2} = {};

    constructor(public control_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }

    startDrag(evt : LocatorEvent, variable_name : string, selectedElement : SVGElement) {
        this.selectedElement  = selectedElement;
        this.selectedVariable = variable_name;
        
        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        if (window.TouchEvent && evt instanceof TouchEvent) { evt.preventDefault(); }
        let coord = getMousePosition(evt, this.control_svg);
        let mousepos = V2(coord.x, coord.y);
        let elementpos = this.element_pos[variable_name];
        if (elementpos){
            this.mouseOffset = elementpos.sub(mousepos);
        }
        
        this.handleBlinking();
    }
    drag(evt : LocatorEvent) {
        if (this.selectedElement == undefined) return;
        if (this.selectedVariable == undefined) return;

        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        if (window.TouchEvent && evt instanceof TouchEvent) { evt.preventDefault(); }

        let coord = getMousePosition(evt, this.control_svg);

        let pos = V2(coord.x, coord.y).add(this.mouseOffset);
        this.element_pos[this.selectedVariable] = pos;
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
    
    public remove(variable_name : string) : void {
        if (this.selectedVariable == variable_name){
            this.selectedElement = null;
            this.selectedVariable = null;
        }
        delete this.callbacks[variable_name];
        delete this.setter[variable_name];
        this.svg_elements[variable_name]?.remove();
        delete this.svg_elements[variable_name];
        delete this.element_pos[variable_name];
    }

    setPos(name : string, pos : Vector2){
        this.element_pos[name] = pos;
        this.callbacks[name](pos, false);
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

    create_locator_diagram_svg(name: string, diagram : Diagram, blink : boolean) : SVGGElement {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.control_svg, g, diagram.position(V2(0,0)), true, false, calculate_text_scale(this.diagram_svg));
        g.style.cursor = "pointer";
        g.setAttribute("overflow", "visible");
        if (blink) {
            g.classList.add("diagramatics-locator-blink");
            this.addBlinkingCircleOuter(g);
        }
        
        if (this.svg_elements[name]){
            this.svg_elements[name].replaceWith(g);
        } else {
            this.control_svg.appendChild(g);
        }
        
        
        this.svg_elements[name] = g;
        this.element_pos[name]
        return g;
    }

    create_locator_circle_pointer_svg(name: string, radius : number, value : Vector2, color : string, blink : boolean) : SVGGElement {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // set svg overflow to visible
        g.setAttribute("overflow", "visible");
        // set cursor to be pointer when hovering
        g.style.cursor = "pointer";

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

        g.appendChild(circle_outer);
        g.appendChild(circle_inner);
        g.setAttribute("transform", `translate(${value.x},${-value.y})`)
        if (this.svg_elements[name]){
            this.svg_elements[name].replaceWith(g);
        } else {
            this.control_svg.appendChild(g);
        }
        
        this.svg_elements[name] = g;
        return g;
    }

}

type DragAndDropContainerData = {
    name : string,
    position : Vector2,
    svgelement? : SVGElement,
    diagram : Diagram,
    content : string[],
    capacity : number,
    config : dnd_container_config,
}
type DragAndDropDraggableData = {
    name : string,
    position : Vector2,
    svgelement? : SVGElement,
    diagram : Diagram,
    diagram_size : [number, number],
    container : string,
}
type DragAndDropData = {container:string, content:string[]}[]

enum dnd_type {
    container = "diagramatics-dnd-container",
    draggable = "diagramatics-dnd-draggable",
    ghost     = "diagramatics-dnd-draggable-ghost"
}

//TODO: add more
type dnd_container_positioning_type =
    {type:"horizontal-uniform"} |
    {type:"vertical-uniform"} |
    {type:"horizontal", padding:number} |
    {type:"vertical", padding:number} |
    {type:"flex-row", padding:number, vertical_alignment?:VerticalAlignment, horizontal_alignment?:HorizontalAlignment} |
    {type:"grid", value:[number, number]}
type dnd_container_config = dnd_container_positioning_type & {
    custom_region_box?: [Vector2, Vector2]
    sorting_function?: (a : string, b : string) => number
}

class DragAndDropHandler {
    containers : {[key : string] : DragAndDropContainerData} = {};
    draggables : {[key : string] : DragAndDropDraggableData} = {};
    callbacks : {[key : string] : (pos : Vector2) => any} = {};
    hoveredContainerName : string | null = null;
    draggedElementName : string | null = null;
    draggedElementGhost : SVGElement | null = null;
    dropped_outside_callback : ((name : string) => any) | null = null;
    move_validation_function : ((draggable_name: string, target_name: string) => boolean) | null = null;
    sort_content : boolean = false;
    dom_to_id_map : WeakMap<HTMLElement|SVGElement, string>;

    constructor(public dnd_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
        this.dom_to_id_map = new WeakMap();
    }

    public add_container(
        name : string, diagram : Diagram, 
        capacity? : number , config? : dnd_container_config,
    ) {
        if (this.containers[name] != undefined) {
            this.replace_container_svg(name, diagram, capacity, config);
            return;
        }

        this.containers[name] = {
            name, diagram, 
            position : diagram.origin, 
            content : [], 
            config : config ?? {type:"horizontal-uniform"},
            capacity : capacity ?? 1
        };
    }

    generate_position_map(bbox : BBox, config : dnd_container_config, capacity : number, content : string[]) 
    : Vector2[] {
        const p_center = bbox[0].add(bbox[1]).scale(0.5);
        switch (config.type){
            case "horizontal-uniform": {
                let width = bbox[1].x - bbox[0].x;
                let dx = width / capacity;
                let x0 = bbox[0].x + dx / 2;
                let y  = p_center.y;
                return range(0, capacity).map(i => V2(x0 + dx*i, y));
            }
            case "vertical-uniform": {
                //NOTE: top to bottom
                let height = bbox[1].y - bbox[0].y;
                let dy = height / capacity;
                let x  = p_center.x;
                let y0 = bbox[1].y - dy / 2;
                return range(0, capacity).map(i => V2(x, y0 - dy*i));
            }
            case "grid" : {
                let [nx,ny] = config.value;
                let height = bbox[1].y - bbox[0].y;
                let width  = bbox[1].x - bbox[0].x;
                let dx = width / nx;
                let dy = height / ny;
                let x0 = bbox[0].x + dx / 2;
                let y0 = bbox[1].y - dy / 2;
                return range(0, capacity).map(i => {
                    let x = x0 + dx * (i % nx);
                    let y = y0 - dy * Math.floor(i / nx);
                    return V2(x, y);
                });
            }
            case "vertical" : {
                const p_top_center = V2(p_center.x, bbox[1].y);
                const sizelist = content.map((name) => this.draggables[name]?.diagram_size ?? [0,0]);
                const size_rects = sizelist.map(([w,h]) => rectangle(w,h).mut());
                const distributed = distribute_vertical_and_align(size_rects, config.padding).mut()
                    .move_origin('top-center').position(p_top_center)
                    .translate(V2(0,-config.padding));
                return distributed.children.map(d => d.origin);
            }
            case "horizontal" : {
                const p_center_left = V2(bbox[0].x, p_center.y);
                const sizelist = content.map((name) => this.draggables[name]?.diagram_size ?? [0,0]);
                const size_rects = sizelist.map(([w,h]) => rectangle(w,h).mut());
                const distributed = distribute_horizontal_and_align(size_rects, config.padding).mut()
                    .move_origin('center-left').position(p_center_left)
                    .translate(V2(config.padding,0));
                return distributed.children.map(d => d.origin);
            }
            case "flex-row" : {
                const pad = config.padding ?? 0;
                const container_width = bbox[1].x - bbox[0].x - 2*pad;
                const sizelist = content.map((name) => this.draggables[name]?.diagram_size ?? [0,0]);
                const size_rects = sizelist.map(([w,h]) => rectangle(w,h).mut());
                let distributed = distribute_variable_row(
                    size_rects, container_width, pad, pad,
                    config.vertical_alignment, config.horizontal_alignment
                ).mut()
                switch (config.horizontal_alignment){
                    case 'center' :{
                        distributed = distributed
                            .move_origin('top-center').position(V2(p_center.x, bbox[1].y-pad));
                    } break;
                    case 'right' : {
                        distributed = distributed
                            .move_origin('top-right').position(V2(bbox[1].x-pad, bbox[1].y-pad));
                    } break;
                    case 'center':
                    default: {
                        distributed = distributed
                            .move_origin('top-left').position(V2(bbox[0].x+pad, bbox[1].y-pad));
                    }
                }
                return distributed.children.map(d => d.origin);
            }
            default : {
                return [];
            }
        }
    }
    
    get_container_content_size(container_name : string) : [number,number] {
        const container = this.containers[container_name];
        if (container == undefined) return [NaN, NaN];
        const pad = (container.config as any).padding ?? 0;
        const content_diagrams = container.content.map(name => this.draggables[name]?.diagram ?? empty());
        const [width, height] = size(diagram_combine(...content_diagrams));
        return [width + 2*pad, height + 2*pad];
    }
    
    private replace_draggable_svg(name : string, diagram : Diagram) {
        let draggable = this.draggables[name];
        if (draggable == undefined) return;
        draggable.svgelement?.remove();
        draggable.diagram = diagram;
        draggable.diagram_size = size(diagram);
        this.add_draggable_svg(name, diagram);
        this.reposition_container_content(draggable.container)
    }
    private replace_container_svg(name : string, diagram : Diagram, capacity? : number, config? : dnd_container_config) {
        let container = this.containers[name];
        if (container == undefined) return;
        container.svgelement?.remove();
        container.diagram = diagram;
        if (capacity) container.capacity = capacity;
        if (config) container.config = config;
        this.add_container_svg(name, diagram);
        this.reposition_container_content(name);
    }

    public add_draggable_to_container(name : string, diagram : Diagram, container_name : string) {
        if (this.draggables[name] != undefined) {
            this.replace_draggable_svg(name, diagram);
            this.move_draggable_to_container(name, container_name, true);
            return;
        }

        const diagram_size = size(diagram);
        this.draggables[name] = {name, diagram : diagram.mut() , diagram_size, position : diagram.origin, container : container_name};
        this.containers[container_name].content.push(name);
    }

    public add_draggable_with_container(name : string, diagram : Diagram, container_diagram? : Diagram) {
        if (this.draggables[name] != undefined) {
            this.replace_draggable_svg(name, diagram);
            return;
        }
        // add a container as initial container for the draggable
        let initial_container_name = `_container0_${name}`;

        if (container_diagram == undefined)
            container_diagram = this.diagram_container_from_draggable(diagram);
        this.add_container(initial_container_name, container_diagram);

        const diagram_size = size(diagram);
        this.containers[initial_container_name].content.push(name);
        this.draggables[name] = {name, diagram : diagram.mut() , diagram_size, position : diagram.origin, container : initial_container_name};
    }
    
    public remove_draggable(name : string) : void {
        for (let container_name in this.containers) {
            const container = this.containers[container_name];
            container.content = container.content.filter(e => e != name);
        }
        this.draggables[name].svgelement?.remove();
        delete this.draggables[name];
    }

    registerCallback(name : string, callback : (pos : Vector2) => any){
        this.callbacks[name] = callback;
    }

    register_dropped_outside_callback(callback : (name : string) => any){
        this.dropped_outside_callback = callback;
    }
    
    register_move_validation_function(fun: (draggable_name: string, target_name: string) => boolean){
        this.move_validation_function = fun;
    }

    setViewBox() {
        // set viewBox and preserveAspectRatio of control_svg to be the same as diagram_svg
        this.dnd_svg.setAttribute("viewBox", this.diagram_svg.getAttribute("viewBox") as string);
        this.dnd_svg.setAttribute("preserveAspectRatio", this.diagram_svg.getAttribute("preserveAspectRatio") as string);
    }
    drawSvg(){
        for (let name in this.containers){
            if (this.containers[name].svgelement) continue;
            this.add_container_svg(name, this.containers[name].diagram);
        }
        for (let name in this.draggables){
            if (this.draggables[name].svgelement) continue;
            this.add_draggable_svg(name, this.draggables[name].diagram);
        }
        for (let name in this.containers)
            this.reposition_container_content(name);
    }

    getData() : DragAndDropData {
        let data : DragAndDropData = []
        for (let name in this.containers){
            data.push({container : name, content : this.containers[name].content});
        }
        return data;
    }

    setData(data : DragAndDropData) {
        try {
            for (let containerdata of data) {
                for (let content of containerdata.content) {
                    this.try_move_draggable_to_container(content, containerdata.container, true);
                }
            }
        } catch (_e) {
            console.error("the data is not valid");
        }
    }

    diagram_container_from_draggable(diagram : Diagram) : Diagram {
        let rect = rectangle_corner(...diagram.bounding_box()).move_origin(diagram.origin);
        return rect.strokedasharray([5]);
    }

    add_container_svg(name : string, diagram: Diagram) {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.dnd_svg, g, diagram.position(V2(0,0)), 
            false, false, calculate_text_scale(this.diagram_svg), dnd_type.container);
        let position = diagram.origin;
        g.setAttribute("transform", `translate(${position.x},${-position.y})`)
        g.setAttribute("class", dnd_type.container);
        this.dnd_svg.prepend(g);

        this.containers[name].svgelement = g;
        this.dom_to_id_map.set(g, name);
    }

    add_draggable_svg(name : string, diagram : Diagram) {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.dnd_svg, g, diagram.position(V2(0,0)), true, false, calculate_text_scale(this.diagram_svg), dnd_type.draggable);
        let position = diagram.origin;
        g.setAttribute("transform", `translate(${position.x},${-position.y})`)
        g.setAttribute("class", dnd_type.draggable);
        g.setAttribute("draggable", "true");

        g.onmousedown = (evt) => {
            this.draggedElementName = name;
            this.startDrag(evt);
        }
        g.ontouchstart = (evt) => {
            this.draggedElementName = name;
            this.startDrag(evt);
        }

        this.dnd_svg.append(g);
        this.draggables[name].svgelement = g;
        this.dom_to_id_map.set(g, name);
    }

    reposition_container_content(container_name : string){
        let container = this.containers[container_name];
        if (container == undefined) return;
        
        if (this.sort_content){
            container.content.sort()
        } else if (container.config?.sorting_function) {
            container.content.sort(container.config.sorting_function);
        }
        const bbox = container.config.custom_region_box ?? container.diagram.bounding_box();
        const position_map = this.generate_position_map(bbox, container.config, container.capacity, container.content);

        for (let i = 0; i < container.content.length; i++) {
            let draggable = this.draggables[container.content[i]];
            let pos = position_map[i] ?? container.diagram.origin;
            draggable.diagram = draggable.diagram.position(pos);
            draggable.position = pos;
            draggable.svgelement?.setAttribute("transform", `translate(${pos.x},${-pos.y})`);
        }
    }
    remove_draggable_from_container(draggable_name : string, container_name : string) {
        this.containers[container_name].content = 
            this.containers[container_name].content.filter((name) => name != draggable_name);
    }
    move_draggable_to_container(draggable_name : string, container_name : string, ignore_callback = false) {
        let draggable = this.draggables[draggable_name];
        if (draggable == undefined) return;

        // ignore if the draggable is already in the container
        if (draggable.container == container_name) return;

        let container = this.containers[container_name];
        let original_container_name = draggable.container;

        this.remove_draggable_from_container(draggable_name, original_container_name);
        draggable.container = container_name;
        container.content.push(draggable_name);

        this.reposition_container_content(container_name);
        this.reposition_container_content(original_container_name);

        if (ignore_callback) return;
        let draggedElement = this.draggables[draggable_name];
        this.callbacks[draggedElement.name](draggedElement.position);
    }

    try_move_draggable_to_container(draggable_name : string, container_name : string, ignore_callback = false) {
        if (this.move_validation_function) {
            const valid = this.move_validation_function(draggable_name, container_name);
            if (!valid) return;
        }
        let draggable = this.draggables[draggable_name];
        let container = this.containers[container_name];
        if (container.content.length + 1 <= container.capacity) {
            this.move_draggable_to_container(draggable_name, container_name, ignore_callback);
        } else if (container.capacity == 1){
            // only swap if the container has only 1 capacity
            // swap
            let original_container_name = draggable.container;
            let other_draggable_name = container.content[0];
            this.move_draggable_to_container(draggable_name, container_name, true);
            this.move_draggable_to_container(other_draggable_name, original_container_name, ignore_callback);
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
        this.dnd_svg.append(this.draggedElementGhost);
    }

    get_dnd_element_data_from_evt(evt : DnDEvent) : {name : string, type : string} | null {
        let element : HTMLElement | null = null;
        if (window.TouchEvent && evt instanceof TouchEvent) { 
            let evt_touch = evt.touches[0];
            element = document.elementFromPoint(evt_touch.clientX, evt_touch.clientY) as HTMLElement;
        } else {
            const evt_ = evt as MouseEvent
            element = document.elementFromPoint(evt_.clientX, evt_.clientY) as HTMLElement;
        }
        if (element == null) return null;

        if (element.localName == "tspan") element = element.parentElement;
        if (element == null) return null;
        
        let dg_tag = element.getAttribute("_dg_tag"); if (dg_tag == null) return null;

        if (dg_tag == dnd_type.container) {
            let parent = element.parentElement; if (parent == null) return null;
            let name = this.dom_to_id_map.get(parent); if (name == null) return null;
            return {name, type : dnd_type.container};
        }
        if (dg_tag == dnd_type.draggable) {
            let parent = element.parentElement; if (parent == null) return null;
            let name = this.dom_to_id_map.get(parent);  if (name == null) return null;
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
        this.draggedElementGhost.setAttribute("transform", `translate(${coord.x},${-coord.y})`);
    }

    endDrag(_evt : DnDEvent) {
        if (this.hoveredContainerName != null && this.draggedElementName != null){
            this.try_move_draggable_to_container(this.draggedElementName, this.hoveredContainerName);
        }

        // if dropped outside of any container
        if (this.hoveredContainerName == null && this.draggedElementName != null 
            && this.dropped_outside_callback != null){
            this.dropped_outside_callback(this.draggedElementName);
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
    svg_g_element : {[key : string] : [SVGGElement,SVGGElement,SVGElement|undefined]} = {};
    touchdownName : string | null = null;

    constructor(public button_svg : SVGSVGElement, public diagram_svg : SVGSVGElement){
    }
    
    remove(name : string){
        delete this.states[name];
        const [a, b] = this.svg_g_element[name];
        a?.remove();
        b?.remove();
        delete this.svg_g_element[name];
    }

    /** add a new toggle button if it doesn't exist, otherwise, update diagrams and callback */
    try_add_toggle(name : string, diagram_on : Diagram, diagram_off : Diagram, state : boolean, callback : (state : boolean, redraw? : boolean) => any) : setter_function_t {
        if (this.svg_g_element[name] != undefined) {
            // delete the old button
            let [old_svg_on, old_svg_off, _] = this.svg_g_element[name];
            old_svg_on.remove();
            old_svg_off.remove();
        }
        return this.add_toggle(name, diagram_on, diagram_off, state, callback);
    }

    add_toggle(name : string, diagram_on : Diagram, diagram_off : Diagram, state : boolean, callback : (state : boolean, redraw? : boolean) => any) : setter_function_t {
        let g_off = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.button_svg, g_off, diagram_off, true, false, calculate_text_scale(this.diagram_svg));
        g_off.setAttribute("overflow", "visible");
        g_off.style.cursor = "pointer";

        let g_on = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.button_svg, g_on, diagram_on, true, false, calculate_text_scale(this.diagram_svg));
        g_on.setAttribute("overflow", "visible");
        g_on.style.cursor = "pointer";

        this.button_svg.appendChild(g_off);
        this.button_svg.appendChild(g_on);
        this.svg_g_element[name] = [g_on, g_off, undefined];

        this.states[name] = state;

        const set_display = (state : boolean) => {
            g_on.setAttribute("display", state ? "block" : "none");
            g_off.setAttribute("display", state ? "none" : "block");
        }
        set_display(this.states[name]);

        const update_state = (state : boolean, redraw : boolean = true) => {
            this.states[name] = state;
            callback(this.states[name], redraw);
            set_display(this.states[name]);
        }

        g_on.onclick = (e) => { 
            e.preventDefault();
            update_state(false); 
        };
        g_off.onclick = (e) => { 
            e.preventDefault();
            update_state(true); 
        };
        g_on.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
        };
        g_off.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
        };

        g_on.ontouchend = () => { 
            if (this.touchdownName == name) update_state(false); 
            this.touchdownName = null;
        };
        g_off.ontouchend = () => { 
            if (this.touchdownName == name) update_state(true); 
            this.touchdownName = null;
        };

        const setter = (state : boolean) => { update_state(state, false); }
        return setter;
    }

    /** add a new click button if it doesn't exist, otherwise, update diagrams and callback */
    try_add_click(
        name : string, diagram : Diagram, diagram_pressed : Diagram, diagram_hover : Diagram,
        callback : () => any
    ){
        if (this.svg_g_element[name] != undefined) {
            // delete the old button
            let [old_svg_normal, old_svg_pressed, old_svg_hover] = this.svg_g_element[name];
            old_svg_normal.remove();
            old_svg_pressed.remove();
            old_svg_hover?.remove();
        }
        this.add_click(name, diagram, diagram_pressed, diagram_hover, callback);
    }

    // TODO: handle touch input moving out of the button
    add_click(name : string, diagram : Diagram, diagram_pressed : Diagram, diagram_hover : Diagram, callback : () => any){
        let g_normal = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.button_svg, g_normal, diagram, true, false, calculate_text_scale(this.diagram_svg));
        g_normal.setAttribute("overflow", "visible");
        g_normal.style.cursor = "pointer";

        let g_pressed = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.button_svg, g_pressed, diagram_pressed, true, false, calculate_text_scale(this.diagram_svg));
        g_pressed.setAttribute("overflow", "visible");
        g_pressed.style.cursor = "pointer";
        
        let g_hover = document.createElementNS("http://www.w3.org/2000/svg", "g");
        f_draw_to_svg(this.button_svg, g_hover, diagram_hover, true, false, calculate_text_scale(this.diagram_svg));
        g_hover.setAttribute("overflow", "visible");
        g_hover.style.cursor = "pointer";

        this.button_svg.appendChild(g_normal);
        this.button_svg.appendChild(g_pressed);
        this.button_svg.appendChild(g_hover);
        this.svg_g_element[name] = [g_normal, g_pressed, g_hover];

        const set_display = (pressed : boolean, hovered : boolean) => {
            g_normal.setAttribute("display", !pressed && !hovered ? "block" : "none");
            g_pressed.setAttribute("display", pressed ? "block" : "none");
            g_hover.setAttribute("display", hovered && !pressed ? "block" : "none");
        }
        set_display(false, false);
        let pressed_state = false;
        let hover_state = false;
        
        const update_display = () => {
            set_display(pressed_state, hover_state);
        }

        g_normal.onmousedown = (e) => {
            e.preventDefault();
            this.touchdownName = name;
            pressed_state = true;
            update_display();
        }
        g_normal.onmouseup = (e) => {
            e.preventDefault();
            this.touchdownName = null;
        }
        g_normal.onmouseenter = (_e) => {
            hover_state = true;
            update_display();
        }
        g_normal.onmouseleave = (_e) => {
            // hover_state = false;
            update_display();
        }
        g_pressed.onmouseleave = (_e) => { 
            hover_state = false;
            pressed_state = false;
            update_display();
        }
        g_pressed.onmousedown = (e) => {
            e.preventDefault();
            this.touchdownName = name;
        }
        g_pressed.onmouseup = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            pressed_state = false;
            update_display();
        }
        g_hover.onmousedown = (e) => {
            e.preventDefault();
            this.touchdownName = name;
            pressed_state = true;
            update_display();
        }
        g_hover.onmouseup = (e) => {
            e.preventDefault();
            this.touchdownName = null;
        }
        g_hover.onmouseleave = (_e) => {
            hover_state = false;
            update_display();
        }

        g_normal.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
            pressed_state = true;
            update_display();
        };
        g_normal.ontouchend = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            pressed_state = false;
            update_display();
        }
        g_pressed.ontouchstart = (e) => { 
            e.preventDefault();
            this.touchdownName = name; 
            pressed_state = true;
            update_display();
        };
        g_pressed.ontouchend = (_e) => {
            if (this.touchdownName == name) callback();
            this.touchdownName = null;
            pressed_state = false;
            update_display();
        }
            
            
    }
        
}
