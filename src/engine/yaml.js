/* yaml.js — minimal YAML parser for lesson content (maps, lists, scalars).
 *
 * Supports the subset used by content packs. JSON documents are also valid
 * YAML 1.2 and are handled via JSON.parse first.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function stripQuotes(value) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
        return value.slice(1, -1);
    return value;
}

function parseBlockScalar(lines, startIndex, indent) {
    const content = [];
    let index = startIndex;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '')
            break;
        if (!line.startsWith(' '.repeat(indent + 2)) && line.trim() !== '')
            break;
        content.push(line.slice(indent + 2));
        index++;
    }
    return { value: content.join('\n'), nextIndex: index };
}

function parseValue(text, lines, index, indent) {
    if (text === '|') {
        const block = parseBlockScalar(lines, index, indent);
        return { value: block.value, nextIndex: block.nextIndex };
    }
    if (text === '>' ) {
        const block = parseBlockScalar(lines, index, indent);
        return { value: block.value.replace(/\n/g, ' ').trim(), nextIndex: block.nextIndex };
    }
    return { value: stripQuotes(text), nextIndex: index };
}

function parseList(lines, startIndex, baseIndent) {
    const items = [];
    let index = startIndex;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '' || !line.startsWith(' '.repeat(baseIndent)))
            break;
        const trimmed = line.trimStart();
        if (!trimmed.startsWith('- '))
            break;
        const itemText = trimmed.slice(2).trim();
        if (itemText.includes(':')) {
            const nested = parseMapping(lines, index + 1, baseIndent + 2);
            const key = itemText.slice(0, itemText.indexOf(':')).trim();
            const inline = itemText.slice(itemText.indexOf(':') + 1).trim();
            const item = {};
            if (inline)
                item[key] = stripQuotes(inline);
            Object.assign(item, nested.value);
            items.push(item);
            index = nested.nextIndex;
        } else {
            items.push(stripQuotes(itemText));
            index++;
        }
    }
    return { value: items, nextIndex: index };
}

function parseMapping(lines, startIndex, baseIndent) {
    const map = {};
    let index = startIndex;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '')
            break;
        if (!line.startsWith(' '.repeat(baseIndent)))
            break;
        const trimmed = line.trimStart();
        if (trimmed.startsWith('- '))
            break;
        const colon = trimmed.indexOf(':');
        if (colon === -1)
            break;
        const key = trimmed.slice(0, colon).trim();
        const rest = trimmed.slice(colon + 1).trim();
        index++;
        if (rest === '') {
            if (index < lines.length && lines[index].trimStart().startsWith('- ')) {
                const list = parseList(lines, index, baseIndent);
                map[key] = list.value;
                index = list.nextIndex;
            } else if (index < lines.length && lines[index].startsWith(' '.repeat(baseIndent + 2))) {
                const nested = parseMapping(lines, index, baseIndent + 2);
                map[key] = nested.value;
                index = nested.nextIndex;
            } else {
                map[key] = null;
            }
        } else {
            const parsed = parseValue(rest, lines, index, baseIndent);
            map[key] = parsed.value;
            index = parsed.nextIndex;
        }
    }
    return { value: map, nextIndex: index };
}

export function parseYaml(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('['))
        return JSON.parse(trimmed);

    const lines = text.replace(/\t/g, '    ').split('\n');
    const root = parseMapping(lines, 0, 0);
    return root.value;
}
