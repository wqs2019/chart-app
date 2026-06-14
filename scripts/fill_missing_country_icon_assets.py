#!/usr/bin/env python3

import json
import re
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
WORLD_FILE = ROOT / 'scripts/data/chart_standard_items.seed.js'
LANDMARK_FILE = ROOT / 'scripts/data/standard_item_landmarks.seed.js'
ICON_FILE = ROOT / 'scripts/data/standard_item_icons.seed.js'
DEBUG_FILE = ROOT / '.dbg/fill_missing_country_icon_assets.json'

PAGE_TITLE_OVERRIDES = {
    'country_palestine': 'State of Palestine',
    'country_timor_leste': 'East Timor',
    'country_cabo_verde': 'Cape Verde',
    'country_cote_divoire': 'Ivory Coast',
    'country_micronesia': 'Federated States of Micronesia',
    'country_vatican_city': 'Vatican City',
    'country_republic_of_the_congo': 'Republic of the Congo',
    'country_democratic_republic_of_the_congo': 'Democratic Republic of the Congo',
}


def escape_js_string(value: str) -> str:
    return value.replace('\\', '\\\\').replace("'", "\\'")


def fetch_summary_image(page_title: str) -> str:
    url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{quote(page_title, safe="")}'
    req = Request(
        url,
        headers={
            'User-Agent': 'chart-app-country-icon-backfill/1.0',
            'Accept': 'application/json',
        },
    )
    with urlopen(req, timeout=20) as response:
        payload = json.loads(response.read().decode('utf-8'))
    return payload.get('originalimage', {}).get('source') or payload.get('thumbnail', {}).get('source') or ''


def parse_world_rows():
    text = WORLD_FILE.read_text()
    pattern = re.compile(r"\['(country_[^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\]")
    return [
        {
            'item_id': item_id,
            'name_zh': name_zh,
            'name_en': name_en,
            'region': region,
            'level': level,
        }
        for item_id, name_zh, name_en, region, level in pattern.findall(text)
    ]


def parse_existing_ids(text: str):
    return set(re.findall(r'\n\s*(country_[a-z_]+):', text))


def update_landmark_file(entries):
    text = LANDMARK_FILE.read_text()
    existing_ids = parse_existing_ids(text)
    insert_at = text.index('\n  province_bj:')
    lines = []
    for entry in entries:
        if entry['item_id'] in existing_ids:
            continue
        title = PAGE_TITLE_OVERRIDES.get(entry['item_id'], entry['name_en'])
        lines.append(f"  {entry['item_id']}: '{escape_js_string(title)}',")

    if not lines:
        return

    text = text[:insert_at] + '\n'.join(lines) + '\n\n' + text[insert_at + 1 :]
    LANDMARK_FILE.write_text(text)


def update_icon_file(icon_entries):
    text = ICON_FILE.read_text()
    existing_ids = parse_existing_ids(text)
    insert_at = text.index('\n  province_bj:')
    lines = []
    for item_id, url in icon_entries:
        if item_id in existing_ids:
            continue
        lines.append(f"  {item_id}: '{escape_js_string(url)}',")

    if not lines:
        return

    text = text[:insert_at] + '\n'.join(lines) + '\n\n' + text[insert_at + 1 :]
    ICON_FILE.write_text(text)


def main():
    world_rows = parse_world_rows()
    icon_text = ICON_FILE.read_text()
    existing_icon_ids = parse_existing_ids(icon_text)
    missing_rows = [row for row in world_rows if row['item_id'] not in existing_icon_ids]

    results = []
    failed = []
    for index, row in enumerate(missing_rows, start=1):
        page_title = PAGE_TITLE_OVERRIDES.get(row['item_id'], row['name_en'])
        try:
            image_url = fetch_summary_image(page_title)
            if image_url:
                results.append((row['item_id'], image_url))
            else:
                failed.append({'item_id': row['item_id'], 'page_title': page_title, 'reason': 'empty image'})
        except Exception as error:
            failed.append({'item_id': row['item_id'], 'page_title': page_title, 'reason': str(error)})

        if index % 15 == 0:
            time.sleep(0.3)

    DEBUG_FILE.write_text(
        json.dumps(
            {
                'missing_count': len(missing_rows),
                'resolved_count': len(results),
                'failed': failed,
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if failed:
        raise RuntimeError(f'failed to resolve {len(failed)} items, see {DEBUG_FILE}')

    update_landmark_file(missing_rows)
    update_icon_file(results)
    print(f'updated {len(results)} missing country icons')


if __name__ == '__main__':
    main()
