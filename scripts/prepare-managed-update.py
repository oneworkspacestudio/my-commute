"""Create app-only update metadata from the suite's canonical package adapter.

Run after package.py --release. This does not publish or install anything.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

p = argparse.ArgumentParser()
p.add_argument('--package', required=True)
p.add_argument('--suite-root', required=True)
p.add_argument('--out', required=True)
a = p.parse_args()
root, suite, out = Path(a.package).resolve(), Path(a.suite_root).resolve(), Path(a.out).resolve()
sys.path.insert(0, str(suite / 'scripts'))
from commute_component import commute_component

contract = commute_component(root)
compatibility = json.loads((root / 'compatibility.json').read_text(encoding='utf-8-sig'))
version = compatibility['version']
packages = {}
archive = out / 'MyCommute-windows-amd64.zip'
with zipfile.ZipFile(archive) as z:
    for key, item in contract['inputs'].items():
        source = Path(item['source'])
        member = source.relative_to(root).as_posix()
        data = source.read_bytes()
        assert z.read(member) == data, member
        assert key == 'commute' or key.startswith('commute-'), key
        packages[key] = dict(file=item['file'], sha256=hashlib.sha256(data).hexdigest(),
                             size=len(data), asset=archive.name, member=member)
assert len(packages) == 47
metadata = dict(schema=2, integration=3, repository='oneworkspacestudio/my-commute',
                tag='v' + version, apps=[contract['app']], packages=packages,
                minimumManager=compatibility['minimumWorkspaceVersion'],
                requiredCapabilities=compatibility['capabilities'])
(out / 'workspace-update.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print('Verified app-only metadata:', version, len(packages), 'owned payloads')
