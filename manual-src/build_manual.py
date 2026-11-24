# 안내서 빌드: manual-src/*.html + 스크린샷(shots/*.jpg) → docs/guide/{member,trainer}.html (이미지까지 한 파일)
# 스크린샷은 tests/e2e-fit.js가 찍은 예시 데이터 화면에서 복사 (실제 회원 정보 금지)
import base64,re,os
S=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(S)
b64=lambda p,t: 'data:%s;base64,'%t+base64.b64encode(open(p,'rb').read()).decode()
icon=b64(R+'/docs/icons/icon-192.png','image/png')
css=open(S+'/style.css').read(); inst=open(S+'/install.html').read()
out=R+'/docs/guide'; os.makedirs(out,exist_ok=True)
for name in ['member','trainer']:
  h=open(S+'/%s.html'%name).read().replace('{{INSTALL}}',inst).replace('{{CSS}}',css).replace('{{ICON}}',icon)
  h=re.sub(r'<shot n="([^"]+)"></shot>',lambda m:'<img loading="lazy" src="%s" alt="">'%b64(S+'/shots/%s.jpg'%m.group(1),'image/jpeg'),h)
  assert '{{' not in h and '<shot' not in h
  open(out+'/%s.html'%name,'w').write(h); print(name,len(h)//1024,'KB')
