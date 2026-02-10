import os
import time
import pandas as pd
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO


from geoenrich.dataloader import import_occurrences_csv, load_areas_file, biodiv_path
from geoenrich.enrichment import create_enrichment_file, save_enrichment_config, load_enrichment_file, get_enrichment_id
from geoenrich.satellite import get_var_catalog

from pathlib import Path

from functions import enrich_wrapper

app = Flask(__name__)

socketio = SocketIO(app, async_mode='threading', message_queue="redis://redis:6379/0")

# App variables
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
app.config['UPLOAD_EXTENSIONS'] = ['.csv']
app.config['DS_REF'] = ''
# app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
# app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

# celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
# celery.conf.update(app.config)

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
            socketio.start_background_task(target=push_status, enrichment_id= enrichment_id, status= "PENDING", varname= v)

    return '', 200


def push_status(enrichment_id, **kwargs):

    time.sleep(1)
    socketio.emit('enrichment_status', {'enrichment_id': enrichment_id, **kwargs})




@app.route("/enrich/<enrichment_id>", methods=['GET'])
def enrich_route():
        
        # enrichment_id = request.args.get('enrichment_id')
        # ds_ref = app.config['DS_REF']

        # _, enrichment_metadata = load_enrichment_file(ds_ref)
        # enrichment = [en for en in enrichment_metadata['enrichments'] if en['id'] == int(enrichment_id)][0]
        
        # enrich_wrapper(ds_ref, enrichment)
        # # var_id = request.form['var_id']
        # # geo_buff = int(request.form['geo_buff'])
        # # time_buff = [int(request.form['tbuff1']), int(request.form['tbuff2'])]

        # # if request.form.get('checkbox'):
        # #     depth_request = 'all'
        # # else:
        # #     depth_request = 'surface'


        # # Run enrichment



    return '', 200

#get var list
@app.route("/get_var_catalog")
def get_var_catalog_api():
    catalog = get_var_catalog()
    return jsonify(list(catalog.keys()))


# Run app
if __name__ == "__main__":

    socketio.run(app, debug=True, host='0.0.0.0', port=8080, allow_unsafe_werkzeug=True)
