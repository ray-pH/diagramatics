import { Diagram, diagram_combine, line } from '../diagram.js';
import { calculate_tree_buchheim, TreeDraw } from './utils_tree.js';


export interface TreeNode {
    value: Diagram;
    children?: TreeNode[];
}

export function tree(node : TreeNode, vertical_dist : number, horizontal_gap : number) : Diagram {
    let treeDraw = calculate_tree_buchheim(node, vertical_dist, horizontal_gap);
    return diagram_from_treeDraw(treeDraw);
}

export function mirror_treenode(node : TreeNode) : TreeNode {
    return {value: node.value, children: (node.children ?? []).map(mirror_treenode).reverse()};
}

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

