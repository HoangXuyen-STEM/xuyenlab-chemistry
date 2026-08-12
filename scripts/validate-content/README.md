# Content validation scripts

`validate.py` enforces the P4 draft subset of `docs/contracts/content.md`:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py --json
```

It rejects missing/invalid metadata, duplicate slug or topic/order, manifest provenance
drift, broken or non-content-addressed staging assets, broken local links, modified
MDX/failure/QA reports, `published` content, and blocking converter issues whose IDs
are not visibly present in the MDX. A passing result confirms structural integrity,
not chemical correctness or owner approval.
