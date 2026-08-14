/* yaml.js — minimal YAML parser for lesson content (maps, lists, scalars).
 *
 * Supports the subset used by content packs. JSON documents are also valid
 * YAML 1.2 and are handled via JSON.parse first.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function stripQuotes(value) {
    const dq = '"';
    const sq = '\'';
    if ((value.startsWith(dq) && value.endsWith(dq)) ||
        (value.startsWith(sq) && value.endsWith(sq)))
        return value.slice(1, -1);
    return value;
}

function parseScalar(text) {
    const stripped = stripQuotes(text);
    if (stripped === 'true')
        return true;
    if (stripped === 'false')
        return false;
    if (stripped === 'null' || stripped === '~')
        return null;
    if (/^-?\d+$/.test(stripped))
        return Number(stripped);
    if (/^-?\d+\.\d+$/.test(stripped))
        return Number(stripped);
    return stripped;
}

function lineIndent(line) {
    return line.match(/^ */)[0].length;
}

function parseBlockScalar(lines, startIndex, keyIndent) {
    const content = [];
    let index = startIndex;
    let contentIndent = null;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '') {
            content.push('');
            index++;
            continue;
        }
        const currentIndent = lineIndent(line);
        if (currentIndent <= keyIndent)
            break;
        if (contentIndent === null)
            contentIndent = currentIndent;
        if (currentIndent < contentIndent)
            break;
        content.push(line.slice(contentIndent));
        index++;
    }
    while (content.length > 0 && content[content.length - 1] === '')
        content.pop();
    return { value: content.join('\n'), nextIndex: index };
}

function parseValue(text, lines, index, keyIndent) {
    if (text === '|') {
        const block = parseBlockScalar(lines, index, keyIndent);
        return { value: block.value, nextIndex: block.nextIndex };
    }
    if (text === '>' ) {
        const block = parseBlockScalar(lines, index, keyIndent);
        return { value: block.value.replace(/\n/g, ' ').trim(), nextIndex: block.nextIndex };
    }
    return { value: parseScalar(text), nextIndex: index };
}

function parseList(lines, startIndex) {
    const items = [];
    let index = startIndex;
    if (index >= lines.length)
        return { value: items, nextIndex: index };

    const firstLine = lines[index];
    if (!firstLine.trimStart().startsWith('- '))
        return { value: items, nextIndex: index };

    const listItemIndent = lineIndent(firstLine);

    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === '')
            break;
        if (lineIndent(line) !== listItemIndent)
            break;
        const trimmed = line.trimStart();
        if (!trimmed.startsWith('- '))
            break;
        const itemText = trimmed.slice(2).trim();
        if (itemText.includes(':')) {
            const nested = parseMapping(lines, index + 1, listItemIndent + 2);
            const key = itemText.slice(0, itemText.indexOf(':')).trim();
            const inline = itemText.slice(itemText.indexOf(':') + 1).trim();
            const item = {};
            if (inline)
                item[key] = parseScalar(inline);
            Object.assign(item, nested.value);
            items.push(item);
            index = nested.nextIndex;
        } else {
            items.push(parseScalar(itemText));
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
        const keyLineIndent = lineIndent(line);
        index++;
        if (rest === '') {
            if (index < lines.length && lines[index].trimStart().startsWith('- ')) {
                const list = parseList(lines, index);
                map[key] = list.value;
                index = list.nextIndex;
            } else if (index < lines.length && lineIndent(lines[index]) > keyLineIndent) {
                const nestedIndent = lineIndent(lines[index]);
                const nested = parseMapping(lines, index, nestedIndent);
                map[key] = nested.value;
                index = nested.nextIndex;
            } else {
                map[key] = null;
            }
        } else {
            const parsed = parseValue(rest, lines, index, keyLineIndent);
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
