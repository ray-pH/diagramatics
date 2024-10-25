import { Diagram, diagram_combine } from '../diagram.js';
import { rectangle_corner } from '../shapes.js';
import { V2, Vector2 } from '../vector.js';
import { transpose, expand_directional_value } from '../utils.js';
import { TAG } from '../tag_names.js';

enum TableOrientation {
    ROWS    = 'rows',
    COLUMNS = 'columns',
}

export type cell_style = { index : [number,number], fill? : string, stroke? : string, strokewidth? : number };
export type alignment_config = string[][];

/**
 * Create a table with diagrams inside
 * @param diagrams 2D array of diagrams
 * @param orientation orientation of the table (default: 'rows')
 * can be 'rows' or 'columns'
 * @param min_rowsize minimum size of each row
 * @param min_colsize minimum size of each column
 * @returns a diagram of the table with the diagrams inside
 */
export function table(diagrams : Diagram[][], padding : number | number[] = 0, orientation : TableOrientation = TableOrientation.ROWS, 
    min_rowsize : number = 0, min_colsize : number = 0) : Diagram {
        
    const config = {
        padding,
        orientation,
        min_rowsize,
        min_colsize,
    };
    return advanced_table(diagrams, config);
}

export interface advanced_table_config {
    padding? : number | number[]; // 0
    orientation? : TableOrientation; // TableOrientation.ROWS
    min_rowsize? : number; // 0
    min_colsize? : number; // 0
    alignment? : string[][]; // []
}
/**
 * Create a table with diagrams inside
 * @param diagrams 2D array of diagrams
 * @param config, config for the table
 * ```typescript
 * interface advanced_table_config {
 *     padding? : number | number[]; // 0
 *     orientation? : 'rows' | 'columns'; // 'rows'
 *     min_rowsize? : number; // 0
 *     min_colsize? : number; // 0
 *     alignment? : string[][]; // []
 * }
 * ```
 */
export function advanced_table(diagrams : Diagram[][], config: advanced_table_config) : Diagram {
    const padding = config.padding ?? 0;
    const orientation = config.orientation ?? TableOrientation.ROWS;
    const min_rowsize = config.min_rowsize ?? 0;
    const min_colsize = config.min_colsize ?? 0;
    const alignment = config.alignment ?? [];
    
    // if the orientation is columns, then we just transpose the rows and columns
    let diagram_rows = orientation == TableOrientation.ROWS ? diagrams : transpose(diagrams);

    const pad = expand_directional_value(padding);
    function f_size(d? : Diagram) : [number, number] {
        if (d == undefined) return [min_colsize, min_rowsize];
        let [bottomleft, topright] = d.bounding_box();
        let width  = topright.x - bottomleft.x + pad[1] + pad[3];
        let height = topright.y - bottomleft.y + pad[0] + pad[2];
        return [width, height];
    }

    let row_count = diagram_rows.length;
    let col_count = Math.max(...diagram_rows.map(row => row.length));
    let rowsizes : number[] = Array(row_count).fill(min_rowsize);
    let colsizes : number[] = Array(col_count).fill(min_colsize);
    // find the maximum size of each row and column
    for (let r = 0; r < row_count; r++) {
        for (let c = 0; c < col_count; c++) {
            let [w, h] = f_size(diagram_rows[r][c]);
            rowsizes[r] = Math.max(rowsizes[r], h);
            colsizes[c] = Math.max(colsizes[c], w);
        }
    }

    return fixed_size(diagrams, rowsizes, colsizes, orientation, pad, alignment);
}

/**
 * WARNING: Deprecated, use tags instead
 * Style the cells of a table
 * @param table_diagram a diagram of a table
 * @param styles an array of cell styles
 * each style has an index of the cell and the style
 * e.g. { index : [0,0], fill : 'red', stroke : 'black', strokewidth : 2 }
 * not all styles are required
 * e.g. { index : [0,0], fill : 'red' }
 * @returns a new diagram with the cells styled
 */
export function style_cell(table_diagram : Diagram, styles : cell_style[]) : Diagram {
    let newd = table_diagram.copy();
    if (table_diagram.tags.includes(TAG.CONTAIN_TABLE)) {
        let table_index = newd.children.findIndex(d => d.tags.includes(TAG.TABLE));
        let new_table = style_cell(newd.children[table_index], styles);
        newd.children[table_index] = new_table;
        return newd;
    }
    else if (!table_diagram.tags.includes(TAG.TABLE)) { return table_diagram; }

    for (let style of styles) {
        let [r, c] = style.index;
        let cell = newd.children[r].children[c];
        if (style.fill) { cell = cell.fill(style.fill); }
        if (style.stroke) { cell = cell.stroke(style.stroke); }
        if (style.strokewidth) { cell = cell.strokewidth(style.strokewidth); }
        newd.children[r].children[c] = cell;
    }
    return newd;
}

/**
 * Create a table with fixed size
 * @param diagrams 2D array of diagrams
 * @param rowsizes size of each row
 * if `rowsizes.length` is less than `diagrams.length`, the last value will be repeated
 * e.g. [1,2,3] -> [1,2,3,3,3]
 * @param colsizes size of each column
 * if `colsizes.length` is less than `diagrams[0].length`, the last value will be repeated
 * @param orientation orientation of the table (default: 'rows')
 * can be 'rows' or 'columns'
 * @alignment alignment config for the table
 * @returns a diagram of the table with the diagrams inside
 */
