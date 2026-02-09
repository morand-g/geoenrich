from multiprocessing.pool import AsyncResult
import os
from time import time
import pandas as pd
from flask import Flask, render_template, request, send_from_directory, jsonify
from flask_socketio import SocketIO
from celery import Celery
from celery.signals import task_sent


from geoenrich.dataloader import *
from geoenrich.enrichment import *
from geoenrich.exports import *
from pathlib import Path

from geoenrich.satellite import get_var_catalog


app = Flask(__name__)

socketio = SocketIO(app)

# App variables
app.config["DEBUG"] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
app.config['UPLOAD_EXTENSIONS'] = ['.csv']
app.config['DS_REF'] = ''
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Directory for enrichment outputs
OUTPUT_DIR = "data/useroutputs/"  


# Root URL
@app.route('/')
def index():
    return render_template('dashboard.html')


# Process uploaded file
@app.route("/uploadFile", methods=['POST'])
def uploadFiles():
    uploaded_file = request.files['file']
    if uploaded_file.filename != '':

        # Handle file
        csv_filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(csv_filepath)
        app.config['DS_REF'] = uploaded_file.filename.split('.')[0]


        # Create enrichment file if needed
        if not Path(biodiv_path / uploaded_file.filename).exists():

            # Guess column names
            lat_col, lon_col, date_col = 'latitude', 'longitude', 'date'
            colnames = pd.read_csv(csv_filepath, nrows=0).columns.tolist()
            for col in colnames:
                if col.lower() in ['latitude', 'y', 'lat', 'decimallatitude']:
                    lat_col = col
                elif col.lower() in ['longitude', 'x', 'lon', 'decimallongitude']:
                    lon_col = col
                elif col.lower() in ['date', 'eventdate']:
                    date_col = col

            # Try loading uploaded file as occurrences, and if it doesn't work, as areas
            try:
                df = import_occurrences_csv(
                    path=csv_filepath,
                    id_col='id', date_col=date_col, lat_col=lat_col, lon_col=lon_col
                )
            except:
                df = load_areas_file(csv_filepath)

            create_enrichment_file(df, app.config['DS_REF'])

    return '', 204


@app.route("/addVariables", methods=['POST'])
def add_variables():

    dataset_ref = app.config['DS_REF']

    variables = request.form['selectedVariablesList'].split(',')[1:]
    geo_buff = int(request.form['bufferInput'])
    depth_request = request.form['depthMode']

    for v in variables:

        _, enrichment_metadata = load_enrichment_file(dataset_ref)
        enrichments = enrichment_metadata['enrichments']
        enrichment_id = get_enrichment_id(enrichments, v, geo_buff, time_buff=(0,0), depth_request=depth_request, downsample={})

        if enrichment_id == -1:
            if len(enrichments):
                enrichment_id = max([en['id'] for en in enrichments]) + 1
            else:
                enrichment_id = 1
            
            save_enrichment_config(dataset_ref, enrichment_id, v, geo_buff, time_buff=(0,0), depth_request=depth_request, downsample={})
            push_status( task_id= enrichment_id,
                                          status= "PENDING",
                                          varname= v)

    return '', 204

@celery.task(bind=True)
def push_status(self, task_id=None, status='PENDING', varname=None, **kwargs):

    self.update_state(task_id=str(task_id), status=status)
    task_sent_handler(sender=None, task_id=str(task_id), status=status, varname=varname)


@task_sent.connect
def task_sent_handler(sender=None, task_id=None, status='PENDING', varname=None, **kwargs):
    socketio.emit('task_status', {'task_id': task_id, 'status': status, 'varname': varname})


@app.route('/task-status/<task_id>')
def task_status(task_id):
    task = AsyncResult(task_id, app=celery)
    return jsonify({
        'status': task.status,
    })

# class TqdmWithCallback(tqdm):
#     def __init__(self, *args, progress_callback=None, **kwargs):
#         self.progress_callback = progress_callback
#         self._last_emit = 0
#         super().__init__(*args, **kwargs)

#     def update(self, n=1):
#         super().update(n)

#         if not self.progress_callback or not self.total:
#             return

#         # throttle: 5–10 Hz
#         now = time.time()
#         if now - self._last_emit < 0.2:
#             return

#         self._last_emit = now
#         self.progress_callback(self.n, self.total)



# @app.route("/enrich/<enrichment_id>", methods=['POST'])
# def enrich_route():
        
#         # var_id = request.form['var_id']
#         # geo_buff = int(request.form['geo_buff'])
#         # time_buff = [int(request.form['tbuff1']), int(request.form['tbuff2'])]

#         # if request.form.get('checkbox'):
#         #     depth_request = 'all'
#         # else:
#         #     depth_request = 'surface'


#         # Run enrichment


#         enrich(ds_ref, var_id, geo_buff, time_buff, depth_request)
#         produce_stats(ds_ref, var_id, out_path=OUTPUT_DIR)


#         # Build download link
#         download_link = f"http://localhost:8080/download/{ds_ref}"


#         return render_template('download.html', link=download_link)


#get var list
@app.route("/get_var_catalog")
def get_var_catalog_api():
    catalog = get_var_catalog()
    return jsonify(list(catalog.keys()))


# Run app
if (__name__ == "__main__"):

    

    socketio.run(app, debug=True, port=8080, host='0.0.0.0', allow_unsafe_werkzeug=True)
