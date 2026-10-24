"""Studio space pipeline: turns an exhibition's installation photos and its works' images and sizes
into a walkable, measured 3D space (data/spaces/<slug>.json + baked textures). Run: python3 -m studio.app.space.pipeline"""
import os

# The same inputs must give the same space on every machine. The numeric libraries pick code for the
# processor they run on (AVX-512 on some, AVX2 on others), and the small differences in rounding grow, through
# the measurement, into centimetres. So every machine runs the AVX2 code, one thread at a time where it matters.
for k, v in {'OPENBLAS_CORETYPE': 'Haswell', 'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1',
             'NPY_DISABLE_CPU_FEATURES': 'X86_V4 AVX512_ICL AVX512_SPR', 'OPENCV_CPU_DISABLE': 'AVX512-SKX,AVX512F'}.items():
    os.environ.setdefault(k, v)
