/**
 *  Class for 2D Vectors 
*/
export class V2 {
    constructor(public x: number, public y: number) { }
    add(v: V2) : V2 {
        return new V2(this.x + v.x, this.y + v.y);
    }
    sub(v: V2) : V2 {
        return new V2(this.x - v.x, this.y - v.y);
    }
    scale(s: number) : V2 {
        return new V2(this.x * s, this.y * s);
    }
    dot(v: V2) : number {
        return this.x * v.x + this.y * v.y;
    }
    cross(v: V2) : number {
        return this.x * v.y - this.y * v.x;
    }
    equals(v: V2) : boolean {
        return this.x == v.x && this.y == v.y;
    }
}
