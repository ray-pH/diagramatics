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
    copy() : Vector2 {
        return new Vector2(this.x, this.y);
    }
    apply(f : (v : Vector2) => Vector2) : Vector2 {
        return f(this.copy());
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


// transformation functions
type TransformFunc = (p : Vector2) => Vector2;
export class Transform {
    static translate(v : Vector2) : TransformFunc {
        return (p : Vector2) => p.add(v);
    }
    static rotate(angle : number, pivot : Vector2) : TransformFunc {
        return (p : Vector2) => p.sub(pivot).rotate(angle).add(pivot);
    }
    static scale(scale : Vector2, origin : Vector2) : TransformFunc {
        return (p : Vector2) => p.sub(origin).mul(scale).add(origin);
    }
    static reflect_over_point(q : Vector2) : TransformFunc {
        return (p : Vector2) => p.sub(q).rotate(Math.PI).add(q);
    }
    static reflect_over_line(p1 : Vector2, p2 : Vector2) : TransformFunc {
        let v = p2.sub(p1);
        let n = v.rotate(Math.PI / 2).normalize();
        return (p : Vector2) => {
            let d = n.dot(p.sub(p1));
            return p.sub(n.scale(2*d));
        }   
    }
    static skewX(angle : number, ybase : number) : TransformFunc {
        return (p : Vector2) => {
            let x = p.x + (ybase - p.y) * Math.tan(angle);
            return new Vector2(x, p.y);
        }
    }
    static skewY(angle : number, xbase : number) : TransformFunc {
        return (p : Vector2) => {
            let y = p.y + (xbase - p.x) * Math.tan(angle);
            return new Vector2(p.x, y);
        }
    }
};
