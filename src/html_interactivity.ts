import { str_to_mathematical_italic } from './unicode_utils.js'
import { Vector2, V2 } from './vector.js';

function format_number(val : number, prec : number) {
    let fixed = val.toFixed(prec);
    // remove trailing zeros
    // and if the last character is a dot, remove it
    return fixed.replace(/\.?0+$/, "");
}

export class Interactive {
    public inp_variables : {[key : string] : any} = {};
    public inp_setter    : {[key : string] : (_ : any) => void } = {};
    public display_mode  : "svg" | "canvas" = "svg";

    // private locatorHandler? : LocatorHandler = undefined;
    private locatorHandler? : LocatorHandler = undefined;
    // no support for canvas yet

    public draw_function : (inp_object : typeof this.inp_variables, setter_object? : typeof this.inp_setter) => any 
        = (_) => {};
    public display_precision : undefined | number = 5;
    intervals : {[key : string] : any} = {};         

    constructor(
        public diagram_outer_svg : SVGSVGElement,
        public control_container_div : HTMLElement, 
        inp_object_? : {[key : string] : any}
    ){
        if (inp_object_ != undefined){ this.inp_variables = inp_object_; }
        // this.locatorHandler = new LocatorHandler(diagram_outer_svg);
        // this.diagram_outer_svg.addEventListener('mousemove', (evt) => { this.locatorHandler.drag(evt); });
        // this.diagram_outer_svg.addEventListener('mouseup'  , (evt) => { this.locatorHandler.endDrag(evt); });
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

    public label(variable_name : string, value : any){
        let varstyle_variable_name = str_to_mathematical_italic(variable_name);

        let labeldiv = document.createElement('div');
        labeldiv.classList.add("diagramatics-label");
        labeldiv.innerHTML = `${varstyle_variable_name} = ${value}`;

        this.inp_variables[variable_name] = value;

        // setter ==========================
        const setter = (val : any) => {
            this.inp_variables[variable_name] = val;
            let val_str = this.display_precision == undefined ?
                val.toString() : format_number(val, this.display_precision);
            labeldiv.innerHTML = `${varstyle_variable_name} = ${val_str}`;
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


    public locator(variable_name : string, radius : number){
        this.draw();
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

        if (diagram_svg == undefined) return;

        if (control_svg == undefined) {
            control_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            control_svg.setAttribute("meta", "control_svg");
            control_svg.setAttribute("width", "100%");
            control_svg.setAttribute("height", "100%");
            this.diagram_outer_svg.appendChild(control_svg);
        }

        // if this is the fist time this function is called, create a locatorHandler
        if (this.locatorHandler == undefined) {
            let locatorHandler = new LocatorHandler(this.diagram_outer_svg, control_svg);
            this.locatorHandler = locatorHandler;
            this.diagram_outer_svg.addEventListener('mousemove'  , (evt) => { locatorHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('mouseup'    , (evt) => { locatorHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchmove'  , (evt) => { locatorHandler.drag(evt);    });
            this.diagram_outer_svg.addEventListener('touchend'   , (evt) => { locatorHandler.endDrag(evt); });
            this.diagram_outer_svg.addEventListener('touchcancel', (evt) => { locatorHandler.endDrag(evt); });
        }

        // set viewBox and preserveAspectRatio of control_svg to be the same as diagram_svg
        control_svg.setAttribute("viewBox", diagram_svg.getAttribute("viewBox") as string);
        control_svg.setAttribute("preserveAspectRatio", diagram_svg.getAttribute("preserveAspectRatio") as string);

        // ============== callback
        const callback = (pos : Vector2, redraw : boolean = true) => {
            this.inp_variables[variable_name] = pos;
            if (redraw) this.draw();
        }
        this.locatorHandler.registerCallback(variable_name, callback);

        // ============== Circle element

        let circle = create_locator_pointer_svg(radius);
        circle.addEventListener('mousedown', (evt) => { 
            (this.locatorHandler as LocatorHandler).startDrag(evt, variable_name, circle);
        });
        circle.addEventListener('touchstart', (evt) => { 
            (this.locatorHandler as LocatorHandler).startDrag(evt, variable_name, circle);
        });
        control_svg.appendChild(circle);
    }

    /**
     * Create a slider
     * @param variable_name name of the variable
     * @param min minimum value
     * @param max maximum value
     * @param value initial value
     * @param step step size
     * @param time time of the animation in milliseconds
    */
    public slider(variable_name : string, min : number = 0, max : number = 100, value : number = 50, step : number = -1, 
        time : number = 1.5){
        // if the step is -1, then it is automatically calculated
        if (step == -1){ step = (max - min) / 100; }

        // initialize the variable
        this.inp_variables[variable_name] = value;

        let varstyle_variable_name = str_to_mathematical_italic(variable_name);

        // =========== label =============
        let labeldiv = document.createElement('div');
        labeldiv.classList.add("diagramatics-label");
        labeldiv.innerHTML = `${varstyle_variable_name} = ${value}`;

        // =========== slider ===========

        // create the callback function
        const callback = (val : number, redraw : boolean = true) => {
            this.inp_variables[variable_name] = val;

            let val_str = this.display_precision == undefined ? 
                val.toString() : format_number(val, this.display_precision);
            labeldiv.innerHTML = `${varstyle_variable_name} = ${val_str}`;
            
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
        playbutton.classList.add("diagramatics-slider-playbutton");
        playbutton.innerHTML = '>';
        playbutton.onclick = () => {
            if (this.intervals[variable_name] == undefined){
                // if is not playing
                playbutton.innerHTML = 'o';
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
                playbutton.innerHTML = '>';
                clearInterval(this.intervals[variable_name]);
                this.intervals[variable_name] = undefined;
            }
        }

        // =========== morebutton ========
        let morebutton = document.createElement('button');
        morebutton.classList.add("diagramatics-slider-moreplaybutton");
        morebutton.innerHTML = '⋯';
        morebutton.onclick = () => {
            // alert not implementer
            alert("Not implemented yet");
        }
        
        // ==============================
        // add components to div
        //
        // <div class="diagramatics-slider-leftcontainer">
        //     <button class="diagramatics-slider-playbutton"></button>
        //     <br>
        //     <button class="diagramatics-slider-moreplaybutton"></button>
        // </div>
        // <div class="diagramatics-slider-rightcontainer">
        //     <div class="diagramatics-label"></div>
        //     <input type="range"class="diagramatics-slider">
        // </div>
        //
        let leftcontainer = document.createElement('div');
        leftcontainer.classList.add("diagramatics-slider-leftcontainer");
        leftcontainer.appendChild(playbutton);
        leftcontainer.appendChild(document.createElement('br'));
        leftcontainer.appendChild(morebutton);

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

function create_locator_pointer_svg(radius : number) : SVGSVGElement {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // set svg overflow to visible
    svg.setAttribute("overflow", "visible");
    // set cursor to be pointer when hovering
    svg.style.cursor = "pointer";

    let circle_outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    let circle_inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    let inner_radius    = radius * 0.4;

    circle_outer.setAttribute("r", radius.toString());
    circle_outer.setAttribute("fill", "blue");
    circle_outer.setAttribute("fill-opacity", "0.1");
    circle_outer.setAttribute("stroke", "none");

    circle_inner.setAttribute("r", inner_radius.toString());
    circle_inner.setAttribute("fill", "blue");
    circle_inner.setAttribute("stroke", "none");

    svg.appendChild(circle_outer);
    svg.appendChild(circle_inner);
    svg.setAttribute("x", "0");
    svg.setAttribute("y", "0");
    return svg;
}

// function create_locator() : SVGCircleElement {
// }
type LocatorEvent = TouchEvent | Touch | MouseEvent
class LocatorHandler {

    selectedElement  : SVGElement | null = null;
    selectedVariable : string | null = null;
    callbacks : {[key : string] : (pos : Vector2) => any} = {};

    constructor(public outer_svg : SVGSVGElement, public control_svg : SVGSVGElement){
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
    }
    drag(evt : LocatorEvent) {
        if (this.selectedElement == undefined) return;
        if (evt instanceof MouseEvent) { evt.preventDefault(); }
        var coord = this.getMousePosition(evt);
        // this.selectedElement.setAttributeNS(null, "cx", (coord.x).toString());
        // this.selectedElement.setAttributeNS(null, "cy", (coord.y).toString());
        this.selectedElement.setAttributeNS(null, "x", (coord.x).toString());
        this.selectedElement.setAttributeNS(null, "y", (coord.y).toString());

        let pos = V2(coord.x, coord.y);
        // check if callback for this.selectedVariable exists
        // if it does, call it
        if (this.selectedVariable == null) return;
        if (this.callbacks[this.selectedVariable] != undefined) {
            this.callbacks[this.selectedVariable](pos);
        }
    }
    endDrag(_ : LocatorEvent) {
        this.selectedElement = null;
        this.selectedVariable = null;
    }

    registerCallback(name : string, callback : (pos : Vector2) => any){
        this.callbacks[name] = callback;
    }

}
