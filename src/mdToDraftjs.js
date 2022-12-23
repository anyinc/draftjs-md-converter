'use strict';

const parse = require('@textlint/markdown-to-ast').parse;
const { JSDOM } = require('jsdom');

const defaultInlineStyles = {
  Strong: {
    type: 'BOLD',
    symbol: '__',
  },
  Emphasis: {
    type: 'ITALIC',
    symbol: '*',
  },
  Delete: {
    type: 'STRIKETHROUGH',
    symbol: '~~',
  },
  Code: {
    type: 'CODE',
    symbol: '`',
  },
};

const defaultInlineHtmlStyles = [
  {
    node: 'ins',
    type: 'UNDERLINE',
    closeTag: '</ins>',
  },
  {
    node: 'span',
    attributeKey: 'color',
    attributeValue: 'red',
    type: 'red',
    closeTag: '</span>',
  },
];

const defaultBlockStyles = {
  List: 'unordered-list-item',
  Header1: 'header-one',
  Header2: 'header-two',
  Header3: 'header-three',
  Header4: 'header-four',
  Header5: 'header-five',
  Header6: 'header-six',
  CodeBlock: 'code-block',
  BlockQuote: 'blockquote',
  Table: 'table',
};

const getBlockStyleForMd = (node, blockStyles) => {
  const style = node.type;
  const ordered = node.ordered;
  const depth = node.depth;
  if (style === 'List' && ordered) {
    return 'ordered-list-item';
  } else if (style === 'Header') {
    return blockStyles[`${style}${depth}`];
  } else if (
    node.type === 'Paragraph' &&
    node.children &&
    node.children[0] &&
    node.children[0].type === 'Image'
  ) {
    return 'atomic';
  } else if (
    node.type === 'Paragraph' &&
    node.raw &&
    node.raw.match(/^\[\[\s\S+\s.*\S+\s\]\]/)
  ) {
    return 'atomic';
  } else if (node.type === 'Table') {
    return 'atomic';
  }
  return blockStyles[style];
};

const joinCodeBlocks = splitMd => {
  const opening = splitMd.indexOf('```');
  const closing = splitMd.indexOf('```', opening + 1);

  if (opening >= 0 && closing >= 0) {
    const codeBlock = splitMd.slice(opening, closing + 1);
    const codeBlockJoined = codeBlock.join('\n');
    const updatedSplitMarkdown = [
      ...splitMd.slice(0, opening),
      codeBlockJoined,
      ...splitMd.slice(closing + 1),
    ];

    return joinCodeBlocks(updatedSplitMarkdown);
  }

  return splitMd;
};

const joinTableBlocks = splitMd => {
  let opening = -1;
  let closing = -1;

  splitMd.some((row, i) => {
    if (
      row.length > 1 &&
      row.indexOf('|') === 0 &&
      row.lastIndexOf('|') === row.length - 1 &&
      row.indexOf('\n') === -1
    ) {
      if (opening === -1) {
        opening = i;
      }
    } else if (opening !== -1) {
      closing = i - 1;
      return true;
    }
    return false;
  });

  if (opening !== -1 && closing === -1) {
    closing = splitMd.length - 1;
  }

  if (opening >= 0 && closing >= 0 && closing - opening >= 3) {
    const tableBlock = splitMd.slice(opening, closing + 1);
    const tableBlockJoined = tableBlock.join('\n');
    const updatedSplitMarkdown = [
      ...splitMd.slice(0, opening),
      tableBlockJoined,
      ...splitMd.slice(closing + 1),
    ];

    return joinTableBlocks(updatedSplitMarkdown);
  }

  return splitMd;
};

const splitMdBlocks = md => {
  const splitMd = md.split('\n');

  // Process the split markdown include the
  // one syntax where there's an block level opening
  // and closing symbol with content in the middle.
  const splitMdWithCodeBlocks = joinTableBlocks(joinCodeBlocks(splitMd));
  return splitMdWithCodeBlocks;
};

