#!/usr/bin/env python3
"""Validate project role choices against an explicitly supplied live Codex catalog."""
import argparse
import json
from pathlib import Path

ROLES = ('feature, refactoring', 'bug-fix', 'perf-issue', 'hillclimb', 'judgment and prose',
         'hardest tasks', 'how explorer', 'how explainer', 'why investigators', 'why synthesizer',
         'reflect tooling', 'reflect judgment, divergent, synthesizer', 'arena runners',
         'arena cross-judge pool', 'swarm workers', 'architect runners', 'interrogate reviewers')
PANELS = {'arena runners', 'arena cross-judge pool', 'architect runners', 'interrogate reviewers'}

def validate(config, catalog):
    if not isinstance(config, dict) or set(config) != {'schema', 'roles'} or config['schema'] != 1:
        raise ValueError('expected schema=1 and roles')
    roles = config['roles']
    if not isinstance(roles, dict) or set(roles) - set(ROLES):
        raise ValueError('unknown role or invalid roles object')
    data = catalog.get('data', []) if isinstance(catalog, dict) else []
    models = {m['model']: {e['reasoningEffort'] for e in m.get('supportedReasoningEfforts', [])}
              for m in data if isinstance(m, dict) and isinstance(m.get('model'), str)}
    for role, selections in roles.items():
        if role in PANELS:
            if not isinstance(selections, list) or not selections:
                raise ValueError(f'{role}: panel must be a nonempty list')
        else:
            selections = [selections]
        for selection in selections:
            if not isinstance(selection, dict) or set(selection) - {'model', 'reasoning_effort'}:
                raise ValueError(f'{role}: expected model and optional reasoning_effort')
            model, effort = selection.get('model'), selection.get('reasoning_effort')
            if model in ('auto', 'inherit-parent'):
                if effort is not None:
                    raise ValueError(f'{role}: inheritance cannot assert reasoning effort')
                continue
            if not isinstance(model, str) or model not in models:
                raise ValueError(f'{role}: model is absent from the supplied live catalog')
            if effort is not None and (not isinstance(effort, str) or effort not in models[model]):
                raise ValueError(f'{role}: effort is not supported by the selected model')
    return {'valid': True, 'configured_roles': len(roles),
            'unconfigured_roles': [r for r in ROLES if r not in roles],
            'served_identity_verified': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--catalog', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(validate(json.loads(Path(args.config).read_text()),
                                  json.loads(Path(args.catalog).read_text())), indent=2))
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'Invalid model configuration: {error}\n')

if __name__ == '__main__':
    main()
