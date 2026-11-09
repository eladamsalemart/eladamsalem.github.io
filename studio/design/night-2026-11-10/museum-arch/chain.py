"""Waits for the axon batch, then renders the interiors: python chain.py (run in the background)."""
import os, subprocess, sys, time
h = os.path.dirname(os.path.abspath(__file__))
while 'E axon' not in open(f'{h}/render4.log').read(): time.sleep(5)
subprocess.run([sys.executable, f'{h}/render_all.py', 'A', 'B', 'C', 'D', 'E', '--shots', 'int,int2'], stdout=open(f'{h}/render5.log', 'w'), stderr=subprocess.STDOUT)
