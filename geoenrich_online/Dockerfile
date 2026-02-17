FROM tiangolo/uwsgi-nginx-flask:python3.10

RUN apt-get update
RUN apt-get install ffmpeg libsm6 libxext6 -y

RUN python3 -m pip install --no-cache-dir geoenrich python-dotenv

RUN rm /app/*
RUN curl https://raw.githubusercontent.com/morand-g/geoenrich/main/docker/initialize.py -o /home/initialize.py
