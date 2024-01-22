export { 
    Diagram, Path, polygon, line, curve, empty, text, image, diagram_combine,
} from './diagram.js';

export { 
    Vector2, V2, Vdir, 
} from './vector.js';

export {
    to_degree, to_radian,
    linspace, range, array_repeat,
    linspace_exc, range_inc,
} from './utils.js'

export {
    draw_to_svg, download_svg_as_svg, download_svg_as_png,
    handle_tex_in_svg,
    default_diagram_style, default_text_diagram_style, default_textdata,
    _init_default_diagram_style, _init_default_text_diagram_style, _init_default_textdata,
    reset_default_styles,
} from './draw_svg.js';

export { 
    rectangle, square, regular_polygon, regular_polygon_side,
    circle, arc, 
    arrow, arrow1, arrow2, textvar, rectangle_corner,
} from './shapes.js'

export {
    align_vertical, align_horizontal,
    distribute_horizontal, distribute_vertical,
    distribute_horizontal_and_align, distribute_vertical_and_align, 
    distribute_grid_row,
} from './alignment.js'

export {
    str_latex_to_unicode, str_to_mathematical_italic,
} from './unicode_utils.js'

export {
    Interactive,
} from './html_interactivity.js'

export * as mod from './modifier.js'

// Extra Shapes
export { 
    axes_transform, ax, axes_empty, axes_corner_empty,
    xtickmark_empty, xtickmark, xticks,
    ytickmark_empty, ytickmark, yticks,
    xyaxes, xygrid, xycorneraxes,
    xaxis, yaxis,
    plot, plotv, plotf, under_curvef,
    axes_options,
} from './shapes/shapes_graph.js'

export * as geometry from './shapes/shapes_geometry.js'
export * as annotation from './shapes/shapes_annotation.js'
export * as mechanics from './shapes/shapes_mechanics.js'
export * as bar from './shapes/shapes_bar.js'

// Mics
export * as encoding from './encoding.js'
