/**
 * Helper function to convert from degrees to radians
 */
export function from_degree(angle: number) : number {
    return angle * Math.PI / 180;
}

/**
 *  Class for 2D Vectors 
*/
export class Vector2 {
    constructor(public x: number, public y: number) { }
    add(v: Vector2) : Vector2 {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    sub(v: Vector2) : Vector2 {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    scale(s: number) : Vector2 {
        return new Vector2(this.x * s, this.y * s);
    }
    rotate(angle: number) : Vector2 {
        let x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
        let y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
        return new Vector2(x, y);
    }
    dot(v: Vector2) : number {
        return this.x * v.x + this.y * v.y;
    }
    cross(v: Vector2) : number {
        return this.x * v.y - this.y * v.x;
    }
    equals(v: Vector2) : boolean {
        return this.x == v.x && this.y == v.y;
    }
}

/**
 * Helper function to create a Vector2
 */
export function V2(x : number, y : number) : Vector2 {
    return new Vector2(x, y);
}

export class Matrix22 {
    constructor(public a: number, public b: number, public c: number, public d: number) { }
}
