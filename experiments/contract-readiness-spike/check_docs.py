"""Checks documentation links/navigation and batch-six coverage; does not certify architecture semantics."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
domains = ['app','space','AI','conversations','connections','workflows','permissions','shared','views','workflows/modes','UI']
paths = [f'{domain}/{name}' for domain in domains for name in ['README.md','CONTRACT.md']]
paths += [
    'README.md', 'docs/README.md', 'docs/MODULE-CONTRACTS.md', 'tools/README.md',
    'AI/roles/README.md',
    'UI/components/README.md', 'UI/conversation/README.md', 'UI/settings/README.md', 'UI/space/README.md',
    'shared/storage/README.md', 'shared/credentials/README.md', 'shared/permissions/README.md',
    'connections/api/README.md', 'connections/api/UI/README.md', 'connections/dsh/README.md',
    'connections/github/README.md', 'connections/github/UI/README.md', 'connections/local/README.md',
    'connections/search/README.md',
    'workflows/runtime/README.md', 'workflows/editor/README.md',
    'workflows/modes/software-development/README.md', 'workflows/modes/software-development/UI/README.md',
    'plugins/README.md', 'dsh/README.md', 'dsh/runtime/README.md', 'accounts/README.md',
    'experiments/contract-readiness-spike/README.md',
    'experiments/model-coordination-spike/README.md', 'experiments/runtime-loader-spike/README.md',
    'references/ecosystem-extension-research/README.md',
]
files = {ROOT/name for name in paths}
files.update((ROOT/'docs/batch6').glob('*.md'))
files.update((ROOT/'docs/architecture').glob('*.md'))
files.update((ROOT/'docs/decisions').glob('*.md'))
files.update((ROOT/'docs/research').glob('*.md'))
files.update((ROOT/'docs/audits').glob('*.md'))
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
stress = (ROOT/'docs/audits/COMPLEX-CONTRACT-STRESS-REVIEW-2026-10-31.md').read_text()
rows = re.findall(r'^\| ((?:L|H)\d\d) ',stress,re.M)
expected = {f'L{i:02d}' for i in range(1,13)}|{f'H{i:02d}' for i in range(1,22)}
if set(rows) != expected or len(rows)!=33: errors.append('33 baseline sample matrix changed')
if set(re.findall(r'^### (H\d\d) ',stress,re.M)) != {f'H{i}' for i in range(22,31)}:
    errors.append('H22–H30 changed')

# Module-to-global documentation navigation contract.
if '[文档体系总索引](README.md)' not in (ROOT/'docs/MODULE-CONTRACTS.md').read_text():
    errors.append('module contract index missing documentation index link')
if '## 模块文档引用规范' not in (ROOT/'docs/README.md').read_text():
    errors.append('missing module documentation reference standard')
for domain in domains:
    contract = (ROOT/domain/'CONTRACT.md').read_text()
    readme = (ROOT/domain/'README.md').read_text()
    if '## 文档关联与施工入口' not in contract:
        errors.append(f'missing documentation map: {domain}/CONTRACT.md')
    if '文档关联与施工入口' not in readme or 'docs/README.md' not in readme:
        errors.append(f'missing documentation entry: {domain}/README.md')
for domain in ['plugins','dsh','accounts']:
    if '## 文档入口与证据边界' not in (ROOT/domain/'README.md').read_text():
        errors.append(f'missing reserved-domain evidence boundary: {domain}/README.md')


submodules = {
    'UI/components/README.md': 'UI/CONTRACT.md',
    'UI/conversation/README.md': 'UI/CONTRACT.md',
    'UI/settings/README.md': 'UI/CONTRACT.md',
    'UI/space/README.md': 'UI/CONTRACT.md',
    'connections/api/UI/README.md': 'connections/CONTRACT.md',
    'connections/github/UI/README.md': 'connections/CONTRACT.md',
    'workflows/modes/software-development/UI/README.md': 'workflows/modes/CONTRACT.md',
    'AI/roles/README.md': 'AI/CONTRACT.md',
    'shared/storage/README.md': 'shared/CONTRACT.md',
    'shared/credentials/README.md': 'shared/CONTRACT.md',
    'connections/api/README.md': 'connections/CONTRACT.md',
    'connections/dsh/README.md': 'connections/CONTRACT.md',
    'connections/github/README.md': 'connections/CONTRACT.md',
    'connections/local/README.md': 'connections/CONTRACT.md',
    'connections/search/README.md': 'connections/CONTRACT.md',
    'workflows/runtime/README.md': 'workflows/CONTRACT.md',
    'workflows/editor/README.md': 'workflows/CONTRACT.md',
    'workflows/modes/software-development/README.md': 'workflows/modes/CONTRACT.md',
    'dsh/runtime/README.md': 'dsh/README.md',
    'tools/README.md': 'docs/MODULE-CONTRACTS.md',
}
for readme, parent in submodules.items():
    if parent not in (ROOT/readme).read_text():
        errors.append(f'missing parent contract link: {readme} -> {parent}')

if errors: raise SystemExit('\n'.join(errors))
print(f'PASS: {len(files)} Markdown files, {links} file targets, 11 domain entries, F01–F09/X01–X09, original 33+9 samples; anchors and semantics not certified')
