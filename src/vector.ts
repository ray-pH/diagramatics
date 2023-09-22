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
    mul(v: Vector2) : Vector2 {
        return new Vector2(this.x * v.x, this.y * v.y);
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
    length() : number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    length_sq() : number {
        return this.x * this.x + this.y * this.y;
    }
    angle() : number {
        return Math.atan2(this.y, this.x);
    }
    normalize() : Vector2 {
        let len = this.length();
        return new Vector2(this.x / len, this.y / len);
    }
    reflect_over_point(p : Vector2) : Vector2{
        return this.sub(p).rotate(Math.PI).add(p);
    }
    reflect_over_line(p1 : Vector2, p2 : Vector2) : Vector2 {
        let v = p2.sub(p1);
        let n = v.rotate(Math.PI / 2).normalize();
        let d = n.dot(this.sub(p1));
        let q = this.sub(n.scale(2*d));
        return q;
    }
    copy() : Vector2 {
        return new Vector2(this.x, this.y);
    }
}

/**
 * Helper function to create a Vector2
 */
export function V2(x : number, y : number) : Vector2 {
    return new Vector2(x, y);
}

/**
 * Helper function to create a Vector2 from an angle
 * @param angle angle in radians
 * @returns Vector2 with length 1
 */
export function Vdir(angle : number) : Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
}
