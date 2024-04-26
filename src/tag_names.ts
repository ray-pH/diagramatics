/*
* For objects that contain children, having a tag is useful so that the children can be easily accessed.
*/

export enum TAG {
    LINE = "line",
    CIRCLE = "circle",
    TEXTVAR = "textvar",
    
    // prefix
    ROW_ = "row_",
    COL_ = "col_",
    
    // arrow
    ARROW_LINE = "arrow_line",
    ARROW_HEAD = "arrow_head",
    
    // table
    TABLE = "table",
    CONTAIN_TABLE = "contain_table",
    TABLE_CELL = "table_cell",
    TABLE_CONTENT = "table_content",
    
    //graph
    GRAPH_AXIS = "graph_axis_line",
    GRAPH_TICK = "graph_tick",
    GRAPH_TICK_LABEL = "graph_tick_label",
    GRAPH_GRID = "graph_grid",
}
