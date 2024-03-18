import { Diagram, diagram_combine, line } from '../diagram.js';
import { calculate_tree_buchheim, TreeDraw } from './utils_tree.js';


export interface TreeNode {
    value: Diagram;
    children?: TreeNode[];
}

/**
 * Create a tree diagram from a tree node
 * @param node root node of the tree
 * @param vertical_dist vertical distance between nodes
 * @param horizontal_gap horizontal gap between nodes
 * @returns tree diagram
 */
export function tree(node : TreeNode, vertical_dist : number, horizontal_gap : number) : Diagram {
    let treeDraw = calculate_tree_buchheim(node, vertical_dist, horizontal_gap);
    return diagram_from_treeDraw(treeDraw);
}

/**
 * Mirror a tree node
 * @param node root node of the tree
 * @returns mirrored tree node
 */
export function mirror_treenode(node : TreeNode) : TreeNode {
    return {value: node.value, children: (node.children ?? []).map(mirror_treenode).reverse()};
}

/**
 * Helper function to create a diagram from a treeDraw
 * @param node treeDraw node
 * @returns diagram
 */
function diagram_from_treeDraw(node : TreeDraw) : Diagram {
    let node_dg = node.diagram;
    let children_dglist = node.children.map(diagram_from_treeDraw);
    let line_diagrams = node.children.map(child_node => {
        let start = node_dg.get_anchor('bottom-center');
        let end = child_node.diagram.get_anchor('top-center');
        return line(start, end);
    });
    return diagram_combine(node_dg, ...line_diagrams, ...children_dglist);
}

