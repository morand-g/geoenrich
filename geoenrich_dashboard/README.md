# Geoenrich Dashboard

The **Geoenrich Dashboard** web app may be useful to you if you want to download many variables on a large data set, as a way to track your progress.
These instructions will help you launch the docker container containing GeoEnrich ant its dashboard web interface.

## Prerequisites

- [Git](https://github.com/git-guides/install-git)
- [Docker Engine](https://docs.docker.com/engine/install/)
- if you plan to use Copernicus data, [Python](https://www.python.org/downloads/).

## Installation

First clone the github repository:
```
git clone https://github.com/morand-g/geoenrich
cd geoenrich/geoenrich_dashboard
```

Then you can edit `docker-compose.yaml` to customize your settings:
- In lines 9 and 31, you can change where geoenrich data is stored on you computer. The default is `~/geoenrich_dashboard_data`. The format should be `YOUR_CUSTOM_PATH:/home/data`.
- If you want to use local netcdf data sets, uncomment line 32 and update the path to your files. In this case you need to read the *Adding other data sources* section from the *Installation instructions*. You can save the `personal_catalog.csv` file directly to the geoenrich data location chosen in the previous bullet point.

Finally you can run `docker compose up --build` and access the app in your browser by typing `localhost:8081`.

## Available variables

For tests, you can use the *bathymetry* variable as it does not require any authentification. If you want to use Copernicus or FSLE data, you need to follow login instructions as explained on the [variables page](https://geoenrich.readthedocs.io/en/latest/variables.html), and then copy either the `~/.netrc` file or the `~/.copernicusmarine/.copernicusmarine-credentials` file to the geoenrich data location chosen previously. 


## Uninstall

To stop the container and delete the docker data from your computer:
```
docker stop geoenrich_dashboard geoenrich_redis geoenrich_worker
docker rm geoenrich_dashboard geoenrich_redis geoenrich_worker
docker image rm geoenrich_dashboard redis
```


![Illustration of the dashboard interface](https://github.com/morand-g/geoenrich/blob/main/geoenrich/data/geoenrich_dashboard_screenshot.png?raw=True "Illustration of the dashboard interface")