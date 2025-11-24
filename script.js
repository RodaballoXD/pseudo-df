'use strict';

function base64ToUint8Array(base64) {

    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function base64_to_json(string) {

    const decodedBytes = base64ToUint8Array(string);

    const decompressed = pako.ungzip(decodedBytes, {
        to: 'string'
    });
    return JSON.parse(decompressed);
}

function get_base64_code(string) {
    const needle = ',"code":"';
    const startIndex = string.indexOf(needle);
    const trimmedStart = string.slice(startIndex + needle.length);
    const endMarker = "\"}'";
    const endIndex = trimmedStart.indexOf(endMarker);
    const trimmed = trimmedStart.slice(0, endIndex);
    return trimmed;
}

function json_to_pseudo_df(code) {

    const blocks = Array.from(code.blocks); 
    if (blocks.length === 0) return '';
    const first = blocks.shift();
    let string_code = handle_line_starter(first) + ' {';
    let indentation = 1;

    for (const block of blocks) {
        if (block.id === 'block') {
            string_code += '\n' + ' '.repeat(indentation * 4) + process_block(block, ';');
        } else if (block.id === 'bracket') {
            if (block.direct === 'open') {
                indentation += 1;

                string_code = string_code.slice(0, -1);
                string_code += ' {';
            } else {
                indentation -= 1;
                if (indentation < 0) indentation = 0;
                string_code += '\n' + ' '.repeat(indentation * 4) + '}';
            }
        } else {
            throw new Error('NOT A BLOCK NOR A BRACKET!');
        }
    }

    string_code += '\n}';
    return string_code;
}

function process_block(block, end_char = ';') {
    const block_type = block.block;
    if (block_type === 'else') return `else${end_char}`;

    let block_action;
    if (Object.prototype.hasOwnProperty.call(block, 'action')) block_action = block.action;
    else if (Object.prototype.hasOwnProperty.call(block, 'data')) block_action = block.data;
    else throw new Error('Not action nor data!!');

    const chest_contents = block.args && block.args.items ? block.args.items : [];
    const args = chest_contents.filter(i => i.item && i.item.id !== 'bl_tag');
    const tags = chest_contents.filter(i => i.item && i.item.id === 'bl_tag');

    const custom_sintax = custom_code_action_sintax(block_type, block_action, args, tags);
    if (custom_sintax) {
        console.log('Custom Sintax!');
        return custom_sintax + end_char;
    }

    const values = process_args_and_tags(args, tags);

    const values_str = values.join(', ');
    if (block_action === '') block_action = 'UNDEFINED_ACTION';
    const action = `${code_block_name(block_type)}.${block_action}`;

    let target = '';
    if (Object.prototype.hasOwnProperty.call(block, 'target')) {
        target = `${block.target}:`;
    }

    let sub_action = '';
    if (Object.prototype.hasOwnProperty.call(block, 'subAction')) {
        sub_action = `.${block.subAction}`;
    }

    return `${target}${action}${sub_action}(${values_str})${end_char}`;
}

function handle_line_starter(block) {
    const starter_type = block.block;
    const mapping = {
        'process': 'Process',
        'func': 'Function',
        'event': 'PlayerEvent',
        'entity_event': 'EntityEvent'
    };
    const mapped = mapping[starter_type];
    if (!mapped) throw new Error('Starter type desconocido: ' + starter_type);

    let name;
    if (Object.prototype.hasOwnProperty.call(block, 'data')) name = `${mapped} ${block.data}`;
    else if (Object.prototype.hasOwnProperty.call(block, 'action')) name = `${mapped} ${block.action}`;
    else throw new Error('Not data nor action!!');

    let args_str = '';
    if (starter_type === 'func') {
        const args = block.args && block.args.items ? block.args.items : [];
        const values = args.map(i => process_value(i.item));
        args_str = values.join(', ');
    }

    name += `(${args_str})`;
    return name;
}

function process_args_and_tags(args, tags) {
    const values = [];
    for (const i of args) {
        const arg = i.item;
        const processed = process_value(arg);
        values.push(processed);
    }
    for (const i of tags) {
        const tag = i.item;
        const processed = process_tag(tag);
        if (processed) values.push(processed);
    }
    return values
}

function process_value(value) {
    if (!value || !value.id) {
        console.log('UNABLE_TO_PROCESS_VALUE');
        return 'UNABLE_TO_PROCESS_VALUE';
    }

    function txt(value) {

        return `'${String(value.data.name).replace(/'/g, "\\'")}'`;
    }

    function comp(value) {

        return `"${String(value.data.name).replace(/"/g, '\\"')}"`;
    }

    function num(value) {
        return String(value.data.name);
    }

    function loc(value) {
        const coords = value.data.loc;
        const parts = [
            Number(coords.x).toFixed(3),
            Number(coords.y).toFixed(3),
            Number(coords.z).toFixed(3)
        ];
        if (coords.pitch !== undefined) parts.push(Number(coords.pitch).toFixed(3));
        if (coords.yaw !== undefined) parts.push(Number(coords.yaw).toFixed(3));
        return `Loc(${parts.join(', ')})`;
    }

    function vec(value) {
        const coords = value.data;
        return `Vec(${Number(coords.x).toFixed(3)}, ${Number(coords.y).toFixed(3)}, ${Number(coords.z).toFixed(3)})`;
    }

    function snd(value) {
        return `Snd("${value.data.sound}", pitch=${value.data.pitch}, vol=${value.data.vol})`; 
    }

    function part(value) {
        return `Par("${value.data.particle}")`; 
    }

    function pot(value) {
        return `Pot("${value.data.pot}", dur=${value.data.dur}, amp=${value.data.amp})`; 
    }

    function variable(value) {
        const scopes = {
            'line': 'line',
            'local': 'local',
            'unsaved': 'game',
            'saved': 'save'
        };
        const scopeKey = value.data.scope;
        const s = scopes[scopeKey] || scopeKey;
        return `${s} ${value.data.name}`;
    }

    function g_val(value) {
        return `GVal("${value.data.type}"${value.data.target && value.data.target !== 'Default' ? `, target="${value.data.target}"` : ''})`;
    }

    function pn_el(value) {
        return `Param ${value.data.name}:${value.data.optional ? ' optional' : ''}${value.data.plural ? ' plural' : ''} ${value.data.type}`; 
    }

    function bl_tag(value) {
        return `Tag("${value.data.tag}"="${value.data.option}")`;
    }

    function item(value) {
        const itemStr = value.data.item;
        const needle = 'id:"minecraft:';
        const startIndex = itemStr.lastIndexOf(needle);
        if (startIndex === -1) return `item("""${itemStr}""")`;
        const trimmedStart = itemStr.slice(startIndex + needle.length);
        const endIndex = trimmedStart.indexOf('"');
        const trimmed = endIndex === -1 ? trimmedStart : trimmedStart.slice(0, endIndex);
        return `item("${trimmed}")`;
    }

    const value_processors = {
        'txt': txt,
        'comp': comp,
        'num': num,
        'loc': loc,
        'vec': vec,
        'snd': snd,
        'part': part,
        'pot': pot,
        'var': variable,
        'g_val': g_val,
        'pn_el': pn_el,
        'bl_tag': bl_tag,
        'item': item
    };

    const value_type = value.id;
    if (Object.prototype.hasOwnProperty.call(value_processors, value_type)) {
        try {
            return value_processors[value_type](value);
        } catch (e) {
            console.log('ERROR PROCESSING VALUE:', e);
        }
    } else {
        console.log('UNABLE_TO_PROCESS_VALUE: unknown type', value_type);
    }
    return 'UNABLE_TO_PROCESS_VALUE';
}

function process_tag(tag) {
    if (TAGS_FILE === null) {
        throw new Error('TAGS_FILE no está cargado. Debes cargar tags.json antes de procesar tags.');
    }
    const tags_json = TAGS_FILE;

    const tag_data = tag.data;
    const block = tag_data.block;
    const action = tag_data.action;
    const tag_name = tag_data.tag;
    const option = tag_data.option;

    try {
        if (tags_json[block] && tags_json[block][action] && tags_json[block][action][tag_name] === option) {
            return '';
        }
    } catch (e) {

    }

    return `Tag("${tag_name}"="${option}")`;
}

function code_block_name(code_block) {
    const names = {
        'player_action': 'Player',
        'if_player': 'ifPlayer',
        'entity_action': 'Entity',
        'if_entity': 'ifEntity',
        'game_action': 'Game',
        'if_game': 'ifGame',
        'set_var': 'Set',
        'if_var': 'ifVar',
        'call_func': 'Call',
        'start_process': 'Start',
        'repeat': 'Repeat',
        'control': 'Control',
        'select_obj': 'Select'
    };
    return names[code_block] || code_block;
}

function custom_code_action_sintax(block_type, block_action, args, tags) {
    if (block_type === 'set_var') {
        if (!args || args.length === 0) {
            return `EmptyChestSlot = ${block_action}()`;
        }
        if (args.length === 2 && (block_action === '=' || block_action === '+=' || block_action === '-=')) {
            return `${process_value(args[0].item)} ${block_action} ${process_value(args[1].item)}`;
        }

        const replacers = {
            '=': 'SetToValue',
            '+': 'Add',
            '-': 'Subtract',
            'x': 'Multiply',
            '/': 'Divide',
            '%': 'Remainder',
            '+=': 'Increment',
            '-=': 'Decrement'
        };
        if (Object.prototype.hasOwnProperty.call(replacers, block_action)) block_action = replacers[block_action];

        const values_str = process_args_and_tags(args.slice(1), tags).join(', ')
        return `${process_value(args[0].item)} = ${block_action}(${values_str})`;
    }

    if (block_type === 'if_var') {
        if (args.length === 2 && ['=', '!=', '<', '>', '<=', '>='].includes(block_action)) {
            let op = block_action;
            if (op === '=') op = '==';
            return `if (${process_value(args[0].item)} ${op} ${process_value(args[1].item)})`;
        }
        const replacers = {
            '=': 'Equals',
            '!=': 'NotEqual',
            '<': 'Less',
            '>': 'Greater',
            '<=': 'LessOrEqual',
            '>=': 'GreaterOrEqual'
        };
        if (Object.prototype.hasOwnProperty.call(replacers, block_action)) block_action = replacers[block_action];

        const values_str = process_args_and_tags(args, tags).join(', ');
        return `ifVar.${block_action}(${values_str})`;
    }

    return null;
}

function process_all(original_nbt_data) {
    const base64_code = get_base64_code(original_nbt_data);
    const json_code = base64_to_json(base64_code);
    const processed = json_to_pseudo_df(json_code);
    return processed;
}

