"""Both stages for every exhibition (or the ones named): build, then inspect.
    python -m studio.app.space.pipeline [slug ...]            build and inspect
    python -m studio.app.space.pipeline --build [slug ...]    stage 1 only
    python -m studio.app.space.pipeline --inspect [slug ...]  stage 2 only"""
import sys
from . import build, inspect

args = sys.argv[1:]
only = args.pop(0) if args and args[0] in ('--build', '--inspect') else None
if only != '--inspect':
    build.main(args)
if only != '--build':
    inspect.main(args)
