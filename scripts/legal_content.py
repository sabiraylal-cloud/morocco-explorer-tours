"""Render owner-authorized policy text without changing its substantive clauses."""
from dataclasses import dataclass, field
from html import escape
from html.parser import HTMLParser


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class PolicyParser(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in {'br', 'hr'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def text(node):
    if isinstance(node, str):
        return node
    return ' '.join(text(child) for child in node.children)


def substitute(value):
    return value.replace('Morocco Extra Tours', 'Morocco Explorer Tours').replace(
        'contact@moroccoextratours.com', 'moroccoexploredtours@gmail.com')


def render_policy(policy):
    parser = PolicyParser(policy['content_html'])
    headings = []
    prefix = 'privacy' if policy['path'] == 'privacy.html' else 'terms'

    def clean(node):
        if isinstance(node, str):
            return [substitute(node)]
        if node.tag in {'root', 'div'}:
            return [item for child in node.children for item in clean(child)]
        if node.tag == 'hr':
            return []
        if node.tag not in {'p', 'h2', 'h3', 'strong', 'em', 'a', 'br', 'ul', 'li'}:
            raise ValueError(f'Unexpected tag in legal source: {node.tag}')
        children = node.children
        # Only the source Contact Details paragraph has these labelled lines.
        if node.tag == 'p' and 'Company Number:' in text(node):
            lines = [[]]
            for child in children:
                if isinstance(child, Node) and child.tag == 'br':
                    lines.append([])
                else:
                    lines[-1].append(child)
            children = []
            for line in lines:
                label = ' '.join(text(child) for child in line).strip()
                if label.startswith(('Address:', 'Company Number:')):
                    continue
                if children:
                    children.append(Node('br'))
                children.extend(line)
        cleaned = [item for child in children for item in clean(child)]
        if node.tag != 'br' and not ''.join(text(child) for child in cleaned).strip():
            return []
        # Flatten WordPress's decorative nested bullet wrappers, preserving each item.
        if node.tag == 'li' and 'list-style-type: none' in node.attrs.get('style', ''):
            lists = [child for child in cleaned if isinstance(child, Node) and child.tag == 'ul']
            if len(lists) == 1:
                return lists[0].children
        tag = 'h2' if node.tag == 'h3' else node.tag
        attrs = {}
        if tag == 'h2':
            heading_id = f'{prefix}-section-{len(headings)}'
            attrs['id'] = heading_id
            headings.append((heading_id, ' '.join(text(child) for child in cleaned).strip()))
        if tag == 'a':
            label = ''.join(text(child) for child in cleaned).strip()
            if label == 'moroccoexploredtours@gmail.com':
                attrs['href'] = 'mailto:moroccoexploredtours@gmail.com'
            elif node.attrs.get('href'):
                attrs['href'] = substitute(node.attrs['href'])
        return [Node(tag, attrs, cleaned)]

    blocks = [node for node in clean(parser.root) if not isinstance(node, str) or node.strip()]
    merged = []
    for node in blocks:
        if isinstance(node, Node) and node.tag == 'ul' and merged and isinstance(merged[-1], Node) and merged[-1].tag == 'ul':
            merged[-1].children.extend(node.children)
        else:
            merged.append(node)

    def html(node):
        if isinstance(node, str):
            return escape(node)
        attrs = ''.join(f' {key}="{escape(value, quote=True)}"' for key, value in node.attrs.items())
        if node.tag == 'br':
            return '<br>'
        return f'<{node.tag}{attrs}>'+''.join(html(child) for child in node.children)+f'</{node.tag}>'

    return ''.join(html(node) for node in merged), headings
