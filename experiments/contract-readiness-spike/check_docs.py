"""Checks batch-six file links/coverage only; does not certify architecture semantics."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
changed = subprocess.check_output(['git','diff','--name-only'],cwd=ROOT,text=True).splitlines()
files = {ROOT/name for name in changed if name.endswith('.md')}
files.update((ROOT/'docs/batch6').glob('*.md'))
files.add(ROOT/'experiments/contract-readiness-spike/README.md')
errors = []; links = 0
for file in sorted(files):
    text = file.read_text()
    fences = re.findall(r'^```',text,re.M)
    if len(fences)%2: errors.append(f'{file}: unpaired code fence')
    # Check file targets only. Heading anchor rendering is explicitly not certified.
    for target in re.findall(r'\]\(([^)]+)\)',text):
        if target.startswith(('https:','http:','mailto:','#')): continue
        target=target.split('#')[0]
        if not target: continue
        links += 1
        if not (file.parent / target).exists(): errors.append(f'{file.relative_to(ROOT)} -> {target}')
for domain in ['app','space','AI','conversations','connections','workflows','permissions','shared','views','workflows/modes','UI']:
    for name in ['README.md','CONTRACT.md']:
        if '第六批' not in (ROOT/domain/name).read_text(): errors.append(f'missing sixth batch: {domain}/{name}')
convergence = (ROOT/'docs/batch6/CONVERGENCE.md').read_text()
experiments = (ROOT/'docs/batch6/EXPERIMENTS.md').read_text()
for number in range(1,10):
    if not re.search(rf'^## F{number:02d} ',convergence,re.M): errors.append(f'missing F{number:02d}')
    if f'X{number:02d}/' not in experiments: errors.append(f'missing X{number:02d}')
# Preserve exactly the fifth-batch 33 baseline sample rows plus H22–H30 sections.
stress = (ROOT/'docs/research/COMPLEX-CONTRACT-STRESS-REVIEW-2026-10-31.md').read_text()
rows = re.findall(r'^\| ((?:L|H)\d\d) ',stress,re.M)
expected = {f'L{i:02d}' for i in range(1,13)}|{f'H{i:02d}' for i in range(1,22)}
if set(rows) != expected or len(rows)!=33: errors.append('33 baseline sample matrix changed')
if set(re.findall(r'^### (H\d\d) ',stress,re.M)) != {f'H{i}' for i in range(22,31)}:
    errors.append('H22–H30 changed')
if errors: raise SystemExit('\n'.join(errors))
print(f'PASS: {len(files)} Markdown files, {links} file targets, 11 domain entries, F01–F09/X01–X09, original 33+9 samples; anchors and semantics not certified')
