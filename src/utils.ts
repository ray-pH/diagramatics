export function array_repeat<T>(arr : T[], len : number) : T[] {
    let new_arr : T[] = [];
    for (let i = 0; i < len; i++) {
        new_arr.push(arr[i % arr.length]);
    }
    return new_arr;
}
