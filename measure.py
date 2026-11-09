import subprocess, sys, json, numpy as np, parselmouth
from parselmouth.praat import call
V='/home/user/Whatifvideos/audio/voices'
TEXT="What if the zombie apocalypse happened? It starts at sunrise. One bite in a crowded city. By the time the news catches up, the infected have doubled, and doubled again."
def synth(model, out, speaker=None, ns=0.3, nw=0.55, ls=1.22):
    cmd=[sys.executable,'-m','piper','-m',f'{V}/{model}.onnx','-c',f'{V}/{model}.onnx.json','--length-scale',str(ls),'--noise-scale',str(ns),'--noise-w',str(nw),'-f',out]
    if speaker is not None: cmd+=['--speaker',str(speaker)]
    subprocess.run(cmd+['--',TEXT],check=True,capture_output=True)
def stats(path):
    snd=parselmouth.Sound(path); p=snd.to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=400)
    f=p.selected_array['frequency']; f=f[f>0]
    st=12*np.log2(f/np.median(f))
    return dict(mean=float(np.median(f)), std_st=float(st.std()), p90=float(np.percentile(np.abs(st),90)), dur=snd.get_total_duration())
res=[]
synth('en-us-ryan-high','ryan.wav'); res.append(('ryan-high',stats('ryan.wav')))
synth('en-us-lessac-medium','lessac.wav'); res.append(('lessac-medium',stats('lessac.wav')))
cfg=json.load(open(f'{V}/en-us-libritts-high.onnx.json')); n=cfg.get('num_speakers',1)
for sp in range(0,min(n,40),1):
    try:
        synth('en-us-libritts-high',f'lib{sp}.wav',speaker=sp); res.append((f'libritts#{sp}',stats(f'lib{sp}.wav')))
    except Exception as e: print('fail',sp,e)
for name,s in sorted(res,key=lambda r:r[1]['std_st']):
    print(f"{name:14s} medianHz {s['mean']:6.1f}  std {s['std_st']:4.2f} st  p90 {s['p90']:4.2f}  dur {s['dur']:5.1f}")
