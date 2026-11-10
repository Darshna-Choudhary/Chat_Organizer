#!/usr/bin/env python3
"""WhatsApp exported .txt -> offline WhatsApp-style HTML viewer.

Usage:
    python whatsapp_to_html.py chat.txt
    python whatsapp_to_html.py chat.txt --me "Cucky~" --title "Aditya" --out nostalgia.html

Options:
    --me NAME     whose messages appear on the right (green). Default: most active sender.
    --title TEXT  name shown in the header. Default: the other person's name.
    --dayfirst    force DD/MM/YY dates (auto-detected normally).
    --out FILE    output file. Default: <input>.html
"""
import re, sys, json, argparse
from collections import Counter

LINE = re.compile(
    r'^\[?(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?'
    r'\s*([APap]\.?\s?[Mm]\.?)?\]?\s*(?:[-\u2013]\s*)?(.*)$')
MEDIA = re.compile(
    r'^(<Media omitted>|<attached: .+>|(image|video|audio|sticker|GIF|document|Contact card|video note) omitted|.*\(file attached\))$',
    re.I)
EDITED = '<This message was edited>'
DELETED = {'This message was deleted', 'You deleted this message'}


def clean(s):
    for a in ('\u202f', '\u00a0'):
        s = s.replace(a, ' ')
    for a in ('\u200e', '\u200f', '\u202a', '\u202c', '\ufeff'):
        s = s.replace(a, '')
    return s.rstrip('\n').rstrip('\r')


def parse(path, dayfirst=None):
    raw = []
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        for line in f:
            line = clean(line)
            m = LINE.match(line)
            if m:
                raw.append([m, m.group(8)])
            elif raw:
                raw[-1][1] += '\n' + line
            # lines before the first timestamp are ignored

    if dayfirst is None:
        a_big = any(int(m.group(1)) > 12 for m, _ in raw if len(m.group(1)) <= 2)
        b_big = any(int(m.group(2)) > 12 for m, _ in raw)
        dayfirst = a_big and not b_big
        if not a_big and not b_big:
            print('Note: date order is ambiguous, assuming MM/DD/YY. Use --dayfirst if wrong.')
    print('Date order:', 'DD/MM' if dayfirst else 'MM/DD')

    out = []
    for m, body in raw:
        a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if len(m.group(1)) == 4:      # YYYY/MM/DD style
            y, mo, d = a, b, int(m.group(3))
        else:
            d, mo = (a, b) if dayfirst else (b, a)
            if y < 100:
                y += 2000
        hh, mm, ap = int(m.group(4)), m.group(5), m.group(7)
        if ap:
            ap = ap.replace('.', '').replace(' ', '').upper()
            t = f'{hh}:{mm} {ap}'
        else:
            t = f'{hh:02d}:{mm}'
        date = f'{y:04d}-{mo:02d}-{d:02d}'

        sm = re.match(r'^([^:\n]{1,60}?): (.*)$', body, re.S)
        flags, sender, text = 0, '', body
        if sm:
            sender, text = sm.group(1), sm.group(2)
            if text.rstrip().endswith(EDITED):
                text = text.rstrip()[:-len(EDITED)].rstrip()
                flags |= 1
            if text.strip() in DELETED:
                flags |= 2
            elif MEDIA.match(text.strip()):
                flags |= 4
        else:
            flags |= 8
        out.append([date, t, sender, text, flags])
    return out



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--me')
    ap.add_argument('--title')
    ap.add_argument('--out')
    ap.add_argument('--dayfirst', action='store_true', default=None)
    args = ap.parse_args()

    data = parse(args.input, True if args.dayfirst else None)
    if not data:
        sys.exit('No messages found. Check that this is a WhatsApp .txt export.')
    people = Counter(m[2] for m in data if not m[4] & 8)
    me = args.me or people.most_common(1)[0][0]
    others = [p for p, _ in people.most_common() if p != me]
    title = args.title or (', '.join(others[:3]) or 'Chat')
    print('Messages:', len(data), '| People:', dict(people), '| Right side (you):', me)

    html = HTML.replace('__DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/')) \
               .replace('__ME__', json.dumps(me, ensure_ascii=False)) \
               .replace('__TITLE__', json.dumps(title, ensure_ascii=False)) \
               .replace('__TITLE_TEXT__', title.replace('<', '&lt;'))
    out = args.out or re.sub(r'\.txt$', '', args.input) + '.html'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Written:', out)


