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

export function V2(x : number, y : number) : Vector2 {
    return new Vector2(x, y);
}