const parseMdLine = (line, existingEntities, extraStyles = {}) => {
  const inlineStyles = { ...defaultInlineStyles, ...extraStyles.inlineStyles };
  const blockStyles = { ...defaultBlockStyles, ...extraStyles.blockStyles };
  const inlineHtmlStyles = defaultInlineHtmlStyles;

  const astString = parse(line);
  let text = '';
  const inlineStyleRanges = [];
  const entityRanges = [];
  const entityMap = existingEntities;
  let htmlStyles = [];
  let depth = 0;

  const addInlineStyleRange = (offset, length, style) => {
    inlineStyleRanges.push({ offset, length, style });
  };

  const getRawLength = children =>
    children.reduce((prev, current) => {
      if (current.value) {
        return prev + current.value.length;
      } else if (current.children && current.children.length) {
        return prev + getRawLength(current.children);
      }
      return prev;
    }, 0);

  const addLink = child => {
    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'LINK',
      mutability: 'MUTABLE',
      data: {
        url: child.url,
      },
    };
    entityRanges.push({
      key: entityKey,
      length: getRawLength(child.children),
      offset: text.length,
    });
  };

  const addImageOrElse = child => {
    const { ext } = parseUrl(child.url);
    if (!ext) {
      addImage(child);
      return;
    }

    switch (ext) {
      case '.jpeg':
      case '.jpg':
      case '.png':
      case '.svg':
      case '.bmp':
      case '.gif':
      case '.tiff':
      case '.ico':
        addImage(child);
        break;
      case '.pdf':
        addPdf(child);
        break;
      default:
        addFile(child);
        break;
    }
  };

  const addImage = child => {
    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'IMAGE',
      mutability: 'IMMUTABLE',
      data: {
        url: child.url,
        src: child.url,
        fileName: child.alt || '',
      },
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length,
    });
  };

  const addFile = child => {
    const entityKey = Object.keys(entityMap).length;
    const { name, ext } = parseUrl(child.url);
    entityMap[entityKey] = {
      type: 'FILE',
      mutability: 'IMMUTABLE',
      data: {
        src: child.url,
        name: child.alt || `${name}${ext}`,
      },
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length,
    });
  };

  const addPdf = child => {
    const entityKey = Object.keys(entityMap).length;
    const { name, ext } = parseUrl(child.url);
    entityMap[entityKey] = {
      type: 'PDF',
      mutability: 'IMMUTABLE',
      data: {
        src: child.url,
        name: child.alt || `${name}${ext}`,
      },
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length,
    });
  };

  const addVideo = child => {
    const string = child.raw;

    // RegEx: [[ embed url=<anything> ]]
    const url = string.match(/^\[\[\s(?:embed)\s(?:url=(\S+))\s\]\]/)[1];

    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'draft-js-video-plugin-video',
      mutability: 'IMMUTABLE',
      data: {
        src: url,
      },
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length,
    });
  };

  const addTable = child => {
    const entityKey = Object.keys(entityMap).length;

    const convertCellData = cell =>
      cell.children
        .map(str => {
          if (str.type === 'Str') {
            return str.value;
          } else if (
            str.type === 'Html' &&
            (str.value === '<br>' || str.value === '<br />')
          ) {
            return '\n';
          }
          return '';
        })
        .join('');

    const data = {
      columns: null,
      rows: [],
    };
    child.children.forEach((row, rowIndex) => {
      if (rowIndex === 0) {
        data.columns = row.children.map((cell, cellIndex) => ({
          key: `Column${cellIndex}`,
          value: convertCellData(cell),
        }));
      } else {
        const rowValue = row.children.map((cell, cellIndex) => ({
          key: `Row${rowIndex - 1}Cell${cellIndex}`,
          value: convertCellData(cell),
        }));
        data.rows.push({
          key: `Row${rowIndex - 1}`,
          value: rowValue,
        });
      }
    });
    entityMap[entityKey] = {
      type: 'draft-js-table-plugin',
      mutability: 'IMMUTABLE',
      data,
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: 0,
    });
  };

  const parseUrl = url => {
    const matchedFileName =
      url.match(
        /^(?:[^:\/?#]+:)?(?:\/\/[^\/?#]*)?(?:([^?#]*\/)([^\/?#]*))?(\?[^#]*)?(?:#.*)?$/
      ) ?? [];
    const [, dir, fileName, query] = matchedFileName.map(match => match ?? '');
    if (!fileName) {
      return {
        name: fileName,
        ext: '',
      };
    }

    const matchedExt = fileName.match(/^(.+?)(\.[^.]+)?$/) ?? [];
    const [, name, ext] = matchedExt.map(match => match ?? '');
    return { name, ext };
  };

  const parseChildren = (child, style) => {
    // RegEx: [[ embed url=<anything> ]]
    const videoShortcodeRegEx = /^\[\[\s(?:embed)\s(?:url=(\S+))\s\]\]/;
    switch (child.type) {
      case 'Link':
        addLink(child);
        break;
      case 'Image':
        addImageOrElse(child);
        break;
      case 'Paragraph':
        if (videoShortcodeRegEx.test(child.raw)) {
          addVideo(child);
        }
        break;
      case 'Table':
        addTable(child);
        text = ' ';
        return;
      case 'HorizontalRule':
        // MEMO: Qastで水平線対応していないため、文字そのままにする
        text = `${text}${child.raw}`;
        return;
      default:
    }

    if (!videoShortcodeRegEx.test(child.raw) && child.children && style) {
      const rawLength = getRawLength(child.children);
      addInlineStyleRange(text.length, rawLength, style.type);
      const newStyle = inlineStyles[child.type];
      child.children.forEach(grandChild => {
        parseChildren(grandChild, newStyle);
      });
    } else if (!videoShortcodeRegEx.test(child.raw) && child.children) {
      const newStyle = inlineStyles[child.type];
      child.children.forEach(grandChild => {
        parseChildren(grandChild, newStyle);
      });
    } else {
      if (child.type === 'Html') {
        // const d = new DOMParser();
        // const parsedHtml = d.parseFromString(child.value, 'text/html');
        const d = new JSDOM(child.value);
        const parsedHtml = d.window.document;
        let found = false;
        inlineHtmlStyles.forEach(htmlStyle => {
          const node = parsedHtml.querySelector(htmlStyle.node);
          if (node) {
            if ('attributeKey' in htmlStyle) {
              if (
                htmlStyle.attributeKey in node.attributes &&
                htmlStyle.attributeValue ===
                node.attributes[htmlStyle.attributeKey].nodeValue
              ) {
                htmlStyles.push(htmlStyle);
                found = true;
              }
            } else {
              htmlStyles.push(htmlStyle);
              found = true;
            }
          }
        });
        if (found) {
          return;
        }

        htmlStyles.forEach(htmlStyle => {
          if (child.value === htmlStyle.closeTag) {
            const htmlStyleIndex = htmlStyles.lastIndexOf(htmlStyle);
            if (htmlStyleIndex >= 0) {
              htmlStyles = htmlStyles.filter(
                (_, index) => index !== htmlStyleIndex
              );
              found = true;
            }
          }
        });
        if (found) {
          return;
        }
      }

      if (style) {
        addInlineStyleRange(text.length, child.value.length, style.type);
      }
      if (inlineStyles[child.type]) {
        addInlineStyleRange(
          text.length,
          child.value.length,
          inlineStyles[child.type].type
        );
      }
      htmlStyles.forEach(htmlStyle => {
        addInlineStyleRange(text.length, child.value.length, htmlStyle.type);
      });
      text = `${text}${
        child.type === 'Image' || videoShortcodeRegEx.test(child.raw)
          ? ' '
          : child.value
      }`;
    }
  };

  astString.children.forEach(child => {
    const style = inlineStyles[child.type];
    parseChildren(child, style);
  });

  // add block style if it exists
  let blockStyle = 'unstyled';
  if (astString.children[0]) {
    const style = getBlockStyleForMd(astString.children[0], blockStyles);
    if (style) {
      blockStyle = style;
      if (style === 'ordered-list-item' || style === 'unordered-list-item') {
        const depthRegEx = /^\s{3,6}/;
        if (depthRegEx.test(astString.raw)) {
          depth = 1;
        }
      }
    }
  }

  return {
    text,
    inlineStyleRanges,
    entityRanges,
    blockStyle,
    entityMap,
    depth,
  };
};

function mdToDraftjs(mdString, extraStyles) {
  const paragraphs = splitMdBlocks(mdString);
  const blocks = [];
  let entityMap = {};

  paragraphs.forEach(paragraph => {
    const result = parseMdLine(paragraph, entityMap, extraStyles);
    blocks.push({
      text: result.text,
      type: result.blockStyle,
      depth: result.depth,
      inlineStyleRanges: result.inlineStyleRanges,
      entityRanges: result.entityRanges,
    });
    entityMap = result.entityMap;
  });

  // add a default value
  // not sure why that's needed but Draftjs convertToRaw fails without it
  if (Object.keys(entityMap).length === 0) {
    entityMap = {
      data: '',
      mutability: '',
      type: '',
    };
  }
  return {
    blocks,
    entityMap,
  };
}

module.exports = mdToDraftjs;
