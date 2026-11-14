# Entradas de intriga: texto grande, voz de Marcelo y sonidos. Genera el HTML, los cuadros y el video.
import json, subprocess, sys, wave, os
import numpy as np
SR = 44100
T = {
 'intriga': [
  ('¿Y si caminar<br><b>tuviera premio?</b>', '¿Y si caminar tuviera premio?'),
  ('Vas a la plaza.<br>Al mercado.<br>Al trabajo.', 'Vas a la plaza. Al mercado. Al trabajo.'),
  ('Todos los días<br>caminas <b>gratis.</b>', 'Todos los días caminas gratis.'),
  ('Eso está<br><b>por cambiar.</b>', 'Eso está por cambiar.'),
  ('END|Algo llega a Tarija.', 'Camina. Primero de diciembre.'),
 ],
 'pasos': [
  ('Ayer caminaste<br><span class="n" data-count="1">6.000</span><br>pasos.', 'Ayer caminaste seis mil pasos.'),
  ('¿Y qué<br><b>ganaste?</b>', '¿Y qué ganaste?'),
  ('Nada.', 'Nada.'),
  ('¿Y si mañana<br>esos pasos<br><b>valieran algo?</b>', '¿Y si mañana esos pasos valieran algo?'),
  ('END|Tus pasos van a valer.', 'Camina. Primero de diciembre, en Tarija.'),
 ],
 'tarija': [
  ('Tarija<br><b>camina.</b>', 'Tarija camina.'),
  ('Por la plaza.<br>Por la costanera.<br>Por el centro.', 'Por la plaza. Por la costanera. Por el centro.'),
  ('Y nadie<br>le da <b>nada</b><br>por eso.', 'Y nadie le da nada por eso.'),
  ('Hasta<br><b>ahora.</b>', 'Hasta ahora.'),
  ('END|Caminar va a tener premio.', 'Camina. Primero de diciembre.'),
 ],
}
name = sys.argv[1]; beats = T[name]; os.makedirs('voz', exist_ok=True)
durs = []
for i, (_, vo) in enumerate(beats):
    mp, wav = f'voz/t-{name}-{i}.mp3', f'voz/t-{name}-{i}.wav'
    subprocess.run(['python3', 'tts.py', 'es-BO-MarceloNeural', vo, mp, '+4%'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '44100', '-ac', '1', wav], check=True)
    durs.append(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).decode()))
t = 0.0; tl = []
for i, d in enumerate(durs):
    last = i == len(durs) - 1; L = d + (0.55 if not last else 2.6); tl.append((t, t + L)); t += L
