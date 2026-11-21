import sys, subprocess, numpy as np, onnxruntime as ort
src, model, out = sys.argv[1:4]
W, H = 576, 1024
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
rec = [np.zeros([1, 1, 1, 1], np.float32)] * 4
ds = np.array([0.4], np.float32)
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4',
                        '-auto-alt-ref', '0', out], stdin=subprocess.PIPE)
n = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    x = (img.astype(np.float32) / 255).transpose(2, 0, 1)[None]
    fgr, pha, *rec = sess.run(None, {'src': x, 'r1i': rec[0], 'r2i': rec[1], 'r3i': rec[2], 'r4i': rec[3], 'downsample_ratio': ds})
    a = pha[0, 0]
    rgb = (fgr[0].transpose(1, 2, 0) * 255).clip(0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, (a * 255).clip(0, 255).astype(np.uint8)])
    enc.stdin.write(rgba.tobytes())
    if n == 300:
        import PIL.Image as I; I.fromarray((a * 255).astype(np.uint8)).save(out + '.alpha300.png'); I.fromarray(rgba).save(out + '.rgba300.png')
    n += 1
enc.stdin.close(); enc.wait(); print('frames', n)
