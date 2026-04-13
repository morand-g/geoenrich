# Geoenrich Dashboard

The **Geoenrich Dashboard** web app may be useful to you if you want to download many variables on a large data set, as a way to track your progress.
This subfolder contains all needed files to run it in a web browser.

## Instructions

Prerequisites: [Git](https://github.com/git-guides/install-git), [Docker](https://docs.docker.com/engine/install/), and if you plan to use Copernicus data, [Python](https://www.python.org/downloads/).

First clone the github repository:
```
git clone https://github.com/morand-g/geoenrich
cd geoenrich/geoenrich_dashboard
```

Then you can edit `docker-compose.yaml` to customize your settings:
- In lines 9 and 31, you can change where geoenrich data is stored on you computer. The default is `~/geoenrich_dashboard_data`. 
- If you want to use local netcdf data sets, uncomment line 32 and update the path to your files.


> [!NOTE]
> For tests, you can use the *bathymetry* variable as it does not require any authentification. If you want to use Copernicus or FSLE data, you need to follow login instructions as explained on the [variables page](https://geoenrich.readthedocs.io/en/latest/variables.html), and then copy either the `~/.netrc` file or the `~/.copernicusmarine/.copernicusmarine-credentials` file to the folder chosen just before (mentioned in lines 9 and 31 of the *docker_compose.yaml* file). 



Finally you can run `docker compose up --build` and access the app in your browser by typing `localhost:8081`.

![Illustration of the dashboard interface](https://github.com/morand-g/geoenrich/blob/main/geoenrich/data/geoenrich_dashboard_screenshot.png?raw=True "Illustration of the dashboard interface")