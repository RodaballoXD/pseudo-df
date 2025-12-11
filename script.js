'use strict';

settings = {};

function base64ToUint8Array(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    base64 = base64.replace(/[^\w\+\/=]/g, '');
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    return bytes;
}


function base64ToJson(string) {
    const decodedBytes = base64ToUint8Array(string);
    const decompressed = pako.ungzip(decodedBytes, {
        to: 'string'
    });
    return JSON.parse(decompressed);
}

function getBase64Code(string) {
    const needle = 'H4sIA';
    const startIndex = string.indexOf(needle);
    const trimmedStart = string.slice(startIndex);
    const endMarker = "\"}'";
    const endIndex = trimmedStart.indexOf(endMarker);
    let trimmed = trimmedStart;
    if (endIndex !== -1) trimmed = trimmedStart.slice(0, endIndex);
    return trimmed;
}



function legalName(str, cannotAlwaysEncapsulate) {
    if (!window.settings.keepVariableNameSpaces) {
        str = str.replaceAll(' ', '-').replaceAll('.', '·');
    }
    if ((window.settings.encapsulateAllNames && !cannotAlwaysEncapsulate) || /[\+\/=;,:<>`\s]/.test(str)) {
        str = '`' + str.replaceAll('`', '\\`') + '`';
    }
    return str;
}



function jsonToPseudoDf(code) {
    const blocks = Array.from(code.blocks);
    if (blocks.length === 0) return '';
    const first = blocks.shift();
    let stringCode = '';
    try {
        stringCode = handleLineStarter(first) + ' {';
    } catch (e) {
        console.error(e);
        stringCode = 'UNABLE_TO_PROCESS_LINE_STARTER {';
        blocks.unshift(first);
    }
    let indentation = 1;
    

    for (const block of blocks) {
        try {
            if (block.id === 'block') {
                stringCode += '\n' + ' '.repeat(indentation * 4) + processBlock(block) + ';';
            }
            else if (block.id === 'bracket') {
                if (block.direct === 'open') {
                    indentation += 1;

                    stringCode = stringCode.slice(0, -1);
                    stringCode += ' {';
                } else {
                    indentation -= 1;
                    if (indentation < 0) indentation = 0;
                    stringCode += '\n' + ' '.repeat(indentation * 4) + '}';
                }
            }
            else {
                throw new Error('Block id was not "block" and was not "bracket"');
            }
        }
        catch (e) {
            console.error(e);
            stringCode += '\n' + ' '.repeat(indentation * 4) + 'UNABLE_TO_PROCESS_CODEBLOCK';
        }
    }

    stringCode += '\n}';
    return stringCode;
}



function processBlock(block) {
    const blockType = block.block;
    if (blockType === 'else') return 'else';

    let blockAction;
    if (Object.prototype.hasOwnProperty.call(block, 'action')) blockAction = block.action.trim();
    else if (Object.prototype.hasOwnProperty.call(block, 'data')) blockAction = block.data.trim();
    else throw new Error('Not action nor data!!');

    let attribute = (Object.prototype.hasOwnProperty.call(block, 'attribute')) ? block.attribute.toLowerCase() : '';

    const chestContents = block.args && block.args.items ? block.args.items : [];
    const args = chestContents.filter(i => i.item && i.item.id !== 'bl_tag');
    const tags = chestContents.filter(i => i.item && i.item.id === 'bl_tag');

    if (window.settings.noCustomSintax) {

    }
    else {
        const customSintax = customCodeActionSintax(blockType, blockAction, args, tags, attribute);
        if (customSintax) {
            return customSintax;
        }
    }
    
    const values = processArgsAndTags(args, tags);

    const valuesStr = values.join(', ');
    if (blockAction === '') blockAction = 'UNDEFINED_ACTION';
    blockAction = legalName(blockAction, !(['call_func', 'start_process'].includes(blockType)));
    const action = `${codeBlockName(blockType)}.${blockAction}`;

    let target = '';
    if (Object.prototype.hasOwnProperty.call(block, 'target')) {
        target = `${block.target}:`;
    }

    let subAction = '';
    if (Object.prototype.hasOwnProperty.call(block, 'subAction')) {
        subAction = `.${block.subAction}`;
    }
    
    if (attribute) {
        attribute = `.${block.attribute}`;
    }

    return `${target}${action}${attribute}${subAction}(${valuesStr})`;
}

function handleLineStarter(block) {
    const starterType = block.block;
    const mapping = {
        'process': 'Process',
        'func': 'Function',
        'event': 'PlayerEvent',
        'entity_event': 'EntityEvent'
    };
    const blockType = mapping[starterType];
    if (!blockType) throw new Error('Unknown starter type: ' + starterType);

    let name;
    if (Object.prototype.hasOwnProperty.call(block, 'data')) name = legalName(block.data);
    else if (Object.prototype.hasOwnProperty.call(block, 'action')) name = block.action;
    else throw new Error('Not data nor action!!');

    if (name === '') name = 'UNNAMED';

    let argsStr;
    if (block.args && block.args.items) {
        const args = block.args.items;
        const values = args.map(i => processValue(i.item));
        argsStr = values.join(', ');
    }
    else argsStr = '';

    let lagSlay = '';
    if (block.attribute === 'LS-CANCEL') lagSlay = 'LS-CANCEL ';

    return `${blockType} ${lagSlay}${name}(${argsStr})`;
}

function processArgsAndTags(args, tags) {
    const values = [];
    for (const i of args) {
        const arg = i.item;
        const processed = processValue(arg);
        values.push(processed);
    }
    for (const i of tags) {
        const tag = i.item;
        const processed = processTag(tag);
        if (processed) values.push(processed);
    }
    return values
}

function processValue(value) {
    if (!value || !value.id) {
        console.error('UNABLE_TO_PROCESS_VALUE:', value);
        return 'UNABLE_TO_PROCESS_VALUE';
    }

    function formatDecimals(str) {
        let formatted = `${parseFloat(`${Number(str).toFixed(3)}`)}`;
        if (!formatted.includes('.')) formatted = `${formatted}.0`;
        return formatted;
    }
    function properString(str, strChar) {
        return str.replaceAll(strChar, `\\${strChar}`).replaceAll('\n', '<newline>')
    }

    function txt(value) {
        return `'${properString(value.data.name, "'")}'`;
    }

    function comp(value) {
        return `"${properString(value.data.name, '"')}"`;
    }

    function num(value) {
        return String(value.data.name);
    }

    function loc(value) {
        const coords = value.data.loc;
        const parts = [
            formatDecimals(coords.x),
            formatDecimals(coords.y),
            formatDecimals(coords.z)
        ];
        if (coords.pitch !== undefined) parts.push(formatDecimals(coords.pitch));
        if (coords.yaw !== undefined) parts.push(formatDecimals(coords.yaw));
        return `Loc(${parts.join(', ')})`;
    }

    function vec(value) {
        const coords = value.data;
        return `Vec(${formatDecimals(coords.x)}, ${formatDecimals(coords.y)}, ${formatDecimals(coords.z)})`;
    }

    function snd(value) {
        const pitch = (value.data.pitch !== 1.0) ? `, pitch=${value.data.pitch}` : '';
        const volume = (value.data.vol !== 2.0) ? `, vol=${value.data.vol}` : '';
        return `Snd("${value.data.sound}"${pitch}${volume})`;
    }

    function part(value) {
        const clusterData = value.data.cluster;
        const amount = (clusterData.amount !== 1) ? `, amount=${clusterData.amount}` : '';
        const spread = (clusterData.horizontal === 0 && clusterData.vertical === 0) ? '' : `, spread=(${clusterData.horizontal},${clusterData.vertical})`;

        const otherData = value.data.data;
        let processedData = '';
        for (let i in otherData) {
            processedData += (i === 'rgb') ? `, color="#${otherData[i].toString(16)}"` : `, ${i}="${otherData[i]}"`;
        }
        return `Par("${value.data.particle}"${amount}${spread}${processedData})`;
    }

    function pot(value) {
        const amplifier = (value.data.amp !== 0) ? `, amp=${value.data.amp + 1}` : '';
        const duration = (value.data.dur !== 1000000) ? `, dur=${value.data.dur}` : ''; // TODO: MM:SS format
        return `Pot("${value.data.pot}"${amplifier}${duration})`;
    }

    function variable(value) {
        const scope = value.data.scope;
        if (window.settings.lineScopeDefault && scope === 'line') {
            return legalName(value.data.name);
        }
        const scopes =
            (window.settings.shortScopes === true) ?
            {'line':'I', 'local':'L', 'unsaved':'G', 'saved':'S'} :
            {'line':'line','local':'local', 'unsaved':'game', 'saved':'save'};
        const scopeMapped = scopes[scope];
        return `${scopeMapped} ${legalName(value.data.name)}`;
    }

    function g_val(value) {
        return `GVal("${value.data.type}"${value.data.target && value.data.target !== 'Default' ? `, target="${value.data.target}"` : ''})`;
    }

    function pn_el(value) {
        const defaultValue = (value.data.defaultValue) ? (` = ${processValue(value.data.defaultValue)}`) : ('');
        const mapping = { 'txt': 'str', 'comp': 'txt', 'part': 'par' };
        const type = mapping[value.data.type] || value.data.type;
        return `Param ${legalName(value.data.name)} :${value.data.optional ? ' optional' : ''}${value.data.plural ? ' plural' : ''} ${type.charAt(0).toUpperCase() + type.slice(1)}${defaultValue}`;
    }

    function bl_tag(value) {
        return `Tag("${value.data.tag}"="${value.data.option}")`;
    }

    function item(value) { // TODO
        const itemStr = value.data.item;
        const needle = 'id:"minecraft:';
        const startIndex = itemStr.lastIndexOf(needle);
        if (startIndex === -1) return `item("""${itemStr}""")`;
        const trimmedStart = itemStr.slice(startIndex + needle.length);
        const endIndex = trimmedStart.indexOf('"');
        const trimmed = endIndex === -1 ? trimmedStart : trimmedStart.slice(0, endIndex);
        return `Item("${trimmed}")`;
    }

    function hint(value) {
        return 'FunctionHint()'
    }

    const valueProcessors = {
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
        'item': item,
        'hint': hint
    };

    const valueType = value.id;
    if (Object.prototype.hasOwnProperty.call(valueProcessors, valueType)) {
        try {
            return valueProcessors[valueType](value);
        } catch (e) {
            console.error('ERROR PROCESSING VALUE:', e);
        }
    } else {
        console.error('UNABLE_TO_PROCESS_VALUE: unknown type', valueType);
    }
    return 'UNABLE_TO_PROCESS_VALUE';
}

function processTag(tag) {
    if (TAGS_FILE === null) {
        throw new Error('TAGS_FILE is not loaded');
    }
    const tagsJson = TAGS_FILE;

    const tagData = tag.data;
    const block = tagData.block;
    const action = tagData.action;
    const tagName = tagData.tag;
    const option = tagData.option;

    if (window.settings.showAllTags) {
        return `Tag("${tagName}"="${option}")`;
    }

    try {
        if (tagsJson[block] && tagsJson[block][action] && tagsJson[block][action][tagName] === option) {
            return '';
        }
    } catch (e) {

    }

    return `Tag("${tagName}"="${option}")`;
}

function codeBlockName(codeBlock) {
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
    return names[codeBlock] || codeBlock;
}

function customCodeActionSintax(blockType, blockAction, args, tags, attribute) {
    if (blockType === 'set_var') {
        if (!args || args.length === 0) {
            return `EmptyChestSlot = ${blockAction}()`;
        }
        const varInFirstSlot = (args[0].item.id === 'var');
        if (args.length === 2 && (blockAction === '=' || blockAction === '+=' || blockAction === '-=') && varInFirstSlot) {
            return `${processValue(args[0].item)} ${blockAction} ${processValue(args[1].item)}`;
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
        if (Object.prototype.hasOwnProperty.call(replacers, blockAction)) blockAction = replacers[blockAction];

        if (!varInFirstSlot) {
            const valuesStr = processArgsAndTags(args, tags).join(', ');
            return `Set.${blockAction}(${valuesStr})`;
        }

        const valuesStr = processArgsAndTags(args.slice(1), tags).join(', ');
        return `${processValue(args[0].item)} = ${blockAction}(${valuesStr})`;
    }

    if (blockType === 'if_var') {
        if (args.length === 2 && ['=', '!=', '<', '>', '<=', '>='].includes(blockAction)) {
            let op = blockAction;
            if (op === '=') op = '==';
            if (attribute) attribute = `${attribute} `;
            return `if ${attribute}(${processValue(args[0].item)} ${op} ${processValue(args[1].item)})`;
        }
        const replacers = {
            '=': 'Equals',
            '!=': 'NotEqual',
            '<': 'Less',
            '>': 'Greater',
            '<=': 'LessOrEqual',
            '>=': 'GreaterOrEqual'
        };
        if (Object.prototype.hasOwnProperty.call(replacers, blockAction)) blockAction = replacers[blockAction];

        if (attribute) attribute = `.${attribute}`;

        const valuesStr = processArgsAndTags(args, tags).join(', ');
        return `ifVar.${blockAction}${attribute}(${valuesStr})`;
    }

    return null;
}



function getSettings() {
    const result = {};
    document.querySelectorAll("#settingsPanel input[type='checkbox']").forEach(box => {
        const key = box.dataset.setting;
        result[key] = box.checked;
    });
    return result;
}

function processAll(originalNbtData) {
    if (originalNbtData.trim() === '') return '';
    try {
        console.log(`\n\nPARSING:\n${originalNbtData}\n`);

        const base64Code = getBase64Code(originalNbtData);
        console.log(`CODE DATA:`);
        console.log(base64Code);

        const jsonCode = base64ToJson(base64Code);
        console.log(`CODE AS JSON:`);
        console.log(jsonCode);

        window.settings = getSettings();
        const processed = jsonToPseudoDf(jsonCode);
        console.log(`SUCCESSFUL! PARSED CODE:`);
        console.log(processed);

        return processed;
    }
    catch (e) {
        console.error(e);
        return '';
    }
}

