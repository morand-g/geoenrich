FROM tiangolo/uwsgi-nginx-flask:python3.10

RUN apt-get update
RUN apt-get install ffmpeg libsm6 libxext6 redis-server -y

RUN pip install --no-cache-dir git+https://github.com/morand-g/geoenrich@develop

RUN old_path="'./'" && new_path="'/home/data/'" && sed -i "s%$old_path%$new_path%g" /usr/local/lib/python3.10/site-packages/geoenrich/credentials_example.py
