from pathlib import Path 
import shutil

print('Initialization...')

if Path('/home/geoenrich_host/credentials.py').exists():
    shutil.copy(Path('/home/geoenrich_host/credentials.py'), Path('/usr/local/lib/python3.10/site-packages/geoenrich/credentials.py'))

if Path('/home/geoenrich_host/data/personal_catalog.csv').exists():
    shutil.copy(Path('/home/geoenrich_host/data/personal_catalog.csv'), Path('/usr/local/lib/python3.10/site-packages/geoenrich/data/personal_catalog.csv'))

print('Initialization complete.')
