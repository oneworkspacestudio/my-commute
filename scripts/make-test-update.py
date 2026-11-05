"""Synthetic app-only bundle for the dedicated managed acceptance fixture."""
import json,hashlib,sys,zipfile
from pathlib import Path
config,exe,target=map(Path,sys.argv[1:]);config=config.resolve()
assert str(config).lower().startswith('c:\\projects\\.cache\\my-commute-20261105\\managed-')
c=json.loads(config.read_text());cat=c['catalog'];assert {a['id'] for a in cat['apps']}=={'accounts','commute'}
app=next(a for a in cat['apps'] if a['id']=='commute');app['version']='0.1.0-preview.2-test';app['source']='https://github.com/oneworkspacestudio/my-commute/releases/tag/v0.1.0-preview.2-test'
content={}
for key,p in cat['packages'].items():
 data=(Path(c['programs'])/p['file']).read_bytes()
 if key=='commute':data=exe.read_bytes()
 elif key in ['commute-contract','commute-manifest']:
  v=json.loads(data);v['version']=app['version']
  if key=='commute-manifest':v['executableSHA256']=hashlib.sha256(exe.read_bytes()).hexdigest()
  data=json.dumps(v).encode()
 p['size']=len(data);p['sha256']=hashlib.sha256(data).hexdigest();content[p['file']]=data
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('catalog.json',json.dumps(cat))
 for rel,data in content.items():z.writestr(rel,data)
print('Prepared synthetic app-only update fixture')
