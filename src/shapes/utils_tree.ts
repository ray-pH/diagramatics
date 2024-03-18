import { Diagram } from '../diagram.js';
import { V2 } from '../vector.js';
import { size } from './shapes_geometry.js';
import type { TreeNode } from './shapes_tree.js';

// C. Buchheim, M. J Unger, and S. Leipert. Improving Walker's algorithm to run in linear time. In Proc. Graph Drawing (GD), 2002. http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.16.8757
// article : https://llimllib.github.io/pymag-trees/
export class TreeDraw  {
    diagram: Diagram;
    size: [number,number];
    tree: TreeNode;
    children: TreeDraw[];
    x : number; 
    y : number;
    parent: TreeDraw | undefined;
    thread: TreeDraw | undefined;
    mod: number;
    ancestor: TreeDraw;
    change: number;
    shift: number;
    number: number;

    constructor(tree: TreeNode, parent : TreeDraw | undefined, depth : number = 0, number : number = 0) {
        this.diagram = tree.value;
        this.size = size(this.diagram);
        this.x = -1.0;
        this.y = depth;
        this.tree = tree;
        let tree_children = tree.children ?? [];
        this.children = tree_children.map((child, i) => new TreeDraw(child, this, depth + 1, i));
        this.parent = parent;
        this.thread = undefined;
        this.mod = 0;
        this.ancestor = this;
        this.change = 0;
        this.shift = 0;
        this.number = number;
    }

    left() : TreeDraw | undefined {
        if (this.thread) return this.thread;
        if (this.children.length > 0) return this.children[0];
        return undefined;
    }
    right() : TreeDraw | undefined{
        if (this.thread) return this.thread;
        if (this.children.length > 0) return this.children[this.children.length-1];
        return undefined;
    }
    lsibling() : TreeDraw | undefined {
        if (!this.parent) return undefined;
        if (this.number > 0) return this.parent.children[this.number-1];
        return undefined;
    }
}

export function calculate_tree_buchheim(tree : TreeNode, vertical_dist : number, horizontal_gap : number) : TreeDraw{
    let treeDraw = new TreeDraw(tree, undefined);
    let dt = first_walk(treeDraw, horizontal_gap);
    let min = second_walk(dt, 0, 0, vertical_dist, 0);
    if (min < 0) third_walk(dt, -min);
    position_diagram(dt);
    return dt;
}

function position_diagram(tree : TreeDraw) {
    tree.diagram = tree.diagram.position(V2(tree.x, tree.y));
    tree.children.forEach(position_diagram);
}

function third_walk(td : TreeDraw, n : number){
    td.x += n;
    td.children.forEach(child => third_walk(child, n));
}

function first_walk(td : TreeDraw, horizontal_gap : number){
    let self_halfwidth = td.size[0] / 2;
    if (td.children.length === 0){
        let lbrother = td.lsibling();
        if (lbrother) {
            let lbrother_halfwidth = lbrother.size[0] / 2;
            let dist = lbrother_halfwidth + self_halfwidth + horizontal_gap;
            td.x = lbrother.x + dist;
        } else {
            td.x = 0
        }
    } else {
        let default_ancestor = td.children[0];
        td.children.forEach(w => {
            first_walk(w, horizontal_gap);
            default_ancestor = apportion(w, default_ancestor, horizontal_gap);
        });
        execute_shifts(td);
        let midpoint = (td.children[0].x + td.children[td.children.length-1].x) / 2;
        let lbrother = td.lsibling();
        if (lbrother){
            let lbrother_halfwidth = lbrother.size[0] / 2;
            let dist = lbrother_halfwidth + self_halfwidth + horizontal_gap;
            td.x = lbrother.x + dist;
            td.mod = td.x - midpoint;
        } else {
            td.x = midpoint;
        }
    }
    return td;
}

type V = TreeDraw | undefined;
function apportion(v : TreeDraw, default_ancestor : TreeDraw, horizontal_gap : number) {
    let w = v.lsibling();
    if (w !== undefined) {
        let lmost_sibling = (!v.parent || v.number === 0) ? undefined : v.parent.children[0];
        let vir : V = v;
        let vor : V = v;
        let vil : V = w;
        let vol : V = lmost_sibling ;
        let sir = v.mod;
        let sor = v.mod;
        let sil = vil.mod;
        let sol = vol!.mod;

        while (vil?.right() !== undefined && vir?.left() !== undefined) {
            vil = vil.right();
            vir = vir.left();
            vol = vol?.left();
            vor = vor?.right();
            vor!.ancestor = v;
            let lhalfwidth = vil!.size[0] / 2;
            let rhalfwidth = vir!.size[0] / 2;
            let dist = lhalfwidth + rhalfwidth + horizontal_gap;
            let shift = (vil!.x + sil) - (vir!.x + sir) + dist;
            if (shift > 0) {
                let a = ancestor(vil!, v, default_ancestor);
                move_subtree(a, v, shift);
                sir += shift;
                sor += shift;
            }
            sil += vil!.mod;
            sir += vir!.mod;
            sol += vol!.mod;
            sor += vor!.mod;
        }
        if (vil!.right() !== undefined && vor!.right() === undefined) {
            vor!.thread = vil!.right();
            vor!.mod += sil - sor;
        } else {
            if (vir?.left() !== undefined && vol?.left() === undefined) {
                vol!.thread = vir.left();
                vol!.mod += sir - sol;
            }
            default_ancestor = v;
        }
    }
    return default_ancestor;
}

function move_subtree(wl : TreeDraw, wr : TreeDraw, shift : number){
    let subtrees = wr.number - wl.number;
    wr.change -= shift / subtrees;
    wr.shift += shift;
    wl.change += shift / subtrees;
    wr.x += shift;
    wr.mod += shift;
}

function execute_shifts(td : TreeDraw){
    let shift = 0;
    let change = 0;
    for (let i = td.children.length - 1; i >= 0; i--){
        let w = td.children[i];
        w.x += shift;
        w.mod += shift;
        change += w.change;
        shift += w.shift + change;
    }
}

function ancestor(vil : TreeDraw, v : TreeDraw, default_ancestor : TreeDraw){
    if (v.parent?.children.includes(vil.ancestor)) return vil.ancestor;
    return default_ancestor;
}

function second_walk(td : TreeDraw, m : number, depth : number, vertical_dist : number, min? : number){
    td.x += m;
    td.y = -depth * vertical_dist;

    // if (min === undefined) min = v.x;
    min = Math.min(min ?? td.x, td.x);

    td.children.forEach(w => {
        min = second_walk(w, m + td.mod, depth + 1, vertical_dist, min);
    });
    return min;
}
