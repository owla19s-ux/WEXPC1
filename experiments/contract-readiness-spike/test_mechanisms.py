"""Non-product mechanism acceptance; every test owns an isolated temporary directory."""
import hashlib
import json
import multiprocessing as mp
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

import mechanisms as m

class Mechanisms(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.db = self.root / 'state.db'
        m.init(self.db)

    def test_F01_cycle_persists_independent_work_and_safe_recovery(self):
        m.add_wait(self.db, 'A', 'B', 'P', 'unknown')
        # Second process commits the reverse dependency, then is killed after commit.
        m.child(self.db, 'wait-crash')
        self.assertEqual(m.cycles(self.db), [('A', 'B')])
        self.assertFalse(m.release(self.db, 'A', 'timeout'))
        self.assertFalse(m.release(self.db, 'B', 'cancel-request'))
        self.assertTrue(m.independent(self.db, 'R'))
        self.assertTrue(m.release(self.db, 'B', 'confirmed-stopped'))
        self.assertEqual(m.cycles(self.db), [])
        self.assertFalse(m.independent(self.db, 'P'), 'B release must not free A unknown hold')
        self.assertFalse(m.release(self.db, 'A', 'timeout'))
        self.assertEqual(m.count(self.db, 'dispatches'), 0)

    def test_F01_normal_wait_self_cycle_and_failure_release(self):
        m.add_wait(self.db, 'A', 'B', 'P', 'known')
        self.assertEqual(m.cycles(self.db), [])
        m.add_wait(self.db, 'B', 'B', 'Q', 'known')
        self.assertEqual(m.cycles(self.db), [('B',)])
        self.assertTrue(m.release(self.db, 'B', 'proven-not-started'))
        self.assertEqual(m.cycles(self.db), [])

    def test_F01_unknown_external_effect_recovery_does_not_redispatch(self):
        m.child(self.db, 'effect-crash')
        effect = self.db.with_suffix('.effects')
        self.assertEqual(effect.read_text().splitlines(), ['operation-1'])
        self.assertFalse(m.dispatch_effect(self.db, 'operation-1'))
        self.assertEqual(effect.read_text().splitlines(), ['operation-1'])
        self.assertEqual(m.count(self.db, 'dispatches'), 1)

    def test_F02_versions_join_round_attempt_and_restart(self):
        m.define(self.db, 4, ['N', 'B'])
        m.instance(self.db, 'I1', 4, ['N', 'B'])
        m.define(self.db, 5, ['NEW'])
        m.instance(self.db, 'I2', 5, ['NEW'])
        self.assertEqual(m.bound(self.db, 'I1'), (4, ['N', 'B']))
        self.assertEqual(m.bound(self.db, 'I2'), (5, ['NEW']))
        m.result(self.db, 'I1', 1, 'N', 1, 'unknown')
        m.result(self.db, 'I1', 1, 'B', 1, 'succeeded')
        self.assertFalse(m.joined(self.db, 'I1', 1))
        m.result(self.db, 'I1', 1, 'N', 2, 'succeeded')
        self.assertTrue(m.joined(self.db, 'I1', 1))
        self.assertFalse(m.joined(self.db, 'I1', 2))
        # A duplicate delivery is idempotent; conflicting same-attempt results are rejected.
        m.result(self.db, 'I1', 1, 'N', 2, 'succeeded')
        with self.assertRaises(ValueError):
            m.result(self.db, 'I1', 1, 'N', 2, 'failed')
        m.child(self.db, 'workflow-read')
        self.assertEqual(m.count(self.db, 'dispatches'), 0)

    def test_F02_definition_immutable_and_invalid_branch_rejected(self):
        m.define(self.db, 1, ['a', 'b'])
        with self.assertRaises(ValueError): m.define(self.db, 1, ['c'])
        m.instance(self.db, 'I', 1, ['a'])
        with self.assertRaises(ValueError): m.result(self.db, 'I', 1, 'b', 1, 'succeeded')
        m.result(self.db, 'I', 1, 'a', 1, 'succeeded')
        self.assertTrue(m.joined(self.db, 'I', 1))

    def test_F03_read_transform_save_reload_send_and_revoke(self):
        original = self.root / 'source.txt'
        original.write_text('private evidence', encoding='utf8')
        artifact = self.root / 'summary.txt'
        # Local deterministic transform stands in for AI; no model is called.
        m.derive(original, artifact, ['provider:M'])
        self.assertTrue(m.send(self.db, artifact, 'provider:M'))
        self.assertFalse(m.send(self.db, artifact, 'agent:D'))
        m.revoke(self.db, 'provider:M')
        self.assertFalse(m.send(self.db, artifact, 'provider:M'))
        self.assertEqual(m.count(self.db, 'outbox'), 1)

    def test_F03_revoke_between_read_and_send_target_substitution(self):
        source = self.root / 'x'; source.write_text('restricted')
        target = self.root / 'y'; m.derive(source, target, ['M'])
        self.assertFalse(m.send(self.db, target, 'D'))
        self.assertFalse(m.send(self.db, target, 'M', before_commit=lambda: m.revoke(self.db, 'M')))
        self.assertEqual(m.count(self.db, 'outbox'), 0)

    def test_F03_modified_missing_or_incomplete_provenance_denied(self):
        source = self.root / 'x'; source.write_text('restricted')
        target = self.root / 'y'; m.derive(source, target, ['M'])
        target.write_text('copied raw source')
        self.assertFalse(m.send(self.db, target, 'M'))
        target.with_suffix('.provenance.json').unlink()
        self.assertFalse(m.send(self.db, target, 'M'))
        self.assertEqual(m.count(self.db, 'outbox'), 0)

    def test_F03_second_transform_cannot_broaden_source_targets(self):
        x = self.root / 'x'; x.write_text('restricted source')
        y = self.root / 'y'; z = self.root / 'z'
        m.derive(x, y, ['M'])
        m.derive(y, z, ['M', 'D'])
        self.assertFalse(m.send(self.db, z, 'D'))
        self.assertTrue(m.send(self.db, z, 'M'))
        self.assertEqual(m.count(self.db, 'outbox'), 1)

    def test_F05_naive_read_then_write_overbooks(self):
        accepted = m.race(self.db, unsafe=True)
        self.assertEqual(accepted, 2, 'negative control must reproduce oversubscription')

    def test_F05_atomic_last_unit_only_one_winner(self):
        self.assertEqual(m.race(self.db, unsafe=False), 1)
        self.assertEqual(m.remaining(self.db), 0)

    def test_F05_crash_unknown_retry_cancel_reconcile(self):
        m.child(self.db, 'budget-crash')
        self.assertEqual(m.remaining(self.db), 0)
        self.assertFalse(m.reserve(self.db, 'retry', 1))
        self.assertFalse(m.settle(self.db, 'crashed', 'cancel-request', 0))
        self.assertEqual(m.remaining(self.db), 0)
        self.assertTrue(m.settle(self.db, 'crashed', 'final-usage', 0))
        self.assertFalse(m.settle(self.db, 'crashed', 'final-usage', 0))
        self.assertEqual(m.remaining(self.db), 1)
        self.assertTrue(m.reserve(self.db, 'retry', 1))
        self.assertTrue(m.reserve(self.db, 'retry', 1))
        with self.assertRaises(ValueError): m.reserve(self.db, 'retry', 2)
        self.assertTrue(m.settle(self.db, 'retry', 'final-usage', 3))
        self.assertEqual(m.remaining(self.db), -2, 'observed overspend must remain visible')
        self.assertFalse(m.reserve(self.db, 'next', 1))

    def test_F06_takeover_stale_return_and_concurrent_edit(self):
        epoch = m.takeover(self.db)
        self.assertEqual(epoch, 2)
        self.assertFalse(m.complete(self.db, 1, 'late agent output'))
        self.assertTrue(m.complete(self.db, epoch, 'human edit'))
        self.assertFalse(m.complete(self.db, epoch, 'duplicate write'))
        self.assertEqual(m.current_work(self.db), ('human edit', 'held'))
        self.assertEqual(m.count(self.db, 'observations'), 3)
        self.assertFalse(m.resume(self.db, epoch, stopped=False))
        self.assertTrue(m.resume(self.db, epoch, stopped=True))
        self.assertEqual(m.current_work(self.db)[1], 'ready')

    def test_F06_takeover_race_has_one_current_writer(self):
        self.assertEqual(m.writer_race(self.db), 1)
        self.assertEqual(m.count(self.db, 'observations'), 2)

    def test_F07_content_not_mtime_and_acceptance_version(self):
        file = self.root / 'chapter.txt'; file.write_text('v1')
        v1 = m.fingerprint(file); stat = file.stat()
        verification = {'requirement': 1, 'hash': v1, 'pass': True}
        self.assertTrue(m.accept(file, verification, 1))
        file.write_text('v2'); os.utime(file, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        self.assertFalse(m.accept(file, verification, 1))
        self.assertFalse(m.accept(file, {'requirement': 1, 'hash': m.fingerprint(file), 'pass': True}, 2))
        self.assertFalse(m.accept(file, {'requirement': 1, 'hash': m.fingerprint(file), 'pass': False}, 1))
        self.assertEqual(file.read_text(), 'v2')

    def test_F07_move_delete_duplicate_names_and_failed_output(self):
        a = self.root / 'a'; b = self.root / 'b'; a.mkdir(); b.mkdir()
        x = a / 'report'; y = b / 'report'; x.write_text('first'); y.write_text('second')
        evidence = {'requirement': 1, 'hash': m.fingerprint(x), 'pass': True}
        moved = a / 'moved'; x.rename(moved)
        self.assertFalse(m.accept(x, evidence, 1))
        self.assertFalse(m.accept(y, evidence, 1))
        self.assertTrue(m.accept(moved, evidence, 1)) # Explicit rebind, not automatic discovery.
        moved.unlink(); self.assertFalse(m.accept(moved, evidence, 1))
        self.assertTrue(y.exists(), 'failed/other outputs remain for diagnosis')

    @unittest.skipUnless(sys.platform == 'linux', 'Linux advisory flock experiment only')
    def test_F08_same_root_different_roots_kill_and_stale_metadata(self):
        # Parent never guesses liveness from PID or deletes a lock based on its age.
        with m.locked_process(self.root) as process:
            self.assertFalse(m.can_lock(self.root))
            other = self.root / 'other'; other.mkdir()
            self.assertTrue(m.can_lock(other))
            process.kill(); process.wait(timeout=5)
        self.assertTrue((self.root / '.instance.lock').exists())
        self.assertTrue(m.can_lock(self.root))

    @unittest.skipUnless(sys.platform == 'linux', 'Linux advisory flock experiment only')
    def test_F08_concurrent_writers_guard_root_and_database_integrity(self):
        self.assertEqual(m.root_writer_race(self.root, self.db), 1)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('pragma integrity_check').fetchone()[0], 'ok')

if __name__ == '__main__': unittest.main(verbosity=2)
