import numpy as np
from scipy import ndimage as nd
from PIL import Image
src=np.asarray(Image.open('/home/box/agent-data/agents/5eb59a39-5a25-4b92-b379-1ea007d0de39/attachments/242a855e73c9a1abc48cf246a0da678d2fe6f94949449992af3c3327eedf3297.png').convert('RGBA')).astype(float)
a=src[...,3]/255;H,W=a.shape;yy,xx=np.mgrid[0:H,0:W]
m=a>0.35;lab,n=nd.label(m)
k=1254/1024;cx,cy,r=512*k,497*k,312*k
rr=np.hypot(xx-cx,yy-cy)
comp={}
for i in range(1,n+1):
    sel=lab==i;comp[i]=(sel.sum(),np.abs(rr[sel]-r).mean())
ring_ids=[i for i in comp if comp[i][1]<15*k];print('ring',ring_ids)
pen_ids=[2,4]
_,ind=nd.distance_transform_edt(lab==0,return_indices=True)
near=lab[ind[0],ind[1]]
white=np.isin(near,pen_ids+ring_ids)
penS=np.isin(lab,pen_ids)
fill=nd.binary_fill_holes(nd.binary_closing(penS,iterations=3))&~nd.binary_dilation(penS,iterations=2)
print('fill px',fill.sum())
# background
bg=np.zeros((H,W,3));bg[:]=[6,18,31]
t=np.clip(np.hypot(xx-cx*0.97,yy-cy*0.92)/(r*1.2),0,1)[...,None]
disk=(np.array([13,51,82])*(1-t)+np.array([6,22,41])*t)
inside=(rr<r)[...,None];bg=np.where(inside,disk,bg)
bg=np.where(fill[...,None],bg*0.25+np.array([78,150,186])*0.75,bg)
col=np.where(white[...,None],np.array([255,255,255.]),src[...,:3])
# boost line color to Jarvis cyan
col=np.where(white[...,None],col,np.array([63,216,255.]))
ramp=np.clip((a-0.2)/0.3,0,1);a2=np.where(fill,0,np.where((rr<r-8)&~white,a*ramp,a));aa=a2[...,None]
out=bg*(1-aa)+col*aa
im=Image.fromarray(np.clip(out,0,255).astype(np.uint8))
c=(int(cx-470),int(cy-460));im=im.crop((c[0],c[1],c[0]+940,c[1]+940))
im.save('icon_full.png')
