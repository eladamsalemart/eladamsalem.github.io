"""Supabase's sign-in settings for Open Studio, through Supabase's management API (the token is the GitHub secret
SUPABASE_ACCESS_TOKEN; this runs in the "Supabase settings" workflow).

    python3 studio/supabase/settings.py show    # write what is set now to auth.live.json (passwords and keys left out)
    python3 studio/supabase/settings.py apply   # set what auth.json says, then show

auth.json holds only what Open Studio sets on purpose; everything else stays as Supabase has it.

Sign-in with Google and Apple is switched on by apply when their GitHub secrets exist:
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET            (Google Cloud: an OAuth client, "Web application")
    APPLE_SERVICES_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_P8   (Apple Developer: a Services ID and a Sign in with Apple key)
Apple's secret is a token signed with the key that lives at most six months, so the workflow re-applies monthly.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REF = 'hlpzqeosdavfuzjgpwhy'
API = f'https://api.supabase.com/v1/projects/{REF}/config/auth'
SECRET = ('secret', 'pass', 'password', 'key', 'token')       # never written down or printed


def call(method, body=None):
    tok = os.environ.get('SUPABASE_ACCESS_TOKEN', '').strip()
    if not tok:
        sys.exit('No SUPABASE_ACCESS_TOKEN (a GitHub secret).')
    req = urllib.request.Request(API, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json',
                                          'User-Agent': 'open-studio-settings/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        sys.exit(f'Supabase answered {e.code}: {e.read().decode()[:500]}')


def clean(cfg):
    return {k: ('(set)' if v not in (None, '', False) else v) if any(s in k.lower() for s in SECRET) else v
            for k, v in sorted(cfg.items())}


def show():
    cfg = clean(call('GET'))
    (HERE / 'auth.live.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + '\n')
    on = sorted(k[len('external_'):-len('_enabled')] for k, v in cfg.items() if k.startswith('external_') and k.endswith('_enabled') and v)
    print(f"site: {cfg.get('site_url')}\nredirects: {cfg.get('uri_allow_list')}\nsign-in with: {', '.join(on)}\n"
          f"smtp: {cfg.get('smtp_host')} as {cfg.get('smtp_admin_email')}\nemails an hour: {cfg.get('rate_limit_email_sent')}\n"
          f"code length: {cfg.get('mailer_otp_length')}\nsign-up open: {not cfg.get('disable_signup')}")


def env(k):
    return os.environ.get(k, '').strip()


def apple_secret(team, services, key_id, p8):
    """Apple's client secret: an ES256 token signed with the Sign in with Apple key, good for 180 days."""
    import time
    import jwt                                                  # pyjwt[crypto], installed by the workflow
    now = int(time.time())
    return jwt.encode({'iss': team, 'iat': now, 'exp': now + 180 * 86400, 'aud': 'https://appleid.apple.com',
                       'sub': services}, p8.replace('\\n', '\n'), algorithm='ES256', headers={'kid': key_id})


def providers():
    out = {}
    if env('GOOGLE_CLIENT_ID') and env('GOOGLE_CLIENT_SECRET'):
        out.update(external_google_enabled=True, external_google_client_id=env('GOOGLE_CLIENT_ID'),
                   external_google_secret=env('GOOGLE_CLIENT_SECRET'))
        print('Google: on')
    apple = [env(k) for k in ('APPLE_SERVICES_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_P8')]
    if all(apple):
        services, team, key_id, p8 = apple
        out.update(external_apple_enabled=True, external_apple_client_id=services,
                   external_apple_secret=apple_secret(team, services, key_id, p8))
        print('Apple: on (secret renewed for 180 days)')
    elif any(apple):
        print('Apple: some of APPLE_SERVICES_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_P8 are missing; left as it is')
    return out


def apply():
    want = json.loads((HERE / 'auth.json').read_text())
    want = {k: v for k, v in want.items() if not k.startswith('_')}
    want.update(providers())
    if not want:
        print('auth.json sets nothing.')
    else:
        call('PATCH', want)
        print('set:', ', '.join(sorted(want)))
    show()


if __name__ == '__main__':
    {'show': show, 'apply': apply}[(sys.argv[1:] or ['show'])[0]]()
