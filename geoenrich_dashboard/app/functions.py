from geoenrich.enrichment import *
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
