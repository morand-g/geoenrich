## Docker image

You may use GeoEnrich and its associated webapp locally by loading a Docker container the following way:

```
git clone https://github.com/morand-g/geoenrich
cd geoenrich_online
docker-compose up -d --build
```

You can then use geoenrich from the command line:

```
docker exec -it geoenrich_online python
```

Or launch the web app in a browser:
```
localhost:8082
```

If you need to use datasets that require authentification, you can follow the configuration instructions [here](https://geoenrich.readthedocs.io/en/latest/install.html#first-configuration)