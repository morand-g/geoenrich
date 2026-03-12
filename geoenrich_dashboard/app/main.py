import json
import os
import shutil
import io
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO
from celery import Celery, chord, group
from celery.result import AsyncResult

from geoenrich.dataloader import import_occurrences_csv, load_areas_file, biodiv_path, sat_path
from geoenrich.enrichment import create_enrichment_file, save_enrichment_config, load_enrichment_file, get_enrichment_id, enrich, get_metadata
from geoenrich.satellite import get_var_catalog
from geoenrich.exports import collate_npy, parse_columns, compute_stats
import netCDF4 as nc

from pathlib import Path

from functions import get_progress_callback, merge_files, normalization_values

app = Flask(__name__)

socketio = SocketIO(app, async_mode='threading', message_queue="redis://redis:6379/0")

# App variables
app.config['UPLOAD_FOLDER'] = 'static/uploads/'
app.config['UPLOAD_EXTENSIONS'] = ['.csv']
app.config['DS_REF'] = ''
app.config['CELERY_BROKER_URL'] = 'redis://redis:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://redis:6379/1'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'], backend=app.config['CELERY_RESULT_BACKEND'])


app.config['UPLOAD_FOLDER'] = '/app/static/uploads'
biodiv_path = Path('/home/data/biodiv')

# Directory for enrichment outputs
OUTPUT_DIR = "data/useroutputs/"  


# Root URL
@app.route('/')
def index():
    return render_template('dashboard.html')


def push_status(enrichment_id, **kwargs):
    socketio.emit('enrichment_status', {'enrichment_id': enrichment_id, **kwargs})


########################## Section 1 ################################################


@app.route("/getPreviousFiles", methods=["GET"])
def get_previous_files():
    # List files in the /app/static/uploads folder that correspond to JSON filenames in /home/data
    previous_files = set()
    for json_file in os.listdir(biodiv_path):
        if json_file.endswith('-config.json'):
            base_name = json_file[:-12] # Remove '-config.json' suffix

            csv_file = f"{base_name}.csv"
            previous_files.add(csv_file)

    return jsonify(list(previous_files))

@app.route("/uploadFile", methods=['POST'])
def uploadFiles():

    uploaded_file = request.files.get('file')
    selected_previous_file = request.form.get('previous_file')

    # CASE 1: User selected a previous file
    if selected_previous_file:
        csv_filepath = os.path.join(app.config['UPLOAD_FOLDER'], selected_previous_file)

        if not os.path.exists(csv_filepath):
            return "File not found", 400

        app.config['DS_REF'] = selected_previous_file.split('.')[0]

    # CASE 2: User uploaded a new file
    elif uploaded_file and uploaded_file.filename != '':
        csv_filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(csv_filepath)

        app.config['DS_REF'] = uploaded_file.filename.split('.')[0]

    else:
        return "No file selected", 400


    # ---------------------------------------------------
    # From here, both cases use the same csv_filepath
    # ---------------------------------------------------

    if not Path(biodiv_path / os.path.basename(csv_filepath)).exists():

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

        try:
            df = import_occurrences_csv(
                path=csv_filepath,
                id_col='id',
                date_col=date_col,
                lat_col=lat_col,
                lon_col=lon_col
            )
        except:
            df = load_areas_file(csv_filepath)

        create_enrichment_file(df, app.config['DS_REF'])

    else:
        _, enrichment_metadata = load_enrichment_file(app.config['DS_REF'])
        enrichments = enrichment_metadata['enrichments']

        for enrichment in enrichments:
            enrichment_id = enrichment['id']

            socketio.start_background_task(
                target=push_status,
                enrichment_id=enrichment_id,
                status='PENDING',
                varname=enrichment['parameters']['var_id']
            )

            if enrichment['status'] == 'Enriched':
                socketio.start_background_task(
                    target=push_status,
                    enrichment_id=enrichment_id,
                    status='COMPLETED',
                    varname=enrichment['parameters']['var_id']
                )

    return '', 200

