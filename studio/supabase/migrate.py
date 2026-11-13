"""Open Studio: the database's migrations, through Supabase's management API.

Runs every file in studio/supabase/migrations/ that is not yet in migrations.applied.json, in name order, each in
one transaction, and stops at the first that fails (its error goes to migrations.result.json). Then writes what the
public schema is now (columns, checks, triggers, policies; no data) to schema.live.json, so a session without the
database connector can read it. Migrations are additive only: never drop or rewrite what holds people's data.
"""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path

REF = 'hlpzqeosdavfuzjgpwhy'
HERE = Path(__file__).parent
TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')


def query(sql):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query', data=json.dumps({'query': sql}).encode(),
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json', 'User-Agent': 'open-studio-migrate'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b'[]')
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{e.code}: {e.read().decode(errors="replace")[:600]}')


def main():
    if not TOKEN:
        sys.exit('SUPABASE_ACCESS_TOKEN is not set')
    applied_f = HERE / 'migrations.applied.json'
    applied = json.loads(applied_f.read_text(encoding='utf-8')) if applied_f.exists() else []
    result = {'ran': [], 'error': None}
    for f in sorted((HERE / 'migrations').glob('*.sql')):
        if f.name in applied:
            continue
        try:
            query('begin;\n' + f.read_text(encoding='utf-8') + '\ncommit;')
            applied.append(f.name); result['ran'].append(f.name)
        except RuntimeError as e:
            try: query('rollback;')
            except RuntimeError: pass
            result['error'] = {'file': f.name, 'message': str(e)}
            break
    applied_f.write_text(json.dumps(applied, indent=1) + '\n', encoding='utf-8')
    (HERE / 'migrations.result.json').write_text(json.dumps(result, indent=1) + '\n', encoding='utf-8')
    schema = {
        'columns': query("select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position"),
        'checks': query("select conrelid::regclass::text as table, conname, pg_get_constraintdef(oid) as def from pg_constraint where connamespace = 'public'::regnamespace and contype = 'c' order by 1, 2"),
        'triggers': query("select event_object_table as table, trigger_name, action_timing, event_manipulation, action_statement from information_schema.triggers where trigger_schema = 'public' order by 1, 2, 4"),
        'policies': query("select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2"),
        'functions': query("select p.proname, pg_get_functiondef(p.oid) as def from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1"),
    }
    (HERE / 'schema.live.json').write_text(json.dumps(schema, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"ran {len(result['ran'])}, error: {result['error'] and result['error']['file']}")
    if result['error']:
        sys.exit(1)


if __name__ == '__main__':
    main()
