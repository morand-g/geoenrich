from geoenrich.enrichment import *
from geoenrich.dataloader import biodiv_path
from tqdm.auto import tqdm
import time
from flask_socketio import SocketIO
import pandas as pd

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
            socketio.emit('enrichment_status', {'enrichment_id': enrichment_id, 'status': "PROGRESS", 'progress': int(self.n / self.total * 100)})

    return TqdmWithCallback



def merge_files(ds_ref, enrichment_id):

    # Repatriate temp enrichment data into main file and delete enrichment file and config

    original_df = pd.read_csv(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'), index_col = 'id').drop(columns = ['geometry', 'eventDate'])
    enrichment_df =  pd.read_csv(biodiv_path / (ds_ref + '.csv'), index_col = 'id')

    enrichment_df[original_df.columns] = original_df
    enrichment_df.to_csv(biodiv_path / (ds_ref +'.csv'))

    update_enrichment_status(ds_ref, enrichment_id, 'Enriched')

    os.remove(biodiv_path / (ds_ref + str(enrichment_id) + '.csv'))
    os.remove(biodiv_path / (ds_ref + str(enrichment_id) + '-config.json'))



def normalization_values(ds_ref):

    # Get normalization values for a dataset, used in the normalization step

    in_path = biodiv_path.parent / 'outputs_raw' / (ds_ref + '-npy')

    l = []

    file_list = list(in_path.glob('*.npy'))

    for file in file_list:
        item = np.load(file)
        l.append(item)

    bigdata = np.array(l)

    meds = np.nanmedian(bigdata, axis = [0,1,2])
    perc1 = np.nanpercentile(bigdata, 1, axis = [0,1,2])
    perc99 = np.nanpercentile(bigdata, 99, axis = [0,1,2])

    to_save = np.stack([meds, perc1, perc99])
    np.save(biodiv_path.parent / f"{ds_ref}-stats.npy", to_save)

    return meds, perc1, perc99