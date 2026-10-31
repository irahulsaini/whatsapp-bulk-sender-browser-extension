"""Statically verify packaging and integrity; never load or execute the sender."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from build import FILES, build_package

ROOT = Path(__file__).resolve().parent
RELEASE = json.loads((ROOT / 'release.json').read_text())


class PackageVerification(unittest.TestCase):
    """Confirm distribution files match the maintained browser builds."""

    def test_integrity_inventory(self):
        """Check every listed artifact and source file against its SHA-256."""
        sums = json.loads((ROOT / 'SHA256SUMS.json').read_text())
        actual = {str(p.relative_to(ROOT)) for folder in ('builds', 'packages') for p in (ROOT / folder).rglob('*') if p.is_file()}
        self.assertEqual(set(sums), actual)
        for name, expected in sums.items():
            with self.subTest(file=name):
                self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), expected)

    def test_all_browser_packages(self):
        """Check manifests, permissions and byte-identical installable contents."""
        for browser in RELEASE['browsers']:
            with self.subTest(browser=browser):
                package = ROOT / 'packages' / f'whatsapp-bulk-sender-{browser}-v{RELEASE["version"]}.zip'
                with zipfile.ZipFile(package) as archive:
                    self.assertEqual(set(archive.namelist()), set(FILES))
                    for name in FILES:
                        self.assertEqual(archive.read(name), (ROOT / 'builds' / browser / name).read_bytes())
                    manifest = json.loads(archive.read('manifest.json'))
                    self.assertEqual(manifest['version'], RELEASE['version'])
                    self.assertEqual(manifest['manifest_version'], 3)
                    self.assertEqual(manifest['permissions'], ['storage', 'tabs', 'scripting'])
                    self.assertEqual(manifest['host_permissions'], ['https://web.whatsapp.com/*'])

    def test_standalone_build(self):
        """Rebuild into a temporary directory and compare all packaged bytes."""
        with tempfile.TemporaryDirectory() as temporary:
            for browser in RELEASE['browsers']:
                with self.subTest(browser=browser):
                    with zipfile.ZipFile(build_package(browser, temporary)) as archive:
                        for name in FILES:
                            self.assertEqual(archive.read(name), (ROOT / 'builds' / browser / name).read_bytes())


if __name__ == '__main__':
    unittest.main(verbosity=2)
