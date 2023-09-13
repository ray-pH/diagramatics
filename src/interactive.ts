import { str_to_mathematical_italic } from './unicode_utils.js'

export class Interactive {
    public inp_variables : {[key : string] : any} = {};
    public inp_inputs    : {[key : string] : HTMLInputElement} = {};
    public draw_function : (inp_object : typeof this.inp_variables) => any = (_) => {};
    intervals : {[key : string] : any} = {};

    constructor(public container_div : HTMLElement, inp_object_? : {[key : string] : any}){
        if (inp_object_ != undefined){ this.inp_variables = inp_object_; }
    }

    public draw() : void {
        this.draw_function(this.inp_variables);
    }

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
        const callback = (val : Number) => {
            this.inp_variables[variable_name] = val;
            this.draw_function(this.inp_variables);
            labeldiv.innerHTML = `${varstyle_variable_name} = ${val}`;
        }
        let slider = create_slider(callback, min, max, value, step);
        this.inp_inputs[variable_name] = slider;

        let nstep = (max - min) / step;
        const interval_time = 1000 * time / nstep;
        

        // =========== playbutton ========
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
                    if (val > max){ val = min; }
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

        this.container_div.appendChild(container);
    }
}

// ========== functions
//
function create_slider(callback : (val : Number) => any, min : number = 0, max : number = 100, value : number = 50, step : number) : HTMLInputElement {
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
