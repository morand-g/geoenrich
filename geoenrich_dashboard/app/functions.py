from geoenrich.enrichment import *
from pathlib import Path
from tqdm.auto import tqdm
import time
from flask_socketio import SocketIO

# Celery worker needs its own SocketIO client
socketio = SocketIO(
    message_queue="redis://redis:6379/0",
    async_mode="threading",
)

def get_progress_callback(enrichment_id):

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
            socketio.emit('enrichment_status', {'enrichment_id': enrichment_id, 'status': "PROGRESS", 'progress': self.n / self.total * 100 })

    return TqdmWithCallback
