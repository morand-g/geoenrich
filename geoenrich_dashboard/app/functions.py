import os
import time
import random

import pandas as pd

from flask_socketio import SocketIO

from tqdm.auto import tqdm

from geoenrich.enrichment import *
from geoenrich.dataloader import biodiv_path


# Celery worker needs its own SocketIO client
socketio = SocketIO(
    message_queue="redis://redis:6379/0",
    async_mode="threading",
)

def get_progress_callback(enrichment_id):

    # Custom tqdm class that emits progress updates to the client via SocketIO, throttled to 5-10 Hz

    class TqdmWithCallback(tqdm):
        def __init__(self, *args, **kwargs):
            self._last_emit = 0
            super().__init__(*args, **kwargs)

        def update(self, n=1):
            super().update(n)

            if not self.total:
                return

            # throttle: 5–10 Hz
            now = time.time()
            if now - self._last_emit < 0.2:
                return

            self._last_emit = now

            if enrichment_id == 'collation':
                socketio.emit('collation_status', {'status': "PROGRESS", 'progress': int(self.n / self.total * 100)})
            elif enrichment_id == 'normalization':
                socketio.emit('normalization_status', {'status': "PROGRESS", 'progress': int(self.n / self.total * 100)})
            else:
                socketio.emit('enrichment_status', {'enrichment_id': enrichment_id, 'status': "PROGRESS", 'progress': int(self.n / self.total * 100)})

    return TqdmWithCallback



def merge_files(ds_ref, enrichment_id):

    # Repatriate temp enrichment data into main file and delete enrichment file and config
    
    original_df = pd.read_csv(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'), index_col = 'id')
    
    if 'geometry' in original_df.columns:
        original_df = original_df.drop(columns=['geometry', 'eventDate'])
    else:
        original_df = original_df.drop(columns=['mint', 'maxt', 'minx', 'maxx', 'miny', 'maxy'])
        
    enrichment_df =  pd.read_csv(biodiv_path / (ds_ref + '.csv'), index_col = 'id')

    enrichment_df[original_df.columns] = original_df
    enrichment_df.to_csv(biodiv_path / (ds_ref +'.csv'))

    update_enrichment_status(ds_ref, enrichment_id, 'Enriched')

    os.remove(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'))
    os.remove(biodiv_path / (ds_ref + str(enrichment_id) + '-config.json'))



def normalization_values(ds_ref):

    # Get normalization values for a dataset, used in the normalization step

    socketio.emit('normalization_status', {'status': "PROCESSING", 'progress': 0})

    in_path = biodiv_path.parent / 'outputs_raw' / (ds_ref + '-npy')

    l = []

    all_file_list = list(in_path.glob('*.npy'))

    file_list = random.sample(all_file_list, min(len(all_file_list), 5000))

    for file in file_list:
        item = np.load(file)
        l.append(item)
        if len(l) % 50 == 0:
            socketio.emit('normalization_status', {'status': "PROCESSING", 'progress': int(len(l) / len(file_list) * 100), 'subsample': len(all_file_list) != len(file_list)})

    bigdata = np.stack(l)
    meds, perc1, perc99 = np.nanpercentile(bigdata, [50, 1, 99], axis=(0, 1, 2))

    to_save = np.stack([meds, perc1, perc99])
    np.save(biodiv_path.parent / f"{ds_ref}-stats.npy", to_save)

    return meds, perc1, perc99