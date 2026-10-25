# Monta painel/worker/src/mundo.json a partir do Natural Earth 1:110m (domínio público) e da tabela de cidades do exterior.
# Projeção Equal Earth (áreas proporcionais), sem a Antártida. Uso: python3 monta-mundo.py ne110.geojson cidades-exterior.tsv mundo.json
import json, math, sys
A1,A2,A3,A4=1.340264,-0.081106,0.000893,0.003796; M=math.sqrt(3)/2
def ee(lon,lat):
    l=math.radians(lon); t=math.asin(M*math.sin(math.radians(lat)))
    t2=t*t; t6=t2**3
    x=2*math.sqrt(3)*l*math.cos(t)/(3*(9*A4*t6*t2+7*A3*t6+3*A2*t2+A1))
    y=t*(A1+A2*t2+t6*(A3+A4*t2))
    return x,y
W=1000; XMAX=ee(180,0)[0]; S=W/(2*XMAX)
YTOP=ee(0,84)[1]; YBOT=ee(0,-57)[1]; H=round((YTOP-YBOT)*S)
def P(lon,lat):
    x,y=ee(lon,lat); return (round((x+XMAX)*S,1), round((YTOP-y)*S,1))
g=json.load(open(sys.argv[1]))
EXTRA={"BH":"Barein","BB":"Barbados","GF":"Guiana Francesa","LC":"Santa Lúcia","HK":"Hong Kong","CV":"Cabo Verde","AG":"Antígua e Barbuda","SG":"Singapura","ST":"São Tomé e Príncipe"}
pais={}; nomes={}; outros=[]
def anel(r):
    pts=[]; 
    for lon,lat in r:
        p=P(lon,max(lat,-57))
        if not pts or p!=pts[-1]: pts.append(p)
    if len(pts)<3: return ""
    return "M"+"L".join(f"{x:g},{y:g}" for x,y in pts)+"Z"
for f in g["features"]:
    q=f["properties"]
    if q["ADM0_A3"] in ("ATA","ATF"): continue
    geo=f["geometry"]; polys=geo["coordinates"] if geo["type"]=="MultiPolygon" else [geo["coordinates"]]
    d="".join(anel(r) for poly in polys for r in poly)
    iso=q["ISO_A2_EH"]
    if iso=="-99": outros.append(d); continue
    pais[iso]=d; nomes[iso]=q["NAME_PT"]
nomes.update(EXTRA)
cid={}
for linha in open(sys.argv[2],encoding="utf-8"):
    nm,iso,lat,lon=linha.rstrip("\n").split("\t")
    x,y=P(float(lon),float(lat)); cid[nm]=[iso,x,y]
    assert iso in nomes, iso
json.dump({"w":W,"h":H,"pais":pais,"outros":outros,"nome":nomes,"cid":cid,
  "fonte":"Natural Earth 1:110m admin 0 countries (domínio público), projeção Equal Earth; cidades: tabela própria (cidades do exterior do TSE)"},
  open(sys.argv[3],"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("w",W,"h",H,"paises",len(pais),"cidades",len(cid))
