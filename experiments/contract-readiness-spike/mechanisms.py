"""Disposable mechanism models. Never imported by WEX product modules.

SQLite schema and Python APIs below are experiment-private, NOT WEX contracts.
All database connections are fresh: tests actually re-read committed disk state.
"""
from contextlib import contextmanager
import hashlib
import json
import multiprocessing as mp
import os
from pathlib import Path
import sqlite3
import subprocess
import sys

@contextmanager
def connection(path):
    db = sqlite3.connect(path, timeout=5, isolation_level=None)
    try: yield db
    finally: db.close()

@contextmanager
def transaction(path):
    with connection(path) as db:
        db.execute('begin immediate')
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise

def init(path):
    with connection(path) as db:
        db.executescript('''
        pragma journal_mode=WAL;
        create table waits(src text primary key, dst text, resource text, state text);
        create table holds(owner text primary key, resource text, state text);
        create table dispatches(id text primary key);
        create table definitions(rev integer primary key, nodes text);
        create table instances(id text primary key, rev integer, selected text);
        create table results(instance text, round integer, node text, attempt integer, state text,
          primary key(instance,round,node,attempt));
        create table revoked(target text primary key);
        create table outbox(target text, content_hash text, provenance text);
        create table budget(id integer primary key, remaining integer);
        insert into budget values(1,1);
        create table reservations(id text primary key, amount integer, state text);
        create table work(id integer primary key, epoch integer, content text, occupied text, edited integer);
        insert into work values(1,1,'','held',0);
        create table observations(epoch integer, content text, accepted integer);
        create table rootwrites(id integer primary key);
        ''')

def count(path, table):
    assert table in {'dispatches','outbox','observations','rootwrites'}
    with connection(path) as db: return db.execute('select count(*) from '+table).fetchone()[0]

def add_wait(path, src, dst, resource, state):
    with transaction(path) as db:
        db.execute('insert into waits values(?,?,?,?)', (src,dst,resource,state))
        db.execute('insert into holds values(?,?,?)', (src,resource,state))

def cycles(path):
    with connection(path) as db: edges = dict(db.execute('select src,dst from waits'))
    found = set()
    for start in edges:
        chain = []; current = start
        while current in edges and current not in chain:
            chain.append(current); current = edges[current]
        if current in chain: found.add(tuple(sorted(chain[chain.index(current):])))
    return sorted(found)

def release(path, owner, evidence):
    if evidence not in {'confirmed-stopped','proven-not-started'}: return False
    with transaction(path) as db:
        # Remove satisfied wait edges separately from unrelated unknown holds.
        db.execute('delete from waits where src=? or dst=?', (owner,owner))
        db.execute('delete from holds where owner=?', (owner,))
    return True

def independent(path, resource):
    with connection(path) as db:
        return not db.execute('select 1 from holds where resource=?', (resource,)).fetchone()

def dispatch_effect(path, intent, crash=False):
    # Persist uncertainty BEFORE an external file effect. Existing unknown is not retried.
    with transaction(path) as db:
        if db.execute('select 1 from dispatches where id=?',(intent,)).fetchone(): return False
        db.execute('insert into dispatches values(?)',(intent,))
    with open(Path(path).with_suffix('.effects'), 'a') as output:
        output.write(intent+'\n'); output.flush(); os.fsync(output.fileno())
    if crash: os.kill(os.getpid(),9)
    return True


def define(path, revision, nodes):
    with transaction(path) as db:
        old = db.execute('select nodes from definitions where rev=?',(revision,)).fetchone()
        encoded = json.dumps(nodes)
        if old and old[0] != encoded: raise ValueError('immutable definition')
        db.execute('insert or ignore into definitions values(?,?)',(revision,encoded))

def instance(path, name, revision, selected):
    with transaction(path) as db:
        nodes = json.loads(db.execute('select nodes from definitions where rev=?',(revision,)).fetchone()[0])
        if not selected or not set(selected) <= set(nodes): raise ValueError('invalid branch selection')
        db.execute('insert into instances values(?,?,?)',(name,revision,json.dumps(selected)))

def bound(path, name):
    with connection(path) as db:
        row = db.execute('select rev,nodes from instances join definitions using(rev) where id=?',(name,)).fetchone()
        return row[0], json.loads(row[1])

