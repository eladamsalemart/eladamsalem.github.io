"""Takes every app screenshot the three slide PDFs use (iPhone 390x844): python studio/design/night-2026-11-10/slides_shots_all.py"""
import json, sys
from slides_shoot import start, shoot

PRE_NEW = "sessionStorage.setItem('os-preview', JSON.stringify({as:'new', user:{id:'preview',email:'you@example.com',provider:'email',role:'%s',name:'Dana Levi',details:true}}))"
DEMO = "document.getElementById('demoIn') && document.getElementById('demoIn').click()"

# background schemes: variables the app already uses (index.html :root), put on <body> over the real screens
P = {
    'paper':  {'--wall': '#F6F1E7', '--paper': '#FFFDF8', '--ink': '#1B1A17', '--muted': '#5E594F', '--line': '#D9D0BD', '--card': '#EAE2D0', '--dot': '#2F6B4F', '--stage': '#EFE9DD'},
    'pastel': {'--wall': '#E9E4F4', '--paper': '#F6F3FB', '--ink': '#262232', '--muted': '#5F5873', '--line': '#CFC7E2', '--card': '#DCD5EC', '--dot': '#6A55B8', '--stage': '#E2DCF0'},
    'grey':   {'--wall': '#DAD6CE', '--paper': '#E9E6E0', '--ink': '#1E1D1B', '--muted': '#55514A', '--line': '#BDB8AD', '--card': '#CBC6BB', '--dot': '#2F6B4F', '--stage': '#D0CBC1'},
    'sage':   {'--wall': '#DCE3D5', '--paper': '#EDF1E7', '--ink': '#1D2419', '--muted': '#4F5B49', '--line': '#BCC7B2', '--card': '#CBD5C1', '--dot': '#3E6B49', '--stage': '#D2DACA'},
    'cocoa':  {'--wall': '#2B2622', '--paper': '#363029', '--ink': '#F2EBDD', '--muted': '#B3A998', '--line': '#4B433A', '--card': '#3E372F', '--dot': '#E5B45C', '--stage': '#332D27', '--shade': 'rgba(30,24,20,.74)'},
    'dusk':   {'--wall': '#202B3B', '--paper': '#2A3649', '--ink': '#EEF1F6', '--muted': '#A9B3C4', '--line': '#3C4A61', '--card': '#2F3C52', '--dot': '#F0C36C', '--stage': '#263246', '--shade': 'rgba(20,28,42,.74)'},
}
GRAIN = "body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:99;opacity:.5;mix-blend-mode:multiply;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")}"
GRID = "body{background-image:linear-gradient(rgba(60,50,30,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(60,50,30,.07) 1px,transparent 1px)!important;background-size:24px 24px!important}"
P['paper_grain'] = dict(P['paper'], _css=GRAIN)
P['paper_grid'] = dict(P['paper'], _css=GRID)

if __name__ == '__main__':
    only = sys.argv[1:]
    p, t = start()
    ok = lambda k: not only or k in only
    try:
        if ok('app'):
            for n, h in [('home', '#/'), ('artists', '#/artists'), ('artist', '#/artist/vincent-van-gogh'), ('shows', '#/shows'), ('map', '#/map'),
                         ('search', '#/search'), ('exhibition', '#/exhibition/orchards-in-bloom'), ('artist_about', '#/artist/vincent-van-gogh/about'), ('works', '#/artist/vincent-van-gogh/works')]:
                shoot(t, n, h); print(n, flush=True)
            shoot(t, 'artist_scroll', '#/artist/vincent-van-gogh', scroll=700)
            shoot(t, 'welcome_role', '#/welcome/role', pre=PRE_NEW % '')
            shoot(t, 'welcome_artist', '#/welcome/artist', pre=PRE_NEW % 'artist')
            shoot(t, 'welcome_start', '#/welcome', pre='sessionStorage.clear();localStorage.clear()')
        if ok('studio'):
            shoot(t, 'studio_land', '#/studio', before=DEMO)
            for n, h in [('studio', '#/studio'), ('studio_onview', '#/studio/onview'), ('studio_exh', '#/studio/exhibitions'), ('studio_import', '#/studio/import'),
                         ('studio_exh_new', '#/studio/exhibitions/new'), ('studio_virtual_new', '#/studio/virtual/new')]:
                shoot(t, n, '#/studio', before=DEMO + ";setTimeout(()=>{location.hash='%s'},900)" % h, wait=3.5); print(n, flush=True)
            shoot(t, 'studio_scroll', '#/studio', before=DEMO, scroll=800)
        if ok('home'):
            shoot(t, 'home', '#/', wait=7)
        if ok('palstudio'):
            for k, pal in [('now', None)] + list(P.items()):
                shoot(t, f'bg_{k}_studio', '#/studio', before=DEMO, palette=pal, scroll=950); print(k, 'studio', flush=True)
        if ok('pal'):
            SC = {'artist': 760, 'studio': 950}
            for k, pal in [('now', None)] + list(P.items()):
                for n, h in [('artist', '#/artist/vincent-van-gogh'), ('exhibition', '#/exhibition/orchards-in-bloom'), ('shows', '#/shows'), ('map', '#/map'), ('studio', '#/studio')]:
                    shoot(t, f'bg_{k}_{n}', h, palette=pal, scroll=SC.get(n, 0), before=DEMO if n == 'studio' else ''); print(k, n, flush=True)
    finally:
        p.terminate()
