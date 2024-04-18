/*
* For objects that contain children, having a tag is useful so that the children can be easily accessed.
*/

export enum TAG {
    LINE = "line",
    CIRCLE = "circle",
    TEXTVAR = "textvar",
    
    // arrow
    ARROW_LINE = "arrow_line",
    ARROW_HEAD = "arrow_head",
    
    // table
    TABLE = "table",
    CONTAIN_TABLE = "contain_table",
    
    //graph
    GRAPH_AXIS = "graph_axis_line",
    GRAPH_TICK = "graph_tick",
    GRAPH_TICK_LABEL = "graph_tick_label",
    GRAPH_GRID = "graph_grid",
}
