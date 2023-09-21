export type Var<T> = T | string;
export type variable_context = {[key: string]: any};

/**
 * Class representing a variable.
 * Variable could be a `constant` or a `variable`.
 *
 * a constant is a value that is not going to change.
 * a variable is stored as a string that is going to be looked up in the context.
 *
 * @class Variable 
 * @template T
 */
export class Variable<T> {
    public type  : 'constant' | 'variable';
    public value : Var<T>;

    constructor(value: Var<T>) { 
        if (typeof value === 'string') {
            this.type = 'variable';
            this.value = value;
        } else {
            this.type = 'constant';
            this.value = value;
        }
    }

    /**
     * Set the variable to be a constant.
     * for now, const string need to be defined this way.
     * @example
     * let st = new Variable('hello').const();
    */
    public const() : Variable<T> {
        this.type = 'constant'
        return this;
    }

    public copy() : Variable<T> {
        let newvar = { 
            type : this.type, 
            value : this.value };
        Object.setPrototypeOf(newvar, Variable.prototype);
        return newvar as Variable<T>;
    }

    /**
     * Evaluate the variable in the context.
     * will return undefined if the variable is not found in the context.
     * @param variables context to evaluate the variable in
     * @returns the value of the variable
    */
    public eval(variables : variable_context) : T | undefined {
        if (this.type === 'variable') {
            if (typeof this.value !== 'string') throw new Error('Unreachable : Variable value must be a string');
            // check if variables has this key
            if (!(this.value in variables)) {
                console.warn(`Variable ${this.value} not found in context`)
                return undefined;
            }
            return variables[this.value];
        } else {
            return this.value as T;
        }
    }
}
