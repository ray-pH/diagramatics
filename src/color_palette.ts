// color from matpltlib's tab20
export const tab_color : {[key : string]: string} = {
    'blue'        : '#1f77b4',
    'lightblue'   : '#aec7e8',
    'orange'      : '#ff7f0e',
    'lightorange' : '#ffbb78',
    'green'       : '#2ca02c',
    'lightgreen'  : '#98df8a',
    'red'         : '#d62728',
    'lightred'    : '#ff9896',
    'purple'      : '#9467bd',
    'lightpurple' : '#c5b0d5',
    'brown'       : '#8c564b',
    'lightbrown'  : '#c49c94',
    'pink'        : '#e377c2',
    'lightpink'   : '#f7b6d2',
    'grey'        : '#7f7f7f',
    'lightgrey'   : '#c7c7c7',
    'gray'        : '#7f7f7f',
    'lightgray'   : '#c7c7c7',
    'olive'       : '#bcbd22',
    'lightolive'  : '#dbdb8d',
    'cyan'        : '#17becf',
    'lightcyan'   : '#9edae5',
}

export function get_color(colorname : string, palette : {[key : string]: string}) : string {
    return palette[colorname] ?? colorname;
}
