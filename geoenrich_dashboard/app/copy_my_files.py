from pathlib import Path
import shutil

if Path('/home/data/personal_catalog.csv').exists():
    shutil.copy(Path('/home/data/personal_catalog.csv'), Path('/usr/local/lib/python3.10/site-packages/geoenrich/data/personal_catalog.csv'))

if Path('/home/data/.dodsrc').exists():
    shutil.copy(Path('/home/data/.dodsrc'), Path('/root/.dodsrc'))

if Path('/home/data/.copernicusmarine-credentials').exists():
    Path('/root/.copernicusmarine').mkdir(exist_ok=True)
    shutil.copy(Path('/home/data/.copernicusmarine-credentials'), Path('/root/.copernicusmarine/.copernicusmarine-credentials'))