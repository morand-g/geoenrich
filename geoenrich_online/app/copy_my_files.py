from pathlib import Path
import shutil

if Path('/app/data/.netrc').exists():
    shutil.copy(Path('/app/data/.netrc'), Path('/root/.netrc'))

if Path('/app/data/.copernicusmarine-credentials').exists():
    Path('/root/.copernicusmarine').mkdir(exist_ok=True)
    shutil.copy(Path('/app/data/.copernicusmarine-credentials'), Path('/root/.copernicusmarine/.copernicusmarine-credentials'))