/**
 * Helper function to convert from degrees to radians
 */
export function from_degree(angle: number) : number {
    return angle * Math.PI / 180;
}


export function array_repeat<T>(arr : T[], len : number) : T[] {
    let new_arr : T[] = [];
    for (let i = 0; i < len; i++) {
        new_arr.push(arr[i % arr.length]);
    }
    return new_arr;
}

/**
 * Create a equivalently spaced array of numbers from start to end
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
 * Create a equivalently spaced array of numbers from start to end
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
    for (let i = start; i < end; i += step) {
        result.push(i);
    }
    return result;
}