def result(path, name, iteration, node, attempt, state):
    if iteration < 1 or attempt < 1: raise ValueError('invalid round or attempt')
    with transaction(path) as db:
        selected = json.loads(db.execute('select selected from instances where id=?',(name,)).fetchone()[0])
        if node not in selected: raise ValueError('not selected in this instance')
        old = db.execute('select state from results where instance=? and round=? and node=? and attempt=?',
                         (name,iteration,node,attempt)).fetchone()
        if old and old[0] != state: raise ValueError('conflicting delivery')
        db.execute('insert or ignore into results values(?,?,?,?,?)',(name,iteration,node,attempt,state))

def joined(path, name, iteration):
    with connection(path) as db:
        selected = json.loads(db.execute('select selected from instances where id=?',(name,)).fetchone()[0])
        rows = list(db.execute('select node,state from results where instance=? and round=? order by attempt', (name,iteration)))
    latest = dict(rows)
    return all(latest.get(node) == 'succeeded' for node in selected)

def fingerprint(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def derive(source, artifact, targets):
    # Explicit deterministic AI stand-in; union/intersection only, no declassification.
    inherited_path = source.with_suffix('.provenance.json')
    ancestors = []
    if inherited_path.exists():
        inherited = json.loads(inherited_path.read_text())
        if inherited['content_hash'] != fingerprint(source): raise ValueError('stale provenance')
        targets = sorted(set(targets) & set(inherited['targets']))
        ancestors = inherited.get('ancestors', []) + [inherited['source_hash']]
    artifact.write_text('summary: '+source.read_text()[:8], encoding='utf8')
    artifact.with_suffix('.provenance.json').write_text(json.dumps({
        'source': str(source), 'source_hash': fingerprint(source),
        'content_hash': fingerprint(artifact), 'targets': targets, 'ancestors': ancestors,
    }), encoding='utf8')

def revoke(path, target):
    with transaction(path) as db: db.execute('insert or ignore into revoked values(?)',(target,))

def send(path, artifact, actual_target, before_commit=lambda: None):
    try:
        data = artifact.read_bytes()
        meta = json.loads(artifact.with_suffix('.provenance.json').read_text())
        digest = hashlib.sha256(data).hexdigest()
        if digest != meta['content_hash'] or actual_target not in meta['targets'] or not meta['source_hash']:
            return False
    except (OSError, ValueError, KeyError): return False
    before_commit() # Fault injection after read/transform, before atomic authorization + local outbox.
    with transaction(path) as db:
        if db.execute('select 1 from revoked where target=?',(actual_target,)).fetchone(): return False
        db.execute('insert into outbox values(?,?,?)',(actual_target,digest,json.dumps(meta)))
    return True # Outbox commit, NOT delivery to a network destination.

def reserve(path, intent, amount):
    if amount <= 0: raise ValueError('invalid units')
    with transaction(path) as db:
        old = db.execute('select amount,state from reservations where id=?',(intent,)).fetchone()
        if old:
            if old[0] != amount: raise ValueError('intent payload mismatch')
            return old[1] == 'reserved'
        updated = db.execute('update budget set remaining=remaining-? where id=1 and remaining>=?',(amount,amount)).rowcount
        if not updated: return False
        db.execute('insert into reservations values(?,?,?)',(intent,amount,'reserved'))
        return True

def remaining(path):
    with connection(path) as db: return db.execute('select remaining from budget').fetchone()[0]

def settle(path, intent, evidence, actual):
    if evidence not in {'final-usage','proven-not-started'}: return False
    if actual < 0: raise ValueError('invalid usage')
    with transaction(path) as db:
        row = db.execute('select amount,state from reservations where id=?',(intent,)).fetchone()
        if not row or row[1] != 'reserved': return False
        db.execute('update budget set remaining=remaining+? where id=1',(row[0]-actual,))
        db.execute("update reservations set state='settled' where id=?",(intent,))
        return True

def _budget_worker(path, intent, barrier, queue, unsafe):
    if unsafe:
        available = remaining(path)
        barrier.wait(timeout=5)
        if available >= 1:
            with transaction(path) as db:
                db.execute('update budget set remaining=? where id=1',(available-1,))
                db.execute('insert into reservations values(?,?,?)',(intent,1,'reserved'))
            queue.put(True)
        else: queue.put(False)
    else:
        barrier.wait(timeout=5)
        queue.put(reserve(path,intent,1))

def _run_workers(target, args):
    ctx = mp.get_context('spawn'); barrier = ctx.Barrier(2); queue = ctx.Queue()
    children = [ctx.Process(target=target,args=(*arg,barrier,queue)) for arg in args]
    try:
        for child in children: child.start()
        values = [queue.get(timeout=10) for _ in children]
        for child in children:
            child.join(timeout=5)
            assert child.exitcode == 0, ('worker failed', child.exitcode)
        return sum(values)
    finally:
        for child in children:
            if child.is_alive(): child.kill(); child.join(timeout=5)
        queue.close()

def _budget_adapter(path, intent, unsafe, barrier, queue):
    _budget_worker(path,intent,barrier,queue,unsafe)

def race(path, unsafe):
    return _run_workers(_budget_adapter, [(path,str(i),unsafe) for i in range(2)])

def takeover(path):
    with transaction(path) as db:
        db.execute('update work set epoch=epoch+1,edited=0 where id=1')
        return db.execute('select epoch from work where id=1').fetchone()[0]

def complete(path, epoch, content):
    with transaction(path) as db:
        accepted = db.execute('update work set content=?,edited=1 where id=1 and epoch=? and edited=0',
                              (content,epoch)).rowcount
        db.execute('insert into observations values(?,?,?)',(epoch,content,accepted))
        return bool(accepted)

def current_work(path):
    with connection(path) as db: return db.execute('select content,occupied from work where id=1').fetchone()

def resume(path, epoch, stopped):
    if not stopped: return False
    with transaction(path) as db:
        return bool(db.execute("update work set occupied='ready' where id=1 and epoch=? and occupied='held'",(epoch,)).rowcount)

def _writer(path, index, barrier, queue):
    barrier.wait(timeout=5); queue.put(complete(path,2,'writer:'+str(index)))

def writer_race(path):
    takeover(path)
    return _run_workers(_writer, [(path,i) for i in range(2)])

def accept(path, verification, requirement):
    try: digest = fingerprint(path)
    except OSError: return False
    return verification['pass'] and verification['requirement']==requirement and verification['hash']==digest

@contextmanager
def locked_process(root):
    child = subprocess.Popen([sys.executable,__file__,'lock',str(root)],stdout=subprocess.PIPE,text=True)
    try:
        assert child.stdout.readline().strip() == 'locked'
        yield child
    finally:
        if child.poll() is None: child.kill()
        child.wait(timeout=5); child.stdout.close()

def can_lock(root):
    import fcntl
    with open(root / '.instance.lock','a+') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: return False
        return True

def _root_writer(root, path, index, barrier, queue):
    import fcntl
    with open(Path(root) / '.instance.lock','a+') as lock:
        acquired = False
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB); acquired=True
        except BlockingIOError: pass
        # Winner retains lock until the other process has attempted acquisition.
        barrier.wait(timeout=5)
        if acquired:
            with transaction(path) as db: db.execute('insert into rootwrites values(?)',(index,))
        queue.put(acquired)

def root_writer_race(root,path):
    return _run_workers(_root_writer, [(str(root),path,i) for i in range(2)])

def child(path, mode):
    result = subprocess.run([sys.executable,__file__,mode,str(path)],capture_output=True,text=True,timeout=10)
    if mode.endswith('crash'): assert result.returncode == -9, result
    else: assert result.returncode == 0, result.stderr

if __name__ == '__main__':
    mode, location = sys.argv[1:]
    if mode == 'effect-crash':
        dispatch_effect(location,'operation-1',crash=True)
    elif mode == 'wait-crash':
        add_wait(location,'B','A','Q','unknown'); os.kill(os.getpid(),9)
    elif mode == 'budget-crash':
        assert reserve(location,'crashed',1); os.kill(os.getpid(),9)
    elif mode == 'workflow-read':
        assert bound(location,'I1')[0] == 4
        assert joined(location,'I1',1) and not joined(location,'I1',2)
        assert count(location,'dispatches') == 0
    elif mode == 'lock':
        import fcntl
        import signal
        with open(Path(location)/'.instance.lock','a+') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            lock.write('diagnostic metadata only\n'); lock.flush()
            print('locked',flush=True)
            signal.pause()
    else: raise ValueError(mode)
