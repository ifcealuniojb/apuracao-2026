"""Converte a malha de UFs do IBGE (GeoJSON) em caminhos SVG para o painel.
Uso: python3 painel/mapa/gerar.py  ->  painel/worker/src/mapa.json"""
import json, math, os
AQUI = os.path.dirname(__file__)
COD = {"11":"RO","12":"AC","13":"AM","14":"RR","15":"PA","16":"AP","17":"TO","21":"MA","22":"PI","23":"CE","24":"RN","25":"PB","26":"PE","27":"AL","28":"SE","29":"BA","31":"MG","32":"ES","33":"RJ","35":"SP","41":"PR","42":"SC","43":"RS","50":"MS","51":"MT","52":"GO","53":"DF"}
g = json.load(open(os.path.join(AQUI, "ibge-uf-intermediaria.geojson")))
K = math.cos(math.radians(-14))
def anel(geom):
    if geom["type"] == "Polygon": yield from geom["coordinates"]
    else:
        for p in geom["coordinates"]: yield from p
pts = [(x*K, -y) for f in g["features"] for r in anel(f["geometry"]) for x, y in r]
x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
W = 1000; S = W/(x1-x0); H = round((y1-y0)*S)
out = {"w": W, "h": H, "uf": {}, "centro": {}}
for f in g["features"]:
    uf = COD[f["properties"]["codarea"]]; d = []; cx = cy = n = 0
    for r in anel(f["geometry"]):
        seg = []; last = None
        for x, y in r:
            p = (round((x*K-x0)*S, 1), round((-y-y0)*S, 1))
            if p != last: seg.append(p); last = p
            cx += p[0]; cy += p[1]; n += 1
        if len(seg) > 2:
            d.append("M" + "L".join(f"{a:g},{b:g}" for a, b in seg) + "Z")
    out["uf"][uf] = "".join(d)
    # centro do maior anel (centroide de área)
    best = None
    for r in anel(f["geometry"]):
        q = [((x*K-x0)*S, (-y-y0)*S) for x, y in r]
        a = cxa = cya = 0
        for (xa, ya), (xb, yb) in zip(q, q[1:] + q[:1]):
            c = xa*yb - xb*ya; a += c; cxa += (xa+xb)*c; cya += (ya+yb)*c
        if a and (best is None or abs(a) > best[0]): best = (abs(a), cxa/(3*a), cya/(3*a))
    out["centro"][uf] = [round(best[1]), round(best[2])]
json.dump(out, open(os.path.join(AQUI, "..", "worker", "src", "mapa.json"), "w"), separators=(",", ":"))
print(W, H, len(json.dumps(out)))
