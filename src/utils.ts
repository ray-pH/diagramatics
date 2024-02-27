import { Vector2, V2 } from "./vector.js";

/**
 * Helper function to convert from degrees to radians
 */
export function to_radian(angle: number) : number {
    return angle * Math.PI / 180;
}

/**
 * Helper function to convert from radians to degrees
 */
export function to_degree(angle: number) : number {
    return angle * 180 / Math.PI;
}



export function array_repeat<T>(arr : T[], len : number) : T[] {
    let new_arr : T[] = [];
    for (let i = 0; i < len; i++) {
        new_arr.push(arr[i % arr.length]);
    }
    return new_arr;
}

/**
 * Create a equivalently spaced array of numbers from start to end (inclusive) 
 * [start, end]
 * @param start start value
 * @param end end value
 * @param n number of points
 */
export function linspace(start: number, end: number, n: number = 100) : number[] {
    let result = [];
    let step = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) {
        result.push(start + step * i);
    }
    return result;
}

/**
 * Create a equivalently spaced array of numbers from start to end (exclusice) 
 * [start, end)
 * @param start start value
 * @param end end value
 * @param n number of points
 */
export function linspace_exc(start: number, end: number, n: number = 100) : number[] {
    let result = [];
    let step = (end - start) / n;
    for (let i = 0; i < n; i++) {
        result.push(start + step * i);
    }
    return result;
}

/**
 * Create a equivalently spaced array of numbers from start to end (exclusive)
 * [start, end)
 * @param start start value
 * @param end end value
 * @param step step size
 */
export function range(start: number, end: number, step: number = 1) : number[] {
    // step cannot be 0 and cannot be in the wrong direction
    if (step == 0) return [];
    let n = Math.floor((end - start) / step);
    if (n <= 0) return [];

    let result = [];
    if (step > 0){
        for (let i = start; i < end; i += step) {
            result.push(i);
        }
    } else {
        for (let i = start; i > end; i += step) {
            result.push(i);
        }
    }
    return result;
}

/**
 * Create a equivalently spaced array of numbers from start to end (inc)
 * [start, end]
 * @param start start value
 * @param end end value
 * @param step step size
 */
export function range_inc(start: number, end: number, step: number = 1) : number[] {
    // step cannot be 0 and cannot be in the wrong direction
    if (step == 0) return [];
    let n = Math.floor((end - start) / step);
    if (n <= 0) return [];

    let result = [];
    if (step > 0){
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
    } else {
        for (let i = start; i >= end; i += step) {
            result.push(i);
        }
    }
    return result;
}

/**
 * Transpose a 2D array
 * if the array is not a rectangle, the transposed array will be padded with undefined
 * @param arr 2D array
 * @returns transposed 2D array
 */
export function transpose<T>(arr : T[][]) : (T|undefined)[][] {
    let result : T[][] = [];
    let n = Math.max(...arr.map(a => a.length));
    for (let i = 0; i < n; i++) {
        result.push([]);
        for (let j = 0; j < arr.length; j++) {
            result[i].push(arr[j][i]);
        }
    }
    return result;
}

// interpolations

export function cubic_spline(points: Vector2[], n: number = 10): Vector2[] {
    const n_points = points.length;
    let a: number[] = points.map(p => p.y);
    let b: number[] = new Array(n_points).fill(0);
    let d: number[] = new Array(n_points).fill(0);
    let h: number[] = new Array(n_points - 1);
    for (let i = 0; i < n_points - 1; i++) {
        h[i] = points[i + 1].x - points[i].x;
    }

    // Solve tridiagonal system for the c[i] coefficients (second derivatives)
    let alpha : number[] = new Array(n_points - 1).fill(0);
    let c     : number[] = new Array(n_points).fill(0);
    let l     : number[] = new Array(n_points).fill(1);
    let mu    : number[] = new Array(n_points).fill(0);
    let z     : number[] = new Array(n_points).fill(0);

    for (let i = 1; i < n_points - 1; i++) {
        alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
    }

    for (let i = 1; i < n_points - 1; i++) {
        l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    // Back substitution
    for (let j = n_points - 2; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    // Now that we have coefficients, we can construct the spline between each pair of points
    let spline_points: Vector2[] = [];
    for (let i = 0; i < n_points - 1; i++) {
        for (let j = 0; j <= n; j++) {
            let x = points[i].x + j * (points[i + 1].x - points[i].x) / n;
            let y = a[i] + b[i] * (x - points[i].x) + c[i] * Math.pow(x - points[i].x, 2) + d[i] * Math.pow(x - points[i].x, 3);
            spline_points.push(V2(x, y));
        }
    }

    return spline_points;
}
