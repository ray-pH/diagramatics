import { Diagram, curve } from '../diagram.js';
import { V2, Vector2 } from '../vector.js';

/**
* Combine multiple curves into a single curve
* @param curves an array of curves
* \* you can reverse the order of the point in a curve by using the reverse() method
*/
export function curve_combine(...curves : Diagram[]) : Diagram {
    const points = curves.map(c => c.path?.points ?? []).flat();
    return curve(points);
}

export function bezier_quadratic(p0 : Vector2, p1 : Vector2, p2 : Vector2, n_sample = 100 ) {
    const dt = 1/(n_sample-1);
    const points = Array<Vector2>(n_sample);
    for (let i = 0; i < n_sample; i++) {
        const t = i*dt;
        // B(t) = (1-t)^2 * P0 + 2t(1-t)P1 + t^2P2
        const a = p0.scale((1-t)*(1-t));
        const b = p1.scale(2*t*(1-t));
        const c = p2.scale(t*t);
        points[i] = a.add(b).add(c);
    }
    return curve(points);
}

export function bezier_cubic(p0 : Vector2, p1 : Vector2, p2 : Vector2, p3 : Vector2, n_sample = 100 ) {
    const dt = 1/(n_sample-1);
    const points = Array<Vector2>(n_sample);
    for (let i = 0; i < n_sample; i++) {
        const t = i*dt;
        // B(t) = (1-t)^3 * P0 + 3t(1-t)^2P1 + 3t^2(1-t)P2 + t^3P3
        const a = p0.scale((1-t)*(1-t)*(1-t));
        const b = p1.scale(3*t*(1-t)*(1-t));
        const c = p2.scale(3*t*t*(1-t));
        const d = p3.scale(t*t*t);
        points[i] = a.add(b).add(c).add(d);
    }
    return curve(points);
}

// interpolations

/**
* Create a curve from the cubic spline interpolation of the given points
* @param points array of points to interpolate
* @param n number of points to interpolate between each pair of points (default 10)
*/
export function cubic_spline(points : Vector2[], n : number = 10) : Diagram {
    const interpolated_points = interpolate_cubic_spline(points, n);
    return curve(interpolated_points);
}

/**
 * Cubic spline interpolation
 * @param points array of points to interpolate
 * @param n number of points to interpolate between each pair of points (default 10)
 * @returns array of interpolated points
 */
export function interpolate_cubic_spline(points: Vector2[], n: number = 10): Vector2[] {
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