@app.route("/getFileContent/<filename>", methods=["GET"])
def get_file_content(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return "File not found", 404

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    return content, 200


########################## Section 2 ################################################

@app.route("/get_var_catalog")
def get_var_catalog_api():
    catalog = get_var_catalog()
    return jsonify(list(catalog.keys()))



@app.route("/addVariables", methods=['POST'])
def add_variables():

    # Add enrichment variables to dataset config

    dataset_ref = app.config['DS_REF']

    variables = request.form['selectedVariablesList'].split(',')
    variables = [v for v in variables if v]  # Remove empty strings

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
            
            save_enrichment_config(dataset_ref, enrichment_id, v, geo_buff, time_buff=(0,0), depth_request=depth_request,
                                   downsample={}, status = 'Pending')
            socketio.start_background_task(target=push_status, enrichment_id= enrichment_id, status= "PENDING", varname= v)

    return '', 200





########################## Section 3 ################################################


@app.route("/enrich/<enrichment_id>", methods=['GET'])
def enrich_route(enrichment_id):

    # Catch enrich signal and launch enrichment
    
    ds_ref = app.config['DS_REF']

    _, enrichment_metadata = load_enrichment_file(ds_ref)
    enrichment = [en for en in enrichment_metadata['enrichments'] if en['id'] == int(enrichment_id)][0]
    
    enrich_wrapper.apply_async(args=[ds_ref, enrichment_id, enrichment['parameters']], task_id=enrichment_id)

    return '', 200



@celery.task()
def enrich_wrapper(ds_ref, enrichment_id, enrichment_params):

    # Launch enrichment as a Celery task, so it can run asynchronously and report progress back to the client via SocketIO

    socketio.emit('enrichment_status', {'enrichment_id':  enrichment_id, 'status': "STARTING"})

    ### Create temp copy to allow parallel enrichment

    original, enrichment_metadata = load_enrichment_file(ds_ref)
    enrichment_metadata['enrichments'] = [en for en in enrichment_metadata['enrichments'] if en['id'] == int(enrichment_id)]

    if enrichment_metadata['input_type'] == 'occurrence':
        original[['geometry', 'eventDate']].to_csv(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'))
    else:
        original[['mint', 'maxt', 'minx', 'maxx', 'miny', 'maxy']].to_csv(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'))

        
    filepath_json = biodiv_path / (ds_ref + str(enrichment_id) + '-config.json')
    with filepath_json.open('w') as f:
        json.dump(enrichment_metadata, f, ensure_ascii=False, indent=4)

    # Run enrichment

    var_id = enrichment_params['var_id']
    geo_buff = enrichment_params['geo_buff']
    time_buff = enrichment_params['time_buff']
    depth_request = enrichment_params['depth_request']

    try:
        enrich(ds_ref + str(enrichment_id), var_id, geo_buff, time_buff, depth_request, progress_callback= get_progress_callback(enrichment_id))
        merge_files(ds_ref, enrichment_id)
    except Exception as e:
        socketio.emit('enrichment_status', {'enrichment_id':  enrichment_id, 'status': "ERROR", 'error': str(e)})
        Path(biodiv_path / (ds_ref + str(enrichment_id) + '.csv')).unlink()
        Path(biodiv_path / (ds_ref + str(enrichment_id) + '-config.json')).unlink()
        return '', 500

    

    socketio.emit('enrichment_status', {'enrichment_id':  enrichment_id, 'status': "COMPLETED", 'progress': 100})

    return '', 200


############################ Section 4 ################################################


# Start collation of enriched data into .npy format
@app.route("/collateData", methods=['POST'])
def collateData():

    target_res = int(request.form['resInput'])
    collate_wrapper.apply_async(args=[app.config['DS_REF'], target_res])

    return '', 200


@celery.task()
def collate_wrapper(ds_ref, target_res):

    out_path = biodiv_path.parent / 'outputs_raw'
    out_path.mkdir(exist_ok=True, parents=True)

    collate_npy(ds_ref, out_path, target_res, progress_callback= get_progress_callback('collation'))
    shutil.copy(out_path / (ds_ref + '-npy') / '0000_npy_metadata.txt', out_path / (ds_ref + '_metadata.npy'))

    socketio.emit('collation_status', {'enrichment_id':  'collation', 'status': "COMPLETED", 'progress': 100})

    return '', 200


# Normalize data
@app.route("/normalizeData", methods=['POST'])
def normalizeData():

    uploaded_file = request.files['file']
    if uploaded_file.filename != '':
        npy_filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(npy_filepath)

        normalize_task.apply_async(args=[app.config['DS_REF'], npy_filepath])
    
    else:
        normalize_task.apply_async(args=[app.config['DS_REF']])

    return '', 200


@celery.task()
def normalize_task(ds_ref, npy_filepath = None):

    if npy_filepath:
        meds, perc1, perc99 = np.load(npy_filepath)
    else:
        meds, perc1, perc99 = normalization_values(ds_ref)

    in_path = out_path = biodiv_path.parent / 'outputs_raw' / (ds_ref + '-npy')
    out_path = biodiv_path.parent / 'outputs_normalized' / (ds_ref + '-npy')

    out_path.mkdir(exist_ok=True, parents=True)

    file_list = list(in_path.glob('*.npy'))

    for i in range(len(file_list)):
        file = file_list[i]
        item = np.load(file)

        # Fill NaNs with average values
        all_nans = np.isnan(item).all(axis=(0,1))
        some_nans = np.logical_and(~all_nans, np.isnan(item).any(axis=(0,1)))
        fill_values = all_nans * meds + some_nans * np.nan_to_num(np.nanmedian(item, axis = [0,1]), nan=0)
        filled = np.nan_to_num(item, nan=fill_values)

        # Normalize
        normed = (filled - perc1) / (perc99 - perc1)

        # Remove extreme values
        final = np.clip(normed, 0,1)

        # Save
        np.save(out_path / file.name, final)

        socketio.emit('normalization_status', {'enrichment_id':  'normalization', 'status': "PROGRESS", 'progress': int((i+1) / len(file_list) * 100)})

    socketio.emit('normalization_status', {'enrichment_id':  'normalization', 'status': "COMPLETED", 'progress': 100})
    return '', 200



@app.route("/checkExported", methods=['GET'])
def checkExported():
    verifyfilenumber.apply_async(args=[app.config['DS_REF']])

    return '', 200


@celery.task()
def verifyfilenumber(ds_ref):

    out_path = biodiv_path.parent / 'outputs_raw'
    out_path.mkdir(exist_ok=True, parents=True)

    filelist = list((out_path / (ds_ref + '-npy')).glob('*.npy'))
    csv, _  = load_enrichment_file(ds_ref)

    if len(filelist) == len(csv):
        socketio.emit('collation_status', {'enrichment_id':  'collation', 'status': "COMPLETED", 'progress': 100})

    return '', 200







#popUp routes
@app.route("/prepare_csv_export", methods=['GET'])
def launch_csv_export():
    
    socketio.emit('csvexport_status', {'status': "PROGRESS", 'progress': 0})

    _, enrichment_metadata = load_enrichment_file(app.config['DS_REF'])

    workflow = chord(
        group(export_variable.s(app.config['DS_REF'], en) for en in enrichment_metadata['enrichments'])
    )(on_all_variables_ready.s())

    return jsonify({"task_id": workflow.id})


# Define your parallel tasks
@celery.task()
def export_variable(ds_ref, enrichment):

    df, enrichment_metadata = load_enrichment_file(ds_ref)
    input_type = enrichment_metadata['input_type']

    var_ind = parse_columns(df)[enrichment['id']]
    var_id = enrichment['parameters']['var_id']

    var_source = get_var_catalog()[var_id]
    ds = nc.Dataset(str(Path(sat_path, var_id + '.nc')))
    dimdict, var = get_metadata(ds, var_source['varname'])

    print('Computing stats for ' + var_id + '...')
    res = df.progress_apply(compute_stats, axis=1, args = (enrichment['parameters'], input_type, var_ind, ds, dimdict, var),
                                    result_type = 'expand')
    ds.close()

    socketio.emit('csvexport_status', {'status': "PROGRESS", 'progress': np.floor(1 / len(enrichment_metadata['enrichments']) * 100)})

    return ds_ref, res.to_json()


@celery.task()
def on_all_variables_ready(results):

    compiled_result = pd.concat([pd.read_json(r[1]) for r in results], axis=1)
    socketio.emit('csvexport_status', {'status': "COMPLETED"})

    return results[0][0], compiled_result.to_json()


@app.route("/get_csv_export/<task_id>", methods=['GET'])
def download_csv(task_id):

    result = celery.AsyncResult(task_id)
    if result.ready():
        ds_ref, df_json = result.get()
        df = pd.read_json(df_json)

        buffer = io.StringIO()
        df.to_csv(buffer)
        buffer.seek(0)

        return send_file(
            io.BytesIO(buffer.getvalue().encode()),
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"{ds_ref}_export.csv"
        )
    
    return jsonify({"status": result.status}), 202


@app.route("/get_csv_export_preview/<task_id>", methods=['GET'])
def preview_csv(task_id):

    result = celery.AsyncResult(task_id)
    if result.ready():
        _, df_json = result.get()
        df = pd.read_json(df_json)
        return jsonify(df.head(10).to_dict(orient="records"))
    return jsonify({"status": result.status}), 202




# Run app
if __name__ == "__main__":

    socketio.run(app, debug=True, host='0.0.0.0', port=8080, allow_unsafe_werkzeug=True)
