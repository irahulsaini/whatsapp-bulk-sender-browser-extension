"""Package the maintained browser builds without executing sending JavaScript."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = ('manifest.json', 'popup.html', 'popup.css', 'popup.js', 'content.js')


def build_package(browser, output_directory):
    """Create a deterministic installable ZIP from one browser's source files."""
    version = json.loads((ROOT / 'release.json').read_text())['version']
    folder = ROOT / 'builds' / browser
    manifest = json.loads((folder / 'manifest.json').read_text())
    if manifest['version'] != version:
        raise ValueError(f'{browser}: manifest version does not match release.json')
    output_directory = Path(output_directory)
    output_directory.mkdir(parents=True, exist_ok=True)
    archive = output_directory / f'whatsapp-bulk-sender-{browser}-v{version}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as target:
        for name in FILES:
            entry = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(entry, (folder / name).read_bytes())
    return archive


def main():
    """Build every browser package and refresh its integrity inventory."""
    release = json.loads((ROOT / 'release.json').read_text())
    for browser in release['browsers']:
        print(build_package(browser, ROOT / 'packages').relative_to(ROOT))
    sums = {}
    for folder in ('builds', 'packages'):
        for filename in sorted((ROOT / folder).rglob('*')):
            if filename.is_file():
                sums[str(filename.relative_to(ROOT))] = hashlib.sha256(filename.read_bytes()).hexdigest()
    (ROOT / 'SHA256SUMS.json').write_text(json.dumps(sums, indent=2) + '\n')


if __name__ == '__main__':
    main()
