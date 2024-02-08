// BBCode parser for multiline text object
//

enum BB_TokenType {
    TEXT      = "TEXT",
    OPEN_TAG  = "OPEN_TAG",
    CLOSE_TAG = "CLOSE_TAG",
    EOF       = "EOF",
}
type BB_Token = {
    type       : BB_TokenType,
    attributes : { [key: string]: string }
}

export class BB_Lexer {
    static parse_tag_content(str : string) : BB_Token {
        if (str[0] === "/") {
        // close tag
            let name = str.substring(1);
            return {
                type: BB_TokenType.CLOSE_TAG,
                attributes: {_tag_name : name}
            }
        }

        // open tag
        let space_id = str.indexOf(" ");
        let equal_id = str.indexOf("=");
        if (space_id === -1 && equal_id === -1) {
        // [name]
            return {
                type: BB_TokenType.OPEN_TAG,
                attributes: {_tag_name : str}
            }
        }
        if (space_id === -1 && equal_id > 0) {
        // [name=value]
            let name = str.substring(0, equal_id);
            let value = str.substring(equal_id + 1);
            let attributes : any = {_tag_name : name}
            attributes[name] = value;
            return {
                type: BB_TokenType.OPEN_TAG,
                attributes
            }
        }
        // [name attr1=value1 attr2=value2]
        throw new Error("Unimplemented");
    }

    static parse(text : string) : BB_Token[] | null {
        let tokens : BB_Token[] = [];

        let pos = 0;
        let len = text.length;
        while (pos < len) {
            // Find the next tag
            // Find [
            let TagLeft = text.indexOf("[", pos);
            if (TagLeft === -1) {
            // no more tags, add the rest of the text
                tokens.push({ 
                    type: BB_TokenType.TEXT, 
                    attributes: {_text : text.substring(pos)} 
                });
                break;
            }
            if (TagLeft > pos) {
            // add the text before the [
                tokens.push({ 
                    type: BB_TokenType.TEXT, 
                    attributes: {_text : text.substring(pos, TagLeft)} 
                });
            }

            // find ]
            let TagRight = text.indexOf("]", TagLeft);
            let nextTagLeft  = text.indexOf("[", TagLeft + 1);
            // make sure there is no [ between the [ and ]
            if (nextTagLeft > 0 && nextTagLeft < TagRight) return null;
            // make sure there is a ] after the [
            if (TagRight === -1) return null;

            let tag_content = text.substring(TagLeft + 1, TagRight);
            tokens.push(BB_Lexer.parse_tag_content(tag_content));

            pos = TagRight + 1;
        }
        return tokens;
    }
}

export class BB_multiline {
    static from_BBCode(text : string, linespace : string = "1em") {
        let tspans : {text : string, style : {}}[]  = []
        let tag_stack : { [key: string]: string }[] = [];
        let tokens = BB_Lexer.parse(text);
        if (tokens === null) {
            console.error("Invalid BBCode");
            return;
        }
        for (let token of tokens) {
            switch (token.type) {
                case BB_TokenType.OPEN_TAG: {
                    // if the token is [br] then add a new line
                    if (token.attributes['_tag_name'] === "br") {
                        tspans.push({text: "\n", style: {dy: linespace}});
                        break;
                    }
                    tag_stack.push(token.attributes);
                } break;
                case BB_TokenType.CLOSE_TAG: {
                    if (tag_stack.length === 0) {
                        console.error("Invalid BBCode");
                        return;
                    }
                    let tag_top = tag_stack[tag_stack.length - 1];
                    if (tag_top['_tag_name'] !== token.attributes['_tag_name']) {
                        console.error("Invalid BBCode");
                        return;
                    }
                    tag_stack.pop();
                } break;
                case BB_TokenType.TEXT: {
                    let style = BB_multiline.build_style(tag_stack);
                    tspans.push({text: token.attributes['_text'], style});
                } break;
            }
        }

        return tspans;
    }

    static build_style(tag_stack : { [key: string]: string }[]) {
        let style : any = {};
        for (let tag of tag_stack) {
            switch (tag['_tag_name']) {
                case "b"     : style["font-weight"] = "bold"; break;
                case "i"     : style["font-style"] = "italic"; break;
                case "color" : style["fill"] = tag["color"]; break;
                case "size"  : style["font-size"] = tag["size"]; break;
                case "dx"    : style["dx"] = tag["dx"]; break;
                case "dy"    : style["dy"] = tag["dy"]; break;
                case "font"  : style["font-family"] = tag["font"]; break;
                case "var"   : style["textvar"] = true; break;
                case "tag"   : style["tag"] = tag["tag"]; break;
            }
        }
        return style;
    }
}