DUR = t
html = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box}html,body{margin:0;background:#000}
#st{width:1080px;height:1920px;position:relative;overflow:hidden;color:#F0EBFA;background:linear-gradient(165deg,#2c1a63 0%,#1b1140 45%,#110922 100%);font-family:'Plus Jakarta Sans'}
#g{position:absolute;width:1500px;height:1500px;left:-210px;top:300px;border-radius:50%;background:radial-gradient(circle,rgba(98,240,182,.20),rgba(98,240,182,0) 62%)}
.b{position:absolute;left:60px;right:60px;text-align:center;display:none;font-family:Montserrat;font-weight:900;font-size:128px;line-height:1.06;letter-spacing:-3px}
.b b{color:#62F0B6}.b .n{font-size:330px;letter-spacing:-10px;color:#62F0B6;line-height:1}
.b .ln{display:block}
.e img.l{width:270px}.e .w{font-size:150px;letter-spacing:10px;color:#62F0B6;margin-top:30px}.e .d{display:inline-block;margin-top:44px;background:#62F0B6;color:#1a0f3a;font-size:64px;letter-spacing:0;padding:30px 54px;border-radius:99px}.e .s{font-family:'Plus Jakarta Sans';font-weight:700;font-size:54px;letter-spacing:0;color:#D6CCF0;margin-top:44px}
</style></head><body><div id="st"><div id="g"></div>BEATS</div><script>
const TL=__TL__;const cl=x=>Math.min(1,Math.max(0,x)),eo=x=>1-Math.pow(1-cl(x),3);const back=x=>{x=cl(x);const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const fmt=n=>String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');
const B=[...document.querySelectorAll('.b')];window.DUR=__DUR__;
window.fit=()=>B.forEach(b=>{b.style.display='block';b.style.top=Math.round((1920-b.offsetHeight)/2-60)+'px';b.style.display='none'});
window.seek=t=>{document.getElementById('g').style.transform=`translate(${Math.sin(t*.5)*180}px,${Math.cos(t*.4)*220}px)`;
 B.forEach((b,i)=>{const[t0,t1]=TL[i];if(t<t0||t>=t1){b.style.display='none';return}b.style.display='block';const u=t-t0,last=i===B.length-1,out=last?0:cl((t-(t1-.2))/.2);b.style.opacity=1-out;
  [...b.children].forEach((c,k)=>{const d=last?[0,.25,.7,1.1][k]??0:k*.22;const p=cl((u-d)/.4);if(i===0&&d===0&&u<.01){c.style.opacity=1;c.style.transform='none';return}c.style.opacity=cl((u-d)/.2);c.style.transform=c.dataset.pop?`scale(${.5+.5*back(p)})`:`translateY(${(1-eo(p))*46}px)`});
  const n=b.querySelector('[data-count]');if(n)n.textContent=fmt(1000+5000*eo((u-.1)/1.1));});};
</script></body></html>'''
bh = ''
for i, (txt, _) in enumerate(beats):
    if txt.startswith('END|'):
        bh += f'<div class="b e"><div data-pop="1"><img class="l" src="img/logo.png"></div><div class="w">CAMINA</div><div data-pop="1"><span class="d">1 de diciembre</span></div><div class="s">{txt[4:]}</div></div>'
    else:
        bh += '<div class="b">' + ''.join(f'<span class="ln">{l}</span>' for l in txt.split('<br>')) + '</div>'
open(f'teaser-{name}.html', 'w').write(html.replace('BEATS', bh).replace('__TL__', json.dumps(tl)).replace('__DUR__', str(DUR)))
open(f'teaser-{name}.js', 'w').write('''const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const dir = __dirname + '/ft-NAME'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
 const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
 await p.goto('file://' + __dirname + '/teaser-NAME.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700); await p.evaluate(() => window.fit());
 const n = Math.round((await p.evaluate(() => window.DUR)) * 30);
 for (let i = 0; i < n; i++) { await p.evaluate((x) => window.seek(x), i / 30); await p.screenshot({ path: `${dir}/f-${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 }); }
 await b.close(); })();'''.replace('NAME', name))
subprocess.run(['node', f'teaser-{name}.js'], check=True)
# audio
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / d)
def tone(f, dur, d): n = int(dur * SR); x = np.arange(n) / SR; return (np.sin(2 * np.pi * f * x) + .25 * np.sin(4 * np.pi * f * x)) * env(n, .004, d)
def pop(): n = int(.09 * SR); x = np.arange(n) / SR; return np.sin(2 * np.pi * (520 * np.exp(-x * 18) + 180) * x) * env(n, .002, .03)
out = np.zeros(int((DUR + .3) * SR))
def put(t0, s, g):
    i = int(t0 * SR); s = s[:len(out) - i]; out[i:i + len(s)] += s * g
for i, (t0, t1) in enumerate(tl):
    put(t0, pop(), .22)
    if i == len(tl) - 1:
        for k, f in enumerate([784, 988, 1319, 1568]): put(t0 + .25 + k * .085, tone(f, 1.0, .32), .16)
    w = wave.open(f'voz/t-{name}-{i}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768; w.close(); put(t0 + .12, x / max(.05, np.abs(x).max()), .9)
out = np.tanh(out * .95) * .9
w = wave.open(f'teaser-{name}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'ft-{name}/f-%04d.jpg', '-i', f'teaser-{name}.wav', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-shortest', '-movflags', '+faststart', f'Camina-entrada-{name}.mp4'], check=True)
print(name, round(DUR, 1), [round(a, 1) for a, _ in tl])
