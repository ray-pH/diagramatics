export class Interactive {
    public inp_object : {[key : string] : any} = {};
    public draw_function : (inp_object : typeof this.inp_object) => any = (_) => {};

    constructor(public container_div : HTMLElement, inp_object_? : {[key : string] : any}){
        if (inp_object_ != undefined){ this.inp_object = inp_object_; }
    }

    public draw() : void {
        this.draw_function(this.inp_object);
    }

    public slider(variable_name : string, min : number = 0, max : number = 100, value : number = 50){
        // initialize the variable
        this.inp_object[variable_name] = value;
        // create the callback function
        const callback = (val : Number) => {
            this.inp_object[variable_name] = val;
            this.draw_function(this.inp_object);
        }
        create_slider(callback, this.container_div, min, max, value);
    }
}

// ========== functions
//
function create_slider(callback : (val : Number) => any, div : HTMLElement, min : number = 0, max : number = 100, value : number = 50){
    // create a slider
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.oninput = () => {
        let val = slider.value;
        callback(parseFloat(val));
    }
    // add slider to  div
    div.appendChild(slider);
}
