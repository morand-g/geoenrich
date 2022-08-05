from pathlib import Path 
import requests

print('Initialization...')

if not any(Path('/app').iterdir()):

    # Download files from github if they don't already exist
    Path('/app/data/').mkdir()
    Path('/app/templates/').mkdir()
    Path('/app/static/styles/').mkdir(parents=True)
    Path('/app/static/uploads/').mkdir()
    Path('/app/static/stats/').mkdir()
    
    r = requests.get('https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/app/static/styles/style.css') 
    Path('/app/static/styles/style.css').open('wb').write(r.content)

    r = requests.get('https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/app/templates/home.html') 
    Path('/app/templates/home.html').open('wb').write(r.content)

    r = requests.get('https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/app/templates/download.html') 
    Path('/app/templates/download.html').open('wb').write(r.content)

    r = requests.get('https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/app/main.py') 
    Path('/app/main.py').open('wb').write(r.content)

    print('Initialization complete.')