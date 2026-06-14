#!/usr/bin/env python3

import json
import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANDMARKS_FILE = ROOT / 'scripts/data/standard_item_landmarks.seed.js'
MISSING_FILE = ROOT / '.dbg/missing_country_titles.json'
OUTPUT_FILE = ROOT / '.dbg/scenic_country_batches.json'

landmarks_text = LANDMARKS_FILE.read_text()
missing_items = json.loads(MISSING_FILE.read_text())
landmark_pairs = {}
for item_id, single_title, double_title in re.findall(
    r'\n\s*(country_[a-z_]+): (?:"((?:\\"|[^"])+)"|\'((?:\\\'|[^\'])+)\')',
    landmarks_text,
):
    title = double_title or single_title
    landmark_pairs[item_id] = title.replace("\\'", "'").replace('\\"', '"')

items = [{'itemId': item['itemId'], 'title': landmark_pairs[item['itemId']]} for item in missing_items]
chunks = [items[index : index + 15] for index in range(0, len(items), 15)]

output = []
for batch_index, chunk in enumerate(chunks, start=1):
    titles = '|'.join(item['title'] for item in chunk)
    url = (
        'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages'
        '&piprop=original|thumbnail&pithumbsize=330&redirects=1&titles='
        + urllib.parse.quote(titles, safe='')
    )
    output.append(
        {
            'batch': batch_index,
            'items': chunk,
            'url': url,
        }
    )

OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2))
print(f'wrote {len(output)} batches to {OUTPUT_FILE}')
