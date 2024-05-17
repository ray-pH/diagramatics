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

/* @return [top, right, bottom, left] */
export function expand_directional_value(padding : number | number[]) : [number,number,number,number] {
    let p = padding;
    if (typeof p === 'number') return [p,p,p,p];
    if (!Array.isArray(p)) return [0,0,0,0];
    if (p.length === 1) return [p[0], p[0], p[0], p[0]];
    if (p.length === 2) return [p[0], p[1], p[0], p[1]];
    if (p.length === 3) return [p[0], p[1], p[2], p[1]];
    if (p.length >= 4)  return [p[0], p[1], p[2], p[3]];
    return [0,0,0,0];
}