HTML = r'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE_TEXT__ - chat</title>
<style>
:root{--bg:#efeae2;--head:#008069;--headtx:#fff;--me:#d9fdd3;--them:#fff;--tx:#111b21;--sub:#667781;--chip:#fff;--sys:#fff3c5;--panel:#fff;--line:#e9edef;--flash:#fff6a8}
:root[data-theme=dark]{--bg:#0b141a;--head:#202c33;--headtx:#e9edef;--me:#005c4b;--them:#202c33;--tx:#e9edef;--sub:#8696a0;--chip:#182229;--sys:#182229;--panel:#111b21;--line:#233138;--flash:#4a4a1f}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Color Emoji",sans-serif;background:var(--bg);color:var(--tx);display:flex;flex-direction:column}
header{background:var(--head);color:var(--headtx);padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:max(8px,env(safe-area-inset-top))}
.av{width:40px;height:40px;border-radius:50%;background:#6b7c85;display:grid;place-items:center;font-weight:600;font-size:18px;flex:none}
.who{flex:1;min-width:120px}.who b{display:block;font-size:16px;font-weight:600}.who small{opacity:.8;font-size:12px}
header input,header select,header button{font:inherit;font-size:13px;border:0;border-radius:8px;padding:6px 8px;background:rgba(255,255,255,.18);color:inherit}
header select option{color:#111}
header input::placeholder{color:rgba(255,255,255,.7)}
header input[type=date]{color-scheme:dark}
header button{cursor:pointer}
#q{width:150px}
#chat{flex:1;overflow-y:auto;padding:10px 6% 40px;scroll-behavior:auto}
.date,.sys{text-align:center;margin:12px 0 6px}
.date span,.sys span{display:inline-block;background:var(--chip);color:var(--sub);font-size:12.5px;padding:4px 10px;border-radius:8px;box-shadow:0 1px .5px rgba(11,20,26,.13)}
.sys span{background:var(--sys);max-width:80%}
.row{display:flex;margin:2px 0}
.row.first{margin-top:8px}
.row.me{justify-content:flex-end}
.b{position:relative;max-width:min(75%,560px);padding:5px 8px 4px 9px;border-radius:8px;background:var(--them);box-shadow:0 1px .5px rgba(11,20,26,.13);overflow-wrap:anywhere}
.me .b{background:var(--me)}
.row.first .b::before{content:"";position:absolute;top:0;width:8px;height:12px;background:inherit}
.them.first .b{border-top-left-radius:0}.them.first .b::before{left:-8px;clip-path:polygon(100% 0,0 0,100% 100%)}
.me.first .b{border-top-right-radius:0}.me.first .b::before{right:-8px;clip-path:polygon(0 0,100% 0,0 100%)}
.tx{white-space:pre-wrap}
.meta{float:right;margin:7px 0 -3px 12px;font-size:11px;color:var(--sub);white-space:nowrap}
.nm{font-size:12.8px;font-weight:600;margin-bottom:1px}
.del,.media{color:var(--sub);font-style:italic}.media{font-style:normal}
a{color:#027eb5}
.flash .b{outline:2px solid #f5c400;background:var(--flash)}
#res{position:fixed;top:56px;right:8px;width:min(420px,calc(100% - 16px));max-height:70vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);display:none;z-index:5}
#res div{padding:8px 12px;border-bottom:1px solid var(--line);cursor:pointer}
#res div:hover{background:var(--line)}
#res small{color:var(--sub);display:block}
#res mark{background:#ffe066;color:#111}
#res p{margin:0;padding:12px;color:var(--sub)}
@media(max-width:600px){#chat{padding:8px 8px 40px}.b{max-width:86%}#q{width:110px}}
</style></head><body>
<header>
 <div class="av" id="av"></div>
 <div class="who"><b id="title"></b><small id="sub"></small></div>
 <input id="q" type="search" placeholder="Search chat">
 <select id="mon" title="Jump to month"></select>
 <input id="dt" type="date" title="Jump to date">
 <button id="th" title="Light / dark">&#9788;</button>
</header>
<div id="res"></div>
<div id="chat"></div>
<script>
const DATA=__DATA__, ME=__ME__, TITLE=__TITLE__;
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const $=id=>document.getElementById(id);
const chat=$('chat');
const months=[];let cur=null;
DATA.forEach((m,i)=>{const k=m[0].slice(0,7);if(!cur||cur.key!==k){cur={key:k,start:i,end:i+1};months.push(cur)}else cur.end=i+1});
const multi=new Set(DATA.filter(m=>!(m[4]&8)).map(m=>m[2])).size>2;
const fmtDate=d=>{const[y,mo,da]=d.split('-');return +da+' '+MON[+mo-1]+' '+y};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const linkify=s=>s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
const col=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return 'hsl('+h+',55%,42%)'};
function monthHTML(mi){
 const mo=months[mi];let out='',prev=null;
 for(let i=mo.start;i<mo.end;i++){
  const[d,t,s,x,f]=DATA[i];
  if(i===mo.start||DATA[i-1][0]!==d){out+='<div class="date"><span>'+fmtDate(d)+'</span></div>';prev=null}
  if(f&8){out+='<div class="sys" id="m'+i+'"><span>'+esc(x)+'</span></div>';prev=null;continue}
  const me=s===ME,first=prev!==s;prev=s;
  const body=f&2?'<span class="del">&#128683; '+esc(x)+'</span>':f&4?'<span class="media">&#128206; '+esc(x)+'</span>':linkify(esc(x));
  out+='<div class="row '+(me?'me':'them')+(first?' first':'')+'" id="m'+i+'"><div class="b">'+(multi&&!me&&first?'<div class="nm" style="color:'+col(s)+'">'+esc(s)+'</div>':'')+'<span class="tx">'+body+'</span><span class="meta">'+(f&1?'edited ':'')+t+'</span></div></div>';
 }
 return out;
}
let lo=0,hi=0;
function show(mi,idx){
 lo=hi=mi;chat.innerHTML=monthHTML(mi);$('mon').value=mi;
 if(idx!=null){const el=$('m'+idx);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),3000)}}
 else chat.scrollTop=0;
}
const monthOf=i=>months.findIndex(m=>i>=m.start&&i<m.end);
chat.addEventListener('scroll',()=>{
 if(chat.scrollTop+chat.clientHeight>chat.scrollHeight-800&&hi<months.length-1){hi++;chat.insertAdjacentHTML('beforeend',monthHTML(hi))}
 if(chat.scrollTop<300&&lo>0){const h=chat.scrollHeight;lo--;chat.insertAdjacentHTML('afterbegin',monthHTML(lo));chat.scrollTop+=chat.scrollHeight-h}
});
// header
$('title').textContent=TITLE;$('av').textContent=(TITLE[0]||'?').toUpperCase();
$('sub').textContent=DATA.length.toLocaleString()+' messages, '+fmtDate(DATA[0][0])+' to '+fmtDate(DATA[DATA.length-1][0]);
$('mon').innerHTML=months.map((m,i)=>'<option value="'+i+'">'+MON[+m.key.slice(5)-1]+' '+m.key.slice(0,4)+'</option>').join('');
$('mon').onchange=e=>show(+e.target.value);
$('dt').min=DATA[0][0];$('dt').max=DATA[DATA.length-1][0];
$('dt').onchange=e=>{const v=e.target.value;if(!v)return;let i=DATA.findIndex(m=>m[0]>=v);if(i<0)i=DATA.length-1;show(monthOf(i),i)};
// search
const res=$('res');let tm;
$('q').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{
 const q=e.target.value.trim().toLowerCase();
 if(q.length<2){res.style.display='none';return}
 const hits=[];for(let i=0;i<DATA.length&&hits.length<300;i++){if(!(DATA[i][4]&8)&&DATA[i][3].toLowerCase().includes(q))hits.push(i)}
 res.style.display='block';
 if(!hits.length){res.innerHTML='<p>No matches</p>';return}
 const re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
 res.innerHTML=hits.map(i=>{const m=DATA[i];return '<div data-i="'+i+'"><small>'+fmtDate(m[0])+', '+m[1]+' - '+esc(m[2])+'</small>'+esc(m[3].slice(0,160)).replace(re,'<mark>$1</mark>')+'</div>'}).join('');
},200)};
res.onclick=e=>{const d=e.target.closest('[data-i]');if(!d)return;const i=+d.dataset.i;res.style.display='none';show(monthOf(i),i)};
// theme
const root=document.documentElement;
if(matchMedia('(prefers-color-scheme: dark)').matches)root.dataset.theme='dark';
$('th').onclick=()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark'};
show(Math.max(0, months.findIndex(m => m.key === '2024-11')));;
</script></body></html>'''

if __name__ == '__main__':
    main()
