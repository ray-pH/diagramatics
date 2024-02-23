import { Diagram, diagram_combine, line, empty } from '../diagram.js';
import { V2 } from '../vector.js';
import { size } from './shapes_geometry.js';

export enum TAG {
    TREE_NODE_VALUE = 'tree_node_value',
    TREE_NODE     = 'tree_node',
    TREE_CHILDREN = 'tree_children',
}

export interface TreeNode {
    value: Diagram;
    children?: TreeNode[];
}

export interface CalculatedTreeNode extends TreeNode {
    children: CalculatedTreeNode[];
    total_width: number;
}

// export function binary_tree(tree : TreeNode, vertical_gap : number, horizontal_gap : number) : Diagram {
// }

/**
 * Create a tree diagram from a tree node
 * @param tree_node the root of the tree
 * @param vertical_dist the vertical gap between nodes
 * @param horizontal_gap the horizontal gap between nodes
 * @returns a diagram of the tree
 */
export function tree(tree_node : TreeNode, vertical_dist : number, horizontal_gap : number) : Diagram {
    let calculated_tree = calculate_tree(tree_node, horizontal_gap);
    return tree_calculated(calculated_tree, vertical_dist, horizontal_gap);
}

/**
 * helper function to create a tree diagram from a calculated tree node
 */
function tree_calculated(tree_c_node : CalculatedTreeNode, vertical_dist : number, horizontal_gap : number) : Diagram {
    let self_dg = tree_c_node.value.position(V2(0,0)).append_tag(TAG.TREE_NODE_VALUE);
    if (!tree_c_node.children?.length) return self_dg;

    let children_widths = tree_c_node.children.map((child) => child.total_width);

    let y_position = -vertical_dist;
    let x_positions : number[] = [];
    let left = -tree_c_node.total_width / 2;
    for (let i = 0; i < tree_c_node.children.length; i++) {
        let width = children_widths[i];
        x_positions.push(left + width/2);
        left += width + horizontal_gap;
    }

    let children_diagrams = tree_c_node.children.map((child, i) => {
        let child_dg = tree_calculated(child, vertical_dist, horizontal_gap);
        let x = x_positions[i]; let y = y_position;
        return child_dg.translate(V2(x, y));
    });

    let p_self_bottom = self_dg.get_anchor('bottom-center');
    let line_diagrams = children_diagrams.map((child) => {
        let child_node_value_dg : Diagram = empty();
        if (child.tags.includes(TAG.TREE_NODE_VALUE)) {
            child_node_value_dg = child;
        } else if (child.tags.includes(TAG.TREE_NODE)) {
            for (let i = 0; i < child.children.length; i++) {
                if (child.children[i].tags.includes(TAG.TREE_NODE_VALUE)) {
                    child_node_value_dg = child.children[i];
                    break;
                }
            }
        }
        let p_child_top = child_node_value_dg.get_anchor('top-center');
        return line(p_self_bottom, p_child_top);
    })

    let line_diagram = diagram_combine(...line_diagrams);
    let children_diagram = diagram_combine(...children_diagrams).append_tag(TAG.TREE_CHILDREN);
    return diagram_combine(self_dg, line_diagram, children_diagram).append_tag(TAG.TREE_NODE);
}

/**
 * helper function to calculate the width of a tree node and its children
 */
function calculate_tree(tree : TreeNode, horizontal_gap : number) :  CalculatedTreeNode {
    if (!tree.children?.length) return { 
        value: tree.value, children: [], total_width: size(tree.value)[0], 
    };

    let children = tree.children.map((child) => calculate_tree(child, horizontal_gap));
    let gap_width = (tree.children.length - 1) * horizontal_gap;
    let children_widths = children.map((child) => child.total_width).reduce((a, b) => a + b, 0);
    let total_width = children_widths + gap_width;
    return { value: tree.value, children, total_width };
}

/**
 * helper function to collect all diagrams in a tree
*/
function collect_diagrams(tree : TreeNode) : Diagram[] {
    let diagrams = [tree.value];
    if (!tree.children) return diagrams;
    for (let i = 0; i < tree.children.length; i++) {
        diagrams = diagrams.concat(collect_diagrams(tree.children[i]));
    }
    return diagrams;
}