export function fixed_size(diagrams : Diagram[][], rowsizes : number[], colsizes : number[]
    , orientation: TableOrientation = TableOrientation.ROWS, padding: number|number[] = 0,
    alignment: alignment_config = []) : Diagram
{
    const pad = expand_directional_value(padding);
    // if the orientation is columns, then we just transpose the rows and columns
    let diagram_rows = orientation == TableOrientation.ROWS ? diagrams : transpose(diagrams);
    let row_count = diagram_rows.length;
    let col_count = Math.max(...diagram_rows.map(row => row.length));

    const empty_map = get_empty_map(diagrams);
    const table = empty_fixed_size(row_count, col_count, rowsizes, colsizes, empty_map);
    const cells = get_padded_cells(table, pad);

    let diagram_grid : Diagram[] = [];
    for (let r = 0; r < row_count; r++) {
        for (let c = 0; c < col_count; c++) {
            let d = diagram_rows[r][c];
            if (d == undefined) continue;
            d = d.append_tags(TAG.TABLE_CONTENT)
                .append_tags(TAG.ROW_ + r)
                .append_tags(TAG.COL_ + c);
            const alignment_value: any = alignment[r]?.[c] ?? 'center-center';
            console.log(r,c,alignment_value);
            d = d.move_origin(alignment_value).position(cells[r][c].get_anchor(alignment_value))
            diagram_grid.push(d);
        }
    }
    let diagram_grid_combined = diagram_combine(...diagram_grid);
    return diagram_combine(table, diagram_grid_combined).append_tags(TAG.CONTAIN_TABLE);
}

function get_empty_map(diagrams : Diagram[][]) : boolean[][] {
    let row_count = diagrams.length;
    let col_count = Math.max(...diagrams.map(row => row.length));
    let empty_indices_map : boolean[][] = Array(row_count).fill(false).map(() => Array(col_count).fill(false));
    for (let r = 0; r < row_count; r++) {
        for (let c = 0; c < col_count; c++) {
            const d = diagrams[r][c];
            if (d == undefined || d?.is_empty?.()) 
                empty_indices_map[r][c] = true;
        }
    }
    return empty_indices_map;
}

/**
 * Create an empty table with fixed size
 * @param row_count number of rows
 * @param col_count number of columns
 * @param rowsizes size of each row
 * if `rowsizes.length` is less than `row_count`, the last value will be repeated
 * e.g. [1,2,3] -> [1,2,3,3,3]
 * @param colsizes size of each column
 * if `colsizes.length` is less than `col_count`, the last value will be repeated
 */
export function empty_fixed_size(row_count : number, col_count : number, 
    rowsizes : number[], colsizes : number[], empty_map : boolean[][]
) : Diagram 
{
    while (rowsizes.length < row_count) { rowsizes.push(rowsizes[rowsizes.length-1]); }
    while (colsizes.length < col_count) { colsizes.push(colsizes[colsizes.length-1]); }

    let rows : Diagram[] = [];
    let y_top = 0;
    for (let r = 0; r < row_count; r++) {
        let y_bot   = y_top - rowsizes[r];
        let x_left = 0;
        let cols : Diagram[] = [];
        for (let c = 0; c < col_count; c++) {
            let x_right = x_left + colsizes[c];
            let x_mid = (x_left + x_right) / 2;
            let y_mid = (y_top + y_bot) / 2;

            //TODO: draw line instead of recangles
            let rect = rectangle_corner(V2(x_left, y_bot), V2(x_right, y_top)).move_origin(V2(x_mid, y_mid))
                .append_tags(TAG.TABLE_CELL)
                .append_tags(TAG.ROW_ + r)
                .append_tags(TAG.COL_ + c);
            if (empty_map[r][c]) rect = rect.append_tags(TAG.EMPTY_CELL);
            cols.push(rect);
            x_left = x_right;
        }
        rows.push(diagram_combine(...cols));
        y_top = y_bot;
    }

    return diagram_combine(...rows).append_tags(TAG.TABLE);
}

/**
 * Get the midpoints of the cells from a table diagram
 * @param table_diagram a table diagram
 * @returns a 2D array of points
 * the first index is the row, the second index is the column
 */
export function get_points(table_diagram : Diagram) : Vector2[][] {
    let table_diagram_ = table_diagram;
    if (table_diagram.tags.includes(TAG.CONTAIN_TABLE)) {
        for (let d of table_diagram.children){
            if (d.tags.includes(TAG.TABLE)) {
                table_diagram_ = d;
                break;
            }
        }
    }
    if (!table_diagram_.tags.includes(TAG.TABLE)) return [];

    let rows : Vector2[][] = [];
    for (let row of table_diagram_.children){
        let cols : Vector2[] = [];
        for (let cell of row.children){
            cols.push(cell.origin);
        }
        rows.push(cols);
    }
    return rows;
}

/**
 * Get the padded cells of a table diagram
 * @param table_diagram a table diagram
 * @returns a 2D array of Diagram
 */
export function get_padded_cells(table_diagram : Diagram, padding: number|number[] = 0) : Diagram[][] {
    const pad = expand_directional_value(padding);
    
    let table_diagram_ = table_diagram;
    if (table_diagram.tags.includes(TAG.CONTAIN_TABLE)) {
        for (let d of table_diagram.children){
            if (d.tags.includes(TAG.TABLE)) {
                table_diagram_ = d;
                break;
            }
        }
    }
    if (!table_diagram_.tags.includes(TAG.TABLE)) return [];

    let rows : Diagram[][] = [];
    for (let row of table_diagram_.children){
        let cols : Diagram[] = [];
        for (let cell of row.children){
            const [cell_bottomleft, cell_topright] = cell.bounding_box();
            // include the padding
            const bottomleft = cell_bottomleft.add(V2(pad[3], pad[2]));
            const topright = cell_topright.sub(V2(pad[1], pad[0]));
            cols.push(rectangle_corner(bottomleft, topright));
        }
        rows.push(cols);
    }
    return rows;
}