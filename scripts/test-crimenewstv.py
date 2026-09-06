import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout
import io
import json
import tempfile

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-crimenewstv.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class SelectionTests(unittest.TestCase):
    now = datetime(2026, 9, 7, 13, tzinfo=timezone.utc)

    def video(self, n, **changes):
        return {'id': f'{n:011d}', 'title': f'Court hearing case {n}',
                'publishedAt': (self.now-timedelta(hours=n)).isoformat(),
                'embeddable': True, 'privacyStatus': 'public', 'duration': 'PT5M',
                'source': {'id': str(n % 5), 'name': 'News'}, **changes}

    def test_nine_per_run_and_remaining_daily_capacity(self):
        rows = [self.video(n) for n in range(20)]
        self.assertEqual(len(collector.select(rows, [], 9, self.now)), 9)
        self.assertEqual(len(collector.select(rows, [], min(9,18-16), self.now)), 2)
        self.assertEqual(collector.select(rows, [], 0, self.now), [])

    def test_no_duplicates_or_unplayable_or_future_or_stale(self):
        rows = [self.video(0), self.video(0), self.video(1),
                self.video(2, embeddable=False), self.video(3, privacyStatus='private'),
                self.video(4, publishedAt=(self.now+timedelta(days=1)).isoformat()),
                self.video(5, publishedAt=(self.now-timedelta(days=8)).isoformat()),
                self.video(6, duration='P0D')]
        self.assertEqual([v['id'] for v in collector.select(rows, [{'embed': '00000000001'}], 9, self.now)], ['00000000000'])

    def test_relevance_and_source_diversity(self):
        rows = [self.video(n, source={'id':'same'}, title='Court hearing') for n in range(12)]
        rows += [self.video(20,title='Weather forecast'), self.video(21,title='Celebrity birthday')]
        self.assertEqual(len(collector.select(rows, [], 9, self.now)), 3)

    def test_case_diversity(self):
        rows = [self.video(n,title='Lindsay Clancy trial') for n in range(12)]
        self.assertEqual(len(collector.select(rows, [], 9, self.now)), 3)

    def test_two_slots_publish_eighteen_and_retry_is_idempotent(self):
        class FrozenDate(datetime):
            @classmethod
            def now(cls, tz=None):
                return datetime(2026,9,7,20,tzinfo=timezone.utc)
        rows = [self.video(n) for n in range(25)]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'data').mkdir()
            (root/'data/crimenewstv-sources.json').write_text('[{"id":"test"}]')
            state = root/'data/state.json'
            state.write_text('{"editions":[],"runs":{}}')
            with patch.multiple(collector, ROOT=root, STATE=state, OUTPUT=root/'auto.js', datetime=FrozenDate), \
                 patch.object(collector,'legacy_catalog',return_value=[]), \
                 patch.object(collector,'feed',return_value=rows), \
                 patch.object(collector,'request',return_value=json.dumps({'configured':True,'videos':rows}).encode()), \
                 patch.dict('os.environ',{'GITHUB_OUTPUT':''}), redirect_stdout(io.StringIO()):
                for slot in ['09','16','16']:
                    with patch('sys.argv',['collector','--slot',slot]):
                        collector.main()
            result = json.loads(state.read_text())
            self.assertEqual(len(result['editions'][0]['videos']),18)
            self.assertEqual(len({v['id'] for v in result['editions'][0]['videos']}),18)
            self.assertEqual(len(result['runs']),2)
            self.assertTrue((root/'auto.js').exists())

if __name__ == '__main__':
    unittest.main()
